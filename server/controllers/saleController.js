const Sale = require('../models/Sale');
const Product = require('../models/Product');
const StockMovement = require('../models/StockMovement');

// @desc    Get all sales invoices
// @route   GET /api/sales
// @access  Private
exports.getSales = async (req, res, next) => {
  try {
    const sales = await Sale.find().sort({ createdAt: -1 });
    res.json({
      success: true,
      count: sales.length,
      data: sales,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single sale invoice by ID
// @route   GET /api/sales/:id
// @access  Private
exports.getSaleById = async (req, res, next) => {
  try {
    const sale = await Sale.findById(req.params.id);
    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Sale invoice not found.',
      });
    }
    res.json({ success: true, data: sale });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new sale invoice (Atomic stock deduction & validation)
// @route   POST /api/sales
// @access  Private (Admin, Manager, Staff)
exports.createSale = async (req, res, next) => {
  try {
    const {
      customerId,
      items,
      subtotal,
      tax,
      discount,
      totalAmount,
      paymentMethod,
      paymentStatus,
      status,
      notes,
    } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'A sale invoice must contain at least one line item.',
      });
    }

    // Step 1: Pre-validation of inventory for all items
    for (const item of items) {
      const prod = await Product.findById(item.productId);
      if (!prod) {
        return res.status(400).json({
          success: false,
          message: `Product with ID "${item.productId}" does not exist in inventory.`,
        });
      }
      if (prod.quantity < Number(item.quantity)) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for "${prod.name}". Available: ${prod.quantity}, Requested: ${item.quantity}.`,
        });
      }
    }

    // Step 2: Generate unique invoice number
    const count = await Sale.countDocuments();
    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const isCompleted = status === 'completed' || !status;

    // Step 3: Deduct stock and record movement if completed
    if (isCompleted) {
      for (const item of items) {
        const prod = await Product.findById(item.productId);
        const newQty = prod.quantity - Number(item.quantity);
        prod.quantity = newQty;
        await prod.save();

        await StockMovement.create({
          productId: prod._id,
          type: 'sale_out',
          quantity: -Number(item.quantity),
          balanceAfter: newQty,
          reference: invoiceNumber,
          reason: `POS sale completed for invoice ${invoiceNumber}`,
          performedBy: req.user ? req.user.name : 'Cashier',
        });
      }
    }

    // Step 4: Create sale record
    const sale = await Sale.create({
      invoiceNumber,
      customerId,
      items,
      subtotal: Number(subtotal) || 0,
      tax: Number(tax) || 0,
      discount: Number(discount) || 0,
      totalAmount: Number(totalAmount) || 0,
      paymentMethod: paymentMethod || 'cash',
      paymentStatus: paymentStatus || 'paid',
      status: isCompleted ? 'completed' : 'draft',
      cashierName: req.user ? req.user.name : 'Cashier Staff',
      notes: notes || '',
    });

    res.status(201).json({
      success: true,
      message: `Sale invoice ${invoiceNumber} created successfully.`,
      data: sale,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel a sale invoice (Restores deducted stock)
// @route   PUT /api/sales/:id/cancel
// @access  Private (Admin, Manager)
exports.cancelSale = async (req, res, next) => {
  try {
    const sale = await Sale.findById(req.params.id);
    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Sale invoice not found.',
      });
    }

    if (sale.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'This sale invoice is already cancelled.',
      });
    }

    // If sale was completed, restore stock
    if (sale.status === 'completed') {
      for (const item of sale.items) {
        const prod = await Product.findById(item.productId);
        if (prod) {
          const newQty = prod.quantity + Number(item.quantity);
          prod.quantity = newQty;
          await prod.save();

          await StockMovement.create({
            productId: prod._id,
            type: 'reversal',
            quantity: Number(item.quantity),
            balanceAfter: newQty,
            reference: sale.invoiceNumber,
            reason: `Reversal: Sale invoice ${sale.invoiceNumber} cancelled`,
            performedBy: req.user ? req.user.name : 'Manager',
          });
        }
      }
    }

    sale.status = 'cancelled';
    await sale.save();

    res.json({
      success: true,
      message: `Sale invoice ${sale.invoiceNumber} has been cancelled and stock restored.`,
      data: sale,
    });
  } catch (error) {
    next(error);
  }
};
