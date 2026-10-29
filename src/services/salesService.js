import { storageService, STORAGE_KEYS } from './storageService';
import { inventoryService } from './inventoryService';
import { calculateSaleTotals } from '../utils/calculations';
import { apiClient } from './apiClient';

class SalesService {
  getAll() {
    return storageService.getItem(STORAGE_KEYS.SALES, []);
  }

  getById(id) {
    const sales = this.getAll();
    return sales.find((s) => s.id === id) || null;
  }

  create(saleData, performedBy = 'Sales Executive') {
    const sales = this.getAll();
    const { subtotal, discount, total } = calculateSaleTotals(saleData.items || [], saleData.discount);

    const newSale = {
      ...saleData,
      id: `sal-${Date.now()}`,
      invoiceNo: saleData.invoiceNo?.trim() || `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      date: saleData.date || new Date().toISOString(),
      status: saleData.status || 'completed', // 'completed' | 'draft' | 'cancelled'
      paymentStatus: saleData.paymentStatus || 'paid',
      subtotal,
      discount,
      total,
      notes: saleData.notes?.trim() || '',
      createdAt: new Date().toISOString(),
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

    // Live sync to MongoDB Atlas
    apiClient.post('/sales', {
      customerId: newSale.customerId,
      items: (newSale.items || []).map((it) => ({
        productId: it.productId || it.id,
        productName: it.productName || it.name,
        sku: it.sku,
        quantity: Number(it.quantity) || 1,
        unitPrice: Number(it.unitPrice || it.sellingPrice) || 0,
        subtotal: Number(it.subtotal || (it.quantity * it.unitPrice)) || 0,
      })),
      subtotal: newSale.subtotal,
      discount: newSale.discount,
      totalAmount: newSale.total,
      paymentMethod: newSale.paymentMethod || 'cash',
      paymentStatus: newSale.paymentStatus,
      status: newSale.status,
      notes: newSale.notes,
    }).then((res) => {
      if (res?.data?._id) {
        const cur = storageService.getItem(STORAGE_KEYS.SALES, []);
        const idx = cur.findIndex((s) => s.id === newSale.id);
        if (idx !== -1) {
          cur[idx].id = res.data._id;
          cur[idx]._id = res.data._id;
          storageService.setItem(STORAGE_KEYS.SALES, cur);
        }
      }
    }).catch((err) => {
      console.warn('[MongoDB Sales sync]:', err.message);
    });

    return { success: true, sale: newSale };
  }

  /**
   * Transition a Draft sale to Completed status: decreases stock
   */
  completeSale(id, performedBy = 'Sales Executive') {
    const sales = this.getAll();
    const index = sales.findIndex((s) => s.id === id);
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
    sales[index] = sale;
    storageService.setItem(STORAGE_KEYS.SALES, sales);

    return { success: true, sale };
  }

  /**
   * Cancel a sale invoice
   * If it was already completed, safely restores the inventory back to stock
   */
  cancelSale(id, performedBy = 'Admin') {
    const sales = this.getAll();
    const index = sales.findIndex((s) => s.id === id);
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
    sales[index] = sale;
    storageService.setItem(STORAGE_KEYS.SALES, sales);

    return { success: true, sale };
  }
}

export const salesService = new SalesService();
