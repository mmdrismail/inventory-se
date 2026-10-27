const Supplier = require('../models/Supplier');
const Purchase = require('../models/Purchase');

// @desc    Get all suppliers
// @route   GET /api/suppliers
// @access  Private (Admin, Manager)
exports.getSuppliers = async (req, res, next) => {
  try {
    const suppliers = await Supplier.find().sort({ name: 1 });
    res.json({
      success: true,
      count: suppliers.length,
      data: suppliers,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single supplier
// @route   GET /api/suppliers/:id
// @access  Private (Admin, Manager)
exports.getSupplierById = async (req, res, next) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found.',
      });
    }
    res.json({ success: true, data: supplier });
  } catch (error) {
    next(error);
  }
};

// @desc    Create supplier
// @route   POST /api/suppliers
// @access  Private (Admin, Manager)
exports.createSupplier = async (req, res, next) => {
  try {
    const supplier = await Supplier.create(req.body);
    res.status(201).json({
      success: true,
      message: 'Supplier created successfully.',
      data: supplier,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update supplier
// @route   PUT /api/suppliers/:id
// @access  Private (Admin, Manager)
exports.updateSupplier = async (req, res, next) => {
  try {
    const updated = await Supplier.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found.',
      });
    }
    res.json({
      success: true,
      message: 'Supplier updated successfully.',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete supplier
// @route   DELETE /api/suppliers/:id
// @access  Private (Admin)
exports.deleteSupplier = async (req, res, next) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found.',
      });
    }

    const hasPurchases = await Purchase.findOne({ supplierId: req.params.id });
    if (hasPurchases) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete supplier "${supplier.name}" because purchase orders are linked to them.`,
      });
    }

    await Supplier.findByIdAndDelete(req.params.id);
    res.json({
      success: true,
      message: `Supplier "${supplier.name}" deleted successfully.`,
    });
  } catch (error) {
    next(error);
  }
};
