const Category = require('../models/Category');
const Product = require('../models/Product');
const { cleanStr, escapeRegex } = require('../utils/domainNormalizers');
const {
  computeCategoryHierarchyFields,
  cascadeUpdateDescendantCategoryPaths,
  buildCategoryTreeNodes,
} = require('../services/hierarchyService');

// @desc    Get all categories (supports flat list + recursive hierarchical tree)
// @route   GET /api/categories
// @access  Public
exports.getCategories = async (req, res, next) => {
  try {
    const [categories, productCounts] = await Promise.all([
      Category.find().sort({ level: 1, sortOrder: 1, name: 1 }).lean(),
      Product.aggregate([{ $group: { _id: '$categoryId', count: { $sum: 1 } } }]),
    ]);

    const countMap = {};
    for (const row of productCounts) {
      if (row._id) countMap[String(row._id)] = row.count;
    }

    const tree = buildCategoryTreeNodes(categories, countMap);

    res.json({
      success: true,
      count: categories.length,
      data: categories,
      tree,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a category (supports parentId hierarchy)
// @route   POST /api/categories
// @access  Private (Admin, Manager)
exports.createCategory = async (req, res, next) => {
  try {
    const { name, description, color, parentId, sortOrder, status } = req.body;
    const cleanName = cleanStr(name);
    if (!cleanName) {
      return res.status(400).json({ success: false, message: 'Category name is required.' });
    }

    const existing = await Category.findOne({ name: { $regex: `^${escapeRegex(cleanName)}$`, $options: 'i' } });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Category "${cleanName}" already exists.`,
      });
    }

    const hierarchy = await computeCategoryHierarchyFields({
      name: cleanName,
      parentId: parentId || null,
    });

    const category = await Category.create({
      name: cleanName,
      description: description || '',
      color: color || 'emerald',
      sortOrder: Number(sortOrder) || 0,
      status: status || 'active',
      ...hierarchy,
    });

    res.status(201).json({
      success: true,
      message: 'Category created successfully.',
      data: category,
    });
  } catch (error) {
    if (error.statusCode === 400) {
      return res.status(400).json({ success: false, message: error.message });
    }
    next(error);
  }
};

// @desc    Update a category and cascade path/ancestor updates to children
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

    const nextName = req.body.name !== undefined ? cleanStr(req.body.name) : category.name;
    if (!nextName) {
      return res.status(400).json({ success: false, message: 'Category name cannot be empty.' });
    }

    if (nextName.toLowerCase() !== category.name.toLowerCase()) {
      const dup = await Category.findOne({
        _id: { $ne: category._id },
        name: { $regex: `^${escapeRegex(nextName)}$`, $options: 'i' },
      });
      if (dup) {
        return res.status(400).json({
          success: false,
          message: `Category "${nextName}" already exists.`,
        });
      }
    }

    const nextParentId = req.body.parentId !== undefined ? req.body.parentId : category.parentId;
    const hierarchy = await computeCategoryHierarchyFields({
      name: nextName,
      parentId: nextParentId,
      existingId: category._id,
    });

    const updateFields = {
      ...req.body,
      name: nextName,
      ...hierarchy,
    };
    delete updateFields._id;

    const updated = await Category.findByIdAndUpdate(req.params.id, updateFields, {
      new: true,
      runValidators: true,
    });

    await cascadeUpdateDescendantCategoryPaths(updated);

    res.json({
      success: true,
      message: 'Category updated successfully.',
      data: updated,
    });
  } catch (error) {
    if (error.statusCode === 400) {
      return res.status(400).json({ success: false, message: error.message });
    }
    next(error);
  }
};

// @desc    Delete a category (blocks if child categories or assigned products exist)
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

    const hasChildren = await Category.findOne({ parentId: category._id }).select('_id name').lean();
    if (hasChildren) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete "${category.name}" because it has child sub-category "${hasChildren.name}". Move or delete child categories first.`,
      });
    }

    const hasProducts = await Product.findOne({ categoryId: req.params.id }).select('_id').lean();
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
