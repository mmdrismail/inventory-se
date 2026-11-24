import { storageService, STORAGE_KEYS } from './storageService';
import { inventoryService } from './inventoryService';
import { customerService } from './customerService';
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
    const totalVal = total;
    let paidVal = Number(saleData.paidAmount !== undefined ? saleData.paidAmount : (saleData.paymentStatus === 'paid' ? totalVal : (saleData.paymentStatus === 'due' ? 0 : 0)));
    if (saleData.paymentStatus === 'paid') paidVal = totalVal;
    const dueVal = Math.max(0, totalVal - paidVal);

    // Auto-upsert customer profile if details provided
    let customerId = saleData.customerId;
    if (saleData.customerName && saleData.customerName.trim() && saleData.customerName !== 'Walk-in Retail Customer') {
      const cust = customerService.upsertCustomer({
        id: saleData.customerId,
        name: saleData.customerName,
        companyName: saleData.customerCompany,
        designationRole: saleData.customerRole,
        phone: saleData.customerPhone,
        email: saleData.customerEmail,
        address: saleData.customerAddress,
        location: saleData.customerLocation || saleData.customerAddress,
      });
      if (cust && cust.id) {
        customerId = cust.id;
      }
    }

    const isCompleted = saleData.status === 'completed' || !saleData.status;

    const isGenericClientName = (name) => {
      if (!name) return true;
      const n = name.trim().toLowerCase();
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
        customerId = cust.id || cust._id;
      }
    }

    if (customerId && isCompleted) {
      customerService.updateFinancials(customerId, totalVal, paidVal, dueVal);
    }

    const newSale = {
      ...saleData,
      id: `sal-${Date.now()}`,
      invoiceNo: saleData.invoiceNo?.trim() || `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      customerId,
      customerName: saleData.customerName || 'Walk-in Retail Customer',
      customerCompany: saleData.customerCompany || '',
      customerRole: saleData.customerRole || 'owner',
      customerPhone: saleData.customerPhone || '',
      customerAddress: saleData.customerAddress || '',
      customerLocation: saleData.customerLocation || '',
      date: saleData.date || new Date().toISOString(),
      status: saleData.status || 'completed',
      paymentStatus: saleData.paymentStatus || 'paid',
      subtotal,
      discount,
      total,
      paidAmount: paidVal,
      dueAmount: dueVal,
      requisitionRef: saleData.requisitionRef || '',
      quotationId: saleData.quotationId || null,
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
        lineTotal: Number(it.lineTotal || it.subtotal || ((it.quantity || 1) * (it.unitPrice || it.sellingPrice || 0))) || 0,
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
   * Update an existing sale invoice (Customer info, items, pricing, etc.)
   */
  update(id, saleData, performedBy = 'Sales Executive') {
    const sales = this.getAll();
    const index = sales.findIndex((s) => s.id === id || s._id === id);
    if (index === -1) {
      return { success: false, message: 'Sale invoice not found.' };
    }

    const existing = sales[index];
    const items = saleData.items || existing.items || [];
    const { subtotal, discount, total } = calculateSaleTotals(items, saleData.discount !== undefined ? saleData.discount : existing.discount);
    const totalVal = total;
    let paidVal = Number(saleData.paidAmount !== undefined ? saleData.paidAmount : (saleData.paymentStatus === 'paid' ? totalVal : (saleData.paymentStatus === 'due' ? 0 : existing.paidAmount || 0)));
    if (saleData.paymentStatus === 'paid') paidVal = totalVal;
    const dueVal = Math.max(0, totalVal - paidVal);

    // Auto-upsert customer profile if details provided
    let customerId = saleData.customerId !== undefined ? saleData.customerId : existing.customerId;
    const custName = saleData.customerName || existing.customerName;
    if (custName && custName.trim() && custName !== 'Walk-in Retail Customer') {
      const cust = customerService.upsertCustomer({
        id: customerId,
        name: custName,
        companyName: saleData.customerCompany !== undefined ? saleData.customerCompany : existing.customerCompany,
        designationRole: saleData.customerRole || existing.customerRole,
        phone: saleData.customerPhone !== undefined ? saleData.customerPhone : existing.customerPhone,
        email: saleData.customerEmail !== undefined ? saleData.customerEmail : existing.customerEmail,
        address: saleData.customerAddress !== undefined ? saleData.customerAddress : existing.customerAddress,
        location: saleData.customerLocation || saleData.customerAddress || existing.customerLocation,
      });
      if (cust && cust.id) {
        customerId = cust.id;
      }
    }

    const updatedSale = {
      ...existing,
      ...saleData,
      id: existing.id,
      _id: existing._id,
      invoiceNo: existing.invoiceNo,
      customerId,
      customerName: custName || 'Walk-in Retail Customer',
      customerCompany: saleData.customerCompany !== undefined ? saleData.customerCompany : (existing.customerCompany || ''),
      customerRole: saleData.customerRole || existing.customerRole || 'owner',
      customerPhone: saleData.customerPhone !== undefined ? saleData.customerPhone : (existing.customerPhone || ''),
      customerAddress: saleData.customerAddress !== undefined ? saleData.customerAddress : (existing.customerAddress || ''),
      customerLocation: saleData.customerLocation !== undefined ? saleData.customerLocation : (existing.customerLocation || ''),
      items,
      subtotal,
      discount: saleData.discount !== undefined ? Number(saleData.discount) : (existing.discount || 0),
      total,
      totalAmount: total,
      paidAmount: paidVal,
      dueAmount: dueVal,
      paymentStatus: saleData.paymentStatus || existing.paymentStatus || 'paid',
      updatedAt: new Date().toISOString(),
    };

    if (
      saleData.autoSaveCustomer !== false &&
      custName &&
      custName.trim() &&
      !isGenericClientName(custName)
    ) {
      customerService.upsertCustomer({
        id: customerId,
        name: custName,
        companyName: updatedSale.customerCompany,
        designationRole: updatedSale.customerRole,
        phone: updatedSale.customerPhone,
        email: updatedSale.customerEmail,
        address: updatedSale.customerAddress,
        location: updatedSale.customerLocation || updatedSale.customerAddress,
      });
    }

    sales[index] = updatedSale;
    storageService.setItem(STORAGE_KEYS.SALES, sales);

    // Live sync to MongoDB Atlas
    const mongoId = existing._id || existing.id;
    if (mongoId) {
      apiClient.put(`/sales/${mongoId}`, {
        customerId: updatedSale.customerId,
        customerName: updatedSale.customerName,
        customerCompany: updatedSale.customerCompany,
        customerRole: updatedSale.customerRole,
        customerPhone: updatedSale.customerPhone,
        customerEmail: updatedSale.customerEmail,
        customerAddress: updatedSale.customerAddress,
        customerLocation: updatedSale.customerLocation,
        items: (updatedSale.items || []).map((it) => ({
          productId: it.productId || it.id,
          productName: it.productName || it.name,
          sku: it.sku,
          quantity: Number(it.quantity) || 1,
          unitPrice: Number(it.unitPrice || it.sellingPrice || it.price) || 0,
          lineTotal: Number(it.lineTotal || (Number(it.quantity || 1) * Number(it.unitPrice || it.price || 0))) || 0,
        })),
        subtotal: updatedSale.subtotal,
        discount: updatedSale.discount,
        totalAmount: updatedSale.total,
        paymentStatus: updatedSale.paymentStatus,
        status: updatedSale.status,
        notes: updatedSale.notes,
      }).catch((err) => {
        console.warn('[MongoDB Sales update sync]:', err.message);
      });
    }

    return { success: true, sale: updatedSale };
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
