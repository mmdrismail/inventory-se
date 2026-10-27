const StockMovement = require('../models/StockMovement');
const Product = require('../models/Product');

// @desc    Get all stock movements (audit log)
// @route   GET /api/inventory/movements
// @access  Private (Admin, Manager)
exports.getMovements = async (req, res, next) => {
  try {
    const { productId, type } = req.query;
    const query = {};

    if (productId) query.productId = productId;
    if (type && type !== 'all') query.type = type;

    const movements = await StockMovement.find(query).sort({ createdAt: -1 });

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
    const { productId, mode, quantity, reason } = req.body;

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

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found.',
      });
    }

    let diff = 0;
    let newBalance = product.quantity;

    if (mode === 'add') {
      diff = qty;
      newBalance = product.quantity + qty;
    } else if (mode === 'deduct') {
      diff = -qty;
      newBalance = Math.max(0, product.quantity - qty);
    } else if (mode === 'set') {
      diff = qty - product.quantity;
      newBalance = qty;
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid adjustment mode. Valid options: "add", "deduct", "set".',
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
