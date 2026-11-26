import { normalizeUnit } from './units';

const cleanStr = (v) => String(v || '').trim();

export const EMPTY_MACHINE_DETAILS = {
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

export const normalizeMachineDetails = (raw = {}) => {
  if (!raw || typeof raw !== 'object') return { ...EMPTY_MACHINE_DETAILS };
  return {
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

export const hasAnyMachineDetails = (md = {}) => {
  if (!md || typeof md !== 'object') return false;
  return Boolean(
    cleanStr(md.machineName) ||
      cleanStr(md.model || md.machineModel) ||
      cleanStr(md.type || md.machineType) ||
      cleanStr(md.hp) ||
      cleanStr(md.ton) ||
      cleanStr(md.cylinder || md.cylender) ||
      cleanStr(md.others) ||
      cleanStr(md.description)
  );
};

export const formatMachineSummary = (md = {}) => {
  if (!md || typeof md !== 'object') return '';
  const parts = [
    cleanStr(md.machineName),
    cleanStr(md.model || md.machineModel) ? `Model: ${cleanStr(md.model || md.machineModel)}` : '',
    cleanStr(md.type || md.machineType) ? `Type: ${cleanStr(md.type || md.machineType)}` : '',
    cleanStr(md.hp) ? `${cleanStr(md.hp)} HP` : '',
    cleanStr(md.ton) ? `${cleanStr(md.ton)} Ton` : '',
    cleanStr(md.cylinder || md.cylender) ? `${cleanStr(md.cylinder || md.cylender)} Cyl` : '',
    cleanStr(md.others),
  ].filter(Boolean);
  return parts.join(' · ');
};

export const buildMachineKey = (md = {}) => {
  return [
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
};

/**
 * Multi-keyword token matcher: matches if every whitespace-separated token appears in the text blob.
 * Example: "bitzer 4ec valve" matches "Bitzer Compressor · Model: 4EC-6.2Y · Valve Plate".
 */
export const matchesMultiTokens = (query = '', fields = []) => {
  const tokens = cleanStr(query).toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;
  const blob = fields.map((f) => cleanStr(Array.isArray(f) ? f.join(' ') : f).toLowerCase()).join(' ');
  return tokens.every((tok) => blob.includes(tok));
};

/**
 * Builds a unified deduplicated index across:
 * 1) Live Stock Inventory Products (`products`)
 * 2) Persistent PartPriceCatalog (`priceCatalog`)
 * 3) All historical Quotation & Sale items (`quotations`, `sales`)
 */
export const buildUnifiedPartsIndex = ({
  products = [],
  priceCatalog = [],
  quotations = [],
  sales = [],
} = {}) => {
  const safeProducts = Array.isArray(products) ? products.filter((p) => p && typeof p === 'object') : [];
  const safePriceCatalog = Array.isArray(priceCatalog) ? priceCatalog.filter((r) => r && typeof r === 'object') : [];
  const safeQuotations = Array.isArray(quotations) ? quotations.filter((q) => q && typeof q === 'object') : [];
  const safeSales = Array.isArray(sales) ? sales.filter((s) => s && typeof s === 'object') : [];

  const byProductId = new Map();
  const byProductName = new Map();

  for (const p of safeProducts) {
    if (!p) continue;
    const pid = p.id || p._id;
    if (pid) byProductId.set(String(pid), p);
    if (p.name) byProductName.set(cleanStr(p.name).toLowerCase(), p);
  }

  const catalogMap = new Map();

  const upsertCatalogEntry = (entry) => {
    const normName = cleanStr(entry.partName).toLowerCase();
    if (!normName || normName.length < 2) return;
    const mKey = buildMachineKey(entry);
    const compositeKey = `${normName}__${mKey}`;

    const matchedProd =
      (entry.linkedProductId && byProductId.get(String(entry.linkedProductId))) ||
      byProductName.get(normName) ||
      null;

    const existing = catalogMap.get(compositeKey);
    const price = Number(entry.lastPrice) || 0;
    const docDateMs = new Date(entry.lastDocDate || 0).getTime() || 0;

    if (!existing) {
      catalogMap.set(compositeKey, {
        ...entry,
        compositeKey,
        linkedProduct: matchedProd,
        linkedProductId: matchedProd?.id || matchedProd?._id || entry.linkedProductId || null,
        inStockDb: Boolean(matchedProd),
        stockQty: matchedProd ? Number(matchedProd.quantity) || 0 : null,
        _dateMs: docDateMs,
      });
    } else {
      if (!existing.linkedProduct && matchedProd) {
        existing.linkedProduct = matchedProd;
        existing.linkedProductId = matchedProd.id || matchedProd._id;
        existing.inStockDb = true;
        existing.stockQty = Number(matchedProd.quantity) || 0;
      }
      if (price > 0) {
        if (!existing.lastQuotedPrice && entry.lastQuotedPrice) existing.lastQuotedPrice = entry.lastQuotedPrice;
        if (!existing.lastSoldPrice && entry.lastSoldPrice) existing.lastSoldPrice = entry.lastSoldPrice;
        if (docDateMs >= existing._dateMs) {
          existing.lastPrice = price;
          existing.lastDocNumber = entry.lastDocNumber || existing.lastDocNumber;
          existing.lastDocDate = entry.lastDocDate || existing.lastDocDate;
          existing.lastCustomerName = entry.lastCustomerName || existing.lastCustomerName;
          existing.sourceType = entry.sourceType || existing.sourceType;
          existing._dateMs = docDateMs;
        }
        existing.minPrice = existing.minPrice > 0 ? Math.min(existing.minPrice, price) : price;
        existing.maxPrice = Math.max(existing.maxPrice || 0, price);
      }
      if ((!existing.history || existing.history.length === 0) && entry.history?.length) {
        existing.history = entry.history;
      }
    }
  };

  // Seed from formal PriceCatalog collection first
  for (const row of safePriceCatalog) {
    if (!row) continue;
    upsertCatalogEntry({
      id: row.id || row._id,
      _id: row._id,
      partName: row.partName,
      machineName: row.machineName || '',
      model: row.model || '',
      type: row.type || '',
      hp: row.hp || '',
      ton: row.ton || '',
      cylinder: row.cylinder || '',
      others: row.others || '',
      description: row.description || '',
      unit: normalizeUnit(row.unit || 'pc'),
      lastQuotedPrice: Number(row.lastQuotedPrice) || 0,
      lastSoldPrice: Number(row.lastSoldPrice) || 0,
      lastPrice: Number(row.lastPrice || row.lastQuotedPrice || row.lastSoldPrice) || 0,
      minPrice: Number(row.minPrice || row.lastPrice) || 0,
      maxPrice: Number(row.maxPrice || row.lastPrice) || 0,
      sourceType: row.sourceType || 'quotation',
      lastDocNumber: row.lastDocNumber || '',
      lastDocDate: row.lastDocDate || row.updatedAt || row.createdAt,
      lastCustomerName: row.lastCustomerName || '',
      linkedProductId: row.linkedProductId || null,
      history: Array.isArray(row.history) ? row.history : [],
    });
  }

  // Enrich live from all Quotations (catches older quotes too)
  for (const q of safeQuotations) {
    if (!q) continue;
    const md = normalizeMachineDetails(q.machineDetails);
    for (const it of Array.isArray(q.items) ? q.items : []) {
      if (!it || typeof it !== 'object') continue;
      const partName = cleanStr(it.name || it.productName);
      if (!partName) continue;
      const rate = Number(it.unitPrice || it.rate || it.price) || 0;
      upsertCatalogEntry({
        partName,
        machineName: md.machineName,
        model: md.model,
        type: md.type,
        hp: md.hp,
        ton: md.ton,
        cylinder: md.cylinder,
        others: md.others,
        description: md.description || cleanStr(it.description),
        unit: normalizeUnit(it.unit || 'pc'),
        lastQuotedPrice: rate,
        lastPrice: rate,
        minPrice: rate,
        maxPrice: rate,
        sourceType: 'quotation',
        lastDocNumber: q.quotationNumber || '',
        lastDocDate: q.date || q.createdAt,
        lastCustomerName: q.customerName || '',
        linkedProductId: it.productId && it.productId !== 'custom' && it.productId !== 'custom-item' ? it.productId : null,
      });
    }
  }

  // Enrich live from all active Sales / Challans
  for (const s of safeSales) {
    if (!s || s.status === 'cancelled') continue;
    const md = normalizeMachineDetails(s.machineDetails);
    const isChallan = s.documentType === 'challan';
    for (const it of Array.isArray(s.items) ? s.items : []) {
      if (!it || typeof it !== 'object') continue;
      const partName = cleanStr(it.productName || it.name);
      if (!partName) continue;
      const rate = Number(it.unitPrice || it.rate || it.price || it.sellingPrice) || 0;
      upsertCatalogEntry({
        partName,
        machineName: md.machineName,
        model: md.model,
        type: md.type,
        hp: md.hp,
        ton: md.ton,
        cylinder: md.cylinder,
        others: md.others,
        description: md.description,
        unit: normalizeUnit(it.unit || 'pc'),
        lastSoldPrice: rate,
        lastPrice: rate,
        minPrice: rate,
        maxPrice: rate,
        sourceType: isChallan ? 'challan' : 'sale',
        lastDocNumber: s.invoiceNumber || s.invoiceNo || '',
        lastDocDate: s.date || s.createdAt,
        lastCustomerName: s.customerName || '',
        linkedProductId: it.productId && it.productId !== 'custom' && it.productId !== 'custom-item' ? it.productId : null,
      });
    }
  }

  const priceListEntries = Array.from(catalogMap.values()).sort((a, b) => (b._dateMs || 0) - (a._dateMs || 0));

  return {
    products: safeProducts,
    priceListEntries,
  };
};

/**
 * Search across BOTH stock Products and Machine/Parts Price List.
 * Ranks entries matching `preferredMachine` higher.
 */
export const searchUnifiedParts = (query = '', index = { products: [], priceListEntries: [] }, options = {}) => {
  const safeIndex = index && typeof index === 'object' ? index : { products: [], priceListEntries: [] };
  const indexProducts = Array.isArray(safeIndex.products) ? safeIndex.products : [];
  const indexPriceEntries = Array.isArray(safeIndex.priceListEntries) ? safeIndex.priceListEntries : [];
  const { preferredMachine = {}, maxResults = 30 } = options || {};
  const prefName = cleanStr(preferredMachine?.machineName).toLowerCase();
  const prefModel = cleanStr(preferredMachine?.model).toLowerCase();

  const scoreMachineMatch = (machineName = '', model = '') => {
    let score = 0;
    const m = cleanStr(machineName).toLowerCase();
    const mod = cleanStr(model).toLowerCase();
    if (prefName && m && m.includes(prefName)) score += 3;
    if (prefModel && mod && mod.includes(prefModel)) score += 3;
    return score;
  };

  const matchedProducts = indexProducts
    .filter((p) =>
      p &&
      matchesMultiTokens(query, [
        p.name,
        p.sku,
        p.barcode,
        p.brand,
        p.modelNumber,
        p.dimensions,
        p.description,
        p.oemPartNumber,
        p.impaCode,
        p.compatibleModels,
        p.warehouseLocation?.code,
        p.warehouseLocation?.rack,
      ])
    )
    .map((p) => ({
      kind: 'product',
      uid: `prod-${p.id || p._id}`,
      productId: p.id || p._id,
      partName: p.name,
      machineName: p.brand || '',
      model: p.modelNumber || '',
      type: '',
      hp: '',
      ton: '',
      cylinder: '',
      description: p.dimensions || p.description || '',
      unit: normalizeUnit(p.unit || 'pc'),
      price: Number(p.sellingPrice) || 0,
      stockQty: Number(p.quantity) || 0,
      sku: p.sku || '',
      inStockDb: true,
      rawProduct: p,
      _score: scoreMachineMatch(p.brand, p.modelNumber) + 1,
    }))
    .sort((a, b) => b._score - a._score)
    .slice(0, maxResults);

  const matchedPriceEntries = indexPriceEntries
    .filter((row) =>
      row &&
      matchesMultiTokens(query, [
        row.partName,
        row.machineName,
        row.model,
        row.type,
        row.hp,
        row.ton,
        row.cylinder,
        row.others,
        row.description,
        row.lastDocNumber,
        row.lastCustomerName,
      ])
    )
    .map((row) => ({
      ...row,
      kind: 'price_history',
      uid: `pc-${row.id || row._id || row.compositeKey}`,
      price: Number(row.lastPrice || row.lastSoldPrice || row.lastQuotedPrice) || 0,
      _score: scoreMachineMatch(row.machineName, row.model),
    }))
    .sort((a, b) => {
      if (b._score !== a._score) return b._score - a._score;
      return (b._dateMs || 0) - (a._dateMs || 0);
    })
    .slice(0, maxResults);

  return {
    matchedProducts,
    matchedPriceEntries,
  };
};
