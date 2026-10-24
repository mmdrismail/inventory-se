import { storageService, STORAGE_KEYS } from './storageService';
import { calculateInventoryMetrics } from '../utils/calculations';

class ReportService {
  getInventoryReport() {
    const products = storageService.getItem(STORAGE_KEYS.PRODUCTS, []);
    const categories = storageService.getItem(STORAGE_KEYS.CATEGORIES, []);
    const metrics = calculateInventoryMetrics(products);

    const catMap = {};
    categories.forEach((c) => (catMap[c.id] = c.name));

    const productBreakdown = products.map((p) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      category: catMap[p.categoryId] || 'Uncategorized',
      quantity: Number(p.quantity) || 0,
      reorderLevel: Number(p.reorderLevel) || 10,
      costPrice: Number(p.costPrice) || 0,
      sellingPrice: Number(p.sellingPrice) || 0,
      totalCostValue: (Number(p.quantity) || 0) * (Number(p.costPrice) || 0),
      totalRetailValue: (Number(p.quantity) || 0) * (Number(p.sellingPrice) || 0),
      status: Number(p.quantity) <= 0 ? 'Out of Stock' : (Number(p.quantity) <= Number(p.reorderLevel) ? 'Low Stock' : 'In Stock'),
    }));

    return {
      metrics,
      productBreakdown,
    };
  }

  getSalesReport({ startDate, endDate } = {}) {
    const sales = storageService.getItem(STORAGE_KEYS.SALES, []);
    let filtered = sales.filter((s) => s.status === 'completed');

    if (startDate) {
      filtered = filtered.filter((s) => new Date(s.date) >= new Date(startDate));
    }
    if (endDate) {
      filtered = filtered.filter((s) => new Date(s.date) <= new Date(endDate));
    }

    const totalSales = filtered.reduce((sum, s) => sum + (Number(s.total) || 0), 0);
    const completedCount = filtered.length;
    const avgOrderValue = completedCount > 0 ? totalSales / completedCount : 0;

    // Sales by product aggregation
    const productSalesMap = {};
    filtered.forEach((sale) => {
      (sale.items || []).forEach((item) => {
        if (!productSalesMap[item.productId]) {
          productSalesMap[item.productId] = {
            productId: item.productId,
            name: item.productName || 'Unknown Product',
            unitsSold: 0,
            revenue: 0,
          };
        }
        productSalesMap[item.productId].unitsSold += Number(item.quantity) || 0;
        productSalesMap[item.productId].revenue += (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
      });
    });

    // Sales by customer aggregation
    const customerSalesMap = {};
    filtered.forEach((sale) => {
      const custName = sale.customerName || 'Walk-in Customer';
      if (!customerSalesMap[custName]) {
        customerSalesMap[custName] = { customer: custName, invoiceCount: 0, totalAmount: 0 };
      }
      customerSalesMap[custName].invoiceCount += 1;
      customerSalesMap[custName].totalAmount += Number(sale.total) || 0;
    });

    return {
      totalSales,
      completedCount,
      avgOrderValue,
      salesList: filtered,
      productBreakdown: Object.values(productSalesMap).sort((a, b) => b.revenue - a.revenue),
      customerBreakdown: Object.values(customerSalesMap).sort((a, b) => b.totalAmount - a.totalAmount),
    };
  }

  getPurchaseReport({ startDate, endDate } = {}) {
    const purchases = storageService.getItem(STORAGE_KEYS.PURCHASES, []);
    const suppliers = storageService.getItem(STORAGE_KEYS.SUPPLIERS, []);
    const supMap = {};
    suppliers.forEach((s) => (supMap[s.id] = s.name));

    let filtered = purchases.filter((p) => p.status === 'received');

    if (startDate) {
      filtered = filtered.filter((p) => new Date(p.date) >= new Date(startDate));
    }
    if (endDate) {
      filtered = filtered.filter((p) => new Date(p.date) <= new Date(endDate));
    }

    const totalPurchases = filtered.reduce((sum, p) => sum + (Number(p.total) || 0), 0);
    const purchaseCount = filtered.length;

    // By supplier
    const supplierMap = {};
    filtered.forEach((p) => {
      const name = supMap[p.supplierId] || 'Direct Supplier';
      if (!supplierMap[name]) {
        supplierMap[name] = { supplier: name, orderCount: 0, totalAmount: 0 };
      }
      supplierMap[name].orderCount += 1;
      supplierMap[name].totalAmount += Number(p.total) || 0;
    });

    return {
      totalPurchases,
      purchaseCount,
      purchaseList: filtered.map((p) => ({
        id: p.id,
        referenceNo: p.referenceNo,
        supplier: supMap[p.supplierId] || 'Direct Supplier',
        date: p.date,
        itemCount: (p.items || []).length,
        total: p.total,
        paymentStatus: p.paymentStatus,
      })),
      supplierBreakdown: Object.values(supplierMap).sort((a, b) => b.totalAmount - a.totalAmount),
    };
  }

  getLowStockReport() {
    const products = storageService.getItem(STORAGE_KEYS.PRODUCTS, []);
    const categories = storageService.getItem(STORAGE_KEYS.CATEGORIES, []);
    const suppliers = storageService.getItem(STORAGE_KEYS.SUPPLIERS, []);

    const catMap = {};
    categories.forEach((c) => (catMap[c.id] = c.name));

    const supMap = {};
    suppliers.forEach((s) => (supMap[s.id] = s.name));

    return products
      .filter((p) => (Number(p.quantity) || 0) <= (Number(p.reorderLevel) || 10))
      .map((p) => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        category: catMap[p.categoryId] || 'Uncategorized',
        supplier: supMap[p.supplierId] || 'Unassigned',
        quantity: Number(p.quantity) || 0,
        reorderLevel: Number(p.reorderLevel) || 10,
        costPrice: Number(p.costPrice) || 0,
        sellingPrice: Number(p.sellingPrice) || 0,
        deficit: Math.max(0, (Number(p.reorderLevel) || 10) - (Number(p.quantity) || 0)),
        status: (Number(p.quantity) || 0) === 0 ? 'Out of Stock' : 'Low Stock',
      }));
  }
}

export const reportService = new ReportService();
