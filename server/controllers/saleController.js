const mongoose = require('mongoose');
const Sale = require('../models/Sale');
const Product = require('../models/Product');
const StockMovement = require('../models/StockMovement');
const Customer = require('../models/Customer');
const Quotation = require('../models/Quotation');
const { recalculateCustomerFinancials } = require('./customerController');

// Safe query helper supporting MongoDB ObjectId, custom String ID, or Invoice Number
const findSaleQuery = (id) => {
  if (!id) return { _id: null };
  if (mongoose.Types.ObjectId.isValid(id)) {
    return { _id: id };
  }
  return { $or: [{ id: String(id) }, { invoiceNumber: String(id) }, { invoiceNo: String(id) }] };
};

// @desc    Get all sales invoices
// @route   GET /api/sales
// @access  Private
exports.getSales = async (req, res, next) => {
  try {
    const { customerId, status, paymentStatus, search, page, limit, startDate, endDate } = req.query;
    const query = {};

    if (customerId) query.customerId = customerId;
    if (status && status !== 'all') query.status = status;
    if (paymentStatus && paymentStatus !== 'all') query.paymentStatus = paymentStatus;

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    if (search && String(search).trim()) {
      const safeSearch = String(search).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { invoiceNumber: { $regex: safeSearch, $options: 'i' } },
        { customerName: { $regex: safeSearch, $options: 'i' } },
        { customerPhone: { $regex: safeSearch, $options: 'i' } },
      ];
    }

    if (page && limit) {
      const pageNum = parseInt(page, 10) || 1;
      const limitNum = parseInt(limit, 10) || 20;
      const skip = (pageNum - 1) * limitNum;

      const [sales, total] = await Promise.all([
        Sale.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
        Sale.countDocuments(query),
      ]);

      return res.json({
        success: true,
        count: sales.length,
        total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum),
        data: sales,
      });
    }

    const sales = await Sale.find(query).sort({ createdAt: -1 }).lean();
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
    const sale = await Sale.findOne(findSaleQuery(req.params.id));
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
    } else if (activeCustomer) {
      if (req.body.customerCompany !== undefined && req.body.customerCompany.trim()) activeCustomer.companyName = req.body.customerCompany.trim();
      if (req.body.customerRole) activeCustomer.designationRole = req.body.customerRole;
      if (req.body.customerPhone !== undefined && req.body.customerPhone.trim()) activeCustomer.phone = req.body.customerPhone.trim();
      if (req.body.customerEmail !== undefined && req.body.customerEmail.trim()) activeCustomer.email = req.body.customerEmail.trim();
      if (req.body.customerAddress !== undefined && req.body.customerAddress.trim()) activeCustomer.address = req.body.customerAddress.trim();
      if (req.body.customerLocation !== undefined && req.body.customerLocation.trim()) activeCustomer.location = req.body.customerLocation.trim();
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

    if (activeCustomerId) {
      await recalculateCustomerFinancials(activeCustomerId);
    }

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

// @desc    Update sale invoice
// @route   PUT /api/sales/:id
// @access  Private (Admin, Manager, Staff)
exports.updateSale = async (req, res, next) => {
  try {
    const saleQuery = findSaleQuery(req.params.id);
    const sale = await Sale.findOne(saleQuery);
    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Sale invoice not found.',
      });
    }

    const prevCustomerId = sale.customerId;
    const updates = { ...req.body };
    delete updates._id;
    delete updates.__v;
    delete updates.createdAt;
    delete updates.id;

    if (updates.items && Array.isArray(updates.items)) {
      updates.items = updates.items.map((it) => {
        const quantity = Number(it.quantity) || 1;
        const unitPrice = Number(it.unitPrice !== undefined ? it.unitPrice : (it.price !== undefined ? it.price : it.sellingPrice)) || 0;
        const lineTotal = Number(it.lineTotal !== undefined ? it.lineTotal : (it.subtotal !== undefined ? it.subtotal : (it.total !== undefined ? it.total : quantity * unitPrice))) || 0;
        return {
          productId: it.productId || it.id || null,
          productName: it.productName || it.name || '',
          sku: it.sku || '',
          quantity,
          unitPrice,
          lineTotal,
        };
      });
    }

    // Auto-recalculate financial balances if totals are updated
    if (updates.totalAmount !== undefined || updates.total !== undefined) {
      const tot = Number(updates.totalAmount !== undefined ? updates.totalAmount : updates.total) || 0;
      const paid = Number(updates.paidAmount !== undefined ? updates.paidAmount : sale.paidAmount) || 0;
      updates.totalAmount = tot;
      updates.total = tot;
      updates.dueAmount = Math.max(0, tot - paid);
    }

    // Resolve and update linked Customer profile directly on backend as well
    const custName = updates.customerName || sale.customerName;
    if (updates.autoSaveCustomer !== false && custName && custName.trim() && custName !== 'Walk-in Retail Customer') {
      let targetCustomer = null;
      const candidateCustId = updates.customerId !== undefined ? updates.customerId : sale.customerId;
      if (candidateCustId && mongoose.Types.ObjectId.isValid(candidateCustId)) {
        targetCustomer = await Customer.findById(candidateCustId);
      }
      if (!targetCustomer && updates.customerPhone && updates.customerPhone.trim()) {
        targetCustomer = await Customer.findOne({ phone: updates.customerPhone.trim() });
      }
      if (!targetCustomer) {
        const escapedName = custName.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        targetCustomer = await Customer.findOne({ name: new RegExp(`^${escapedName}$`, 'i') });
      }

      if (targetCustomer) {
        if (updates.customerName !== undefined) targetCustomer.name = updates.customerName.trim();
        if (updates.customerCompany !== undefined) targetCustomer.companyName = updates.customerCompany.trim();
        if (updates.customerRole !== undefined) targetCustomer.designationRole = updates.customerRole;
        if (updates.customerPhone !== undefined) targetCustomer.phone = updates.customerPhone.trim();
        if (updates.customerEmail !== undefined) targetCustomer.email = updates.customerEmail.trim();
        if (updates.customerAddress !== undefined) targetCustomer.address = updates.customerAddress.trim();
        if (updates.customerLocation !== undefined) targetCustomer.location = updates.customerLocation.trim();
        await targetCustomer.save();
        updates.customerId = targetCustomer._id;
      }
    }

    const updated = await Sale.findOneAndUpdate(saleQuery, updates, {
      new: true,
      runValidators: true,
    });

    // Recalculate financials for previous and current linked customer
    if (prevCustomerId && String(prevCustomerId) !== String(updated.customerId)) {
      await recalculateCustomerFinancials(prevCustomerId);
    }
    if (updated.customerId) {
      await recalculateCustomerFinancials(updated.customerId);
    }

    res.json({
      success: true,
      message: `Sale invoice ${updated.invoiceNumber} updated successfully.`,
      data: updated,
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
    const saleQuery = findSaleQuery(req.params.id);
    const sale = await Sale.findOne(saleQuery);
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
        if (!item.productId || !mongoose.Types.ObjectId.isValid(item.productId)) continue;
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

    if (sale.customerId) {
      await recalculateCustomerFinancials(sale.customerId);
    }

    res.json({
      success: true,
      message: `Sale invoice ${sale.invoiceNumber} has been cancelled and stock restored.`,
      data: sale,
    });
  } catch (error) {
    next(error);
  }
};
