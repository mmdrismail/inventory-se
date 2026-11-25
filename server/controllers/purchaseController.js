const Purchase = require('../models/Purchase');
const Product = require('../models/Product');
const StockMovement = require('../models/StockMovement');

// @desc    Get all purchase orders
// @route   GET /api/purchases
// @access  Private (Admin, Manager)
exports.getPurchases = async (req, res, next) => {
  try {
    const { supplierId, status, page, limit } = req.query;
    const query = {};

    if (supplierId) query.supplierId = supplierId;
    if (status && status !== 'all') query.status = status;

    if (page && limit) {
      const pageNum = parseInt(page, 10) || 1;
      const limitNum = parseInt(limit, 10) || 20;
      const skip = (pageNum - 1) * limitNum;

      const [purchases, total] = await Promise.all([
        Purchase.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
        Purchase.countDocuments(query),
      ]);

      return res.json({
        success: true,
        count: purchases.length,
        total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum),
        data: purchases,
      });
    }

    const purchases = await Purchase.find(query).sort({ createdAt: -1 }).lean();
    res.json({
      success: true,
      count: purchases.length,
      data: purchases,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single purchase order
// @route   GET /api/purchases/:id
// @access  Private (Admin, Manager)
exports.getPurchaseById = async (req, res, next) => {
  try {
    const purchase = await Purchase.findById(req.params.id);
    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: 'Purchase order not found.',
      });
    }
    res.json({ success: true, data: purchase });
  } catch (error) {
    next(error);
  }
};

// @desc    Create purchase order
// @route   POST /api/purchases
// @access  Private (Admin, Manager)
exports.createPurchase = async (req, res, next) => {
  try {
    const { supplierId, items, subtotal, tax, totalAmount, status, notes } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'A purchase order must include at least one item.',
      });
    }

    const count = await Purchase.countDocuments();
    const purchaseNumber = req.body.purchaseNumber || req.body.poNumber || req.body.referenceNo || `PO-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const normalizedItems = (items || []).map((it) => {
      const quantity = Number(it.quantity) || 1;
      const unitCost = Number(it.unitCost !== undefined ? it.unitCost : (it.unitPrice !== undefined ? it.unitPrice : it.costPrice)) || 0;
      const lineTotal = Number(it.lineTotal !== undefined ? it.lineTotal : (it.total !== undefined ? it.total : quantity * unitCost)) || 0;
      return {
        productId: it.productId || it.id,
        productName: it.productName || it.name || '',
        sku: it.sku || '',
        quantity,
        unit: it.unit || 'pc',
        unitCost,
        lineTotal,
      };
    });

    const purchase = await Purchase.create({
      purchaseNumber,
      supplierId,
      items: normalizedItems,
      subtotal: Number(subtotal) || 0,
      tax: Number(tax) || 0,
      totalAmount: Number(totalAmount) || 0,
      status: status || 'draft',
      notes: notes || '',
      receivedDate: status === 'received' ? new Date() : null,
    });

    // If marked received upon creation, immediately intake stock
    if (status === 'received') {
      for (const item of normalizedItems) {
        const prod = (await Product.findById(item.productId)) || (item.sku ? await Product.findOne({ sku: item.sku }) : null);
        if (prod) {
          const newQty = prod.quantity + Number(item.quantity);
          prod.quantity = newQty;
          await prod.save();

          await StockMovement.create({
            productId: prod._id,
            type: 'purchase_in',
            quantity: Number(item.quantity),
            balanceAfter: newQty,
            reference: purchase.purchaseNumber,
            reason: `Purchase stock intake for ${purchase.purchaseNumber}`,
            performedBy: req.user ? req.user.name : 'Manager',
          });
        }
      }
    }

    res.status(201).json({
      success: true,
      message: 'Purchase order created successfully.',
      data: purchase,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark purchase order as received (Atomic stock intake)
// @route   PUT /api/purchases/:id/receive
// @access  Private (Admin, Manager)
exports.receivePurchase = async (req, res, next) => {
  try {
    const purchase = await Purchase.findById(req.params.id);
    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: 'Purchase order not found.',
      });
    }

    if (purchase.status === 'received') {
      return res.status(400).json({
        success: false,
        message: 'This purchase order has already been marked as received.',
      });
    }

    if (purchase.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Cannot receive a cancelled purchase order.',
      });
    }

    // Increment stock for each item and log movement
    for (const item of purchase.items) {
      const prod = (await Product.findById(item.productId)) || (item.sku ? await Product.findOne({ sku: item.sku }) : null);
      if (prod) {
        const newQty = prod.quantity + Number(item.quantity);
        prod.quantity = newQty;
        await prod.save();

        await StockMovement.create({
          productId: prod._id,
          type: 'purchase_in',
          quantity: Number(item.quantity),
          balanceAfter: newQty,
          reference: purchase.purchaseNumber,
          reason: `Stock received against purchase ${purchase.purchaseNumber}`,
          performedBy: req.user ? req.user.name : 'Manager',
        });
      }
    }

    purchase.status = 'received';
    purchase.receivedDate = new Date();
    await purchase.save();

    res.json({
      success: true,
      message: `Purchase order ${purchase.purchaseNumber} received and inventory updated.`,
      data: purchase,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel purchase order (Safe reversal if previously received)
// @route   PUT /api/purchases/:id/cancel
// @access  Private (Admin, Manager)
exports.cancelPurchase = async (req, res, next) => {
  try {
    const purchase = await Purchase.findById(req.params.id);
    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: 'Purchase order not found.',
      });
    }

    if (purchase.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'This purchase order is already cancelled.',
      });
    }

    // If it was already received, reverse the stock
    if (purchase.status === 'received') {
      for (const item of purchase.items) {
        const prod = await Product.findById(item.productId);
        if (prod) {
          const newQty = Math.max(0, prod.quantity - Number(item.quantity));
          prod.quantity = newQty;
          await prod.save();

          await StockMovement.create({
            productId: prod._id,
            type: 'reversal',
            quantity: -Number(item.quantity),
            balanceAfter: newQty,
            reference: purchase.purchaseNumber,
            reason: `Reversal: Purchase order ${purchase.purchaseNumber} cancelled`,
            performedBy: req.user ? req.user.name : 'Manager',
          });
        }
      }
    }

    purchase.status = 'cancelled';
    await purchase.save();

    res.json({
      success: true,
      message: `Purchase order ${purchase.purchaseNumber} has been cancelled.`,
      data: purchase,
    });
  } catch (error) {
    next(error);
  }
};
