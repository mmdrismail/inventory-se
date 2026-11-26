import { normalizeUnit } from '../utils/units';
import {
  cleanStr,
  inferBrandFromMachineName,
  normalizeMachineDetails,
  buildMachineKey,
} from './machineSpecs';
import { resolveItemRate } from './documentSchema';

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
        machineKey: mKey,
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
      if (!existing.machineModelId && entry.machineModelId) {
        existing.machineModelId = entry.machineModelId;
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

  for (const row of safePriceCatalog) {
    if (!row) continue;
    upsertCatalogEntry({
      id: row.id || row._id,
      _id: row._id,
      partName: row.partName,
      machineModelId: row.machineModelId || null,
      categoryId: row.categoryId || null,
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

  for (const q of safeQuotations) {
    if (!q) continue;
    const md = normalizeMachineDetails(q.machineDetails);
    for (const it of Array.isArray(q.items) ? q.items : []) {
      if (!it || typeof it !== 'object') continue;
      const partName = cleanStr(it.name || it.productName);
      if (!partName) continue;
      const rate = resolveItemRate(it);
      upsertCatalogEntry({
        partName,
        machineModelId: md.machineModelId || null,
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

  for (const s of safeSales) {
    if (!s || s.status === 'cancelled') continue;
    const md = normalizeMachineDetails(s.machineDetails);
    const isChallan = s.documentType === 'challan';
    for (const it of Array.isArray(s.items) ? s.items : []) {
      if (!it || typeof it !== 'object') continue;
      const partName = cleanStr(it.productName || it.name);
      if (!partName) continue;
      const rate = resolveItemRate(it);
      upsertCatalogEntry({
        partName,
        machineModelId: md.machineModelId || null,
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
 * Builds a Hierarchical Machine Tree (`Brand -> MachineModel -> Linked Stock Products + Price Catalog Parts`)
 * from one unified source so UI views & pickers can browse hierarchically without duplicating aggregation.
 */
export const buildMachineCatalogTree = ({
  machineModels = [],
  products = [],
  priceCatalog = [],
  quotations = [],
  sales = [],
} = {}) => {
  const { products: safeProducts, priceListEntries } = buildUnifiedPartsIndex({
    products,
    priceCatalog,
    quotations,
    sales,
  });

  const modelMap = new Map();

  const ensureModelNode = (rawSpec = {}, extra = {}) => {
    const md = normalizeMachineDetails(rawSpec);
    const mKey = buildMachineKey(md) || 'unassigned';

    if (!modelMap.has(mKey)) {
      const displayName = md.machineName || md.model || 'সাধারণ / অনির্দিষ্ট মেশিন (General Parts)';
      const brand =
        mKey === 'unassigned'
          ? 'General / Unassigned'
          : cleanStr(rawSpec.brand) || inferBrandFromMachineName(displayName);
      modelMap.set(mKey, {
        machineKey: mKey,
        machineModelId: extra.machineModelId || md.machineModelId || null,
        brand,
        machineName: displayName,
        model: md.model,
        type: md.type,
        hp: md.hp,
        ton: md.ton,
        cylinder: md.cylinder,
        others: md.others,
        description: md.description,
        priceEntries: [],
        stockProducts: [],
        quotationCount: 0,
        saleCount: 0,
        _productIds: new Set(),
      });
    } else if (extra.machineModelId && !modelMap.get(mKey).machineModelId) {
      modelMap.get(mKey).machineModelId = extra.machineModelId;
    }

    return modelMap.get(mKey);
  };

  for (const mm of Array.isArray(machineModels) ? machineModels : []) {
    if (mm && typeof mm === 'object') {
      ensureModelNode(mm, { machineModelId: mm._id || mm.id });
    }
  }

  for (const entry of priceListEntries) {
    const node = ensureModelNode(entry, { machineModelId: entry.machineModelId });
    node.priceEntries.push(entry);
    if (entry.linkedProduct) {
      const pid = String(entry.linkedProduct.id || entry.linkedProduct._id);
      if (!node._productIds.has(pid)) {
        node._productIds.add(pid);
        node.stockProducts.push(entry.linkedProduct);
      }
    }
  }

  for (const q of Array.isArray(quotations) ? quotations : []) {
    if (!q?.machineDetails) continue;
    const key = buildMachineKey(normalizeMachineDetails(q.machineDetails));
    if (key && modelMap.has(key)) modelMap.get(key).quotationCount += 1;
  }

  for (const s of Array.isArray(sales) ? sales : []) {
    if (!s?.machineDetails || s.status === 'cancelled') continue;
    const key = buildMachineKey(normalizeMachineDetails(s.machineDetails));
    if (key && modelMap.has(key)) modelMap.get(key).saleCount += 1;
  }

  // Link products via explicit primaryMachineModelId / compatibleMachineIds or brand/modelNumber
  for (const prod of safeProducts) {
    const prodId = String(prod.id || prod._id || '');
    const explicitIds = new Set(
      [prod.primaryMachineModelId, ...(Array.isArray(prod.compatibleMachineIds) ? prod.compatibleMachineIds : [])]
        .filter(Boolean)
        .map(String)
    );
    const prodTokens = [prod.modelNumber, ...(Array.isArray(prod.compatibleModels) ? prod.compatibleModels : [])]
      .map((t) => cleanStr(t).toLowerCase())
      .filter(Boolean);

    for (const node of modelMap.values()) {
      if (node.machineKey === 'unassigned') continue;
      const matchesId = node.machineModelId && explicitIds.has(String(node.machineModelId));
      const matchesModel =
        node.model && prodTokens.some((tok) => tok === cleanStr(node.model).toLowerCase());
      if ((matchesId || matchesModel) && prodId && !node._productIds.has(prodId)) {
        node._productIds.add(prodId);
        node.stockProducts.push(prod);
      }
    }
  }

  const brandGroups = new Map();
  for (const node of modelMap.values()) {
    const { _productIds, ...cleanNode } = node;
    const bKey = cleanStr(cleanNode.brand).toLowerCase() || 'general';
    if (!brandGroups.has(bKey)) {
      brandGroups.set(bKey, {
        brand: cleanNode.brand,
        models: [],
        totalPartsCount: 0,
        totalStockCount: 0,
      });
    }
    const group = brandGroups.get(bKey);
    group.models.push(cleanNode);
    group.totalPartsCount += cleanNode.priceEntries.length;
    group.totalStockCount += cleanNode.stockProducts.length;
  }

  return Array.from(brandGroups.values())
    .map((g) => ({
      ...g,
      models: g.models.sort((a, b) => cleanStr(a.model || a.machineName).localeCompare(cleanStr(b.model || b.machineName))),
    }))
    .sort((a, b) => {
      if (a.brand === 'General / Unassigned') return 1;
      if (b.brand === 'General / Unassigned') return -1;
      return a.brand.localeCompare(b.brand);
    });
};

/**
 * Search across BOTH stock Products and Machine/Parts Price List.
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
    .filter(
      (p) =>
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
    .filter(
      (row) =>
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
