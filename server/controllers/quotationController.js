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
    const updated = await Quotation.findOneAndUpdate(findQuotationQuery(req.params.id), req.body, {
      new: true,
      runValidators: true,
    });
    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'Quotation not found.',
      });
    }
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
