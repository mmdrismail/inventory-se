const mongoose = require('mongoose');
const Quotation = require('../models/Quotation');
const Sale = require('../models/Sale');
const Product = require('../models/Product');
const StockMovement = require('../models/StockMovement');
const Customer = require('../models/Customer');

// Safe query helper supporting MongoDB ObjectId, custom String ID, or Quotation Number
const findQuotationQuery = (id) => {
  if (!id) return { _id: null };
  if (mongoose.Types.ObjectId.isValid(id)) {
    return { _id: id };
  }
  return { $or: [{ id: String(id) }, { quotationNumber: String(id) }] };
};

// @desc    Get all quotations
// @route   GET /api/quotations
// @access  Private
exports.getQuotations = async (req, res, next) => {
  try {
    const { status, search, page, limit } = req.query;
    const filter = {};
    if (status && status !== 'all') filter.status = status;
    if (search && String(search).trim()) {
      const safeSearch = String(search).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { quotationNumber: { $regex: safeSearch, $options: 'i' } },
        { customerName: { $regex: safeSearch, $options: 'i' } },
        { customerCompany: { $regex: safeSearch, $options: 'i' } },
        { requisitionRef: { $regex: safeSearch, $options: 'i' } },
      ];
    }

    if (page && limit) {
      const pageNum = parseInt(page, 10) || 1;
      const limitNum = parseInt(limit, 10) || 20;
      const skip = (pageNum - 1) * limitNum;

      const [quotations, total] = await Promise.all([
        Quotation.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
        Quotation.countDocuments(filter),
      ]);

      return res.json({
        success: true,
        count: quotations.length,
        total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum),
        data: quotations,
      });
    }

    const quotations = await Quotation.find(filter).sort({ createdAt: -1 }).lean();
    res.json({
      success: true,
      count: quotations.length,
      data: quotations,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single quotation by ID
// @route   GET /api/quotations/:id
// @access  Private
exports.getQuotationById = async (req, res, next) => {
  try {
    const quotation = await Quotation.findOne(findQuotationQuery(req.params.id));
    if (!quotation) {
      return res.status(404).json({
        success: false,
        message: 'Quotation not found.',
      });
    }
    res.json({ success: true, data: quotation });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new quotation
// @route   POST /api/quotations
// @access  Private
exports.createQuotation = async (req, res, next) => {
  try {
    const {
      customerId,
      customerName,
      customerCompany,
      customerRole,
      customerPhone,
      customerEmail,
      customerAddress,
      requisitionRef,
      items,
      subtotal,
      discount,
      tax,
      totalAmount,
      validUntil,
      termsAndConditions,
      notes,
    } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'A quotation must contain at least one line item.',
      });
    }

    const count = await Quotation.countDocuments();
    const quotationNumber =
      req.body.quotationNumber ||
      `QT-${new Date().getFullYear()}-${String(count + 541).padStart(4, '0')}`;

    const normalizedItems = items.map((it) => {
      const quantity = Number(it.quantity) || 1;
      const unitPrice = Number(it.unitPrice || it.rate || it.price) || 0;
      const lineTotal = Number(it.lineTotal || it.amount || quantity * unitPrice) || 0;
      return {
        productId: it.productId || null,
        name: it.name || it.productName || 'Equipment Part',
        description: it.description || '',
        quantity,
        unit: it.unit || 'pc',
        unitPrice,
        lineTotal,
      };
    });

    const calculatedSubtotal = normalizedItems.reduce((sum, it) => sum + it.lineTotal, 0);
    const calculatedTotal = Number(totalAmount) || calculatedSubtotal - (Number(discount) || 0) + (Number(tax) || 0);

    const quotation = await Quotation.create({
      quotationNumber,
      date: req.body.date ? new Date(req.body.date) : new Date(),
      validUntil: validUntil ? new Date(validUntil) : new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
      requisitionRef: requisitionRef || '',
      customerId: customerId || null,
      customerName: customerName || 'Client Representative',
      customerCompany: customerCompany || '',
      customerRole: customerRole || 'owner',
      customerPhone: customerPhone || '',
      customerEmail: customerEmail || '',
      customerAddress: customerAddress || '',
      items: normalizedItems,
      subtotal: calculatedSubtotal,
      discount: Number(discount) || 0,
      tax: Number(tax) || 0,
      totalAmount: calculatedTotal,
      status: req.body.status || 'draft',
      termsAndConditions: termsAndConditions || '১. সকল মালামাল প্রাপ্যতা সাপেক্ষে সরবরাহ করা হইবে।\n২. কার্যাদেশ প্রাপ্তির ৩ কার্যদিবসের মধ্যে ডেলিভারি সম্পন্ন হইবে।\n৩. এই কোটেশনের মেয়াদ জারির তারিখ হইতে ১৫ দিন পর্যন্ত বৈধ।',
      notes: notes || '',
      preparedBy: req.user ? req.user.name : 'Sales Department',
    });

    res.status(201).json({
      success: true,
      message: `Quotation ${quotationNumber} created successfully.`,
      data: quotation,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update quotation
// @route   PUT /api/quotations/:id
// @access  Private
exports.updateQuotation = async (req, res, next) => {
  try {
    const query = findQuotationQuery(req.params.id);
    const existing = await Quotation.findOne(query);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Quotation not found.',
      });
    }

    const updates = { ...req.body };
    delete updates._id;
    delete updates.__v;
    delete updates.createdAt;
    delete updates.id;

    if (updates.items && Array.isArray(updates.items)) {
      updates.items = updates.items.map((it) => {
        const quantity = Number(it.quantity) || 1;
        const unitPrice = Number(it.unitPrice || it.rate || it.price) || 0;
        const lineTotal = Number(it.lineTotal || it.amount || quantity * unitPrice) || 0;
        return {
          productId: it.productId || null,
          name: it.name || it.productName || 'Equipment Part',
          description: it.description || '',
          quantity,
          unit: it.unit || 'pc',
          unitPrice,
          lineTotal,
        };
      });
    }

    if (
      updates.items !== undefined ||
      updates.discount !== undefined ||
      updates.tax !== undefined ||
      updates.subtotal !== undefined
    ) {
      const effectiveItems = updates.items || existing.items || [];
      const nextSub =
        updates.subtotal !== undefined
          ? Number(updates.subtotal) || 0
          : effectiveItems.reduce((sum, it) => sum + (Number(it.lineTotal) || 0), 0);
      const nextDisc = Math.min(
        nextSub,
        Math.max(0, Number(updates.discount !== undefined ? updates.discount : existing.discount) || 0)
      );
      const nextTax = Math.max(0, Number(updates.tax !== undefined ? updates.tax : existing.tax) || 0);
      updates.subtotal = Math.round(nextSub * 100) / 100;
      updates.discount = Math.round(nextDisc * 100) / 100;
      updates.tax = Math.round(nextTax * 100) / 100;
      updates.totalAmount = Math.round(Math.max(0, nextSub - nextDisc + nextTax) * 100) / 100;
    }

    // Also link & update customer profile in MongoDB if customer info is provided
    const custName = updates.customerName || existing.customerName;
    if (updates.autoSaveCustomer !== false && custName && custName.trim() && custName !== 'Direct Client' && custName !== 'Client Representative') {
      let targetCustomer = null;
      const candId = updates.customerId !== undefined ? updates.customerId : existing.customerId;
      if (candId && mongoose.Types.ObjectId.isValid(candId)) {
        targetCustomer = await Customer.findById(candId);
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

    const updated = await Quotation.findByIdAndUpdate(existing._id, updates, {
      new: true,
      runValidators: true,
    });

    res.json({
      success: true,
      message: 'Quotation updated successfully.',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete quotation
// @route   DELETE /api/quotations/:id
// @access  Private (Admin, Manager)
exports.deleteQuotation = async (req, res, next) => {
  try {
    const quotation = await Quotation.findOne(findQuotationQuery(req.params.id));
    if (!quotation) {
      return res.status(404).json({
        success: false,
        message: 'Quotation not found.',
      });
    }
    await Quotation.findOneAndDelete(findQuotationQuery(req.params.id));
    res.json({
      success: true,
      message: `Quotation ${quotation.quotationNumber} removed successfully.`,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Convert Quotation directly to Sales Invoice
// @route   POST /api/quotations/:id/convert-to-sale
// @access  Private
exports.convertQuotationToSale = async (req, res, next) => {
  try {
    const quotation = await Quotation.findOne(findQuotationQuery(req.params.id));
    if (!quotation) {
      return res.status(404).json({
        success: false,
        message: 'Quotation not found.',
      });
    }

    if (quotation.status === 'converted' && quotation.convertedSaleId) {
      return res.status(400).json({
        success: false,
        message: `This quotation has already been converted to Sale #${quotation.convertedSaleId}.`,
      });
    }

    // Convert items into sales items format
    const salesItems = quotation.items.map((it) => ({
      productId: it.productId || 'custom-item',
      productName: it.name,
      sku: 'QUOTE-ITEM',
      quantity: it.quantity,
      unit: it.unit || 'pc',
      unitPrice: it.unitPrice,
      lineTotal: it.lineTotal,
    }));

    const count = await Sale.countDocuments();
    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const sale = await Sale.create({
      invoiceNumber,
      customerId: quotation.customerId,
      customerName: quotation.customerName,
      customerCompany: quotation.customerCompany,
      customerRole: quotation.customerRole,
      customerPhone: quotation.customerPhone,
      customerAddress: quotation.customerAddress,
      items: salesItems,
      subtotal: quotation.subtotal,
      discount: quotation.discount,
      tax: quotation.tax,
      totalAmount: quotation.totalAmount,
      paidAmount: quotation.totalAmount, // default paid or adjust as needed
      dueAmount: 0,
      paymentMethod: 'cash',
      paymentStatus: 'paid',
      status: 'completed',
      requisitionRef: quotation.requisitionRef || quotation.quotationNumber,
      quotationId: quotation._id,
      cashierName: req.user ? req.user.name : 'Sales Manager',
      notes: `Converted from Quotation #${quotation.quotationNumber}. ${quotation.notes || ''}`.trim(),
    });

    quotation.status = 'converted';
    quotation.convertedSaleId = sale._id;
    await quotation.save();

    // Deduct stock for inventory-linked items and record movements
    for (const it of quotation.items) {
      if (it.productId && it.productId !== 'custom-item') {
        try {
          const prod = await Product.findById(it.productId);
          if (prod) {
            const newQty = Math.max(0, prod.quantity - Number(it.quantity));
            prod.quantity = newQty;
            await prod.save();

            await StockMovement.create({
              productId: prod._id,
              type: 'sale_out',
              quantity: -Number(it.quantity),
              balanceAfter: newQty,
              reference: invoiceNumber,
              reason: `Converted from Quotation #${quotation.quotationNumber}`,
              performedBy: req.user ? req.user.name : 'Sales Manager',
            });
          }
        } catch (prodErr) {
          console.warn('Product stock deduction warning:', prodErr.message);
        }
      }
    }

    // Update Customer Financials if customer exists
    if (quotation.customerId) {
      try {
        const cust = await Customer.findById(quotation.customerId);
        if (cust) {
          cust.totalSales = (cust.totalSales || 0) + Number(quotation.totalAmount);
          cust.totalPaid = (cust.totalPaid || 0) + Number(quotation.totalAmount);
          await cust.save();
        }
      } catch (custErr) {
        console.warn('Customer update on quotation convert warning:', custErr.message);
      }
    }

    res.json({
      success: true,
      message: `Quotation ${quotation.quotationNumber} successfully converted to Sales Invoice #${invoiceNumber}.`,
      data: {
        quotation,
        sale,
      },
    });
  } catch (error) {
    next(error);
  }
};
