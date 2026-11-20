import { storageService, STORAGE_KEYS } from './storageService';
import { inventoryService } from './inventoryService';
import { apiClient } from './apiClient';

/**
 * Order Stock Reservation Policy:
 * - Orders created from storefront default to 'pending' (or 'confirmed' if immediate cash-on-delivery policy is selected).
 * - When an order enters 'confirmed', 'processing', 'ready', or 'completed' status, stock is deducted ONCE,
 *   and order.stockDeducted is flagged as true.
 * - If an order with stockDeducted: true is 'cancelled', the exact items are restored to stock ONCE,
 *   and order.stockDeducted is flagged as false.
 * - This guarantees that stock is never deducted or restored multiple times regardless of status transitions.
 */
class OrderService {
  getAll() {
    return storageService.getItem(STORAGE_KEYS.ORDERS, []);
  }

  getById(id) {
    const orders = this.getAll();
    return orders.find((o) => o.id === id) || null;
  }

  getCustomerOrders(customerId, customerEmail) {
    const orders = this.getAll();
    return orders.filter(
      (o) =>
        (customerId && o.customerId === customerId) ||
        (customerEmail && o.email?.toLowerCase() === customerEmail.toLowerCase())
    );
  }

  create(orderData, autoConfirm = false) {
    const orders = this.getAll();
    const subtotal = orderData.items.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 1), 0);
    const shippingFee = orderData.shippingFee !== undefined ? Number(orderData.shippingFee) : 60;
    const total = subtotal + shippingFee;

    const newOrder = {
      ...orderData,
      id: `ord-${Date.now()}`,
      orderNumber: `ORD-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      date: new Date().toISOString(),
      status: autoConfirm ? 'confirmed' : (orderData.status || 'pending'),
      paymentMethod: orderData.paymentMethod || 'Cash on Delivery (Simulated)',
      paymentStatus: orderData.paymentStatus || 'unpaid',
      subtotal,
      shippingFee,
      total,
      stockDeducted: false,
      notes: orderData.notes?.trim() || '',
      createdAt: new Date().toISOString(),
    };

    // If autoConfirm or status is confirmed/processing/completed, deduct stock
    if (['confirmed', 'processing', 'ready', 'completed'].includes(newOrder.status)) {
      this.deductOrderStock(newOrder);
      newOrder.stockDeducted = true;
    }

    orders.unshift(newOrder);
    storageService.setItem(STORAGE_KEYS.ORDERS, orders);

    // Live sync to MongoDB Atlas
    apiClient.post('/orders', {
      customerName: newOrder.customerName || 'Storefront Customer',
      customerEmail: newOrder.email || 'customer@stockline.com',
      customerPhone: newOrder.phone || '',
      shippingAddress: newOrder.shippingAddress || newOrder.address || 'Standard Delivery',
      items: (newOrder.items || []).map((it) => ({
        productId: it.productId || it.id,
        name: it.productName || it.name,
        productName: it.productName || it.name,
        sku: it.sku,
        quantity: Number(it.quantity) || 1,
        price: Number(it.price || it.sellingPrice) || 0,
        unitPrice: Number(it.price || it.sellingPrice) || 0,
        lineTotal: Number(it.lineTotal || ((it.quantity || 1) * (it.price || it.sellingPrice || 0))) || 0,
      })),
      totalAmount: newOrder.total,
      shippingFee: newOrder.shippingFee,
      paymentMethod: newOrder.paymentMethod,
      status: newOrder.status,
      notes: newOrder.notes,
    }).then((res) => {
      if (res?.data?._id) {
        const cur = storageService.getItem(STORAGE_KEYS.ORDERS, []);
        const idx = cur.findIndex((o) => o.id === newOrder.id);
        if (idx !== -1) {
          cur[idx].id = res.data._id;
          cur[idx]._id = res.data._id;
          storageService.setItem(STORAGE_KEYS.ORDERS, cur);
        }
      }
    }).catch((err) => {
      console.warn('[MongoDB Order sync]:', err.message);
    });

    return { success: true, order: newOrder };
  }

  updateStatus(id, newStatus, performedBy = 'Staff') {
    const orders = this.getAll();
    const index = orders.findIndex((o) => o.id === id);
    if (index === -1) {
      return { success: false, message: 'Order not found.' };
    }

    const order = orders[index];
    const prevStatus = order.status;

    if (prevStatus === newStatus) {
      return { success: true, order };
    }

    const isFulfilling = ['confirmed', 'processing', 'ready', 'completed'].includes(newStatus);

    // If moving into fulfilling status and stock wasn't deducted yet: deduct now
    if (isFulfilling && !order.stockDeducted) {
      const deductRes = this.deductOrderStock(order, performedBy);
      if (!deductRes.success) {
        return deductRes;
      }
      order.stockDeducted = true;
    }

    // If moving into cancelled status and stock was previously deducted: restore now
    if (newStatus === 'cancelled' && order.stockDeducted) {
      this.restoreOrderStock(order, performedBy);
      order.stockDeducted = false;
    }

    order.status = newStatus;
    order.updatedAt = new Date().toISOString();
    orders[index] = order;
    storageService.setItem(STORAGE_KEYS.ORDERS, orders);

    return { success: true, order };
  }

  deductOrderStock(order, performedBy = 'Order Fulfillment') {
    const products = storageService.getItem(STORAGE_KEYS.PRODUCTS, []);
    const movements = inventoryService.getMovements();

    // Check availability
    for (const item of order.items) {
      const p = products.find((prod) => prod.id === item.productId);
      if (p) {
        const available = Number(p.quantity) || 0;
        const requested = Number(item.quantity) || 0;
        if (requested > available) {
          return {
            success: false,
            message: `Insufficient inventory for "${p.name}". Available: ${available}, Required: ${requested}.`,
          };
        }
      }
    }

    // Deduct
    order.items.forEach((item) => {
      const p = products.find((prod) => prod.id === item.productId);
      if (p) {
        const req = Number(item.quantity) || 0;
        p.quantity = Math.max(0, (Number(p.quantity) || 0) - req);

        movements.unshift({
          id: `mov-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          productId: p.id,
          productName: p.name,
          sku: p.sku,
          type: 'sale_out',
          quantityChange: -req,
          balanceAfter: p.quantity,
          referenceId: order.orderNumber || order.id,
          reason: `Reserved/Fulfilled Customer Order ${order.orderNumber || order.id}`,
          timestamp: new Date().toISOString(),
          performedBy,
        });
      }
    });

    storageService.setItem(STORAGE_KEYS.PRODUCTS, products);
    storageService.setItem(STORAGE_KEYS.INVENTORY_MOVEMENTS, movements);
    return { success: true };
  }

  restoreOrderStock(order, performedBy = 'Order Cancellation') {
    const products = storageService.getItem(STORAGE_KEYS.PRODUCTS, []);
    const movements = inventoryService.getMovements();

    order.items.forEach((item) => {
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
          referenceId: order.orderNumber || order.id,
          reason: `Restored stock for cancelled Order ${order.orderNumber || order.id}`,
          timestamp: new Date().toISOString(),
          performedBy,
        });
      }
    });

    storageService.setItem(STORAGE_KEYS.PRODUCTS, products);
    storageService.setItem(STORAGE_KEYS.INVENTORY_MOVEMENTS, movements);
    return { success: true };
  }
}

export const orderService = new OrderService();
