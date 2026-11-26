const mongoose = require('mongoose');
const PartPriceCatalog = require('../models/PartPriceCatalog');
const Product = require('../models/Product');
const Quotation = require('../models/Quotation');
const Sale = require('../models/Sale');
const {
  cleanStr,
  roundMoney,
  normalizeMachineDetails,
  buildMachineKey,
  escapeRegex,
} = require('../utils/domainNormalizers');
const { resolveOrUpsertMachineModel } = require('../services/hierarchyService');
const { syncDocumentToPriceCatalog } = require('../services/priceCatalogService');

// @desc    Get all price catalog entries with multi-word search across part + machine specs
// @route   GET /api/price-catalog
// @access  Private
exports.getPriceCatalog = async (req, res, next) => {
  try {
    const { search, machineName, machineModelId, sourceType } = req.query;
    const filter = {};

    if (machineModelId) {
      filter.machineModelId = machineModelId;
    }
    if (machineName && machineName !== 'all') {
      filter.machineName = { $regex: escapeRegex(machineName), $options: 'i' };
    }
    if (sourceType && sourceType !== 'all') {
      filter.sourceType = sourceType;
    }

    // Multi-word AND search across part & machine attributes (e.g. "bitzer 4ec valve")
    if (search && cleanStr(search)) {
      const tokens = cleanStr(search).split(/\s+/).filter(Boolean);
      const tokenClauses = tokens.map((tok) => {
        const re = { $regex: escapeRegex(tok), $options: 'i' };
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

    const { machineModelId, machineKey, machineDetails: md } = await resolveOrUpsertMachineModel(req.body, {
      categoryId: req.body.categoryId || null,
      createIfMissing: Boolean(cleanStr(req.body.machineName)),
    });
    const normalizedPartName = partName.toLowerCase();
    const priceVal = roundMoney(Math.max(0, Number(req.body.lastPrice ?? req.body.unitPrice ?? req.body.sellingPrice ?? 0) || 0));
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
        machineModelId,
        categoryId: req.body.categoryId || null,
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
      if (machineModelId && !entry.machineModelId) entry.machineModelId = machineModelId;
      if (req.body.categoryId) entry.categoryId = req.body.categoryId;
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

    const mergedRaw = { ...existing.toObject(), ...req.body };
    const { machineModelId, machineKey, machineDetails: md } = await resolveOrUpsertMachineModel(mergedRaw, {
      categoryId: req.body.categoryId || existing.categoryId || null,
      createIfMissing: Boolean(cleanStr(mdOrRawName(mergedRaw))),
    });
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
    existing.machineKey = machineKey;
    if (machineModelId) existing.machineModelId = machineModelId;
    if (req.body.categoryId !== undefined) existing.categoryId = req.body.categoryId;
    if (req.body.unit) existing.unit = cleanStr(req.body.unit);
    if (req.body.lastPrice !== undefined) {
      const p = roundMoney(Math.max(0, Number(req.body.lastPrice) || 0));
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

const mdOrRawName = (raw) => raw?.machineName;

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

    const { machineModelId } = await resolveOrUpsertMachineModel(entry, {
      categoryId: entry.categoryId || null,
      createIfMissing: Boolean(entry.machineName),
    });

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
      primaryMachineModelId: machineModelId || entry.machineModelId || null,
      compatibleMachineIds: machineModelId ? [machineModelId] : [],
      categoryId: req.body.categoryId || entry.categoryId || null,
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
    if (machineModelId && !entry.machineModelId) entry.machineModelId = machineModelId;
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
