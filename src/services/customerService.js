import { storageService, STORAGE_KEYS } from './storageService';
import { apiClient } from './apiClient';

class CustomerService {
  getAll() {
    return storageService.getItem(STORAGE_KEYS.CUSTOMERS, []);
  }

  getById(id) {
    const customers = this.getAll();
    return customers.find((c) => c.id === id || c._id === id) || null;
  }

  create(data) {
    const customers = this.getAll();
    const now = new Date().toISOString();
    const newCustomer = {
      ...data,
      id: data.id || `cust-${Date.now()}`,
      name: (data.name || '').trim(),
      companyName: (data.companyName || data.company || '').trim(),
      designationRole: data.designationRole || data.customerRole || data.role || 'owner',
      phone: (data.phone || data.companyPhone || '').trim(),
      companyPhone: (data.companyPhone || data.phone || '').trim(),
      email: (data.email || '').trim(),
      address: (data.address || '').trim(),
      location: (data.location || data.address || '').trim(),
      city: (data.city || '').trim(),
      customerType: data.customerType || 'Retail',
      type: data.type || (data.companyName ? 'corporate' : 'retail'),
      totalDue: Number(data.totalDue) || 0,
      balance: Number(data.balance !== undefined ? data.balance : data.totalDue) || 0,
      totalSales: Number(data.totalSales) || 0,
      totalPaid: Number(data.totalPaid) || 0,
      notes: (data.notes || '').trim(),
      createdAt: data.createdAt || now,
      updatedAt: now,
    };

    customers.unshift(newCustomer);
    storageService.setItem(STORAGE_KEYS.CUSTOMERS, customers);

    // Live sync to MongoDB Atlas with full corporate profile
    const syncPromise = apiClient
      .post(
        '/customers',
        {
          id: newCustomer.id,
          name: newCustomer.name,
          companyName: newCustomer.companyName,
          designationRole: newCustomer.designationRole,
          phone: newCustomer.phone,
          companyPhone: newCustomer.companyPhone,
          email: newCustomer.email,
          address: newCustomer.address,
          location: newCustomer.location,
          city: newCustomer.city,
          customerType: newCustomer.customerType,
          type: newCustomer.type,
          totalDue: newCustomer.totalDue,
          balance: newCustomer.balance,
          notes: newCustomer.notes,
        },
        { tempId: newCustomer.id, storageKey: STORAGE_KEYS.CUSTOMERS }
      )
      .then((res) => {
        if (res?.data?._id) {
          const cur = storageService.getItem(STORAGE_KEYS.CUSTOMERS, []);
          const idx = cur.findIndex((c) => c.id === newCustomer.id || c.name === newCustomer.name);
          if (idx !== -1) {
            cur[idx].id = res.data._id;
            cur[idx]._id = res.data._id;
            storageService.setItem(STORAGE_KEYS.CUSTOMERS, cur);
          }
        }
        return res;
      })
      .catch((err) => {
        console.warn('[MongoDB Customer sync]:', err.message);
        return null;
      });

    return { success: true, customer: newCustomer, syncPromise };
  }

