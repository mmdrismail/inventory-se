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
      id: `cust-${Date.now()}`,
      name: data.name.trim(),
      email: data.email?.trim() || '',
      phone: data.phone?.trim() || '',
      address: data.address?.trim() || '',
      customerType: data.customerType || 'Retail',
      notes: data.notes?.trim() || '',
      createdAt: new Date().toISOString(),
    };

    customers.unshift(newCustomer);
    storageService.setItem(STORAGE_KEYS.CUSTOMERS, customers);

    // Live sync to MongoDB Atlas
    apiClient.post('/customers', {
      name: newCustomer.name,
      email: newCustomer.email,
      phone: newCustomer.phone,
      address: newCustomer.address,
      customerType: newCustomer.customerType,
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
    const index = customers.findIndex((c) => c.id === id);
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
    apiClient.put(`/customers/${id}`, updates).catch((err) => {
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
      existing = customers.find((c) => c.id === data.id);
    }
    if (!existing && data.phone) {
      existing = customers.find((c) => c.phone && c.phone.trim() === data.phone.trim());
    }
    if (!existing && data.name) {
      existing = customers.find((c) => c.name.toLowerCase().trim() === data.name.toLowerCase().trim());
    }

    if (existing) {
      const updates = {
        name: data.name.trim(),
        companyName: data.companyName !== undefined ? data.companyName : existing.companyName || '',
        designationRole: data.designationRole || data.customerRole || existing.designationRole || 'owner',
        phone: data.phone || existing.phone || '',
        companyPhone: data.companyPhone || existing.companyPhone || '',
        email: data.email || existing.email || '',
        address: data.address || existing.address || '',
        location: data.location || data.address || existing.location || '',
        customerType: data.customerType || existing.customerType || 'Retail',
      };
      this.update(existing.id, updates);
      return { ...existing, ...updates };
    } else {
      const res = this.create({
        name: data.name.trim(),
        companyName: data.companyName || '',
        designationRole: data.designationRole || data.customerRole || 'owner',
        phone: data.phone || '',
        companyPhone: data.companyPhone || '',
        email: data.email || '',
        address: data.address || '',
        location: data.location || data.address || '',
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
