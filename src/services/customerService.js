import { storageService, STORAGE_KEYS } from './storageService';
import { apiClient } from './apiClient';

class CustomerService {
  getAll() {
    return storageService.getItem(STORAGE_KEYS.CUSTOMERS, []);
  }

  getById(id) {
    const customers = this.getAll();
    return customers.find((c) => c.id === id) || null;
  }

  create(data) {
    const customers = this.getAll();
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
      createdAt: data.createdAt || new Date().toISOString(),
    };

    customers.unshift(newCustomer);
    storageService.setItem(STORAGE_KEYS.CUSTOMERS, customers);

    // Live sync to MongoDB Atlas with full corporate profile
    apiClient.post('/customers', {
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
    }).then((res) => {
      if (res?.data?._id) {
        const cur = storageService.getItem(STORAGE_KEYS.CUSTOMERS, []);
        const idx = cur.findIndex((c) => c.name === newCustomer.name);
        if (idx !== -1) {
          cur[idx].id = res.data._id;
          cur[idx]._id = res.data._id;
          storageService.setItem(STORAGE_KEYS.CUSTOMERS, cur);
        }
      }
    }).catch((err) => {
      console.warn('[MongoDB Customer sync]:', err.message);
    });

    return { success: true, customer: newCustomer };
  }

  update(id, updates) {
    const customers = this.getAll();
    const index = customers.findIndex((c) => c.id === id || c._id === id);
    if (index === -1) {
      return { success: false, message: 'Customer not found.' };
    }

    customers[index] = {
      ...customers[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    storageService.setItem(STORAGE_KEYS.CUSTOMERS, customers);

    // Live sync to MongoDB Atlas
    const targetId = customers[index]._id || customers[index].id || id;
    apiClient.put(`/customers/${targetId}`, updates).catch((err) => {
      console.warn('[MongoDB Customer update notice]:', err.message);
    });

    return { success: true, customer: customers[index] };
  }

  remove(id) {
    const customers = this.getAll();
    const customer = customers.find((c) => c.id === id);
    if (!customer) {
      return { success: false, message: 'Customer not found.' };
    }

    // Safety check: sales history
    const sales = storageService.getItem(STORAGE_KEYS.SALES, []);
    const customerSales = sales.filter((s) => s.customerId === id);
    if (customerSales.length > 0) {
      return {
        success: false,
        message: `Cannot delete "${customer.name}" because ${customerSales.length} past sales invoices are linked to this customer account.`,
      };
    }

    // Safety check: order history
    const orders = storageService.getItem(STORAGE_KEYS.ORDERS, []);
    const customerOrders = orders.filter((o) => o.customerId === id);
    if (customerOrders.length > 0) {
      return {
        success: false,
        message: `Cannot delete "${customer.name}" because ${customerOrders.length} customer order(s) exist.`,
      };
    }

    const filtered = customers.filter((c) => c.id !== id);
    storageService.setItem(STORAGE_KEYS.CUSTOMERS, filtered);

    // Live sync to MongoDB Atlas
    apiClient.delete(`/customers/${id}`).catch((err) => {
      console.warn('[MongoDB Customer delete notice]:', err.message);
    });

    return { success: true, message: `Customer "${customer.name}" removed.` };
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
        companyName: (data.companyName && data.companyName.trim()) ? data.companyName.trim() : (existing.companyName || ''),
        designationRole: (data.designationRole && data.designationRole !== 'owner') ? data.designationRole : (data.customerRole || existing.designationRole || 'owner'),
        phone: (data.phone && data.phone.trim()) ? data.phone.trim() : (existing.phone || ''),
        companyPhone: (data.companyPhone && data.companyPhone.trim()) ? data.companyPhone.trim() : (existing.companyPhone || existing.phone || ''),
        email: (data.email && data.email.trim()) ? data.email.trim() : (existing.email || ''),
        address: (data.address && data.address.trim()) ? data.address.trim() : (existing.address || ''),
        location: (data.location && data.location.trim()) ? data.location.trim() : (existing.location || existing.address || data.address || ''),
        customerType: data.customerType || existing.customerType || 'Retail',
      };
      this.update(existing.id || existing._id, updates);
      return { ...existing, ...updates };
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
      return res.customer;
    }
  }

  /**
   * Updates total sales, paid, and due balance for customer ledger
   */
  updateFinancials(customerId, totalAmount = 0, paidAmount = 0, dueAmount = 0) {
    if (!customerId) return;
    const customers = this.getAll();
    const customer = customers.find((c) => c.id === customerId);
    if (!customer) return;

    const newSales = (Number(customer.totalSales) || 0) + Number(totalAmount);
    const newPaid = (Number(customer.totalPaid) || 0) + Number(paidAmount);
    const newDue = (Number(customer.totalDue) || 0) + Number(dueAmount);

    this.update(customerId, {
      totalSales: newSales,
      totalPaid: newPaid,
      totalDue: newDue,
      balance: newDue,
    });
  }
}

export const customerService = new CustomerService();
