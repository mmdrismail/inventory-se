import { storageService, STORAGE_KEYS } from './storageService';
import { apiClient } from './apiClient';

/**
 * Inventory Service
 * Single source of truth for stock quantities, balance adjustments,
 * and movement audit logs.
 */
class InventoryService {
  getMovements() {
    return storageService.getItem(STORAGE_KEYS.INVENTORY_MOVEMENTS, []);
  }

  recordMovement({ productId, productName, sku, type, quantityChange, balanceAfter, referenceId, reason, performedBy }) {
    const movements = this.getMovements();
    const newMovement = {
      id: `mov-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      productId,
      productName,
      sku,
      type, // 'purchase_in' | 'sale_out' | 'adjustment' | 'order_deduct' | 'order_cancel_restore' | 'purchase_cancel_reversal' | 'sale_cancel_reversal'
      quantityChange,
      balanceAfter,
      referenceId: referenceId || 'MANUAL',
      reason: reason || 'Inventory update',
      timestamp: new Date().toISOString(),
      performedBy: performedBy || 'System Operator',
    };

    movements.unshift(newMovement);
    storageService.setItem(STORAGE_KEYS.INVENTORY_MOVEMENTS, movements);
    return newMovement;
  }

  /**
   * Manual Stock Adjustment
   * type: 'add' (increase), 'reduce' (decrease), 'correction' (set explicit value)
   */
  adjustStock({ productId, type, quantity, reason, performedBy }) {
    const products = storageService.getItem(STORAGE_KEYS.PRODUCTS, []);
    const product = products.find((p) => p.id === productId);

    if (!product) {
      return { success: false, message: 'Product not found.' };
    }

    const currentQty = Number(product.quantity) || 0;
    const inputQty = Number(quantity);

    if (isNaN(inputQty) || inputQty < 0) {
      return { success: false, message: 'Quantity must be a valid non-negative number.' };
    }

    let newQty = currentQty;
    let qtyChange = 0;

    if (type === 'add') {
      newQty = currentQty + inputQty;
      qtyChange = inputQty;
    } else if (type === 'reduce') {
      if (currentQty - inputQty < 0) {
        return { success: false, message: `Cannot reduce by ${inputQty}. Current available stock is only ${currentQty}.` };
      }
      newQty = currentQty - inputQty;
      qtyChange = -inputQty;
    } else if (type === 'correction') {
      newQty = inputQty;
      qtyChange = newQty - currentQty;
    } else {
      return { success: false, message: 'Invalid adjustment type.' };
    }

    product.quantity = newQty;
    storageService.setItem(STORAGE_KEYS.PRODUCTS, products);

    this.recordMovement({
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      type: 'adjustment',
      quantityChange: qtyChange,
      balanceAfter: newQty,
      referenceId: `adj-${Date.now()}`,
      reason: reason || `Stock adjusted via ${type}`,
      performedBy: performedBy || 'Manager',
    });

    // Live sync to MongoDB Atlas
    apiClient.post('/inventory/adjust', {
      productId: product._id || product.id,
      mode: type === 'reduce' ? 'deduct' : type === 'correction' ? 'set' : type,
      quantity: inputQty,
      reason: reason || `Stock adjusted via ${type}`,
    }).catch((err) => {
      console.warn('[MongoDB Inventory adjust notice]:', err.message);
    });

    return { success: true, product, newQuantity: newQty };
  }

  /**
   * Process receiving a purchase: increases stock
   */
  processPurchaseReceipt(purchase, performedBy = 'Purchasing Staff') {
    const products = storageService.getItem(STORAGE_KEYS.PRODUCTS, []);
    const movements = this.getMovements();

    // Verify all products exist
    for (const item of purchase.items) {
      const p = products.find((prod) => prod.id === item.productId);
      if (!p) {
        return { success: false, message: `Product ${item.productName || item.productId} was not found in catalog.` };
      }
    }

    // Apply stock additions
    purchase.items.forEach((item) => {
      const p = products.find((prod) => prod.id === item.productId);
      const prevQty = Number(p.quantity) || 0;
      const addQty = Number(item.quantity) || 0;
      p.quantity = prevQty + addQty;

      movements.unshift({
        id: `mov-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        productId: p.id,
        productName: p.name,
        sku: p.sku,
        type: 'purchase_in',
        quantityChange: addQty,
        balanceAfter: p.quantity,
        referenceId: purchase.id,
        reason: `Received purchase ${purchase.referenceNo || purchase.id}`,
        timestamp: new Date().toISOString(),
        performedBy,
      });
    });

    storageService.setItem(STORAGE_KEYS.PRODUCTS, products);
    storageService.setItem(STORAGE_KEYS.INVENTORY_MOVEMENTS, movements);

    return { success: true, updatedProducts: products };
  }

  /**
   * Safely reverse received purchase if cancelled
   */
  processPurchaseCancellation(purchase, performedBy = 'Admin') {
    const products = storageService.getItem(STORAGE_KEYS.PRODUCTS, []);
    const movements = this.getMovements();

    // Check if cancellation would cause negative stock
    for (const item of purchase.items) {
      const p = products.find((prod) => prod.id === item.productId);
      if (p) {
        const afterCancel = (Number(p.quantity) || 0) - (Number(item.quantity) || 0);
        if (afterCancel < 0) {
          return {
            success: false,
            message: `Cannot cancel purchase: product "${p.name}" has only ${p.quantity} units in stock. Reversing ${item.quantity} would result in negative stock.`,
          };
        }
      }
    }

    purchase.items.forEach((item) => {
      const p = products.find((prod) => prod.id === item.productId);
      if (p) {
        const decQty = Number(item.quantity) || 0;
        p.quantity = (Number(p.quantity) || 0) - decQty;

        movements.unshift({
          id: `mov-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          productId: p.id,
          productName: p.name,
          sku: p.sku,
          type: 'purchase_cancel_reversal',
          quantityChange: -decQty,
          balanceAfter: p.quantity,
          referenceId: purchase.id,
          reason: `Reversed stock for cancelled purchase ${purchase.referenceNo || purchase.id}`,
          timestamp: new Date().toISOString(),
          performedBy,
        });
      }
    });

    storageService.setItem(STORAGE_KEYS.PRODUCTS, products);
    storageService.setItem(STORAGE_KEYS.INVENTORY_MOVEMENTS, movements);
    return { success: true, updatedProducts: products };
  }

  /**
   * Process completing a sale: decreases stock
   */
  processSaleCompletion(sale, performedBy = 'Sales Executive') {
    const products = storageService.getItem(STORAGE_KEYS.PRODUCTS, []);
    const movements = this.getMovements();

    // Validate sufficient stock for inventory-tracked items
    for (const item of sale.items) {
      const p = products.find((prod) => prod.id === item.productId);
      if (p) {
        const available = Number(p.quantity) || 0;
        const requested = Number(item.quantity) || 0;
        if (requested > available) {
          return {
            success: false,
            message: `Insufficient stock for "${p.name}". Requested: ${requested}, Available: ${available}.`,
          };
        }
      }
    }

    // Deduct stock for inventory-tracked items
    sale.items.forEach((item) => {
      const p = products.find((prod) => prod.id === item.productId);
      if (p) {
        const req = Number(item.quantity) || 0;
        p.quantity = (Number(p.quantity) || 0) - req;

        movements.unshift({
          id: `mov-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          productId: p.id,
          productName: p.name,
          sku: p.sku,
          type: 'sale_out',
          quantityChange: -req,
          balanceAfter: p.quantity,
          referenceId: sale.id,
          reason: `Completed Sale Invoice ${sale.invoiceNo || sale.id}`,
          timestamp: new Date().toISOString(),
          performedBy,
        });
      }
    });

    storageService.setItem(STORAGE_KEYS.PRODUCTS, products);
    storageService.setItem(STORAGE_KEYS.INVENTORY_MOVEMENTS, movements);

    return { success: true, updatedProducts: products };
  }

  /**
   * Safely reverse completed sale if cancelled
   */
  processSaleCancellation(sale, performedBy = 'Admin') {
    const products = storageService.getItem(STORAGE_KEYS.PRODUCTS, []);
    const movements = this.getMovements();

    sale.items.forEach((item) => {
      const p = products.find((prod) => prod.id === item.productId);
      if (p) {
        const restoreQty = Number(item.quantity) || 0;
        p.quantity = (Number(p.quantity) || 0) + restoreQty;

        movements.unshift({
          id: `mov-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          productId: p.id,
          productName: p.name,
          sku: p.sku,
          type: 'sale_cancel_reversal',
          quantityChange: restoreQty,
          balanceAfter: p.quantity,
          referenceId: sale.id,
          reason: `Restored stock for cancelled sale ${sale.invoiceNo || sale.id}`,
          timestamp: new Date().toISOString(),
          performedBy,
        });
      }
    });

    storageService.setItem(STORAGE_KEYS.PRODUCTS, products);
    storageService.setItem(STORAGE_KEYS.INVENTORY_MOVEMENTS, movements);
    return { success: true, updatedProducts: products };
  }

  /**
   * Reconcile inventory deltas when an existing sale invoice is edited
   * Only adjusts catalog-tracked products when status is or was 'completed'.
   */
  reconcileSaleEditStock(prevSale, nextSale, performedBy = 'Sales Executive') {
    const products = storageService.getItem(STORAGE_KEYS.PRODUCTS, []);
    const movements = this.getMovements();
    const resolveTrackedProduct = (pid) =>
      pid && pid !== 'custom' && pid !== 'custom-item'
        ? products.find((prod) => prod.id === pid || prod._id === pid)
        : null;

    const buildQtyMap = (saleObj) => {
      const map = new Map();
      if (!saleObj || saleObj.status !== 'completed') return map;
      for (const item of saleObj.items || []) {
        const prod = resolveTrackedProduct(item.productId);
        if (!prod) continue;
        const key = prod.id;
        map.set(key, (map.get(key) || 0) + (Number(item.quantity) || 0));
      }
      return map;
    };

    const oldMap = buildQtyMap(prevSale);
    const newMap = buildQtyMap(nextSale);
    const allProductKeys = new Set([...oldMap.keys(), ...newMap.keys()]);

    // Pre-validate positive stock deductions
    for (const key of allProductKeys) {
      const delta = (newMap.get(key) || 0) - (oldMap.get(key) || 0);
      if (delta > 0) {
        const prod = products.find((p) => p.id === key);
        const available = Number(prod?.quantity) || 0;
        if (delta > available) {
          return {
            success: false,
            message: `Insufficient stock for "${prod.name}". Additional needed: ${delta}, Available: ${available}.`,
          };
        }
      }
    }

    let changed = false;
    const invLabel = nextSale?.invoiceNo || nextSale?.invoiceNumber || nextSale?.id || 'Invoice';
    for (const key of allProductKeys) {
      const delta = (newMap.get(key) || 0) - (oldMap.get(key) || 0);
      if (delta === 0) continue;
      const prod = products.find((p) => p.id === key);
      if (!prod) continue;

      prod.quantity = Math.max(0, (Number(prod.quantity) || 0) - delta);
      changed = true;
      movements.unshift({
        id: `mov-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        productId: prod.id,
        productName: prod.name,
        sku: prod.sku,
        type: delta > 0 ? 'sale_out' : 'sale_cancel_reversal',
        quantityChange: -delta,
        balanceAfter: prod.quantity,
        referenceId: nextSale?.id || invLabel,
        reason: `Invoice edit stock adjustment (${invLabel})`,
        timestamp: new Date().toISOString(),
        performedBy,
      });
    }

    if (changed) {
      storageService.setItem(STORAGE_KEYS.PRODUCTS, products);
      storageService.setItem(STORAGE_KEYS.INVENTORY_MOVEMENTS, movements);
    }
    return { success: true, updatedProducts: products };
  }
}

export const inventoryService = new InventoryService();
