import { storageService, STORAGE_KEYS } from './storageService';
import { apiClient } from './apiClient';
import { customerService } from './customerService';

const isGenericClientName = (name) => {
  if (!name) return true;
  const n = String(name).trim().toLowerCase();
  return (
    n === 'walk-in retail customer' ||
    n === 'direct client' ||
    n === 'valued client' ||
    n === 'সাধারণ ক্লায়েন্ট' ||
    n === 'সাধারণ গ্রাহক'
  );
};

const applyDeltaToLocalSale = (saleId, delta) => {
  if (!saleId || !delta) return;
  const sales = storageService.getItem(STORAGE_KEYS.SALES, []);
  const idx = sales.findIndex((s) => s.id === saleId || s._id === saleId || s.invoiceNumber === saleId || s.invoiceNo === saleId);
  if (idx === -1) return;

  const s = sales[idx];
  const tot = Math.max(0, Number(s.total !== undefined ? s.total : s.totalAmount) || 0);
  const curPaid =
    s.paymentStatus === 'paid'
      ? tot
      : s.paymentStatus === 'due'
      ? 0
      : Math.max(0, Number(s.paidAmount) || 0);
  const nextPaid = Math.min(tot, Math.max(0, Math.round((curPaid + delta) * 100) / 100));
  const nextDue = Math.max(0, Math.round((tot - nextPaid) * 100) / 100);
  const nextPayStatus = nextDue <= 0.005 ? 'paid' : nextPaid > 0 ? 'partial' : 'due';

  sales[idx] = {
    ...s,
    paidAmount: nextPaid,
    dueAmount: nextDue,
    paymentStatus: nextPayStatus,
    updatedAt: new Date().toISOString(),
  };
  storageService.setItem(STORAGE_KEYS.SALES, sales);
};

class MoneyReceiptService {
  getAll() {
    return storageService.getItem(STORAGE_KEYS.MONEY_RECEIPTS, []);
  }

  getById(id) {
    return this.getAll().find((r) => r.id === id || r._id === id || r.receiptNumber === id) || null;
  }

