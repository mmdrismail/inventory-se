/**
 * StockLine Inventory SE - Client Export Helpers
 * Authored by: Saiful Ahnm Sajed <saifulahnmsajed>
 * Description: Client-side data serialization, CSV generation, and download handlers.
 */

/**
 * Converts array of flat objects into standard CSV text
 * @param {Array<Object>} rows Array of records
 * @param {Array<string>} [headers] Optional ordered column headers
 * @returns {string} CSV formatted string
 */
export function convertToCSV(rows, headers) {
  if (!rows || !rows.length) return '';
  const cols = headers || Object.keys(rows[0]);
  const headerLine = cols.map((c) => `"${c.replace(/"/g, '""')}"`).join(',');

  const bodyLines = rows.map((row) =>
    cols
      .map((col) => {
        const val = row[col] !== undefined && row[col] !== null ? String(row[col]) : '';
        return `"${val.replace(/"/g, '""')}"`;
      })
      .join(',')
  );

  return [headerLine, ...bodyLines].join('\r\n');
}

/**
 * Triggers a browser file download for text/blob content
 * @param {string} content
 * @param {string} filename
 * @param {string} mimeType
 */
export function triggerFileDownload(content, filename, mimeType = 'text/csv;charset=utf-8;') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generates an audit filename timestamped with local date
 * @param {string} prefix Base prefix (e.g. 'inventory_report')
 * @param {string} ext Extension (e.g. 'csv', 'json')
 * @returns {string} Safe filename (e.g. 'inventory_report_2026-11-21.csv')
 */
export function generateAuditFilename(prefix, ext = 'csv') {
  const dateStr = new Date().toISOString().split('T')[0];
  const cleanPrefix = prefix.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  return `${cleanPrefix}_${dateStr}.${ext.replace(/^\./, '')}`;
}
