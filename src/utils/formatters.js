import { format, isValid, parseISO } from 'date-fns';

/**
 * Currency Formatter
 * Defaults to BDT (৳) as specified in requirements, but can format any currency code.
 */
export const formatCurrency = (amount, currency = 'BDT') => {
  const num = Number(amount) || 0;
  const rawCurr = currency ? String(currency).trim() : 'BDT';
  const upperCurr = rawCurr.toUpperCase();

  if (upperCurr === 'BDT' || rawCurr === '৳' || upperCurr === 'TK') {
    return `৳${num.toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  const symbolMap = { '$': 'USD', '€': 'EUR', '£': 'GBP', '₹': 'INR' };
  const isoCurrency = symbolMap[rawCurr] || upperCurr;

  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: isoCurrency,
      minimumFractionDigits: 2,
    }).format(num);
  } catch {
    return `${rawCurr} ${num.toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
};

/**
 * Number Formatter
 */
export const formatNumber = (val) => {
  const num = Number(val) || 0;
  return num.toLocaleString();
};

/**
 * Date Formatter
 */
export const formatDate = (dateInput, pattern = 'MMM dd, yyyy') => {
  if (!dateInput) return '—';
  try {
    const d = typeof dateInput === 'string' ? parseISO(dateInput) : new Date(dateInput);
    if (!isValid(d)) return '—';
    return format(d, pattern);
  } catch {
    return String(dateInput);
  }
};

/**
 * Date & Time Formatter
 */
export const formatDateTime = (dateInput) => {
  return formatDate(dateInput, 'MMM dd, yyyy · hh:mm a');
};

/**
 * Stock Status Helper
 */
export const getStockStatus = (quantity, reorderLevel = 10) => {
  const qty = Number(quantity) || 0;
  const reorder = Number(reorderLevel) || 10;
  
  if (qty <= 0) {
    return { label: 'Out of Stock', status: 'out_of_stock', color: 'red' };
  }
  if (qty <= reorder) {
    return { label: 'Low Stock', status: 'low_stock', color: 'amber' };
  }
  return { label: 'In Stock', status: 'in_stock', color: 'emerald' };
};

/**
 * Generate unique SKU
 */
export const generateSKU = (categoryName = 'GEN') => {
  const prefix = (categoryName || 'GEN').slice(0, 3).toUpperCase().replace(/[^A-Z]/g, 'X');
  const random = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${random}`;
};