  create(data, receivedBy = 'Accounts') {
    const amountNum = Number(data.amount) || 0;
    if (amountNum <= 0) {
      return { success: false, message: 'Receipt amount must be greater than 0.' };
    }

    const receipts = this.getAll();
    const receiptNumber =
      (data.receiptNumber || '').trim() ||
      `MR-${new Date().getFullYear()}-${String(receipts.length + 1).padStart(4, '0')}`;

    let customerId = data.customerId || null;
    let custSyncPromise = null;
    if (
      data.autoSaveCustomer !== false &&
      data.customerName &&
      data.customerName.trim() &&
      !isGenericClientName(data.customerName)
    ) {
      const cust = customerService.upsertCustomer({
        id: customerId,
        name: data.customerName,
        companyName: data.customerCompany,
        designationRole: data.customerRole,
        phone: data.customerPhone,
        email: data.customerEmail,
        address: data.customerAddress,
        location: data.customerAddress,
      });
      if (cust && (cust.id || cust._id)) {
        customerId = cust._id || cust.id;
        custSyncPromise = cust._syncPromise;
      }
    }

    const now = new Date().toISOString();
    const newReceipt = {
      ...data,
      id: `mr-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      receiptNumber,
      date: data.date || now,
      entrySource: data.entrySource || 'khata',
      bookNumber: (data.bookNumber || '').trim(),
      manualSerialNo: (data.manualSerialNo || '').trim(),
      customerId,
      customerName: data.customerName || 'Direct Client',
      customerCompany: data.customerCompany || '',
      customerRole: data.customerRole || 'owner',
      customerPhone: data.customerPhone || '',
      customerEmail: data.customerEmail || '',
      customerAddress: data.customerAddress || '',
      linkedSaleId: data.linkedSaleId || null,
      linkedInvoiceNo: (data.linkedInvoiceNo || '').trim(),
      purpose: (data.purpose || 'বকেয়া পরিশোধ / বিল জমা (Bill Payment)').trim(),
      amount: Math.round(amountNum * 100) / 100,
      paymentMethod: data.paymentMethod || 'cash',
      chequeOrRefNo: (data.chequeOrRefNo || '').trim(),
      status: data.status || 'active',
      notes: (data.notes || '').trim(),
      receivedBy: data.receivedBy || receivedBy,
      createdAt: now,
      updatedAt: now,
    };

    if (newReceipt.status !== 'cancelled' && newReceipt.linkedSaleId) {
      applyDeltaToLocalSale(newReceipt.linkedSaleId, newReceipt.amount);
    }

    receipts.unshift(newReceipt);
    storageService.setItem(STORAGE_KEYS.MONEY_RECEIPTS, receipts);
    if (customerId) customerService.recalculateFromSales(customerId);

    const syncPromise = Promise.resolve(custSyncPromise)
      .then((custRes) => {
        const resolvedCustId = custRes?.data?._id || newReceipt.customerId;
        return apiClient.post(
          '/money-receipts',
          {
            receiptNumber: newReceipt.receiptNumber,
            date: newReceipt.date,
            entrySource: newReceipt.entrySource,
            bookNumber: newReceipt.bookNumber,
            manualSerialNo: newReceipt.manualSerialNo,
            customerId: resolvedCustId,
            customerName: newReceipt.customerName,
            customerCompany: newReceipt.customerCompany,
            customerRole: newReceipt.customerRole,
            customerPhone: newReceipt.customerPhone,
            customerEmail: newReceipt.customerEmail,
            customerAddress: newReceipt.customerAddress,
            linkedSaleId: newReceipt.linkedSaleId,
            linkedInvoiceNo: newReceipt.linkedInvoiceNo,
            purpose: newReceipt.purpose,
            amount: newReceipt.amount,
            paymentMethod: newReceipt.paymentMethod,
            chequeOrRefNo: newReceipt.chequeOrRefNo,
            status: newReceipt.status,
            notes: newReceipt.notes,
            receivedBy: newReceipt.receivedBy,
            autoSaveCustomer: data.autoSaveCustomer !== false,
          },
          { tempId: newReceipt.id, storageKey: STORAGE_KEYS.MONEY_RECEIPTS }
        );
      })
      .then((res) => {
        if (res?.data?._id) {
          const cur = storageService.getItem(STORAGE_KEYS.MONEY_RECEIPTS, []);
          const idx = cur.findIndex((r) => r.id === newReceipt.id);
          if (idx !== -1) {
            cur[idx] = { ...cur[idx], ...res.data, id: res.data._id, _id: res.data._id };
            storageService.setItem(STORAGE_KEYS.MONEY_RECEIPTS, cur);
          }
        }
        return res;
      })
      .catch((err) => {
        console.warn('[MongoDB MoneyReceipt sync]:', err.message);
        return null;
      });

    return { success: true, receipt: newReceipt, syncPromise };
  }

  update(id, updates) {
    const receipts = this.getAll();
    const index = receipts.findIndex((r) => r.id === id || r._id === id);
    if (index === -1) {
      return { success: false, message: 'Money receipt not found.' };
    }

    const prev = receipts[index];
    if (prev.status !== 'cancelled' && prev.linkedSaleId) {
      applyDeltaToLocalSale(prev.linkedSaleId, -Number(prev.amount));
    }

    const updated = {
      ...prev,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    if (updated.status !== 'cancelled' && updated.linkedSaleId) {
      applyDeltaToLocalSale(updated.linkedSaleId, Number(updated.amount));
    }

    receipts[index] = updated;
    storageService.setItem(STORAGE_KEYS.MONEY_RECEIPTS, receipts);
    if (prev.customerId && String(prev.customerId) !== String(updated.customerId)) {
      customerService.recalculateFromSales(prev.customerId);
    }
    if (updated.customerId) {
      customerService.recalculateFromSales(updated.customerId);
    }

    const targetId = updated._id || updated.id || id;
    const syncPromise = apiClient.put(`/money-receipts/${targetId}`, updates).catch((err) => {
      console.warn('[MongoDB MoneyReceipt update notice]:', err.message);
      return null;
    });

    return { success: true, receipt: updated, syncPromise };
  }

  remove(id) {
    const receipts = this.getAll();
    const existing = receipts.find((r) => r.id === id || r._id === id);
    if (!existing) {
      return { success: false, message: 'Money receipt not found.' };
    }

    if (existing.status !== 'cancelled' && existing.linkedSaleId) {
      applyDeltaToLocalSale(existing.linkedSaleId, -Number(existing.amount));
    }

    const filtered = receipts.filter((r) => r.id !== id && r._id !== id);
    storageService.setItem(STORAGE_KEYS.MONEY_RECEIPTS, filtered);
    if (existing.customerId) {
      customerService.recalculateFromSales(existing.customerId);
    }

    const targetId = existing._id || existing.id || id;
    const syncPromise = apiClient.delete(`/money-receipts/${targetId}`).catch((err) => {
      console.warn('[MongoDB MoneyReceipt delete notice]:', err.message);
      return null;
    });

    return { success: true, message: `Money Receipt ${existing.receiptNumber} removed.`, syncPromise };
  }
}

export const moneyReceiptService = new MoneyReceiptService();
