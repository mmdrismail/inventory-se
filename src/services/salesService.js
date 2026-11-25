import { storageService, STORAGE_KEYS } from './storageService';
import { inventoryService } from './inventoryService';
import { customerService } from './customerService';
import { calculateSaleTotals, calculatePaymentBreakdown } from '../utils/calculations';
import { apiClient } from './apiClient';

const linkQuotationLocal = (quotationId, saleId) => {
  if (!quotationId || !saleId) return;
  const quotes = storageService.getItem(STORAGE_KEYS.QUOTATIONS, []);
  const idx = quotes.findIndex((q) => q.id === quotationId || q._id === quotationId);
  if (idx !== -1) {
    quotes[idx] = {
      ...quotes[idx],
      status: 'converted',
      convertedSaleId: saleId,
      updatedAt: new Date().toISOString(),
    };
    storageService.setItem(STORAGE_KEYS.QUOTATIONS, quotes);
  }
};

const isGenericClientName = (name) => {
  if (!name) return true;
  const n = String(name).trim().toLowerCase();
  return (
    n === 'walk-in retail customer' ||
    n === 'direct client' ||
    n === 'valued client' ||
    n === 'counter direct sale' ||
    n === 'সাধারণ ক্লায়েন্ট' ||
    n === 'সাধারণ গ্রাহক' ||
    n.includes('walk-in')
  );
};

class SalesService {
  getAll() {
    return storageService.getItem(STORAGE_KEYS.SALES, []);
  }

  getById(id) {
    const sales = this.getAll();
    return sales.find((s) => s.id === id || s._id === id) || null;
  }

