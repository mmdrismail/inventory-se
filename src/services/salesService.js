import { storageService, STORAGE_KEYS } from './storageService';
import { inventoryService } from './inventoryService';
import { calculateSaleTotals } from '../utils/calculations';

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
