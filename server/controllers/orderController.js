const Order = require('../models/Order');
const Product = require('../models/Product');
const StockMovement = require('../models/StockMovement');

// @desc    Get all storefront customer orders
// @route   GET /api/orders
// @access  Private / Public (filtered for customers)
exports.getOrders = async (req, res, next) => {
  try {
    const { status, email, customerId, page, limit } = req.query;
    const query = {};

    if (status && status !== 'all') query.status = status;
    if (email) query.customerEmail = email.toLowerCase();
    if (customerId) query.customerId = customerId;

    if (page && limit) {
      const pageNum = parseInt(page, 10) || 1;
      const limitNum = parseInt(limit, 10) || 20;
      const skip = (pageNum - 1) * limitNum;

      const [orders, total] = await Promise.all([
        Order.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
        Order.countDocuments(query),
      ]);

      return res.json({
        success: true,
        count: orders.length,
        total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum),
        data: orders,
      });
    }

    const orders = await Order.find(query).sort({ createdAt: -1 }).lean();

    res.json({
      success: true,
      count: orders.length,
      data: orders,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single order by ID or orderNumber
// @route   GET /api/orders/:id
// @access  Public / Private
exports.getOrderById = async (req, res, next) => {
  try {
    let order = await Order.findById(req.params.id);
    if (!order) {
      order = await Order.findOne({ orderNumber: req.params.id });
    }

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found.',
      });
    }

    res.json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

// @desc    Create storefront customer order
// @route   POST /api/orders
// @access  Public
exports.createOrder = async (req, res, next) => {
  try {
    const {
      customerName,
      customerEmail,
      customerPhone,
      shippingAddress,
      city,
      items,
      subtotal,
      deliveryFee,
      totalAmount,
      paymentMethod,
      notes,
    } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Order must contain at least one item.',
      });
    }

    const normalizedItems = items.map((it) => {
      const quantity = Number(it.quantity) || 1;
      const unitPrice = Number(it.unitPrice !== undefined ? it.unitPrice : (it.price !== undefined ? it.price : it.sellingPrice)) || 0;
      const lineTotal = Number(it.lineTotal !== undefined ? it.lineTotal : (it.total !== undefined ? it.total : quantity * unitPrice)) || 0;
      return {
        productId: it.productId || it.id,
        productName: it.productName || it.name || '',
        quantity,
        unitPrice,
        lineTotal,
      };
    });

    const count = await Order.countDocuments();
    const orderNumber = req.body.orderNumber || `ORD-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const order = await Order.create({
      orderNumber,
      customerName,
      customerEmail: customerEmail.toLowerCase(),
      customerPhone,
      shippingAddress,
      city: city || 'Dhaka',
      items: normalizedItems,
      subtotal: Number(subtotal) || 0,
      deliveryFee: Number(deliveryFee !== undefined ? deliveryFee : req.body.shippingFee) || 60,
      totalAmount: Number(totalAmount) || 0,
      paymentMethod: paymentMethod || 'cod',
      status: 'pending',
      stockDeducted: false,
      notes: notes || '',
    });

    res.status(201).json({
      success: true,
      message: `Order ${orderNumber} placed successfully!`,
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update order status (with single stock deduction policy)
// @route   PUT /api/orders/:id/status
// @access  Private (Admin, Manager)
exports.updateOrderStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found.',
      });
    }

    // Single stock deduction on confirmation
    if (status === 'confirmed' && !order.stockDeducted) {
      for (const item of order.items) {
        const prod = await Product.findById(item.productId);
        if (prod) {
          const newQty = Math.max(0, prod.quantity - Number(item.quantity));
          prod.quantity = newQty;
          await prod.save();

          await StockMovement.create({
            productId: prod._id,
            type: 'sale_out',
            quantity: -Number(item.quantity),
            balanceAfter: newQty,
            reference: order.orderNumber,
            reason: `Online order ${order.orderNumber} confirmed`,
            performedBy: req.user ? req.user.name : 'Admin',
          });
        }
      }
      order.stockDeducted = true;
    }

    // Reversal if cancelled after stock deduction
    if (status === 'cancelled' && order.stockDeducted) {
      for (const item of order.items) {
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
            reference: order.orderNumber,
            reason: `Reversal: Online order ${order.orderNumber} cancelled`,
            performedBy: req.user ? req.user.name : 'Admin',
          });
        }
      }
      order.stockDeducted = false;
    }

    order.status = status;
    await order.save();

    res.json({
      success: true,
      message: `Order ${order.orderNumber} status updated to "${status}".`,
      data: order,
    });
  } catch (error) {
    next(error);
  }
};
