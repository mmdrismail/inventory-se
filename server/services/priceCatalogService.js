const mongoose = require('mongoose');
const PartPriceCatalog = require('../models/PartPriceCatalog');
const Product = require('../models/Product');
const {
  cleanStr,
  roundMoney,
  normalizeMachineDetails,
  escapeRegex,
} = require('../utils/domainNormalizers');
const { resolveOrUpsertMachineModel } = require('./hierarchyService');

/**
 * Automatically indexes line items + machine specs from a Quotation or Sale
 * into MongoDB PartPriceCatalog and resolves canonical MachineModel references.
 */
const syncDocumentToPriceCatalog = async (items = [], machineDetailsRaw = {}, meta = {}) => {
  try {
    if (!Array.isArray(items) || items.length === 0) return [];
    const md = normalizeMachineDetails(machineDetailsRaw);
    if (md.autoSaveToPriceCatalog === false) return [];

    const docType = meta.docType || 'quotation';
    const docNumber = cleanStr(meta.docNumber);
    const docDate = meta.date ? new Date(meta.date) : new Date();
    const customerName = cleanStr(meta.customerName);

    const { machineModelId, machineKey } = await resolveOrUpsertMachineModel(md, {
      createIfMissing: Boolean(md.machineName),
    });

    const updatedEntries = [];

    for (const item of items) {
      const partName = cleanStr(item.name || item.productName || item.partName);
      if (!partName || partName.length < 2) continue;

      const normalizedPartName = partName.toLowerCase();
      const priceNum = Number(
        item.unitPrice !== undefined
          ? item.unitPrice
          : item.rate !== undefined
          ? item.rate
          : item.price !== undefined
          ? item.price
          : 0
      );
      const safePrice = Number.isFinite(priceNum) && priceNum >= 0 ? roundMoney(priceNum) : 0;
      const unit = cleanStr(item.unit) || 'pc';

      let linkedProductId = null;
      let resolvedCategoryId = null;
      if (item.productId && mongoose.Types.ObjectId.isValid(item.productId)) {
        const matchedProd = await Product.findById(item.productId).select('_id categoryId').lean();
        if (matchedProd) {
          linkedProductId = matchedProd._id;
          resolvedCategoryId = matchedProd.categoryId || null;
        } else {
          linkedProductId = item.productId;
        }
      } else {
        const matchedProd = await Product.findOne({ name: new RegExp(`^${escapeRegex(partName)}$`, 'i') })
          .select('_id categoryId')
          .lean();
        if (matchedProd) {
          linkedProductId = matchedProd._id;
          resolvedCategoryId = matchedProd.categoryId || null;
        }
      }

      let existing = await PartPriceCatalog.findOne({ normalizedPartName, machineKey });
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

      if (!existing) {
        existing = await PartPriceCatalog.create({
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
          machineModelId,
          categoryId: resolvedCategoryId,
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
        });
      } else {
        if (md.others && !existing.others) existing.others = md.others;
        if (md.description && !existing.description) existing.description = md.description;
        if (!existing.linkedProductId && linkedProductId) existing.linkedProductId = linkedProductId;
        if (!existing.machineModelId && machineModelId) existing.machineModelId = machineModelId;
        if (!existing.categoryId && resolvedCategoryId) existing.categoryId = resolvedCategoryId;
        if (unit) existing.unit = unit;

        if (safePrice > 0) {
          existing.lastPrice = safePrice;
          if (docType === 'quotation') existing.lastQuotedPrice = safePrice;
          if (docType === 'sale' || docType === 'challan') existing.lastSoldPrice = safePrice;
          existing.minPrice = existing.minPrice > 0 ? Math.min(existing.minPrice, safePrice) : safePrice;
          existing.maxPrice = Math.max(existing.maxPrice || 0, safePrice);
        }

        const isNewerDoc = !existing.lastDocDate || docDate >= new Date(existing.lastDocDate);
        if (isNewerDoc) {
          existing.sourceType = docType;
          if (docNumber) existing.lastDocNumber = docNumber;
          existing.lastDocDate = docDate;
          if (customerName) existing.lastCustomerName = customerName;
        }

        const dupIdx = docNumber
          ? existing.history.findIndex((h) => h.docNumber === docNumber && h.docType === docType)
          : -1;
        if (dupIdx !== -1) {
          existing.history[dupIdx] = historyPoint;
        } else {
          existing.history.unshift(historyPoint);
          if (existing.history.length > 20) {
            existing.history = existing.history.slice(0, 20);
          }
          existing.entryCount = (existing.entryCount || 1) + 1;
        }

        await existing.save();
      }
      updatedEntries.push(existing);
    }

    return updatedEntries;
  } catch (err) {
    console.warn('[PriceCatalog sync notice]:', err.message);
    return [];
  }
};

module.exports = {
  syncDocumentToPriceCatalog,
};
