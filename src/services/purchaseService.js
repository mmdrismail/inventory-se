import { storageService, STORAGE_KEYS } from './storageService';
import { inventoryService } from './inventoryService';
import { calculatePurchaseTotals } from '../utils/calculations';

class PurchaseService {
  getAll() {
    return storageService.getItem(STORAGE_KEYS.PURCHASES, []);
  }

  getById(id) {
    const purchases = this.getAll();
    return purchases.find((p) => p.id === id) || null;
  }

  create(purchaseData, performedBy = 'Purchasing Agent') {
    const purchases = this.getAll();
    const { subtotal, total } = calculatePurchaseTotals(purchaseData.items || []);

    const newPurchase = {
      ...purchaseData,
      id: `pur-${Date.now()}`,
      referenceNo: purchaseData.referenceNo?.trim() || `PO-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      date: purchaseData.date || new Date().toISOString(),
      status: purchaseData.status || 'draft', // 'draft' | 'received' | 'cancelled'
      paymentStatus: purchaseData.paymentStatus || 'pending',
      subtotal,
      total,
      notes: purchaseData.notes?.trim() || '',
      createdAt: new Date().toISOString(),
    };

    // If created directly in "received" status, immediately increase stock and log movement
    if (newPurchase.status === 'received') {
      const res = inventoryService.processPurchaseReceipt(newPurchase, performedBy);
      if (!res.success) {
        return res;
      }
      newPurchase.receivedAt = new Date().toISOString();
    }

    purchases.unshift(newPurchase);
    storageService.setItem(STORAGE_KEYS.PURCHASES, purchases);
    return { success: true, purchase: newPurchase };
  }

  /**
   * Transition a Draft purchase to Received status: increases inventory
   */
  receivePurchase(id, performedBy = 'Purchasing Staff') {
    const purchases = this.getAll();
    const index = purchases.findIndex((p) => p.id === id);
    if (index === -1) {
      return { success: false, message: 'Purchase not found.' };
    }

    const purchase = purchases[index];
    if (purchase.status === 'received') {
      return { success: false, message: 'This purchase order has already been marked as received.' };
    }
    if (purchase.status === 'cancelled') {
      return { success: false, message: 'Cancelled purchase orders cannot be received directly.' };
    }

    const res = inventoryService.processPurchaseReceipt(purchase, performedBy);
    if (!res.success) {
      return res;
    }

    purchase.status = 'received';
    purchase.receivedAt = new Date().toISOString();
    purchases[index] = purchase;
    storageService.setItem(STORAGE_KEYS.PURCHASES, purchases);

    return { success: true, purchase };
  }

  /**
   * Cancel a purchase order
   * If it was already received, reverse the stock addition safely
   */
  cancelPurchase(id, performedBy = 'Admin') {
    const purchases = this.getAll();
    const index = purchases.findIndex((p) => p.id === id);
    if (index === -1) {
      return { success: false, message: 'Purchase not found.' };
    }

    const purchase = purchases[index];
    if (purchase.status === 'cancelled') {
      return { success: false, message: 'This purchase is already cancelled.' };
    }

    if (purchase.status === 'received') {
      const revRes = inventoryService.processPurchaseCancellation(purchase, performedBy);
      if (!revRes.success) {
        return revRes;
      }
    }

    purchase.status = 'cancelled';
    purchase.cancelledAt = new Date().toISOString();
    purchases[index] = purchase;
    storageService.setItem(STORAGE_KEYS.PURCHASES, purchases);

    return { success: true, purchase };
  }
}

export const purchaseService = new PurchaseService();
