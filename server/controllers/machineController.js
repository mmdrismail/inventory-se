const mongoose = require('mongoose');
const MachineModel = require('../models/MachineModel');
const Category = require('../models/Category');
const Product = require('../models/Product');
const PartPriceCatalog = require('../models/PartPriceCatalog');
const Quotation = require('../models/Quotation');
const Sale = require('../models/Sale');
const {
  cleanStr,
  slugify,
  escapeRegex,
  inferBrandFromMachineName,
  normalizeMachineDetails,
  buildMachineKey,
} = require('../utils/domainNormalizers');
const {
  buildCategoryTreeNodes,
  buildMachineCatalogTreeReadOnly,
  resolveOrUpsertMachineModel,
} = require('../services/hierarchyService');

// @desc    Get all registered machine profiles + optional search
// @route   GET /api/machines
// @access  Private
exports.getMachines = async (req, res, next) => {
  try {
    const { search, brand, status } = req.query;
    const filter = {};
    if (brand && brand !== 'all') {
      filter.brand = { $regex: escapeRegex(brand), $options: 'i' };
    }
    if (status && status !== 'all') {
      filter.status = status;
    }
    if (search && cleanStr(search)) {
      const tokens = cleanStr(search).split(/\s+/).filter(Boolean);
      filter.$and = tokens.map((tok) => {
        const re = { $regex: escapeRegex(tok), $options: 'i' };
        return {
          $or: [
            { machineName: re },
            { brand: re },
            { model: re },
            { type: re },
            { hp: re },
            { ton: re },
            { cylinder: re },
            { aliases: re },
          ],
        };
      });
    }

    const machines = await MachineModel.find(filter).sort({ brand: 1, machineName: 1, model: 1 }).lean();
    res.json({
      success: true,
      count: machines.length,
      data: machines,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Read-only hierarchical tree across Categories, Machines, Products, PriceCatalog & Docs
// @route   GET /api/machines/hierarchy
// @access  Private
exports.getUnifiedHierarchy = async (req, res, next) => {
  try {
    const [categories, machineModels, products, priceCatalog, quotations, sales] = await Promise.all([
      Category.find().sort({ level: 1, sortOrder: 1, name: 1 }).lean(),
      MachineModel.find().sort({ brand: 1, machineName: 1, model: 1 }).lean(),
      Product.find().select('name sku brand modelNumber compatibleModels categoryId primaryMachineModelId compatibleMachineIds quantity sellingPrice unit').lean(),
      PartPriceCatalog.find().lean(),
      Quotation.find().select('quotationNumber machineDetails date status').lean(),
      Sale.find({ status: { $ne: 'cancelled' } }).select('invoiceNumber machineDetails date status').lean(),
    ]);

    const countMap = {};
    for (const p of products) {
      if (p.categoryId) {
        const cid = String(p.categoryId);
        countMap[cid] = (countMap[cid] || 0) + 1;
      }
    }

    const categoryTree = buildCategoryTreeNodes(categories, countMap);
    const machineTree = buildMachineCatalogTreeReadOnly({
      machineModels,
      products,
      priceCatalog,
      quotations,
      sales,
    });

    res.json({
      success: true,
      data: {
        categoryTree,
        machineTree,
        counts: {
          categories: categories.length,
          machineBrands: machineTree.length,
          machineModels: machineTree.reduce((sum, b) => sum + b.models.length, 0),
          products: products.length,
          priceEntries: priceCatalog.length,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get compatible parts & pricing for a specific MachineModel ID or machineKey
// @route   GET /api/machines/:idOrKey/parts
// @access  Private
exports.getMachineParts = async (req, res, next) => {
  try {
    const param = cleanStr(req.params.idOrKey);
    let machineDoc = null;
    if (mongoose.Types.ObjectId.isValid(param)) {
      machineDoc = await MachineModel.findById(param).lean();
    }
    if (!machineDoc) {
      machineDoc = await MachineModel.findOne({ machineKey: param.toLowerCase() }).lean();
    }

    const key = machineDoc?.machineKey || param.toLowerCase();
    const prodFilter = machineDoc
      ? {
          $or: [
            { primaryMachineModelId: machineDoc._id },
            { compatibleMachineIds: machineDoc._id },
            ...(machineDoc.model ? [{ modelNumber: new RegExp(escapeRegex(machineDoc.model), 'i') }, { compatibleModels: new RegExp(escapeRegex(machineDoc.model), 'i') }] : []),
          ],
        }
      : { _id: null };

    const [stockProducts, priceEntries] = await Promise.all([
      machineDoc ? Product.find(prodFilter).lean() : Promise.resolve([]),
      PartPriceCatalog.find(
        machineDoc
          ? { $or: [{ machineModelId: machineDoc._id }, { machineKey: key }] }
          : { machineKey: key }
      )
        .sort({ lastDocDate: -1 })
        .lean(),
    ]);

    res.json({
      success: true,
      data: {
        machine: machineDoc || { machineKey: key },
        stockProducts,
        priceEntries,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create or upsert a canonical MachineModel profile
// @route   POST /api/machines
// @access  Private
exports.upsertMachineModel = async (req, res, next) => {
  try {
    const md = normalizeMachineDetails(req.body);
    if (!md.machineName && !md.model) {
      return res.status(400).json({ success: false, message: 'Machine name or model is required.' });
    }

    const { machineModel } = await resolveOrUpsertMachineModel(req.body, {
      categoryId: req.body.categoryId || null,
      createIfMissing: true,
    });

    res.status(201).json({
      success: true,
      message: `Saved machine profile "${machineModel?.machineName || md.machineName}".`,
      data: machineModel,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a canonical MachineModel profile
// @route   PUT /api/machines/:id
// @access  Private
exports.updateMachineModel = async (req, res, next) => {
  try {
    const existing = await MachineModel.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Machine profile not found.' });
    }

    const merged = normalizeMachineDetails({ ...existing.toObject(), ...req.body });
    const nextKey = buildMachineKey(merged);
    if (!nextKey) {
      return res.status(400).json({ success: false, message: 'Machine name or model is required.' });
    }

    existing.machineName = merged.machineName || existing.machineName;
    existing.brand = cleanStr(req.body.brand) || existing.brand || inferBrandFromMachineName(existing.machineName);
    existing.model = merged.model;
    existing.type = merged.type;
    existing.hp = merged.hp;
    existing.ton = merged.ton;
    existing.cylinder = merged.cylinder;
    existing.others = merged.others;
    existing.description = merged.description;
    existing.machineKey = nextKey;
    existing.slug = slugify([existing.machineName, existing.model, existing.hp, existing.ton].filter(Boolean).join('-'));
    if (req.body.categoryId !== undefined) existing.categoryId = req.body.categoryId;
    if (Array.isArray(req.body.aliases)) existing.aliases = req.body.aliases.map(cleanStr).filter(Boolean);
    if (req.body.status) existing.status = req.body.status;

    await existing.save();
    res.json({ success: true, data: existing });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a canonical MachineModel profile (without deleting products or catalog history)
// @route   DELETE /api/machines/:id
// @access  Private (Admin, Manager)
exports.deleteMachineModel = async (req, res, next) => {
  try {
    const deleted = await MachineModel.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Machine profile not found.' });
    }
    res.json({ success: true, message: `Machine profile "${deleted.machineName}" deleted.` });
  } catch (error) {
    next(error);
  }
};
