/**
 * Centralized calculation utilities for StockLine
 */

export const calculateLineTotal = (unitPrice, quantity) => {
  const price = Number(unitPrice) || 0;
  const qty = Number(quantity) || 0;
  return Math.max(0, price * qty);
};

export const calculatePurchaseTotals = (items = []) => {
  const subtotal = items.reduce((sum, item) => {
    return sum + calculateLineTotal(item.unitCost, item.quantity);
  }, 0);
  return {
    subtotal,
    total: subtotal,
  };
};

export const calculateSaleTotals = (items = [], discount = 0, tax = 0) => {
  const subtotal = items.reduce((sum, item) => {
    const rate =
      item.unitPrice !== undefined
        ? item.unitPrice
        : item.rate !== undefined
        ? item.rate
        : item.price !== undefined
        ? item.price
        : item.sellingPrice;
    return sum + calculateLineTotal(rate, item.quantity);
  }, 0);
  const discountVal = Math.min(subtotal, Math.max(0, Number(discount) || 0));
  const taxVal = Math.max(0, Number(tax) || 0);
  const total = Math.max(0, subtotal - discountVal + taxVal);
  return {
    subtotal,
    discount: discountVal,
    tax: taxVal,
    total,
  };
};

export const calculatePaymentBreakdown = ({ total = 0, paymentStatus = 'paid', paidAmount = 0 }) => {
  const totalVal = Math.max(0, Number(total) || 0);
  const status = ['paid', 'partial', 'due'].includes(paymentStatus) ? paymentStatus : 'paid';
  let paidVal = totalVal;
  if (status === 'due') {
    paidVal = 0;
  } else if (status === 'partial') {
    paidVal = Math.min(totalVal, Math.max(0, Number(paidAmount) || 0));
  }
  const dueVal = Math.max(0, totalVal - paidVal);
  return {
    paymentStatus: status,
    paidAmount: paidVal,
    dueAmount: dueVal,
  };
};

export const calculateInventoryMetrics = (products = []) => {
  let totalItemsCount = 0;
  let totalStockQuantity = 0;
  let totalCostValue = 0;
  let totalRetailValue = 0;
  let lowStockCount = 0;
  let outOfStockCount = 0;

  products.forEach((p) => {
    totalItemsCount += 1;
    const qty = Number(p.quantity) || 0;
    const cost = Number(p.costPrice) || 0;
    const price = Number(p.sellingPrice) || 0;
    const reorder = Number(p.reorderLevel) || 10;

    totalStockQuantity += qty;
    totalCostValue += qty * cost;
    totalRetailValue += qty * price;

    if (qty <= 0) {
      outOfStockCount += 1;
    } else if (qty <= reorder) {
      lowStockCount += 1;
    }
  });

  return {
    totalItemsCount,
    totalStockQuantity,
    totalCostValue,
    totalRetailValue,
    potentialProfit: Math.max(0, totalRetailValue - totalCostValue),
    lowStockCount,
    outOfStockCount,
  };
};

export const aggregateSalesByDate = (sales = [], days = 7) => {
  const map = {};
  const today = new Date();

  // Prepopulate last `days` days with 0
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    map[dateStr] = { date: dateStr, sales: 0, count: 0 };
  }

  sales
    .filter((s) => s.status === 'completed')
    .forEach((s) => {
      const dateStr = s.date ? s.date.split('T')[0] : '';
      if (map[dateStr]) {
        map[dateStr].sales += Number(s.total) || 0;
        map[dateStr].count += 1;
      }
    });

  return Object.values(map).map((entry) => ({
    ...entry,
    formattedDate: entry.date.slice(5), // MM-DD
  }));
};

export const aggregatePurchasesByDate = (purchases = [], days = 7) => {
  const map = {};
  const today = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    map[dateStr] = { date: dateStr, purchases: 0, count: 0 };
  }

  purchases
    .filter((p) => p.status === 'received')
    .forEach((p) => {
      const dateStr = p.date ? p.date.split('T')[0] : '';
      if (map[dateStr]) {
        map[dateStr].purchases += Number(p.total) || 0;
        map[dateStr].count += 1;
      }
    });

  return Object.values(map).map((entry) => ({
    ...entry,
    formattedDate: entry.date.slice(5),
  }));
};

export const aggregateStockByCategory = (products = [], categories = []) => {
  const catMap = {};
  categories.forEach((c) => {
    catMap[c.id] = { name: c.name, count: 0, value: 0 };
  });

  products.forEach((p) => {
    const cat = catMap[p.categoryId] || { name: 'Uncategorized', count: 0, value: 0 };
    cat.count += Number(p.quantity) || 0;
    cat.value += (Number(p.quantity) || 0) * (Number(p.costPrice) || 0);
    catMap[p.categoryId] = cat;
  });

  return Object.values(catMap).filter((item) => item.count > 0 || item.value > 0);
};
