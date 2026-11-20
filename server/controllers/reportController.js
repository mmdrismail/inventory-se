const Product = require('../models/Product');
const Category = require('../models/Category');
const Sale = require('../models/Sale');
const Purchase = require('../models/Purchase');
const Customer = require('../models/Customer');
const Order = require('../models/Order');

// @desc    Get dashboard metrics & aggregations
// @route   GET /api/reports/dashboard
// @access  Private (Admin, Manager)
exports.getDashboardMetrics = async (req, res, next) => {
  try {
    const products = await Product.find();
    const categories = await Category.find();
    const sales = await Sale.find({ status: 'completed' });
    const purchases = await Purchase.find({ status: 'received' });
    const customers = await Customer.find();
    const orders = await Order.find();

    // Inventory metrics
    let totalInventoryCost = 0;
    let totalRetailValue = 0;
    let totalUnits = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    products.forEach((p) => {
      const qty = Number(p.quantity) || 0;
      totalUnits += qty;
      totalInventoryCost += (Number(p.costPrice) || 0) * qty;
      totalRetailValue += (Number(p.sellingPrice) || 0) * qty;
      if (qty <= 0) {
        outOfStockCount++;
      } else if (qty <= (Number(p.reorderLevel) || 10)) {
        lowStockCount++;
      }
    });

    const potentialProfit = Math.max(0, totalRetailValue - totalInventoryCost);

    // Sales metrics
    const totalRevenue = sales.reduce((sum, s) => sum + (Number(s.totalAmount) || 0), 0);
    const totalPurchasesCost = purchases.reduce((sum, p) => sum + (Number(p.totalAmount) || 0), 0);
    const pendingOrdersCount = orders.filter((o) => o.status === 'pending').length;

    // Category distribution
    const categoryMap = {};
    categories.forEach((c) => {
      categoryMap[c._id.toString()] = { name: c.name, value: 0, count: 0 };
    });

    products.forEach((p) => {
      const catId = p.categoryId ? p.categoryId.toString() : 'uncategorized';
      if (!categoryMap[catId]) {
        categoryMap[catId] = { name: 'Uncategorized', value: 0, count: 0 };
      }
      categoryMap[catId].value += (Number(p.costPrice) || 0) * (Number(p.quantity) || 0);
      categoryMap[catId].count += 1;
    });

    const categoryDistribution = Object.values(categoryMap).filter((c) => c.count > 0);

    const kpiMetrics = {
      totalRevenue,
      totalInventoryCost,
      totalRetailValue,
      potentialProfit,
      totalProducts: products.length,
      totalUnits,
      lowStockCount,
      outOfStockCount,
      totalCustomers: customers.length,
      totalPurchasesCost,
      pendingOrdersCount,
    };

    res.json({
      success: true,
      data: {
        kpi: kpiMetrics,
        metrics: kpiMetrics,
        categoryDistribution,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get low stock report
// @route   GET /api/reports/low-stock
// @access  Private (Admin, Manager)
exports.getLowStockReport = async (req, res, next) => {
  try {
    const products = await Product.find();
    const lowStock = products.filter((p) => p.quantity <= (p.reorderLevel || 10));

    res.json({
      success: true,
      count: lowStock.length,
      data: lowStock,
    });
  } catch (error) {
    next(error);
  }
};
