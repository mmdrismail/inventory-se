const mongoose = require('mongoose');
const MoneyReceipt = require('../models/MoneyReceipt');
const Customer = require('../models/Customer');
const Sale = require('../models/Sale');
const { recalculateCustomerFinancials } = require('./customerController');

const findReceiptQuery = (id) => {
  if (!id) return { _id: null };
  if (mongoose.Types.ObjectId.isValid(id)) {
    return { _id: id };
  }
  return { $or: [{ id: String(id) }, { receiptNumber: String(id) }] };
};

const applyReceiptDeltaToSale = async (saleIdOrInv, deltaAmount) => {
  if (!saleIdOrInv || !deltaAmount) return null;
  const query = mongoose.Types.ObjectId.isValid(saleIdOrInv)
    ? { _id: saleIdOrInv }
    : { $or: [{ invoiceNumber: String(saleIdOrInv) }, { invoiceNo: String(saleIdOrInv) }] };
  const sale = await Sale.findOne(query);
  if (!sale) return null;

  const totalVal = Math.max(0, Number(sale.totalAmount !== undefined ? sale.totalAmount : sale.total) || 0);
  const currentPaid =
    sale.paymentStatus === 'paid'
      ? totalVal
      : sale.paymentStatus === 'due'
      ? 0
      : Math.max(0, Number(sale.paidAmount) || 0);

  const nextPaid = Math.min(totalVal, Math.max(0, Math.round((currentPaid + deltaAmount) * 100) / 100));
  const nextDue = Math.max(0, Math.round((totalVal - nextPaid) * 100) / 100);
  const nextStatus = nextDue <= 0.005 ? 'paid' : nextPaid > 0 ? 'partial' : 'due';

  sale.paidAmount = nextPaid;
  sale.dueAmount = nextDue;
  sale.paymentStatus = nextStatus;
  await sale.save();
  return sale;
};

const resolveOrUpsertCustomer = async (body = {}) => {
  let activeCustomer = null;
  let activeCustomerId = body.customerId || null;

  if (activeCustomerId && mongoose.Types.ObjectId.isValid(activeCustomerId)) {
    activeCustomer = await Customer.findById(activeCustomerId);
  }
  if (!activeCustomer && body.customerPhone && String(body.customerPhone).trim()) {
    activeCustomer = await Customer.findOne({ phone: String(body.customerPhone).trim() });
    if (activeCustomer) activeCustomerId = activeCustomer._id;
  }
  const custName = (body.customerName || '').trim();
  if (!activeCustomer && custName && !/^(direct client|walk-in)/i.test(custName)) {
    const escaped = custName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    activeCustomer = await Customer.findOne({ name: new RegExp(`^${escaped}$`, 'i') });
    if (activeCustomer) activeCustomerId = activeCustomer._id;
  }

  if (!activeCustomer && custName && !/^(direct client|walk-in)/i.test(custName)) {
    activeCustomer = await Customer.create({
      name: custName,
      companyName: (body.customerCompany || '').trim(),
      designationRole: body.customerRole || 'owner',
      phone: (body.customerPhone || '').trim(),
      email: (body.customerEmail || '').trim(),
      address: (body.customerAddress || '').trim(),
      location: (body.customerAddress || '').trim(),
    });
    activeCustomerId = activeCustomer._id;
  } else if (activeCustomer && body.autoSaveCustomer !== false) {
    if (body.customerCompany && body.customerCompany.trim()) activeCustomer.companyName = body.customerCompany.trim();
    if (body.customerPhone && body.customerPhone.trim()) activeCustomer.phone = body.customerPhone.trim();
    if (body.customerEmail && body.customerEmail.trim()) activeCustomer.email = body.customerEmail.trim();
    if (body.customerAddress && body.customerAddress.trim()) activeCustomer.address = body.customerAddress.trim();
    await activeCustomer.save();
  }

  return { activeCustomer, activeCustomerId };
};

