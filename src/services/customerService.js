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
}

export const customerService = new CustomerService();
