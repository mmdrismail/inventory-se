const mongoose = require('mongoose');
const PartPriceCatalog = require('../models/PartPriceCatalog');
const Product = require('../models/Product');
const Quotation = require('../models/Quotation');
const Sale = require('../models/Sale');

const cleanStr = (v) => String(v || '').trim();

const normalizeMachineDetails = (raw = {}) => {
  if (!raw || typeof raw !== 'object') {
    return {
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
    machineName: cleanStr(raw.machineName),
    model: cleanStr(raw.model || raw.machineModel),
    type: cleanStr(raw.type || raw.machineType),
    hp: cleanStr(raw.hp),
    ton: cleanStr(raw.ton),
    cylinder: cleanStr(raw.cylinder || raw.cylender),
    others: cleanStr(raw.others),
    description: cleanStr(raw.description),
    autoSaveToPriceCatalog: raw.autoSaveToPriceCatalog !== undefined ? Boolean(raw.autoSaveToPriceCatalog) : true,
  };
};

const buildMachineKey = (md = {}) => {
  const parts = [md.machineName, md.model, md.type, md.hp, md.ton, md.cylinder]
    .map((x) => cleanStr(x).toLowerCase())
    .filter(Boolean);
  return parts.join('|');
};

/**
 * Automatically indexes line items + machine specs from a Quotation or Sale
 * into MongoDB PartPriceCatalog so shop staff can search previous rates later.
 */
const syncDocumentToPriceCatalog = async (items = [], machineDetailsRaw = {}, meta = {}) => {
  try {
    if (!Array.isArray(items) || items.length === 0) return [];
    const md = normalizeMachineDetails(machineDetailsRaw);
    if (md.autoSaveToPriceCatalog === false) return [];

    const docType = meta.docType || 'quotation'; // 'quotation' | 'sale' | 'challan' | 'manual'
    const docNumber = cleanStr(meta.docNumber);
    const docDate = meta.date ? new Date(meta.date) : new Date();
    const customerName = cleanStr(meta.customerName);
    const machineKey = buildMachineKey(md);

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
      const safePrice = Number.isFinite(priceNum) && priceNum >= 0 ? Math.round(priceNum * 100) / 100 : 0;
      const unit = cleanStr(item.unit) || 'pc';

      // Check linked Product if item references one or shares exact name
      let linkedProductId = null;
      if (item.productId && mongoose.Types.ObjectId.isValid(item.productId)) {
        linkedProductId = item.productId;
      } else {
        const escaped = partName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const matchedProd = await Product.findOne({ name: new RegExp(`^${escaped}$`, 'i') })
          .select('_id')
          .lean();
        if (matchedProd) linkedProductId = matchedProd._id;
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

// @desc    Get all price catalog entries with multi-word search across part + machine specs
// @route   GET /api/price-catalog
// @access  Private
exports.getPriceCatalog = async (req, res, next) => {
  try {
    const { search, machineName, sourceType } = req.query;
    const filter = {};

    if (machineName && machineName !== 'all') {
      const esc = cleanStr(machineName).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.machineName = { $regex: esc, $options: 'i' };
    }
    if (sourceType && sourceType !== 'all') {
      filter.sourceType = sourceType;
    }

    // Multi-word AND search across part & machine attributes (e.g. "bitzer 4ec valve")
    if (search && cleanStr(search)) {
      const tokens = cleanStr(search).split(/\s+/).filter(Boolean);
      const tokenClauses = tokens.map((tok) => {
        const safe = tok.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const re = { $regex: safe, $options: 'i' };
        return {
          $or: [
            { partName: re },
            { machineName: re },
            { model: re },
            { type: re },
            { hp: re },
            { ton: re },
            { cylinder: re },
            { others: re },
            { description: re },
            { lastDocNumber: re },
            { lastCustomerName: re },
          ],
        };
      });
      if (tokenClauses.length > 0) {
        filter.$and = tokenClauses;
      }
    }

    const entries = await PartPriceCatalog.find(filter)
      .sort({ lastDocDate: -1, updatedAt: -1 })
      .lean();

    res.json({
      success: true,
      count: entries.length,
      data: entries,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create or upsert a manual / scanned price catalog entry
// @route   POST /api/price-catalog
// @access  Private
exports.upsertPriceCatalogEntry = async (req, res, next) => {
  try {
    const partName = cleanStr(req.body.partName || req.body.name);
    if (!partName) {
      return res.status(400).json({ success: false, message: 'Part / item name is required.' });
    }

    const md = normalizeMachineDetails(req.body);
    const machineKey = buildMachineKey(md);
    const normalizedPartName = partName.toLowerCase();
    const priceVal = Math.max(0, Number(req.body.lastPrice ?? req.body.unitPrice ?? req.body.sellingPrice ?? 0) || 0);
    const unit = cleanStr(req.body.unit) || 'pc';
    const sourceType = ['sale', 'challan', 'quotation', 'product', 'manual'].includes(req.body.sourceType)
      ? req.body.sourceType
      : 'manual';

    let linkedProductId = null;
    if (req.body.linkedProductId && mongoose.Types.ObjectId.isValid(req.body.linkedProductId)) {
      linkedProductId = req.body.linkedProductId;
    }

    let entry = await PartPriceCatalog.findOne({ normalizedPartName, machineKey });
    if (!entry) {
      entry = await PartPriceCatalog.create({
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
        lastQuotedPrice: Number(req.body.lastQuotedPrice) || (sourceType === 'quotation' ? priceVal : 0),
        lastSoldPrice: Number(req.body.lastSoldPrice) || (sourceType === 'sale' || sourceType === 'challan' ? priceVal : 0),
        lastPrice: priceVal,
        minPrice: priceVal,
        maxPrice: priceVal,
        sourceType,
        lastDocNumber: cleanStr(req.body.lastDocNumber),
        lastDocDate: req.body.lastDocDate ? new Date(req.body.lastDocDate) : new Date(),
        lastCustomerName: cleanStr(req.body.lastCustomerName),
        linkedProductId,
        history:
          priceVal > 0
            ? [
                {
                  price: priceVal,
                  unit,
                  docType: sourceType,
                  docNumber: cleanStr(req.body.lastDocNumber || 'MANUAL'),
                  date: new Date(),
                  customerName: cleanStr(req.body.lastCustomerName),
                  machineName: md.machineName,
                  model: md.model,
                  hp: md.hp,
                  ton: md.ton,
                  cylinder: md.cylinder,
                },
              ]
            : [],
      });
    } else {
      entry.partName = partName;
      entry.others = md.others || entry.others;
      entry.description = md.description || entry.description;
      entry.unit = unit || entry.unit;
      if (priceVal > 0) {
        entry.lastPrice = priceVal;
        if (sourceType === 'quotation') entry.lastQuotedPrice = priceVal;
        if (sourceType === 'sale' || sourceType === 'challan') entry.lastSoldPrice = priceVal;
        entry.minPrice = entry.minPrice > 0 ? Math.min(entry.minPrice, priceVal) : priceVal;
        entry.maxPrice = Math.max(entry.maxPrice || 0, priceVal);
        entry.history.unshift({
          price: priceVal,
          unit,
          docType: sourceType,
          docNumber: cleanStr(req.body.lastDocNumber || 'UPDATE'),
          date: new Date(),
          customerName: cleanStr(req.body.lastCustomerName),
          machineName: md.machineName,
          model: md.model,
          hp: md.hp,
          ton: md.ton,
          cylinder: md.cylinder,
        });
        entry.history = entry.history.slice(0, 20);
      }
      if (linkedProductId) entry.linkedProductId = linkedProductId;
      await entry.save();
    }

    res.status(201).json({
      success: true,
      message: `Saved "${partName}" to Price Catalog.`,
      data: entry,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a price catalog entry
// @route   PUT /api/price-catalog/:id
// @access  Private
exports.updatePriceCatalogEntry = async (req, res, next) => {
  try {
    const existing = await PartPriceCatalog.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Price catalog entry not found.' });
    }

    const md = normalizeMachineDetails({ ...existing.toObject(), ...req.body });
    const nextPartName = cleanStr(req.body.partName) || existing.partName;
    existing.partName = nextPartName;
    existing.normalizedPartName = nextPartName.toLowerCase();
    existing.machineName = md.machineName;
    existing.model = md.model;
    existing.type = md.type;
    existing.hp = md.hp;
    existing.ton = md.ton;
    existing.cylinder = md.cylinder;
    existing.others = md.others;
    existing.description = md.description;
    existing.machineKey = buildMachineKey(md);
    if (req.body.unit) existing.unit = cleanStr(req.body.unit);
    if (req.body.lastPrice !== undefined) {
      const p = Math.max(0, Number(req.body.lastPrice) || 0);
      existing.lastPrice = p;
      existing.minPrice = existing.minPrice > 0 ? Math.min(existing.minPrice, p) : p;
      existing.maxPrice = Math.max(existing.maxPrice || 0, p);
    }
    if (req.body.linkedProductId !== undefined) existing.linkedProductId = req.body.linkedProductId;

    await existing.save();
    res.json({ success: true, data: existing });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a price catalog entry
// @route   DELETE /api/price-catalog/:id
// @access  Private
exports.deletePriceCatalogEntry = async (req, res, next) => {
  try {
    const entry = await PartPriceCatalog.findByIdAndDelete(req.params.id);
    if (!entry) {
      return res.status(404).json({ success: false, message: 'Price catalog entry not found.' });
    }
    res.json({ success: true, message: 'Entry deleted from Price Catalog.' });
  } catch (error) {
    next(error);
  }
};

// @desc    Backfill PartPriceCatalog from all historical Quotations & Sales in MongoDB
// @route   POST /api/price-catalog/sync-history
// @access  Private
exports.syncHistoryToPriceCatalog = async (req, res, next) => {
  try {
    const [quotes, sales] = await Promise.all([
      Quotation.find({}).sort({ date: 1, createdAt: 1 }).lean(),
      Sale.find({ status: { $ne: 'cancelled' } }).sort({ date: 1, createdAt: 1 }).lean(),
    ]);

    let indexedCount = 0;
    for (const q of quotes) {
      const resList = await syncDocumentToPriceCatalog(q.items, q.machineDetails, {
        docType: 'quotation',
        docNumber: q.quotationNumber,
        date: q.date || q.createdAt,
        customerName: q.customerName,
      });
      indexedCount += resList.length;
    }

    for (const s of sales) {
      const resList = await syncDocumentToPriceCatalog(s.items, s.machineDetails, {
        docType: s.documentType === 'challan' ? 'challan' : 'sale',
        docNumber: s.invoiceNumber || s.invoiceNo,
        date: s.date || s.createdAt,
        customerName: s.customerName,
      });
      indexedCount += resList.length;
    }

    const totalCatalog = await PartPriceCatalog.countDocuments();
    res.json({
      success: true,
      message: `Synchronized ${indexedCount} line item record(s) into ${totalCatalog} Price Catalog entries.`,
      indexedCount,
      totalCatalog,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Promote a Price Catalog entry into the formal Product inventory table
// @route   POST /api/price-catalog/:id/promote-to-product
// @access  Private
exports.promoteToProduct = async (req, res, next) => {
  try {
    const entry = await PartPriceCatalog.findById(req.params.id);
    if (!entry) {
      return res.status(404).json({ success: false, message: 'Price catalog entry not found.' });
    }

    if (entry.linkedProductId && mongoose.Types.ObjectId.isValid(entry.linkedProductId)) {
      const existingProd = await Product.findById(entry.linkedProductId);
      if (existingProd) {
        return res.json({
          success: true,
          message: `"${existingProd.name}" is already linked to Product Inventory.`,
          data: { entry, product: existingProd },
        });
      }
    }

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
    const sku = cleanStr(req.body.sku) || `${skuBase}-${Math.floor(1000 + Math.random() * 9000)}`;

    const sellingPrice = Math.max(0, Number(req.body.sellingPrice ?? entry.lastPrice ?? entry.lastQuotedPrice ?? 0) || 0);
    const costPrice = Math.max(0, Number(req.body.costPrice ?? 0) || 0);
    const quantity = Math.max(0, Number(req.body.quantity ?? 0) || 0);

    const product = await Product.create({
      name: entry.partName,
      sku,
      brand: entry.machineName || '',
      modelNumber: entry.model || '',
      compatibleModels: [entry.machineName, entry.model].filter(Boolean),
      dimensions: specParts.join(' · '),
      description: entry.description || specParts.join(' | '),
      costPrice,
      sellingPrice,
      quantity,
      reorderLevel: Number(req.body.reorderLevel) || 5,
      unit: entry.unit || 'pc',
      imageUrl: 'https://images.unsplash.com/photo-1589710751893-f9a6770ad71b?w=500&auto=format&fit=crop&q=60',
      isPublic: true,
    });

    entry.linkedProductId = product._id;
    await entry.save();

    res.status(201).json({
      success: true,
      message: `"${product.name}" added to Product Inventory & linked to Price List.`,
      data: { entry, product },
    });
  } catch (error) {
    next(error);
  }
};

exports.normalizeMachineDetails = normalizeMachineDetails;
exports.buildMachineKey = buildMachineKey;
exports.syncDocumentToPriceCatalog = syncDocumentToPriceCatalog;
