const Category = require('../models/Category');
const Product = require('../models/Product');

// @desc    Get all categories
// @route   GET /api/categories
// @access  Public
exports.getCategories = async (req, res, next) => {
  try {
    const categories = await Category.find().sort({ name: 1 });
    res.json({
      success: true,
      count: categories.length,
      data: categories,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a category
// @route   POST /api/categories
// @access  Private (Admin, Manager)
exports.createCategory = async (req, res, next) => {
  try {
    const { name, description, color } = req.body;

    const existing = await Category.findOne({ name: { $regex: `^${name.trim()}$`, $options: 'i' } });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Category "${name}" already exists.`,
      });
    }

    const category = await Category.create({
      name: name.trim(),
      description: description || '',
      color: color || 'emerald',
    });

    res.status(201).json({
      success: true,
      message: 'Category created successfully.',
      data: category,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a category
// @route   PUT /api/categories/:id
// @access  Private (Admin, Manager)
exports.updateCategory = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found.',
      });
    }

    const updated = await Category.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.json({
      success: true,
      message: 'Category updated successfully.',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a category
// @route   DELETE /api/categories/:id
// @access  Private (Admin)
exports.deleteCategory = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found.',
      });
    }

    const hasProducts = await Product.findOne({ categoryId: req.params.id });
    if (hasProducts) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete category "${category.name}" because products are currently assigned to it.`,
      });
    }

    await Category.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: `Category "${category.name}" deleted successfully.`,
    });
  } catch (error) {
    next(error);
  }
};
