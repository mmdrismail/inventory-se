const LotPurchase = require('../models/LotPurchase');
const Product = require('../models/Product');
const StockMovement = require('../models/StockMovement');

// @desc    Get all bulk lot purchases
// @route   GET /api/lots
// @access  Public / Authenticated
exports.getLots = async (req, res, next) => {
  try {
    const { search, status } = req.query;
    const query = {};

    if (search && String(search).trim()) {
      const s = String(search).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { lotNumber: { $regex: s, $options: 'i' } },
        { lotName: { $regex: s, $options: 'i' } },
        { sourceShipOrOrigin: { $regex: s, $options: 'i' } },
      ];
    }

    if (status && status !== 'all') {
      query.status = status;
    }

    const lots = await LotPurchase.find(query).sort({ createdAt: -1 });

    res.json({
      success: true,
      count: lots.length,
      data: lots,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single lot by ID or lotNumber
// @route   GET /api/lots/:id
// @access  Public / Authenticated
exports.getLotById = async (req, res, next) => {
  try {
    const lot = await LotPurchase.findById(req.params.id) || await LotPurchase.findOne({ lotNumber: req.params.id });
    if (!lot) {
      return res.status(404).json({
        success: false,
        message: 'Lot purchase record not found.',
      });
    }

    // Also fetch all products created from this lot
    const linkedProducts = await Product.find({ lotNumber: lot.lotNumber });

    res.json({
      success: true,
      data: {
        ...lot.toObject(),
        linkedProducts,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create bulk lot purchase
// @route   POST /api/lots
// @access  Private
exports.createLot = async (req, res, next) => {
  try {
    const {
      lotNumber,
      lotName,
      sourceType,
      sourceShipOrOrigin,
      supplierId,
      supplierName,
      purchaseDate,
      totalLotCost,
      otherExpenses,
      items,
      notes,
    } = req.body;

    const formattedLotNumber = (lotNumber || `LOT-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`).toUpperCase().trim();

    const existing = await LotPurchase.findOne({ lotNumber: formattedLotNumber });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Lot with number "${formattedLotNumber}" already exists.`,
      });
    }

    const parsedTotalCost = Number(totalLotCost) || 0;
    const parsedExpenses = Number(otherExpenses) || 0;
    const netInvested = parsedTotalCost + parsedExpenses;

    const parsedItems = Array.isArray(items) ? items.map((it, idx) => ({
      id: it.id || `lot-item-${Date.now()}-${idx + 1}`,
      name: it.name || 'Unnamed Machinery Part',
      brand: it.brand || '',
      modelNumber: it.modelNumber || '',
      condition: it.condition || 'reconditioned',
      quantity: Number(it.quantity) || 1,
      unit: it.unit || 'pcs',
      allocatedCost: Number(it.allocatedCost) || 0,
      targetSellingPrice: Number(it.targetSellingPrice) || 0,
      category: it.category || '',
      warehouseLocation: it.warehouseLocation || '',
      isDistributed: false,
    })) : [];

    const totalExtracted = parsedItems.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);
    const totalEstSales = parsedItems.reduce((sum, it) => sum + ((Number(it.quantity) || 0) * (Number(it.targetSellingPrice) || 0)), 0);

    const lot = await LotPurchase.create({
      lotNumber: formattedLotNumber,
      lotName: lotName || `Ship Scrap Lot #${formattedLotNumber}`,
      sourceType: sourceType || 'ship_scrap',
      sourceShipOrOrigin: sourceShipOrOrigin || '',
      supplierId: supplierId || null,
      supplierName: supplierName || '',
      purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
      totalLotCost: parsedTotalCost,
      otherExpenses: parsedExpenses,
      netInvestedAmount: netInvested,
      status: 'draft',
      items: parsedItems,
      totalExtractedItems: totalExtracted,
      totalEstimatedSalesValue: totalEstSales,
      notes: notes || '',
    });

    res.status(201).json({
      success: true,
      message: 'Lot purchase created successfully.',
      data: lot,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Distribute items from lot into active inventory
// @route   POST /api/lots/:id/distribute
// @access  Private
exports.distributeLotToInventory = async (req, res, next) => {
  try {
    const lot = await LotPurchase.findById(req.params.id) || await LotPurchase.findOne({ lotNumber: req.params.id });
    if (!lot) {
      return res.status(404).json({ success: false, message: 'Lot not found.' });
    }

    const createdOrUpdatedProducts = [];

    for (const item of lot.items) {
      if (item.isDistributed) continue; // Skip already distributed

      const sku = `SKU-LOT-${lot.lotNumber.replace(/\D/g, '').slice(-3)}-${Math.floor(1000 + Math.random() * 9000)}`;

      const newProduct = await Product.create({
        name: item.name,
        sku,
        brand: item.brand,
        modelNumber: item.modelNumber,
        condition: item.condition,
        costPrice: item.allocatedCost,
        sellingPrice: item.targetSellingPrice,
        quantity: item.quantity,
        unit: item.unit,
        lotNumber: lot.lotNumber,
        lotId: lot._id,
        sourceShip: lot.sourceShipOrOrigin,
        sourceLotCost: item.allocatedCost,
        warehouseLocation: {
          code: item.warehouseLocation,
          rack: item.warehouseLocation,
        },
        description: `Sourced from Lot #${lot.lotNumber} (${lot.lotName}). Source: ${lot.sourceShipOrOrigin || 'Auction Yard'}`,
      });

      await StockMovement.create({
        productId: newProduct._id,
        type: 'purchase',
        quantity: item.quantity,
        balanceAfter: item.quantity,
        reference: `LOT_${lot.lotNumber}`,
        reason: `Bulk lot intake allocation from ${lot.lotName}`,
        performedBy: req.user ? req.user.name : 'Lot Intake Manager',
      });

      item.isDistributed = true;
      item.productId = newProduct._id;
      createdOrUpdatedProducts.push(newProduct);
    }

    lot.status = 'intake_completed';
    await lot.save();

    res.json({
      success: true,
      message: `Successfully distributed ${createdOrUpdatedProducts.length} items from Lot #${lot.lotNumber} into inventory.`,
      data: {
        lot,
        products: createdOrUpdatedProducts,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update lot details
// @route   PUT /api/lots/:id
// @access  Private
exports.updateLot = async (req, res, next) => {
  try {
    const lot = await LotPurchase.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!lot) {
      return res.status(404).json({ success: false, message: 'Lot not found.' });
    }
    res.json({ success: true, message: 'Lot updated successfully.', data: lot });
  } catch (error) {
    next(error);
  }
};