// @desc    Get all money receipts
// @route   GET /api/money-receipts
// @access  Private
exports.getMoneyReceipts = async (req, res, next) => {
  try {
    const { customerId, entrySource, status, search } = req.query;
    const filter = {};
    if (customerId) filter.customerId = customerId;
    if (entrySource && entrySource !== 'all') filter.entrySource = entrySource;
    if (status && status !== 'all') filter.status = status;

    if (search && String(search).trim()) {
      const safeSearch = String(search).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { receiptNumber: { $regex: safeSearch, $options: 'i' } },
        { manualSerialNo: { $regex: safeSearch, $options: 'i' } },
        { bookNumber: { $regex: safeSearch, $options: 'i' } },
        { customerName: { $regex: safeSearch, $options: 'i' } },
        { customerPhone: { $regex: safeSearch, $options: 'i' } },
        { linkedInvoiceNo: { $regex: safeSearch, $options: 'i' } },
      ];
    }

    const receipts = await MoneyReceipt.find(filter).sort({ date: -1, createdAt: -1 }).lean();
    res.json({ success: true, count: receipts.length, data: receipts });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single money receipt
// @route   GET /api/money-receipts/:id
// @access  Private
exports.getMoneyReceiptById = async (req, res, next) => {
  try {
    const receipt = await MoneyReceipt.findOne(findReceiptQuery(req.params.id));
    if (!receipt) {
      return res.status(404).json({ success: false, message: 'Money receipt not found.' });
    }
    res.json({ success: true, data: receipt });
  } catch (error) {
    next(error);
  }
};

// @desc    Create money receipt (updates linked Sale if specified & customer balance)
// @route   POST /api/money-receipts
// @access  Private
exports.createMoneyReceipt = async (req, res, next) => {
  try {
    const amountNum = Number(req.body.amount);
    if (!amountNum || amountNum <= 0) {
      return res.status(400).json({ success: false, message: 'Receipt amount must be greater than zero.' });
    }

    const { activeCustomer, activeCustomerId } = await resolveOrUpsertCustomer(req.body);

    const count = await MoneyReceipt.countDocuments();
    let receiptNumber = (req.body.receiptNumber || '').trim();
    if (!receiptNumber) {
      receiptNumber = `MR-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
    }

    const duplicate = await MoneyReceipt.findOne({ receiptNumber });
    if (duplicate) {
      receiptNumber = `${receiptNumber}-${Math.floor(100 + Math.random() * 900)}`;
    }

    const receiptStatus = req.body.status === 'cancelled' ? 'cancelled' : 'active';
    let linkedSaleObj = null;
    if (receiptStatus === 'active' && req.body.linkedSaleId) {
      linkedSaleObj = await applyReceiptDeltaToSale(req.body.linkedSaleId, amountNum);
    }

    const receipt = await MoneyReceipt.create({
      receiptNumber,
      date: req.body.date ? new Date(req.body.date) : new Date(),
      entrySource: req.body.entrySource || 'khata',
      bookNumber: req.body.bookNumber || '',
      manualSerialNo: req.body.manualSerialNo || '',
      customerId: activeCustomerId,
      customerName: req.body.customerName || activeCustomer?.name || 'Direct Client',
      customerCompany: req.body.customerCompany || activeCustomer?.companyName || '',
      customerRole: req.body.customerRole || activeCustomer?.designationRole || 'owner',
      customerPhone: req.body.customerPhone || activeCustomer?.phone || '',
      customerEmail: req.body.customerEmail || activeCustomer?.email || '',
      customerAddress: req.body.customerAddress || activeCustomer?.address || '',
      linkedSaleId: linkedSaleObj?._id || req.body.linkedSaleId || null,
      linkedInvoiceNo: req.body.linkedInvoiceNo || linkedSaleObj?.invoiceNumber || '',
      purpose: req.body.purpose || 'বকেয়া পরিশোধ / বিল জমা (Bill Payment)',
      amount: Math.round(amountNum * 100) / 100,
      paymentMethod: req.body.paymentMethod || 'cash',
      chequeOrRefNo: req.body.chequeOrRefNo || '',
      status: receiptStatus,
      notes: req.body.notes || '',
      receivedBy: req.body.receivedBy || req.user?.name || 'Accounts',
    });

    if (activeCustomerId) {
      await recalculateCustomerFinancials(activeCustomerId);
    }

    res.status(201).json({
      success: true,
      message: `Money Receipt ${receiptNumber} recorded successfully.`,
      data: receipt,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update money receipt
// @route   PUT /api/money-receipts/:id
// @access  Private
exports.updateMoneyReceipt = async (req, res, next) => {
  try {
    const existing = await MoneyReceipt.findOne(findReceiptQuery(req.params.id));
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Money receipt not found.' });
    }

    const updates = { ...req.body };
    delete updates._id;
    delete updates.__v;
    delete updates.createdAt;
    delete updates.id;

    if (updates.date) updates.date = new Date(updates.date);
    if (updates.amount !== undefined) updates.amount = Math.max(0.01, Number(updates.amount) || existing.amount);

    // Reconcile linked Sale payment delta if linkedSaleId, amount, or status changed
    const wasActive = existing.status !== 'cancelled';
    const nextStatus = updates.status || existing.status;
    const willBeActive = nextStatus !== 'cancelled';
    const nextAmount = updates.amount !== undefined ? Number(updates.amount) : Number(existing.amount);
    const nextLinkedSaleId = updates.linkedSaleId !== undefined ? updates.linkedSaleId : existing.linkedSaleId;

    if (wasActive && existing.linkedSaleId) {
      await applyReceiptDeltaToSale(existing.linkedSaleId, -Number(existing.amount));
    }
    if (willBeActive && nextLinkedSaleId) {
      const linked = await applyReceiptDeltaToSale(nextLinkedSaleId, nextAmount);
      if (linked && !updates.linkedInvoiceNo) {
        updates.linkedInvoiceNo = linked.invoiceNumber;
      }
    }

    const prevCustId = existing.customerId;
    const updated = await MoneyReceipt.findByIdAndUpdate(existing._id, updates, {
      new: true,
      runValidators: true,
    });

    if (prevCustId && String(prevCustId) !== String(updated.customerId)) {
      await recalculateCustomerFinancials(prevCustId);
    }
    if (updated.customerId) {
      await recalculateCustomerFinancials(updated.customerId);
    }

    res.json({
      success: true,
      message: `Money Receipt ${updated.receiptNumber} updated.`,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete money receipt
// @route   DELETE /api/money-receipts/:id
// @access  Private
exports.deleteMoneyReceipt = async (req, res, next) => {
  try {
    const receipt = await MoneyReceipt.findOne(findReceiptQuery(req.params.id));
    if (!receipt) {
      return res.status(404).json({ success: false, message: 'Money receipt not found.' });
    }

    if (receipt.status !== 'cancelled' && receipt.linkedSaleId) {
      await applyReceiptDeltaToSale(receipt.linkedSaleId, -Number(receipt.amount));
    }

    await MoneyReceipt.findByIdAndDelete(receipt._id);

    if (receipt.customerId) {
      await recalculateCustomerFinancials(receipt.customerId);
    }

    res.json({
      success: true,
      message: `Money Receipt ${receipt.receiptNumber} deleted.`,
    });
  } catch (error) {
    next(error);
  }
};
