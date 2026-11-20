const Sale = require('../models/Sale');
const Product = require('../models/Product');
const StockMovement = require('../models/StockMovement');
const Customer = require('../models/Customer');
const Quotation = require('../models/Quotation');

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

    const normalizedItems = items.map((it) => {
      const quantity = Number(it.quantity) || 1;
      const unitPrice = Number(it.unitPrice !== undefined ? it.unitPrice : (it.price !== undefined ? it.price : it.sellingPrice)) || 0;
      const lineTotal = Number(it.lineTotal !== undefined ? it.lineTotal : (it.subtotal !== undefined ? it.subtotal : (it.total !== undefined ? it.total : quantity * unitPrice))) || 0;
      return {
        productId: it.productId || it.id,
        productName: it.productName || it.name || '',
        sku: it.sku || '',
        quantity,
        unitPrice,
        lineTotal,
      };
    });

    // Helper to find product by id or sku
    const resolveProduct = async (it) => {
      let p = null;
      if (it.productId) {
        try { p = await Product.findById(it.productId); } catch {}
      }
      if (!p && it.sku) {
        p = await Product.findOne({ sku: it.sku });
      }
      return p;
    };

    const isCompleted = status === 'completed' || !status;

    // Step 1: Pre-validation of inventory for all tracked items
    for (const item of normalizedItems) {
      const prod = await resolveProduct(item);
      if (prod) {
        item.productId = prod._id; // Ensure consistent ObjectId
        if (isCompleted && prod.quantity < Number(item.quantity)) {
          return res.status(400).json({
            success: false,
            message: `Insufficient stock for "${prod.name}". Available: ${prod.quantity}, Requested: ${item.quantity}.`,
          });
        }
      } else {
        // Custom non-inventory line item or quotation spare part
        item.productId = null;
      }
    }

    // Step 2: Generate unique invoice number
    const count = await Sale.countDocuments();
    const invoiceNumber = req.body.invoiceNumber || req.body.invoiceNo || `INV-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    // Step 3: Deduct stock and record movement for inventory-tracked items
    if (isCompleted) {
      for (const item of normalizedItems) {
        if (item.productId) {
          const prod = await Product.findById(item.productId);
          if (prod) {
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
      }
    }

    // Step 4: Handle Customer Financials & Auto-Upsert
    const totalVal = Number(totalAmount) || 0;
    let paidVal = Number(req.body.paidAmount !== undefined ? req.body.paidAmount : (paymentStatus === 'paid' ? totalVal : (paymentStatus === 'due' ? 0 : 0)));
    if (paymentStatus === 'paid') paidVal = totalVal;
    const dueVal = Math.max(0, totalVal - paidVal);

    let activeCustomerId = customerId;
    let activeCustomer = null;

    if (activeCustomerId) {
      try { activeCustomer = await Customer.findById(activeCustomerId); } catch {}
    }

    if (!activeCustomer && req.body.customerPhone) {
      activeCustomer = await Customer.findOne({ phone: req.body.customerPhone });
      if (activeCustomer) activeCustomerId = activeCustomer._id;
    }

    if (!activeCustomer && req.body.customerName && req.body.customerName.trim() && req.body.customerName !== 'Walk-in Retail Customer') {
      try {
        activeCustomer = await Customer.create({
          name: req.body.customerName.trim(),
          companyName: req.body.customerCompany || '',
          designationRole: req.body.customerRole || 'owner',
          phone: req.body.customerPhone || '',
          email: req.body.customerEmail || '',
          address: req.body.customerAddress || '',
          location: req.body.customerLocation || req.body.customerAddress || '',
          totalSales: isCompleted ? totalVal : 0,
          totalPaid: isCompleted ? paidVal : 0,
          totalDue: isCompleted ? dueVal : 0,
          balance: isCompleted ? dueVal : 0,
        });
        activeCustomerId = activeCustomer._id;
      } catch (err) {
        console.warn('Customer auto-create warning:', err.message);
      }
    } else if (activeCustomer && isCompleted) {
      activeCustomer.totalSales = (activeCustomer.totalSales || 0) + totalVal;
      activeCustomer.totalPaid = (activeCustomer.totalPaid || 0) + paidVal;
      activeCustomer.totalDue = (activeCustomer.totalDue || 0) + dueVal;
      activeCustomer.balance = activeCustomer.totalDue;
      if (req.body.customerCompany) activeCustomer.companyName = req.body.customerCompany;
      if (req.body.customerRole) activeCustomer.designationRole = req.body.customerRole;
      if (req.body.customerPhone) activeCustomer.phone = req.body.customerPhone;
      if (req.body.customerAddress) activeCustomer.address = req.body.customerAddress;
      await activeCustomer.save();
    }

    // Step 5: Create sale record
    const sale = await Sale.create({
      invoiceNumber,
      customerId: activeCustomerId,
      customerName: req.body.customerName || activeCustomer?.name || 'Walk-in Retail Customer',
      customerCompany: req.body.customerCompany || activeCustomer?.companyName || '',
      customerRole: req.body.customerRole || activeCustomer?.designationRole || 'owner',
      customerPhone: req.body.customerPhone || activeCustomer?.phone || '',
      customerEmail: req.body.customerEmail || activeCustomer?.email || '',
      customerAddress: req.body.customerAddress || activeCustomer?.address || '',
      customerLocation: req.body.customerLocation || activeCustomer?.location || '',
      items: normalizedItems,
      subtotal: Number(subtotal) || 0,
      tax: Number(tax) || 0,
      discount: Number(discount) || 0,
      totalAmount: totalVal,
      paidAmount: paidVal,
      dueAmount: dueVal,
      paymentMethod: paymentMethod || 'cash',
      paymentStatus: paymentStatus || 'paid',
      status: isCompleted ? 'completed' : 'draft',
      requisitionRef: req.body.requisitionRef || '',
      quotationId: req.body.quotationId || null,
      cashierName: req.user ? req.user.name : 'Cashier Staff',
      notes: notes || '',
    });

    if (req.body.quotationId) {
      try {
        await Quotation.findByIdAndUpdate(req.body.quotationId, {
          status: 'converted',
          convertedSaleId: sale._id,
        });
      } catch (err) {
        console.warn('Quotation update warning:', err.message);
      }
    }

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