  update(id, updates) {
    const customers = this.getAll();
    const index = customers.findIndex((c) => c.id === id || c._id === id);
    if (index === -1) {
      return { success: false, message: 'Customer not found.' };
    }

    const updatedRecord = {
      ...customers[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    customers[index] = updatedRecord;

    storageService.setItem(STORAGE_KEYS.CUSTOMERS, customers);

    // Live sync to MongoDB Atlas
    const targetId = updatedRecord._id || updatedRecord.id || id;
    const payload = { ...updates };
    // Ensure backend fallback resolution has name/phone if temp ID is used
    if (!/^[a-f\d]{24}$/i.test(String(targetId))) {
      if (payload.name === undefined) payload.name = updatedRecord.name;
      if (payload.phone === undefined && updatedRecord.phone) payload.phone = updatedRecord.phone;
    }

    const syncPromise = apiClient
      .put(`/customers/${targetId}`, payload)
      .then((res) => {
        if (res?.data?._id) {
          const cur = storageService.getItem(STORAGE_KEYS.CUSTOMERS, []);
          const curIdx = cur.findIndex((c) => c.id === targetId || c._id === targetId || c._id === res.data._id);
          if (curIdx !== -1) {
            cur[curIdx] = { ...cur[curIdx], ...res.data, id: res.data._id, _id: res.data._id };
            storageService.setItem(STORAGE_KEYS.CUSTOMERS, cur);
          }
        }
        return res;
      })
      .catch((err) => {
        console.warn('[MongoDB Customer update notice]:', err.message);
        return null;
      });

    return { success: true, customer: updatedRecord, syncPromise };
  }

  remove(id) {
    const customers = this.getAll();
    const customer = customers.find((c) => c.id === id || c._id === id);
    if (!customer) {
      return { success: false, message: 'Customer not found.' };
    }

    const custIds = new Set([customer.id, customer._id, id].filter(Boolean));

    // Safety check: sales history
    const sales = storageService.getItem(STORAGE_KEYS.SALES, []);
    const customerSales = sales.filter((s) => custIds.has(s.customerId));
    if (customerSales.length > 0) {
      return {
        success: false,
        message: `Cannot delete "${customer.name}" because ${customerSales.length} past sales invoices are linked to this customer account.`,
      };
    }

    // Safety check: order history
    const orders = storageService.getItem(STORAGE_KEYS.ORDERS, []);
    const customerOrders = orders.filter((o) => custIds.has(o.customerId));
    if (customerOrders.length > 0) {
      return {
        success: false,
        message: `Cannot delete "${customer.name}" because ${customerOrders.length} customer order(s) exist.`,
      };
    }

    const filtered = customers.filter((c) => c.id !== id && c._id !== id);
    storageService.setItem(STORAGE_KEYS.CUSTOMERS, filtered);

    // Live sync to MongoDB Atlas
    const targetId = customer._id || customer.id || id;
    const syncPromise = apiClient.delete(`/customers/${targetId}`).catch((err) => {
      console.warn('[MongoDB Customer delete notice]:', err.message);
      return null;
    });

    return { success: true, message: `Customer "${customer.name}" removed.`, syncPromise };
  }

  getCustomerSales(customerId) {
    const sales = storageService.getItem(STORAGE_KEYS.SALES, []);
    return sales.filter((s) => s.customerId === customerId);
  }

  getCustomerOrders(customerId) {
    const orders = storageService.getItem(STORAGE_KEYS.ORDERS, []);
    return orders.filter((o) => o.customerId === customerId);
  }

  /**
   * Upsert customer from Sales or Quotation form
   */
  upsertCustomer(data) {
    if (!data.name || !data.name.trim() || data.name === 'Walk-in Retail Customer') {
      return null;
    }
    const customers = this.getAll();
    let existing = null;
    if (data.id) {
      existing = customers.find((c) => c.id === data.id || c._id === data.id);
    }
    if (!existing && data.phone && String(data.phone).trim()) {
      const cleanP = String(data.phone).replace(/\D/g, '');
      existing = customers.find((c) => {
        if (!c.phone) return false;
        const cp = String(c.phone).replace(/\D/g, '');
        return cp && (cp === cleanP || cp.slice(-10) === cleanP.slice(-10));
      });
    }
    if (!existing && data.name) {
      existing = customers.find((c) => c.name && c.name.toLowerCase().trim() === data.name.toLowerCase().trim());
    }

    if (existing) {
      const updates = {
        name: data.name.trim(),
        companyName: data.companyName !== undefined && data.companyName.trim() ? data.companyName.trim() : (existing.companyName || ''),
        designationRole:
          data.designationRole !== undefined
            ? data.designationRole
            : data.customerRole !== undefined
            ? data.customerRole
            : existing.designationRole || 'owner',
        phone: data.phone !== undefined && data.phone.trim() ? data.phone.trim() : (existing.phone || ''),
        companyPhone:
          data.companyPhone !== undefined && data.companyPhone.trim()
            ? data.companyPhone.trim()
            : existing.companyPhone || data.phone || existing.phone || '',
        email: data.email !== undefined && data.email.trim() ? data.email.trim() : (existing.email || ''),
        address: data.address !== undefined && data.address.trim() ? data.address.trim() : (existing.address || ''),
        location:
          data.location !== undefined && data.location.trim()
            ? data.location.trim()
            : existing.location || existing.address || data.address || '',
        customerType: data.customerType || existing.customerType || 'Retail',
      };
      const res = this.update(existing._id || existing.id, updates);
      return { ...(res.customer || { ...existing, ...updates }), _syncPromise: res.syncPromise };
    } else {
      const res = this.create({
        name: data.name.trim(),
        companyName: (data.companyName || data.company || '').trim(),
        designationRole: data.designationRole || data.customerRole || 'owner',
        phone: (data.phone || '').trim(),
        companyPhone: (data.companyPhone || data.phone || '').trim(),
        email: (data.email || '').trim(),
        address: (data.address || '').trim(),
        location: (data.location || data.address || '').trim(),
        customerType: data.customerType || 'Retail',
        totalSales: 0,
        totalPaid: 0,
        totalDue: 0,
        balance: 0,
      });
      return { ...res.customer, _syncPromise: res.syncPromise };
    }
  }

  /**
   * Updates total sales, paid, and due balance for customer ledger
   */
  updateFinancials(customerId, totalAmount = 0, paidAmount = 0, dueAmount = 0) {
    if (!customerId) return;
    const customers = this.getAll();
    const customer = customers.find((c) => c.id === customerId || c._id === customerId);
    if (!customer) return;

    const newSales = (Number(customer.totalSales) || 0) + Number(totalAmount);
    const newPaid = (Number(customer.totalPaid) || 0) + Number(paidAmount);
    const newDue = (Number(customer.totalDue) || 0) + Number(dueAmount);

    return this.update(customer._id || customer.id, {
      totalSales: newSales,
      totalPaid: newPaid,
      totalDue: newDue,
      balance: newDue,
    });
  }

  /**
   * Recompute exact customer totals from all active (non-cancelled) local sales invoices
   */
  recalculateFromSales(customerId) {
    if (!customerId) return null;
    const customers = this.getAll();
    const index = customers.findIndex(
      (c) => c.id === customerId || c._id === customerId || c.clientSideId === customerId
    );
    if (index === -1) return null;

    const customer = customers[index];
    const idSet = new Set([customer.id, customer._id, customer.clientSideId, customerId].filter(Boolean).map(String));
    const sales = storageService.getItem(STORAGE_KEYS.SALES, []);

    let totalSales = 0;
    let totalPaid = 0;
    let totalDue = 0;

    for (const s of sales) {
      if (s.status === 'cancelled') continue;
      if (!s.customerId || !idSet.has(String(s.customerId))) continue;
      const tot = Number(s.total !== undefined ? s.total : s.totalAmount) || 0;
      const status = s.paymentStatus || 'paid';
      const paid =
        status === 'paid'
          ? tot
          : status === 'due'
          ? 0
          : Math.min(tot, Math.max(0, Number(s.paidAmount) || 0));
      const due = Math.max(0, tot - paid);
      totalSales += tot;
      totalPaid += paid;
      totalDue += due;
    }

    customers[index] = {
      ...customer,
      totalSales: Math.round(totalSales * 100) / 100,
      totalPaid: Math.round(totalPaid * 100) / 100,
      totalDue: Math.round(totalDue * 100) / 100,
      balance: Math.round(totalDue * 100) / 100,
    };
    storageService.setItem(STORAGE_KEYS.CUSTOMERS, customers);
    return customers[index];
  }
}

export const customerService = new CustomerService();
