const mongoose = require('mongoose');
const StockMovement = require('../models/StockMovement');
const Product = require('../models/Product');

const findProduct = async (idOrSku) => {
  if (!idOrSku) return null;
  if (mongoose.Types.ObjectId.isValid(idOrSku)) {
    const byId = await Product.findById(idOrSku);
    if (byId) return byId;
  }
  return await Product.findOne({ sku: String(idOrSku).toUpperCase().trim() });
};

// @desc    Get all stock movements (audit log)
// @route   GET /api/inventory/movements
// @access  Private (Admin, Manager)
exports.getMovements = async (req, res, next) => {
  try {
    const { productId, type, reference, page, limit } = req.query;
    const query = {};

    if (productId) {
      if (mongoose.Types.ObjectId.isValid(productId)) {
        query.productId = productId;
      } else {
        const prod = await findProduct(productId);
        if (prod) query.productId = prod._id;
      }
    }
    if (type && type !== 'all') query.type = type;
    if (reference) query.reference = reference;

    if (page && limit) {
      const pageNum = parseInt(page, 10) || 1;
      const limitNum = parseInt(limit, 10) || 50;
      const skip = (pageNum - 1) * limitNum;

      const [movements, total] = await Promise.all([
        StockMovement.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
        StockMovement.countDocuments(query),
      ]);

      return res.json({
        success: true,
        count: movements.length,
        total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum),
        data: movements,
      });
    }

    const movements = await StockMovement.find(query).sort({ createdAt: -1 }).lean();

    res.json({
      success: true,
      count: movements.length,
      data: movements,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Perform manual stock adjustment (Add, Deduct, Set Balance)
// @route   POST /api/inventory/adjust
// @access  Private (Admin, Manager)
exports.adjustStock = async (req, res, next) => {
  try {
    const { productId, mode, type, quantity, reason } = req.body;

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: 'Product ID is required for stock adjustment.',
      });
    }

    const qty = Number(quantity);
    if (isNaN(qty) || qty < 0) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be a valid non-negative number.',
      });
    }

    const product = await findProduct(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found.',
      });
    }

    const normalizedMode = mode || (
      type === 'reduce' || type === 'deduct' ? 'deduct' :
      type === 'correction' || type === 'set' ? 'set' :
      type === 'add' ? 'add' :
      'add'
    );

    let diff = 0;
    let newBalance = product.quantity;

    if (normalizedMode === 'add') {
      diff = qty;
      newBalance = product.quantity + qty;
    } else if (normalizedMode === 'deduct') {
      diff = -qty;
      newBalance = Math.max(0, product.quantity - qty);
    } else if (normalizedMode === 'set') {
      diff = qty - product.quantity;
      newBalance = qty;
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid adjustment mode. Valid options: "add", "deduct" / "reduce", "set" / "correction".',
      });
    }

    product.quantity = newBalance;
    await product.save();

    const movement = await StockMovement.create({
      productId: product._id,
      type: 'adjustment',
      quantity: diff,
      balanceAfter: newBalance,
      reference: `ADJ-${Date.now().toString().slice(-6)}`,
      reason: reason || `Manual stock adjustment (${mode})`,
      performedBy: req.user ? req.user.name : 'Manager',
    });

    res.json({
      success: true,
      message: `Stock updated for "${product.name}". New quantity: ${newBalance}.`,
      data: {
        product,
        movement,
      },
    });
  } catch (error) {
    next(error);
  }
};
