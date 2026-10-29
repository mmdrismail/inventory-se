import { storageService, STORAGE_KEYS } from './storageService';
import { apiClient } from './apiClient';

class SupplierService {
  getAll() {
    return storageService.getItem(STORAGE_KEYS.SUPPLIERS, []);
  }

  getById(id) {
    const suppliers = this.getAll();
    return suppliers.find((s) => s.id === id) || null;
  }

  create(data) {
    const suppliers = this.getAll();
    const newSupplier = {
      ...data,
      id: `sup-${Date.now()}`,
      name: data.name.trim(),
      companyName: data.companyName?.trim() || data.name.trim(),
      email: data.email?.trim() || '',
      phone: data.phone?.trim() || '',
      address: data.address?.trim() || '',
      contactPerson: data.contactPerson?.trim() || '',
      notes: data.notes?.trim() || '',
      status: data.status || 'active',
      createdAt: new Date().toISOString(),
    };

    suppliers.unshift(newSupplier);
    storageService.setItem(STORAGE_KEYS.SUPPLIERS, suppliers);

    // Live sync to MongoDB Atlas
    apiClient.post('/suppliers', {
      name: newSupplier.name,
      companyName: newSupplier.companyName,
      email: newSupplier.email,
      phone: newSupplier.phone,
      address: newSupplier.address,
      contactPerson: newSupplier.contactPerson,
      notes: newSupplier.notes,
    }).then((res) => {
      if (res?.data?._id) {
        const cur = storageService.getItem(STORAGE_KEYS.SUPPLIERS, []);
        const idx = cur.findIndex((s) => s.name === newSupplier.name);
        if (idx !== -1) {
          cur[idx].id = res.data._id;
          cur[idx]._id = res.data._id;
          storageService.setItem(STORAGE_KEYS.SUPPLIERS, cur);
        }
      }
    }).catch((err) => {
      console.warn('[MongoDB Supplier sync]:', err.message);
    });

    return { success: true, supplier: newSupplier };
  }

  update(id, updates) {
    const suppliers = this.getAll();
    const index = suppliers.findIndex((s) => s.id === id);
    if (index === -1) {
      return { success: false, message: 'Supplier not found.' };
    }

    suppliers[index] = {
      ...suppliers[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    storageService.setItem(STORAGE_KEYS.SUPPLIERS, suppliers);

    // Live sync to MongoDB Atlas
    apiClient.put(`/suppliers/${id}`, updates).catch((err) => {
      console.warn('[MongoDB Supplier update notice]:', err.message);
    });

    return { success: true, supplier: suppliers[index] };
  }

  remove(id) {
    const suppliers = this.getAll();
    const supplier = suppliers.find((s) => s.id === id);
    if (!supplier) {
      return { success: false, message: 'Supplier not found.' };
    }

    // Safety check: has purchase orders
    const purchases = storageService.getItem(STORAGE_KEYS.PURCHASES, []);
    const supplierPurchases = purchases.filter((p) => p.supplierId === id);
    if (supplierPurchases.length > 0) {
      return {
        success: false,
        message: `Cannot delete "${supplier.name}" because ${supplierPurchases.length} purchase order(s) are linked to this supplier. Deactivate instead.`,
      };
    }

    // Also check if any products reference this supplier
    const products = storageService.getItem(STORAGE_KEYS.PRODUCTS, []);
    const assignedProducts = products.filter((p) => p.supplierId === id);
    if (assignedProducts.length > 0) {
      return {
        success: false,
        message: `Cannot delete "${supplier.name}" because ${assignedProducts.length} product(s) are supplied by them.`,
      };
    }

    const filtered = suppliers.filter((s) => s.id !== id);
    storageService.setItem(STORAGE_KEYS.SUPPLIERS, filtered);

    // Live sync to MongoDB Atlas
    apiClient.delete(`/suppliers/${id}`).catch((err) => {
      console.warn('[MongoDB Supplier delete notice]:', err.message);
    });

    return { success: true, message: `Supplier "${supplier.name}" removed.` };
  }

  getSupplierPurchases(supplierId) {
    const purchases = storageService.getItem(STORAGE_KEYS.PURCHASES, []);
    return purchases.filter((p) => p.supplierId === supplierId);
  }
}

export const supplierService = new SupplierService();
