import { storageService, STORAGE_KEYS } from './storageService';
import { apiClient } from './apiClient';
import { productService } from './productService';
import { normalizeMachineDetails, buildMachineKey } from '../utils/partPriceSearch';
import { normalizeUnit } from '../utils/units';

const cleanStr = (v) => String(v || '').trim();

class PriceCatalogService {
  getAll() {
    return storageService.getItem(STORAGE_KEYS.PRICE_CATALOG, []);
  }

  upsertFromDocument(items = [], machineDetailsRaw = {}, meta = {}) {
    const md = normalizeMachineDetails(machineDetailsRaw);
    if (!Array.isArray(items) || items.length === 0 || md.autoSaveToPriceCatalog === false) {
      return [];
    }

    const catalog = this.getAll();
    const machineKey = buildMachineKey(md);
    const docType = meta.docType || 'quotation';
    const docNumber = cleanStr(meta.docNumber);
    const docDate = meta.date || new Date().toISOString();
    const customerName = cleanStr(meta.customerName);
    const now = new Date().toISOString();

    for (const item of items) {
      const partName = cleanStr(item.name || item.productName || item.partName);
      if (!partName || partName.length < 2) continue;

      const normalizedPartName = partName.toLowerCase();
      const priceVal = Math.max(
        0,
        Number(
          item.unitPrice !== undefined
            ? item.unitPrice
            : item.rate !== undefined
            ? item.rate
            : item.price !== undefined
            ? item.price
            : 0
        ) || 0
      );
      const safePrice = Math.round(priceVal * 100) / 100;
      const unit = normalizeUnit(item.unit || 'pc');
      const linkedProductId =
        item.productId && item.productId !== 'custom' && item.productId !== 'custom-item'
          ? item.productId
          : null;

      const idx = catalog.findIndex(
        (r) =>
          cleanStr(r.normalizedPartName || r.partName).toLowerCase() === normalizedPartName &&
          cleanStr(r.machineKey || buildMachineKey(r)) === machineKey
      );

      const historyPoint = {
        price: safePrice,
        unit,
        docType,
        docNumber,
        date: docDate,
        customerName,
        machineName: md.machineName,
        model: md.model,
        hp: md.hp,
        ton: md.ton,
        cylinder: md.cylinder,
      };

      if (idx === -1) {
        catalog.unshift({
          id: `pc-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
          partName,
          normalizedPartName,
          machineName: md.machineName,
          model: md.model,
          type: md.type,
          hp: md.hp,
          ton: md.ton,
          cylinder: md.cylinder,
          others: md.others,
          description: md.description,
          machineKey,
          unit,
          lastQuotedPrice: docType === 'quotation' ? safePrice : 0,
          lastSoldPrice: docType === 'sale' || docType === 'challan' ? safePrice : 0,
          lastPrice: safePrice,
          minPrice: safePrice,
          maxPrice: safePrice,
          sourceType: docType,
          lastDocNumber: docNumber,
          lastDocDate: docDate,
          lastCustomerName: customerName,
          linkedProductId,
          entryCount: 1,
          history: safePrice > 0 || docNumber ? [historyPoint] : [],
          createdAt: now,
          updatedAt: now,
        });
      } else {
        const cur = { ...catalog[idx] };
        cur.others = md.others || cur.others || '';
        cur.description = md.description || cur.description || '';
        cur.unit = unit || cur.unit || 'pc';
        if (linkedProductId && !cur.linkedProductId) cur.linkedProductId = linkedProductId;

        if (safePrice > 0) {
          cur.lastPrice = safePrice;
          if (docType === 'quotation') cur.lastQuotedPrice = safePrice;
          if (docType === 'sale' || docType === 'challan') cur.lastSoldPrice = safePrice;
          cur.minPrice = cur.minPrice > 0 ? Math.min(cur.minPrice, safePrice) : safePrice;
          cur.maxPrice = Math.max(cur.maxPrice || 0, safePrice);
        }
        cur.sourceType = docType;
        if (docNumber) cur.lastDocNumber = docNumber;
        cur.lastDocDate = docDate;
        if (customerName) cur.lastCustomerName = customerName;

        const hist = Array.isArray(cur.history) ? [...cur.history] : [];
        const dupIdx = docNumber ? hist.findIndex((h) => h.docNumber === docNumber && h.docType === docType) : -1;
        if (dupIdx !== -1) hist[dupIdx] = historyPoint;
        else hist.unshift(historyPoint);
        cur.history = hist.slice(0, 20);
        cur.entryCount = (cur.entryCount || 1) + 1;
        cur.updatedAt = now;
        catalog[idx] = cur;
      }
    }

    storageService.setItem(STORAGE_KEYS.PRICE_CATALOG, catalog);
    return catalog;
  }

  saveManualEntry(data = {}) {
    const partName = cleanStr(data.partName || data.name);
    if (!partName) {
      return { success: false, message: 'Part name is required.' };
    }

    const md = normalizeMachineDetails(data);
    const machineKey = buildMachineKey(md);
    const normalizedPartName = partName.toLowerCase();
    const priceVal = Math.max(0, Number(data.lastPrice ?? data.sellingPrice ?? data.unitPrice ?? 0) || 0);
    const unit = normalizeUnit(data.unit || 'pc');
    const sourceType = data.sourceType || 'manual';
    const now = new Date().toISOString();

    const catalog = this.getAll();
    const existingIdx = data.id
      ? catalog.findIndex((r) => r.id === data.id || r._id === data.id)
      : catalog.findIndex(
          (r) =>
            cleanStr(r.normalizedPartName || r.partName).toLowerCase() === normalizedPartName &&
            cleanStr(r.machineKey || buildMachineKey(r)) === machineKey
        );

    let savedEntry;
    if (existingIdx !== -1) {
      const cur = catalog[existingIdx];
      savedEntry = {
        ...cur,
        partName,
        normalizedPartName,
        ...md,
        machineKey,
        unit,
        lastPrice: priceVal || cur.lastPrice || 0,
        minPrice: priceVal > 0 ? Math.min(cur.minPrice || priceVal, priceVal) : cur.minPrice || 0,
        maxPrice: Math.max(cur.maxPrice || 0, priceVal),
        updatedAt: now,
      };
      catalog[existingIdx] = savedEntry;
    } else {
      savedEntry = {
        id: `pc-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        partName,
        normalizedPartName,
        ...md,
        machineKey,
        unit,
        lastQuotedPrice: sourceType === 'quotation' ? priceVal : 0,
        lastSoldPrice: sourceType === 'sale' || sourceType === 'challan' ? priceVal : 0,
        lastPrice: priceVal,
        minPrice: priceVal,
        maxPrice: priceVal,
        sourceType,
        lastDocNumber: cleanStr(data.lastDocNumber || 'PRICE-LIST'),
        lastDocDate: now,
        lastCustomerName: cleanStr(data.lastCustomerName),
        linkedProductId: data.linkedProductId || null,
        entryCount: 1,
        history: priceVal > 0 ? [{ price: priceVal, unit, docType: sourceType, docNumber: cleanStr(data.lastDocNumber || 'MANUAL'), date: now, ...md }] : [],
        createdAt: now,
        updatedAt: now,
      };
      catalog.unshift(savedEntry);
    }

    storageService.setItem(STORAGE_KEYS.PRICE_CATALOG, catalog);

    const payload = {
      partName: savedEntry.partName,
      machineName: savedEntry.machineName,
      model: savedEntry.model,
      type: savedEntry.type,
      hp: savedEntry.hp,
      ton: savedEntry.ton,
      cylinder: savedEntry.cylinder,
      others: savedEntry.others,
      description: savedEntry.description,
      unit: savedEntry.unit,
      lastPrice: savedEntry.lastPrice,
      sourceType: savedEntry.sourceType,
      lastDocNumber: savedEntry.lastDocNumber,
      lastCustomerName: savedEntry.lastCustomerName,
      linkedProductId: savedEntry.linkedProductId,
    };

    const mongoId = savedEntry._id || (existingIdx !== -1 && catalog[existingIdx]?._id);
    const syncPromise = (
      mongoId
        ? apiClient.put(`/price-catalog/${mongoId}`, payload)
        : apiClient.post('/price-catalog', payload, {
            tempId: savedEntry.id,
            storageKey: STORAGE_KEYS.PRICE_CATALOG,
          })
    )
      .then((res) => {
        if (res?.data?._id) {
          const curList = this.getAll();
          const i = curList.findIndex((x) => x.id === savedEntry.id || x._id === res.data._id);
          if (i !== -1) {
            curList[i] = { ...curList[i], ...res.data, id: res.data._id, _id: res.data._id };
            storageService.setItem(STORAGE_KEYS.PRICE_CATALOG, curList);
          }
        }
        return res;
      })
      .catch((err) => {
        console.warn('[MongoDB PriceCatalog sync]:', err.message);
        return null;
      });

    return { success: true, entry: savedEntry, syncPromise };
  }

  remove(id) {
    const catalog = this.getAll();
    const target = catalog.find((r) => r.id === id || r._id === id);
    if (!target) return { success: false, message: 'Price catalog entry not found.' };

    const filtered = catalog.filter((r) => r.id !== id && r._id !== id);
    storageService.setItem(STORAGE_KEYS.PRICE_CATALOG, filtered);

    const mongoId = target._id;
    const syncPromise = mongoId
      ? apiClient.delete(`/price-catalog/${mongoId}`).catch((err) => {
          console.warn('[MongoDB PriceCatalog delete]:', err.message);
          return null;
        })
      : Promise.resolve(null);

    return { success: true, message: `"${target.partName}" removed from Price List.`, syncPromise };
  }

  syncHistoryLocal(quotations = [], sales = []) {
    for (const q of quotations) {
      this.upsertFromDocument(q.items, q.machineDetails, {
        docType: 'quotation',
        docNumber: q.quotationNumber,
        date: q.date || q.createdAt,
        customerName: q.customerName,
      });
    }
    for (const s of sales) {
      if (s.status === 'cancelled') continue;
      this.upsertFromDocument(s.items, s.machineDetails, {
        docType: s.documentType === 'challan' ? 'challan' : 'sale',
        docNumber: s.invoiceNumber || s.invoiceNo,
        date: s.date || s.createdAt,
        customerName: s.customerName,
      });
    }
    const syncPromise = apiClient.post('/price-catalog/sync-history', {}).catch(() => null);
    return { success: true, entries: this.getAll(), syncPromise };
  }

  promoteToProduct(entry, overrides = {}, performedBy = 'Admin') {
    const specParts = [
      entry.type && `Type: ${entry.type}`,
      entry.hp && `HP: ${entry.hp}`,
      entry.ton && `Ton: ${entry.ton}`,
      entry.cylinder && `Cyl: ${entry.cylinder}`,
      entry.others,
    ].filter(Boolean);

    const skuBase = (entry.machineName || entry.partName || 'PART')
      .replace(/[^a-zA-Z0-9]/g, '')
      .slice(0, 4)
      .toUpperCase() || 'PART';

    const productRes = productService.create(
      {
        name: entry.partName,
        sku: cleanStr(overrides.sku) || `${skuBase}-${Math.floor(1000 + Math.random() * 9000)}`,
        brand: entry.machineName || '',
        modelNumber: entry.model || '',
        compatibleModels: [entry.machineName, entry.model].filter(Boolean),
        dimensions: specParts.join(' · '),
        description: entry.description || specParts.join(' | '),
        costPrice: Number(overrides.costPrice ?? 0) || 0,
        sellingPrice: Number(overrides.sellingPrice ?? entry.lastPrice ?? entry.price ?? 0) || 0,
        quantity: Number(overrides.quantity ?? 0) || 0,
        reorderLevel: Number(overrides.reorderLevel ?? 5) || 5,
        unit: normalizeUnit(entry.unit || 'pc'),
        isPublic: true,
      },
      performedBy
    );

    if (!productRes.success) return productRes;

    // Persist/link catalog record as well
    this.saveManualEntry({
      ...entry,
      linkedProductId: productRes.product.id,
      lastPrice: productRes.product.sellingPrice,
    });

    return { success: true, product: productRes.product };
  }
}

export const priceCatalogService = new PriceCatalogService();
