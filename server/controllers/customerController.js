const mongoose = require('mongoose');
const Customer = require('../models/Customer');
const Sale = require('../models/Sale');

// Safe query helper supporting MongoDB ObjectId or custom String ID
const findCustomerQuery = (id) => {
  if (!id) return { _id: null };
  if (mongoose.Types.ObjectId.isValid(id)) {
    return { _id: id };
  }
  return { $or: [{ id: String(id) }, { phone: String(id) }] };
};

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
    const customer = await Customer.create(req.body);
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
    const updated = await Customer.findOneAndUpdate(findCustomerQuery(req.params.id), req.body, {
      new: true,
      runValidators: true,
    });
    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found.',
      });
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
