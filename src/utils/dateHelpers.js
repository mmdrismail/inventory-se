/**
 * StockLine Inventory SE - Date Helpers
 * Authored by: Saiful Ahnm Sajed <saifulahnmsajed>
 * Description: Time arithmetic, expiry countdowns, and localization formatting.
 */

/**
 * Calculates days remaining until expiration date
 * @param {string|Date} expiryDate
 * @returns {number} Days remaining (negative if expired)
 */
export function getDaysUntilExpiry(expiryDate) {
  if (!expiryDate) return 0;
  const target = new Date(expiryDate).getTime();
  const now = new Date().getTime();
  const diffTime = target - now;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Formats relative time description for batch lots
 * @param {string|Date} dateStr
 * @returns {string} Human-friendly string (e.g., 'Expires in 15 days', 'Expired 4 days ago')
 */
export function formatExpiryStatus(dateStr) {
  const days = getDaysUntilExpiry(dateStr);
  if (days < 0) {
    return `Expired ${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} ago`;
  }
  if (days === 0) {
    return 'Expires today';
  }
  if (days <= 7) {
    return `Expires soon (${days} day${days === 1 ? '' : 's'})`;
  }
  return `${days} days left`;
}

/**
 * Converts English numerical digits to Bengali digits
 * @param {string|number} input
 * @returns {string} Bengali formatted number string
 */
export function toBengaliNumerals(input) {
  const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(input).replace(/[0-9]/g, (w) => bnDigits[+w]);
}

/**
 * Formats ISO date to standard local date string (DD/MM/YYYY)
 * @param {string|Date} date
 * @returns {string}
 */
export function formatStandardDate(date) {
  if (!date) return '-';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '-';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}
