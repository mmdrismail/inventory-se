/**
 * StockLine Inventory SE - Validation Utilities
 * Authored by: Saiful Ahnm Sajed <saifulahnmsajed>
 * Description: Client-side validation helpers for barcodes, SKUs, contact details, and monetary amounts.
 */

/**
 * Validates EAN-13 barcode check digit using modulo 10 algorithm.
 * @param {string} barcode 13-digit barcode string
 * @returns {boolean} True if checksum is mathematically valid
 */
export function isValidEAN13(barcode) {
  if (!barcode || typeof barcode !== 'string') return false;
  const clean = barcode.trim();
  if (!/^\d{13}$/.test(clean)) return false;

  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(clean[i], 10);
    sum += i % 2 === 0 ? digit : digit * 3;
  }

  const checksum = (10 - (sum % 10)) % 10;
  return checksum === parseInt(clean[12], 10);
}

/**
 * Validates Bangladeshi mobile phone numbers (+8801... or 01...)
 * @param {string} phone
 * @returns {boolean}
 */
export function isValidBDPhone(phone) {
  if (!phone || typeof phone !== 'string') return false;
  const cleaned = phone.replace(/[\s-]/g, '');
  return /^(?:\+?8801|01)[3-9]\d{8}$/.test(cleaned);
}

/**
 * Validates SKU alphanumeric format (e.g., 'CAT-PROD-001')
 * @param {string} sku
 * @returns {boolean}
 */
export function isValidSKU(sku) {
  if (!sku || typeof sku !== 'string') return false;
  return /^[A-Za-z0-9_-]{3,24}$/.test(sku.trim());
}

/**
 * Validates standard email address format
 * @param {string} email
 * @returns {boolean}
 */
export function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/**
 * Validates positive monetary price
 * @param {number|string} price
 * @returns {boolean}
 */
export function isValidPositiveAmount(price) {
  const num = typeof price === 'number' ? price : parseFloat(price);
  return !isNaN(num) && num >= 0 && isFinite(num);
}
