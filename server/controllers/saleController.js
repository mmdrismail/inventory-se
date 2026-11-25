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
        unit: it.unit || 'pc',
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
    const computedSubtotal =
      subtotal !== undefined
        ? Number(subtotal) || 0
        : normalizedItems.reduce((sum, it) => sum + (Number(it.lineTotal) || 0), 0);
    const discountVal = Math.min(computedSubtotal, Math.max(0, Number(discount) || 0));
    const taxVal = Math.max(0, Number(tax) || 0);
    const explicitTotal =
      totalAmount !== undefined ? totalAmount : req.body.total !== undefined ? req.body.total : undefined;
    const totalVal =
      explicitTotal !== undefined
        ? Math.max(0, Number(explicitTotal) || 0)
        : Math.max(0, computedSubtotal - discountVal + taxVal);
    const nextPayStatus = ['paid', 'partial', 'due', 'pending'].includes(paymentStatus)
      ? paymentStatus
      : 'paid';
    let paidVal =
      nextPayStatus === 'paid'
        ? totalVal
        : nextPayStatus === 'due'
        ? 0
        : Math.min(totalVal, Math.max(0, Number(req.body.paidAmount) || 0));
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
      subtotal: computedSubtotal,
      tax: taxVal,
      discount: discountVal,
      totalAmount: totalVal,
      total: totalVal,
      paidAmount: paidVal,
      dueAmount: dueVal,
      paymentMethod: paymentMethod || 'cash',
      paymentStatus: nextPayStatus,
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
    const prevQuotationId = sale.quotationId;
    const updates = { ...req.body };
    delete updates._id;
    delete updates.__v;
    delete updates.createdAt;
    delete updates.id;

    if (updates.invoiceNo && !updates.invoiceNumber) {
      updates.invoiceNumber = String(updates.invoiceNo).trim();
    }

    if (updates.items && Array.isArray(updates.items)) {
      const resolvedItems = [];
      for (const it of updates.items) {
        const quantity = Number(it.quantity) || 1;
        const unitPrice = Number(it.unitPrice !== undefined ? it.unitPrice : (it.price !== undefined ? it.price : it.sellingPrice)) || 0;
        const lineTotal = Number(it.lineTotal !== undefined ? it.lineTotal : (it.subtotal !== undefined ? it.subtotal : (it.total !== undefined ? it.total : quantity * unitPrice))) || 0;
        let resolvedProdId = null;
        if (it.productId && mongoose.Types.ObjectId.isValid(it.productId)) {
          const prodDoc = await Product.findById(it.productId).select('_id').lean();
          if (prodDoc) resolvedProdId = prodDoc._id;
        } else if (it.sku) {
          const prodDoc = await Product.findOne({ sku: it.sku }).select('_id').lean();
          if (prodDoc) resolvedProdId = prodDoc._id;
        }
        resolvedItems.push({
          productId: resolvedProdId,
          productName: it.productName || it.name || '',
          sku: it.sku || '',
          quantity,
          unit: it.unit || 'pc',
          unitPrice,
          lineTotal,
        });
      }
      updates.items = resolvedItems;
    }

    // Reconcile tracked Product stock when completed status/quantities change
    const nextStatus = updates.status || sale.status || 'completed';
    const nextItemsForStock = updates.items || sale.items || [];
    const buildTrackedQtyMap = (statusVal, itemList) => {
      const map = new Map();
      if (statusVal !== 'completed') return map;
      for (const it of itemList || []) {
        if (!it.productId || !mongoose.Types.ObjectId.isValid(it.productId)) continue;
        const k = String(it.productId);
        map.set(k, (map.get(k) || 0) + (Number(it.quantity) || 0));
      }
      return map;
    };
    const oldStockMap = buildTrackedQtyMap(sale.status, sale.items);
    const newStockMap = buildTrackedQtyMap(nextStatus, nextItemsForStock);
    const allProdIds = new Set([...oldStockMap.keys(), ...newStockMap.keys()]);

    for (const pid of allProdIds) {
      const delta = (newStockMap.get(pid) || 0) - (oldStockMap.get(pid) || 0);
      if (delta > 0) {
        const prod = await Product.findById(pid);
        if (prod && prod.quantity < delta) {
          return res.status(400).json({
            success: false,
            message: `Insufficient stock for "${prod.name}". Additional needed: ${delta}, Available: ${prod.quantity}.`,
          });
        }
      }
    }
    for (const pid of allProdIds) {
      const delta = (newStockMap.get(pid) || 0) - (oldStockMap.get(pid) || 0);
      if (delta === 0) continue;
      const prod = await Product.findById(pid);
      if (!prod) continue;
      prod.quantity = Math.max(0, prod.quantity - delta);
      await prod.save();
      await StockMovement.create({
        productId: prod._id,
        type: delta > 0 ? 'sale_out' : 'reversal',
        quantity: -delta,
        balanceAfter: prod.quantity,
        reference: updates.invoiceNumber || sale.invoiceNumber,
        reason: `Invoice edit stock adjustment (${updates.invoiceNumber || sale.invoiceNumber})`,
        performedBy: req.user ? req.user.name : 'Manager',
      });
    }

    // Always keep subtotal, discount, tax, totalAmount, paidAmount, dueAmount, paymentStatus in sync
    const effectiveItems = updates.items || sale.items || [];
    const nextSubtotal =
      updates.subtotal !== undefined
        ? Number(updates.subtotal) || 0
        : effectiveItems.reduce((sum, it) => sum + (Number(it.lineTotal ?? it.quantity * it.unitPrice) || 0), 0);
    const nextDiscount = Math.min(
      nextSubtotal,
      Math.max(0, Number(updates.discount !== undefined ? updates.discount : sale.discount) || 0)
    );
    const nextTax = Math.max(0, Number(updates.tax !== undefined ? updates.tax : sale.tax) || 0);
    const nextTotal = Math.max(0, nextSubtotal - nextDiscount + nextTax);

    const nextPaymentStatus = updates.paymentStatus || sale.paymentStatus || 'paid';
    let nextPaid = nextTotal;
    if (nextPaymentStatus === 'due') {
      nextPaid = 0;
    } else if (nextPaymentStatus === 'partial') {
      nextPaid = Math.min(
        nextTotal,
        Math.max(0, Number(updates.paidAmount !== undefined ? updates.paidAmount : sale.paidAmount) || 0)
      );
    }
    const nextDue = Math.max(0, nextTotal - nextPaid);

    updates.subtotal = Math.round(nextSubtotal * 100) / 100;
    updates.discount = Math.round(nextDiscount * 100) / 100;
    updates.tax = Math.round(nextTax * 100) / 100;
    updates.totalAmount = Math.round(nextTotal * 100) / 100;
    updates.total = updates.totalAmount;
    updates.paymentStatus = nextPaymentStatus;
    updates.paidAmount = Math.round(nextPaid * 100) / 100;
    updates.dueAmount = Math.round(nextDue * 100) / 100;

    // Resolve and update/create linked Customer profile directly on backend as well
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
      } else {
        targetCustomer = await Customer.create({
          name: custName.trim(),
          companyName: (updates.customerCompany || '').trim(),
          designationRole: updates.customerRole || 'owner',
          phone: (updates.customerPhone || '').trim(),
          email: (updates.customerEmail || '').trim(),
          address: (updates.customerAddress || '').trim(),
          location: (updates.customerLocation || updates.customerAddress || '').trim(),
        });
        updates.customerId = targetCustomer._id;
      }
    }

    const updated = await Sale.findOneAndUpdate(saleQuery, updates, {
      new: true,
      runValidators: true,
    });

    // Sync linked Quotation hierarchy if quotationId is linked/changed
    if (prevQuotationId && String(prevQuotationId) !== String(updated.quotationId) && mongoose.Types.ObjectId.isValid(prevQuotationId)) {
      await Quotation.findOneAndUpdate(
        { _id: prevQuotationId, convertedSaleId: updated._id },
        { $set: { convertedSaleId: null } }
      ).catch(() => {});
    }
    if (updated.quotationId && mongoose.Types.ObjectId.isValid(updated.quotationId)) {
      await Quotation.findByIdAndUpdate(updated.quotationId, {
        status: 'converted',
        convertedSaleId: updated._id,
      }).catch(() => {});
    }

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
