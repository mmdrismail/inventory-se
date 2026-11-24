const mongoose = require('mongoose');
const Customer = require('../models/Customer');
const Sale = require('../models/Sale');
const Quotation = require('../models/Quotation');

// Safe query helper supporting MongoDB ObjectId or custom String ID
const findCustomerQuery = (id) => {
  if (!id) return { _id: null };
  if (mongoose.Types.ObjectId.isValid(id)) {
    return { _id: id };
  }
  return { $or: [{ id: String(id) }, { clientSideId: String(id) }, { phone: String(id) }] };
};

// Recalculate customer lifetime financials from active sales invoices
const recalculateCustomerFinancials = async (customerId) => {
  if (!customerId) return null;
  try {
    const queryIds = [String(customerId)];
    if (mongoose.Types.ObjectId.isValid(customerId)) {
      queryIds.push(new mongoose.Types.ObjectId(customerId));
    }
    const sales = await Sale.find({
      customerId: { $in: queryIds },
      status: { $ne: 'cancelled' },
    }).lean();

    let totalSales = 0;
    let totalPaid = 0;
    let totalDue = 0;
    for (const s of sales) {
      const tot = Number(s.totalAmount !== undefined ? s.totalAmount : s.total) || 0;
      const paid = Number(s.paidAmount !== undefined ? s.paidAmount : (s.paymentStatus === 'paid' ? tot : 0)) || 0;
      const due = Math.max(0, tot - paid);
      totalSales += tot;
      totalPaid += paid;
      totalDue += due;
    }

    const custQuery = mongoose.Types.ObjectId.isValid(customerId)
      ? { _id: customerId }
      : { $or: [{ id: String(customerId) }, { clientSideId: String(customerId) }] };

    return await Customer.findOneAndUpdate(
      custQuery,
      {
        totalSales: Math.round(totalSales * 100) / 100,
        totalPaid: Math.round(totalPaid * 100) / 100,
        totalDue: Math.round(totalDue * 100) / 100,
        balance: Math.round(totalDue * 100) / 100,
      },
      { new: true }
    );
  } catch (err) {
    console.warn('recalculateCustomerFinancials warning:', err.message);
    return null;
  }
};
exports.recalculateCustomerFinancials = recalculateCustomerFinancials;

// @desc    Get all customers
// @route   GET /api/customers
// @access  Private
exports.getCustomers = async (req, res, next) => {
  try {
    const { search, type, page, limit } = req.query;
    const query = {};

    if (search && String(search).trim()) {
      const safeSearch = String(search).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { name: { $regex: safeSearch, $options: 'i' } },
        { companyName: { $regex: safeSearch, $options: 'i' } },
        { phone: { $regex: safeSearch, $options: 'i' } },
        { email: { $regex: safeSearch, $options: 'i' } },
      ];
    }

    if (type && type !== 'all') {
      query.type = type;
    }

    if (page && limit) {
      const pageNum = parseInt(page, 10) || 1;
      const limitNum = parseInt(limit, 10) || 20;
      const skip = (pageNum - 1) * limitNum;

      const [customers, total] = await Promise.all([
        Customer.find(query).sort({ name: 1 }).skip(skip).limit(limitNum).lean(),
        Customer.countDocuments(query),
      ]);

      return res.json({
        success: true,
        count: customers.length,
        total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum),
        data: customers,
      });
    }

    const customers = await Customer.find(query).sort({ name: 1 }).lean();
    res.json({
      success: true,
      count: customers.length,
      data: customers,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single customer
// @route   GET /api/customers/:id
// @access  Private
exports.getCustomerById = async (req, res, next) => {
  try {
    const customer = await Customer.findOne(findCustomerQuery(req.params.id));
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found.',
      });
    }
    res.json({ success: true, data: customer });
  } catch (error) {
    next(error);
  }
};

// @desc    Create customer
// @route   POST /api/customers
// @access  Private
exports.createCustomer = async (req, res, next) => {
  try {
    const payload = { ...req.body };
    delete payload._id;
    delete payload.__v;
    if (payload.id && !payload.clientSideId) {
      payload.clientSideId = String(payload.id);
    }
    delete payload.id;

    const customer = await Customer.create(payload);
    res.status(201).json({
      success: true,
      message: 'Customer registered successfully.',
      data: customer,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update customer
// @route   PUT /api/customers/:id
// @access  Private
exports.updateCustomer = async (req, res, next) => {
  try {
    const updates = { ...req.body };
    const skipPropagate = Boolean(updates._skipPropagate);
    delete updates._id;
    delete updates.__v;
    delete updates.createdAt;
    delete updates.id;
    delete updates._skipPropagate;

    let target = await Customer.findOne(findCustomerQuery(req.params.id));

    // Fallback lookup by phone or exact case-insensitive name if temp frontend ID (e.g. cust-...) was passed
    if (!target && !mongoose.Types.ObjectId.isValid(req.params.id)) {
      if (updates.phone && String(updates.phone).trim()) {
        target = await Customer.findOne({ phone: String(updates.phone).trim() });
      }
      if (!target && updates.name && String(updates.name).trim()) {
        const escaped = String(updates.name).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        target = await Customer.findOne({ name: new RegExp(`^${escaped}$`, 'i') });
      }
    }

    if (!target) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found.',
      });
    }

    const updated = await Customer.findByIdAndUpdate(target._id, updates, {
      new: true,
      runValidators: true,
    });

    // Propagate updated customer profile fields to linked sales & quotations in MongoDB
    if (updated && !skipPropagate) {
      const custIds = [updated._id, String(updated._id)];
      if (updated.clientSideId) custIds.push(updated.clientSideId);

      const snapshotUpdates = {};
      if (updates.name !== undefined) snapshotUpdates.customerName = updated.name;
      if (updates.companyName !== undefined) snapshotUpdates.customerCompany = updated.companyName;
      if (updates.designationRole !== undefined) snapshotUpdates.customerRole = updated.designationRole;
      if (updates.phone !== undefined) snapshotUpdates.customerPhone = updated.phone;
      if (updates.email !== undefined) snapshotUpdates.customerEmail = updated.email;
      if (updates.address !== undefined) snapshotUpdates.customerAddress = updated.address;
      if (updates.location !== undefined) snapshotUpdates.customerLocation = updated.location;

      if (Object.keys(snapshotUpdates).length > 0) {
        await Promise.allSettled([
          Sale.updateMany({ customerId: { $in: custIds } }, { $set: snapshotUpdates }),
          Quotation.updateMany({ customerId: { $in: custIds } }, { $set: snapshotUpdates }),
        ]);
      }
    }

    res.json({
      success: true,
      message: 'Customer updated successfully.',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete customer
// @route   DELETE /api/customers/:id
// @access  Private (Admin)
exports.deleteCustomer = async (req, res, next) => {
  try {
    const customer = await Customer.findOne(findCustomerQuery(req.params.id));
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found.',
      });
    }

    const hasSales = await Sale.findOne({ $or: [{ customerId: customer._id }, { customerId: customer.id }] });
    if (hasSales) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete customer "${customer.name}" because sales invoices are recorded under this account.`,
      });
    }

    await Customer.findOneAndDelete(findCustomerQuery(req.params.id));
    res.json({
      success: true,
      message: `Customer "${customer.name}" deleted successfully.`,
    });
  } catch (error) {
    next(error);
  }
};
