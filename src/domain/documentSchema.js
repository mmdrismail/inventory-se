import { normalizeUnit } from '../utils/units';
import { cleanStr, normalizeMachineDetails } from './machineSpecs';

/**
 * Unified line-item & transaction document schema normalizer across
 * Sales, Quotations, Challans, Offline Khata entries, and Print Templates.
 */

export const roundMoney = (val) => Math.round((Number(val) || 0) * 100) / 100;

export const resolveItemRate = (item = {}) => {
  if (!item || typeof item !== 'object') return 0;
  const raw =
    item.unitPrice !== undefined
      ? item.unitPrice
      : item.rate !== undefined
      ? item.rate
      : item.price !== undefined
      ? item.price
      : item.sellingPrice;
  return roundMoney(Math.max(0, Number(raw) || 0));
};

export const normalizeLineItem = (item = {}, { defaultName = '' } = {}) => {
  const quantity = Math.max(0, Number(item?.quantity) || 0);
  const unitPrice = resolveItemRate(item);
  const explicitTotal =
    item?.lineTotal !== undefined
      ? item.lineTotal
      : item?.subtotal !== undefined
      ? item.subtotal
      : item?.amount !== undefined
      ? item.amount
      : item?.total;
  const lineTotal =
    explicitTotal !== undefined && explicitTotal !== ''
      ? roundMoney(Math.max(0, Number(explicitTotal) || 0))
      : roundMoney(quantity * unitPrice);

  const resolvedName = cleanStr(item?.name || item?.productName || item?.partName) || defaultName;
  const pid =
    item?.productId && item.productId !== 'custom' && item.productId !== 'custom-item'
      ? item.productId
      : null;

  return {
    productId: pid,
    name: resolvedName,
    productName: resolvedName,
    sku: cleanStr(item?.sku),
    description: cleanStr(item?.description),
    quantity,
    unit: normalizeUnit(item?.unit || 'pc'),
    unitPrice,
    lineTotal,
  };
};

export const normalizeTransactionDocument = (doc = {}, { fallbackType = 'sale' } = {}) => {
  if (!doc || typeof doc !== 'object') return null;
  const id = doc._id || doc.id;
  const items = (Array.isArray(doc.items) ? doc.items : []).map((it) => normalizeLineItem(it));
  const totalAmount = roundMoney(doc.totalAmount !== undefined ? doc.totalAmount : doc.total);

  return {
    ...doc,
    id,
    _id: id,
    docType: doc.quotationNumber ? 'quotation' : doc.documentType || fallbackType,
    docNumber:
      doc.invoiceNumber ||
      doc.invoiceNo ||
      doc.quotationNumber ||
      doc.quotationNo ||
      doc.receiptNumber ||
      doc.manualSerialNo ||
      '',
    date: doc.date || doc.quotationDate || doc.createdAt || null,
    machineDetails: normalizeMachineDetails(doc.machineDetails),
    items,
    total: totalAmount,
    totalAmount,
  };
};