  create(saleData, performedBy = 'Sales Executive') {
    const sales = this.getAll();
    const { subtotal, discount, tax, total } = calculateSaleTotals(
      saleData.items || [],
      saleData.discount,
      saleData.tax
    );
    const totalVal = total;
    const {
      paymentStatus: nextPaymentStatus,
      paidAmount: paidVal,
      dueAmount: dueVal,
    } = calculatePaymentBreakdown({
      total: totalVal,
      paymentStatus: saleData.paymentStatus || 'paid',
      paidAmount: saleData.paidAmount !== undefined ? saleData.paidAmount : 0,
    });

    // Auto-upsert customer profile if details provided and not generic
    let customerId = saleData.customerId;
    let custSyncPromise = null;
    if (
      saleData.autoSaveCustomer !== false &&
      saleData.customerName &&
      saleData.customerName.trim() &&
      !isGenericClientName(saleData.customerName)
    ) {
      const cust = customerService.upsertCustomer({
        id: customerId,
        name: saleData.customerName,
        companyName: saleData.customerCompany,
        designationRole: saleData.customerRole,
        phone: saleData.customerPhone,
        email: saleData.customerEmail,
        address: saleData.customerAddress,
        location: saleData.customerLocation || saleData.customerAddress,
      });
      if (cust && (cust.id || cust._id)) {
        customerId = cust._id || cust.id;
        custSyncPromise = cust._syncPromise;
      }
    }

    const now = new Date().toISOString();
    const invNo =
      saleData.invoiceNo?.trim() ||
      saleData.invoiceNumber?.trim() ||
      `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newSale = {
      ...saleData,
      id: `sal-${Date.now()}`,
      invoiceNo: invNo,
      invoiceNumber: invNo,
      customerId,
      customerName: saleData.customerName || 'Walk-in Retail Customer',
      customerCompany: saleData.customerCompany || '',
      customerRole: saleData.customerRole || 'owner',
      customerPhone: saleData.customerPhone || '',
      customerEmail: saleData.customerEmail || '',
      customerAddress: saleData.customerAddress || '',
      customerLocation: saleData.customerLocation || '',
      date: saleData.date || now,
      status: saleData.status || 'completed',
      paymentMethod: saleData.paymentMethod || 'cash',
      paymentStatus: nextPaymentStatus,
      subtotal,
      discount,
      tax,
      total,
      totalAmount: total,
      paidAmount: paidVal,
      dueAmount: dueVal,
      requisitionRef: saleData.requisitionRef || '',
      quotationId: saleData.quotationId || null,
      notes: saleData.notes?.trim() || '',
      createdAt: now,
      updatedAt: now,
    };

    // If completed immediately, validate stock and deduct
    if (newSale.status === 'completed') {
      const res = inventoryService.processSaleCompletion(newSale, performedBy);
      if (!res.success) {
        return res;
      }
    }

    sales.unshift(newSale);
    storageService.setItem(STORAGE_KEYS.SALES, sales);
    if (customerId) customerService.recalculateFromSales(customerId);
    if (newSale.quotationId) linkQuotationLocal(newSale.quotationId, newSale.id);

    // Live sync to MongoDB Atlas (wait for customer upsert first if temp customer was created)
    const syncPromise = Promise.resolve(custSyncPromise)
      .then((custRes) => {
        const resolvedCustId = custRes?.data?._id || newSale.customerId;
        return apiClient.post(
          '/sales',
          {
            invoiceNumber: newSale.invoiceNumber,
            customerId: resolvedCustId,
            customerName: newSale.customerName,
            customerCompany: newSale.customerCompany,
            customerRole: newSale.customerRole,
            customerPhone: newSale.customerPhone,
            customerEmail: newSale.customerEmail,
            customerAddress: newSale.customerAddress,
            customerLocation: newSale.customerLocation,
            autoSaveCustomer: saleData.autoSaveCustomer !== false,
            items: (newSale.items || []).map((it) => ({
              productId: it.productId || it.id,
              productName: it.productName || it.name,
              sku: it.sku,
              quantity: Number(it.quantity) || 1,
              unit: it.unit || 'pc',
              unitPrice: Number(it.unitPrice || it.sellingPrice) || 0,
              lineTotal:
                Number(it.lineTotal || it.subtotal || (it.quantity || 1) * (it.unitPrice || it.sellingPrice || 0)) || 0,
              subtotal: Number(it.subtotal || it.quantity * it.unitPrice) || 0,
            })),
            subtotal: newSale.subtotal,
            discount: newSale.discount,
            tax: newSale.tax,
            totalAmount: newSale.total,
            paidAmount: newSale.paidAmount,
            dueAmount: newSale.dueAmount,
            paymentMethod: newSale.paymentMethod || 'cash',
            paymentStatus: newSale.paymentStatus,
            status: newSale.status,
            requisitionRef: newSale.requisitionRef,
            quotationId: newSale.quotationId,
            notes: newSale.notes,
          },
          { tempId: newSale.id, storageKey: STORAGE_KEYS.SALES }
        );
      })
      .then((res) => {
        if (res?.data?._id) {
          const cur = storageService.getItem(STORAGE_KEYS.SALES, []);
          const idx = cur.findIndex((s) => s.id === newSale.id);
          if (idx !== -1) {
            cur[idx].id = res.data._id;
            cur[idx]._id = res.data._id;
            if (res.data.customerId) cur[idx].customerId = res.data.customerId;
            storageService.setItem(STORAGE_KEYS.SALES, cur);
          }
          if (newSale.quotationId) linkQuotationLocal(newSale.quotationId, res.data._id);
        }
        return res;
      })
      .catch((err) => {
        console.warn('[MongoDB Sales sync]:', err.message);
        return null;
      });

    return { success: true, sale: newSale, syncPromise };
  }

  /**
   * Update an existing sale invoice (Customer info, items, pricing, etc.)
   */
  update(id, saleData, performedBy = 'Sales Executive') {
    const sales = this.getAll();
    const index = sales.findIndex((s) => s.id === id || s._id === id);
    if (index === -1) {
      return { success: false, message: 'Sale invoice not found.' };
    }

    const existing = sales[index];
    const prevCustomerId = existing.customerId;
    const items = saleData.items || existing.items || [];
    const { subtotal, discount, tax, total } = calculateSaleTotals(
      items,
      saleData.discount !== undefined ? saleData.discount : existing.discount,
      saleData.tax !== undefined ? saleData.tax : existing.tax || 0
    );
    const totalVal = total;
    const {
      paymentStatus: nextPaymentStatus,
      paidAmount: paidVal,
      dueAmount: dueVal,
    } = calculatePaymentBreakdown({
      total: totalVal,
      paymentStatus: saleData.paymentStatus || existing.paymentStatus || 'paid',
      paidAmount: saleData.paidAmount !== undefined ? saleData.paidAmount : existing.paidAmount || 0,
    });

    const nextInvNo =
      (saleData.invoiceNo || saleData.invoiceNumber || existing.invoiceNo || existing.invoiceNumber || '').trim();

    // Auto-upsert customer profile if details provided
    let customerId = saleData.customerId !== undefined ? saleData.customerId : existing.customerId;
    const custName = saleData.customerName || existing.customerName;
    let custSyncPromise = null;
    if (saleData.autoSaveCustomer !== false && custName && custName.trim() && !isGenericClientName(custName)) {
      const cust = customerService.upsertCustomer({
        id: customerId,
        name: custName,
        companyName: saleData.customerCompany !== undefined ? saleData.customerCompany : existing.customerCompany,
        designationRole: saleData.customerRole || existing.customerRole || 'owner',
        phone: saleData.customerPhone !== undefined ? saleData.customerPhone : existing.customerPhone,
        email: saleData.customerEmail !== undefined ? saleData.customerEmail : existing.customerEmail,
        address: saleData.customerAddress !== undefined ? saleData.customerAddress : existing.customerAddress,
        location: saleData.customerLocation || saleData.customerAddress || existing.customerLocation,
      });
      if (cust && (cust.id || cust._id)) {
        customerId = cust._id || cust.id;
        custSyncPromise = cust._syncPromise;
      }
    }

    const updatedSale = {
      ...existing,
      ...saleData,
      id: existing.id,
      _id: existing._id,
      invoiceNo: nextInvNo,
      invoiceNumber: nextInvNo,
      customerId,
      customerName: custName || 'Walk-in Retail Customer',
      customerCompany: saleData.customerCompany !== undefined ? saleData.customerCompany : existing.customerCompany || '',
      customerRole: saleData.customerRole || existing.customerRole || 'owner',
      customerPhone: saleData.customerPhone !== undefined ? saleData.customerPhone : existing.customerPhone || '',
      customerEmail: saleData.customerEmail !== undefined ? saleData.customerEmail : existing.customerEmail || '',
      customerAddress: saleData.customerAddress !== undefined ? saleData.customerAddress : existing.customerAddress || '',
      customerLocation: saleData.customerLocation !== undefined ? saleData.customerLocation : existing.customerLocation || '',
      items,
      subtotal,
      discount,
      tax,
      total,
      totalAmount: total,
      paidAmount: paidVal,
      dueAmount: dueVal,
      paymentMethod: saleData.paymentMethod || existing.paymentMethod || 'cash',
      paymentStatus: nextPaymentStatus,
      requisitionRef: saleData.requisitionRef !== undefined ? saleData.requisitionRef : existing.requisitionRef || '',
      quotationId: saleData.quotationId !== undefined ? saleData.quotationId : existing.quotationId || null,
      updatedAt: new Date().toISOString(),
    };

    const stockRes = inventoryService.reconcileSaleEditStock(existing, updatedSale, performedBy);
    if (!stockRes.success) {
      return stockRes;
    }

    sales[index] = updatedSale;
    storageService.setItem(STORAGE_KEYS.SALES, sales);

    if (prevCustomerId && String(prevCustomerId) !== String(customerId)) {
      customerService.recalculateFromSales(prevCustomerId);
    }
    if (customerId) {
      customerService.recalculateFromSales(customerId);
    }
    if (updatedSale.quotationId) {
      linkQuotationLocal(updatedSale.quotationId, updatedSale._id || updatedSale.id);
    }

    // Live sync to MongoDB Atlas
    const mongoId = existing._id || existing.id;
    let syncPromise = Promise.resolve(custSyncPromise);
    if (mongoId) {
      syncPromise = Promise.allSettled([
        custSyncPromise,
        apiClient.put(`/sales/${mongoId}`, {
          invoiceNumber: updatedSale.invoiceNumber,
          date: updatedSale.date,
          customerId: updatedSale.customerId,
          customerName: updatedSale.customerName,
          customerCompany: updatedSale.customerCompany,
          customerRole: updatedSale.customerRole,
          customerPhone: updatedSale.customerPhone,
          customerEmail: updatedSale.customerEmail,
          customerAddress: updatedSale.customerAddress,
          customerLocation: updatedSale.customerLocation,
          autoSaveCustomer: saleData.autoSaveCustomer !== false,
          items: (updatedSale.items || []).map((it) => ({
            productId: it.productId || it.id,
            productName: it.productName || it.name,
            sku: it.sku,
            quantity: Number(it.quantity) || 1,
            unit: it.unit || 'pc',
            unitPrice: Number(it.unitPrice || it.sellingPrice || it.price) || 0,
            lineTotal: Number(it.lineTotal || Number(it.quantity || 1) * Number(it.unitPrice || it.price || 0)) || 0,
          })),
          subtotal: updatedSale.subtotal,
          discount: updatedSale.discount,
          tax: updatedSale.tax,
          totalAmount: updatedSale.total,
          total: updatedSale.total,
          paidAmount: updatedSale.paidAmount,
          dueAmount: updatedSale.dueAmount,
          paymentMethod: updatedSale.paymentMethod,
          paymentStatus: updatedSale.paymentStatus,
          status: updatedSale.status,
          requisitionRef: updatedSale.requisitionRef,
          quotationId: updatedSale.quotationId,
          showRate: updatedSale.showRate,
          showLineTotal: updatedSale.showLineTotal,
          showGrandTotal: updatedSale.showGrandTotal,
          notes: updatedSale.notes,
        }),
      ])
        .then(([, saleRes]) => {
          if (saleRes?.status === 'fulfilled' && saleRes.value?.data?._id) {
            const cur = storageService.getItem(STORAGE_KEYS.SALES, []);
            const idx = cur.findIndex((s) => s.id === mongoId || s._id === mongoId);
            if (idx !== -1) {
              cur[idx] = { ...cur[idx], ...saleRes.value.data, id: saleRes.value.data._id, _id: saleRes.value.data._id };
              storageService.setItem(STORAGE_KEYS.SALES, cur);
            }
          }
          return saleRes?.value || null;
        })
        .catch((err) => {
          console.warn('[MongoDB Sales update sync]:', err.message);
          return null;
        });
    }

    return { success: true, sale: updatedSale, syncPromise };
  }

  /**
   * Transition a Draft sale to Completed status: decreases stock
   */
  completeSale(id, performedBy = 'Sales Executive') {
    const sales = this.getAll();
    const index = sales.findIndex((s) => s.id === id || s._id === id);
    if (index === -1) {
      return { success: false, message: 'Sale invoice not found.' };
    }

    const sale = sales[index];
    if (sale.status === 'completed') {
      return { success: false, message: 'This sale has already been completed.' };
    }
    if (sale.status === 'cancelled') {
      return { success: false, message: 'Cancelled sales invoices cannot be completed directly.' };
    }

    const res = inventoryService.processSaleCompletion(sale, performedBy);
    if (!res.success) {
      return res;
    }

    sale.status = 'completed';
    sale.completedAt = new Date().toISOString();
    sale.updatedAt = new Date().toISOString();
    sales[index] = sale;
    storageService.setItem(STORAGE_KEYS.SALES, sales);
    if (sale.customerId) customerService.recalculateFromSales(sale.customerId);

    const mongoId = sale._id || sale.id;
    const syncPromise = apiClient.put(`/sales/${mongoId}`, { status: 'completed' }).catch((err) => {
      console.warn('[MongoDB completeSale sync]:', err.message);
      return null;
    });

    return { success: true, sale, syncPromise };
  }

  /**
   * Cancel a sale invoice
   * If it was already completed, safely restores the inventory back to stock
   */
  cancelSale(id, performedBy = 'Admin') {
    const sales = this.getAll();
    const index = sales.findIndex((s) => s.id === id || s._id === id);
    if (index === -1) {
      return { success: false, message: 'Sale invoice not found.' };
    }

    const sale = sales[index];
    if (sale.status === 'cancelled') {
      return { success: false, message: 'This sale invoice is already cancelled.' };
    }

    if (sale.status === 'completed') {
      const revRes = inventoryService.processSaleCancellation(sale, performedBy);
      if (!revRes.success) {
        return revRes;
      }
    }

    sale.status = 'cancelled';
    sale.cancelledAt = new Date().toISOString();
    sale.updatedAt = new Date().toISOString();
    sales[index] = sale;
    storageService.setItem(STORAGE_KEYS.SALES, sales);
    if (sale.customerId) customerService.recalculateFromSales(sale.customerId);

    const mongoId = sale._id || sale.id;
    const syncPromise = apiClient.put(`/sales/${mongoId}/cancel`, {}).catch((err) => {
      console.warn('[MongoDB cancelSale sync]:', err.message);
      return null;
    });

    return { success: true, sale, syncPromise };
  }
}

export const salesService = new SalesService();
