const mongoose = require('mongoose');
const Product = require('../models/Product');
const Sale = require('../models/Sale');
const Purchase = require('../models/Purchase');
const Order = require('../models/Order');
const StockMovement = require('../models/StockMovement');

// Safe lookup helper supporting MongoDB ObjectId or SKU
const findProduct = async (idOrSku) => {
  if (!idOrSku) return null;
  if (mongoose.Types.ObjectId.isValid(idOrSku)) {
    const byId = await Product.findById(idOrSku);
    if (byId) return byId;
  }
  return await Product.findOne({ sku: String(idOrSku).toUpperCase().trim() });
};

// @desc    Get all products with filtering & search
// @route   GET /api/products
// @access  Public
exports.getProducts = async (req, res, next) => {
  try {
    const { search, category, status, stockStatus, isPublic } = req.query;
    const query = {};

    if (search && String(search).trim()) {
      const safeSearch = String(search).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { name: { $regex: safeSearch, $options: 'i' } },
        { sku: { $regex: safeSearch, $options: 'i' } },
        { barcode: { $regex: safeSearch, $options: 'i' } },
        { brand: { $regex: safeSearch, $options: 'i' } },
        { modelNumber: { $regex: safeSearch, $options: 'i' } },
        { compatibleModels: { $regex: safeSearch, $options: 'i' } },
        { impaCode: { $regex: safeSearch, $options: 'i' } },
        { oemPartNumber: { $regex: safeSearch, $options: 'i' } },
        { condition: { $regex: safeSearch, $options: 'i' } },
        { 'warehouseLocation.code': { $regex: safeSearch, $options: 'i' } },
        { 'warehouseLocation.rack': { $regex: safeSearch, $options: 'i' } },
        { 'warehouseLocation.zone': { $regex: safeSearch, $options: 'i' } },
        { 'variants.name': { $regex: safeSearch, $options: 'i' } },
        { lotNumber: { $regex: safeSearch, $options: 'i' } },
      ];
    }

    if (category && category !== 'all') {
      query.categoryId = category;
    }

    if (status && status !== 'all') {
      query.status = status;
    }

    if (isPublic !== undefined) {
      query.isPublic = isPublic === 'true';
    }

    let products = await Product.find(query).sort({ createdAt: -1 });

    if (stockStatus) {
      if (stockStatus === 'out') {
        products = products.filter((p) => p.quantity <= 0);
      } else if (stockStatus === 'low') {
        products = products.filter((p) => p.quantity > 0 && p.quantity <= p.reorderLevel);
      } else if (stockStatus === 'in') {
        products = products.filter((p) => p.quantity > p.reorderLevel);
      }
    }

    res.json({
      success: true,
      count: products.length,
      data: products,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single product by ID
// @route   GET /api/products/:id
// @access  Public
exports.getProductById = async (req, res, next) => {
  try {
    const product = await findProduct(req.params.id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: `Product with ID '${req.params.id}' not found.`,
      });
    }
    res.json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a product
// @route   POST /api/products
// @access  Private (Admin, Manager)
exports.createProduct = async (req, res, next) => {
  try {
    const {
      name,
      sku,
      barcode,
      description,
      unit,
      imageUrl,
      isPublic,
    } = req.body;

    const resolvedCost = Number(req.body.costPrice !== undefined ? req.body.costPrice : req.body.purchasePrice) || 0;
    const resolvedPrice = Number(req.body.sellingPrice) || 0;
    const resolvedQty = Number(req.body.quantity !== undefined ? req.body.quantity : (req.body.currentStock !== undefined ? req.body.currentStock : req.body.stock)) || 0;
    const resolvedReorder = Number(req.body.reorderLevel !== undefined ? req.body.reorderLevel : req.body.minStockThreshold) || 10;
    const resolvedCategory = req.body.categoryId || req.body.category || null;
    const resolvedSupplier = req.body.supplierId || req.body.supplier || null;

    const formattedSku = (sku || `SKU-${Date.now().toString().slice(-6)}`).toUpperCase().trim();

    const existingSku = await Product.findOne({ sku: formattedSku });
    if (existingSku) {
      return res.status(400).json({
        success: false,
        message: `A product with SKU "${formattedSku}" already exists.`,
      });
    }

    const product = await Product.create({
      name: (name || 'Unnamed Product').trim(),
      sku: formattedSku,
      barcode: barcode || '',
      brand: req.body.brand || '',
      modelNumber: req.body.modelNumber || '',
      compatibleModels: Array.isArray(req.body.compatibleModels) ? req.body.compatibleModels : [],
      condition: req.body.condition || 'new',
      dimensions: req.body.dimensions || '',
      impaCode: req.body.impaCode || '',
      oemPartNumber: req.body.oemPartNumber || '',
      warehouseLocation: req.body.warehouseLocation || {},
      variants: Array.isArray(req.body.variants) ? req.body.variants : [],
      alternatives: Array.isArray(req.body.alternatives) ? req.body.alternatives : [],
      lotId: req.body.lotId || null,
      lotNumber: req.body.lotNumber || '',
      sourceShip: req.body.sourceShip || '',
      sourceLotCost: Number(req.body.sourceLotCost) || 0,
      description: description || '',
      categoryId: resolvedCategory,
      supplierId: resolvedSupplier,
      costPrice: resolvedCost,
      sellingPrice: resolvedPrice,
      quantity: resolvedQty,
      reorderLevel: resolvedReorder,
      unit: unit || 'pcs',
      imageUrl: imageUrl || '',
      isPublic: isPublic !== undefined ? isPublic : true,
    });

    // If initial stock > 0, log initial movement
    if (product.quantity > 0) {
      await StockMovement.create({
        productId: product._id,
        type: 'adjustment',
        quantity: product.quantity,
        balanceAfter: product.quantity,
        reference: 'INITIAL_STOCK',
        reason: 'Initial stock intake on creation',
        performedBy: req.user ? req.user.name : 'System',
      });
    }

    res.status(201).json({
      success: true,
      message: 'Product created successfully.',
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a product
// @route   PUT /api/products/:id
// @access  Private (Admin, Manager)
exports.updateProduct = async (req, res, next) => {
  try {
    const product = await findProduct(req.params.id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: `Product with ID '${req.params.id}' not found.`,
      });
    }

    if (req.body.sku) {
      const formattedSku = req.body.sku.toUpperCase().trim();
      const existingSku = await Product.findOne({ sku: formattedSku, _id: { $ne: product._id } });
      if (existingSku) {
        return res.status(400).json({
          success: false,
          message: `SKU "${formattedSku}" is already taken by another product.`,
        });
      }
      req.body.sku = formattedSku;
    }

    const updateData = { ...req.body };
    if (updateData.currentStock !== undefined && updateData.quantity === undefined) {
      updateData.quantity = Number(updateData.currentStock);
    }
    if (updateData.purchasePrice !== undefined && updateData.costPrice === undefined) {
      updateData.costPrice = Number(updateData.purchasePrice);
    }
    if (updateData.minStockThreshold !== undefined && updateData.reorderLevel === undefined) {
      updateData.reorderLevel = Number(updateData.minStockThreshold);
    }
    if (updateData.category && !updateData.categoryId) {
      updateData.categoryId = updateData.category;
    }
    if (updateData.supplier && !updateData.supplierId) {
      updateData.supplierId = updateData.supplier;
    }

    const updated = await Product.findByIdAndUpdate(product._id, updateData, {
      new: true,
      runValidators: true,
    });

    res.json({
      success: true,
      message: 'Product updated successfully.',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a product (with dependency safety guards)
// @route   DELETE /api/products/:id
// @access  Private (Admin)
exports.deleteProduct = async (req, res, next) => {
  try {
    const product = await findProduct(req.params.id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: `Product with ID '${req.params.id}' not found.`,
      });
    }

    // Dependency check: Sales
    const hasSales = await Sale.findOne({ 'items.productId': product._id });
    if (hasSales) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete "${product.name}" because it is referenced in completed sales invoices.`,
      });
    }

    // Dependency check: Purchases
    const hasPurchases = await Purchase.findOne({ 'items.productId': product._id });
    if (hasPurchases) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete "${product.name}" because it is linked to purchase orders.`,
      });
    }

    // Dependency check: Customer Orders
    const hasOrders = await Order.findOne({ 'items.productId': product._id });
    if (hasOrders) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete "${product.name}" because it belongs to customer orders.`,
      });
    }

    await Product.findByIdAndDelete(product._id);

    res.json({
      success: true,
      message: `Product "${product.name}" deleted successfully.`,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Bulk CSV Import products
// @route   POST /api/products/import-csv
// @access  Private (Admin, Manager)
exports.importCSV = async (req, res, next) => {
  try {
    const { products: rows } = req.body;

    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No product rows provided in request.',
      });
    }

    let imported = 0;
    const errors = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const name = row.name || row['Product Name'];
      const sku = (row.sku || row['SKU'] || '').toUpperCase().trim();

      if (!name || !sku) {
        errors.push(`Row ${i + 1}: Missing Name or SKU.`);
        continue;
      }

      const existing = await Product.findOne({ sku });
      if (existing) {
        errors.push(`Row ${i + 1}: SKU "${sku}" already exists. Skipping.`);
        continue;
      }

      const newProduct = await Product.create({
        name,
        sku,
        description: row.description || row['Description'] || '',
        costPrice: Number(row.costPrice || row['Cost Price']) || 0,
        sellingPrice: Number(row.sellingPrice || row['Selling Price']) || 0,
        quantity: Number(row.quantity || row['Quantity']) || 0,
        reorderLevel: Number(row.reorderLevel || row['Reorder Level']) || 10,
        imageUrl: row.imageUrl || row['Image URL'] || '',
      });

      if (newProduct.quantity > 0) {
        await StockMovement.create({
          productId: newProduct._id,
          type: 'adjustment',
          quantity: newProduct.quantity,
          balanceAfter: newProduct.quantity,
          reference: 'CSV_IMPORT',
          reason: 'Bulk stock import via CSV',
          performedBy: req.user ? req.user.name : 'Admin',
        });
      }

      imported++;
    }

    res.json({
      success: true,
      message: `Imported ${imported} products successfully.`,
      imported,
      errors,
    });
  } catch (error) {
    next(error);
  }
};
