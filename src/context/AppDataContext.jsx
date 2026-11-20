import React, { createContext, useContext, useState, useEffect } from 'react';
import { storageService, STORAGE_KEYS } from '../services/storageService';
import { productService } from '../services/productService';
import { categoryService } from '../services/categoryService';
import { supplierService } from '../services/supplierService';
import { customerService } from '../services/customerService';
import { purchaseService } from '../services/purchaseService';
import { salesService } from '../services/salesService';
import { quotationService } from '../services/quotationService';
import { lotService } from '../services/lotService';
import { inventoryService } from '../services/inventoryService';
import { orderService } from '../services/orderService';
import { userService } from '../services/userService';
import { settingsService } from '../services/settingsService';
import { apiClient } from '../services/apiClient';

const AppDataContext = createContext(null);

export const AppDataProvider = ({ children }) => {
  // Ensure seed data initialized before reading collections
  storageService.initializeSeedData();

  // Primary collections lazily loaded from storage (deduplicated by name/id)
  const [products, setProducts] = useState(() => storageService.getItem(STORAGE_KEYS.PRODUCTS, []));
  const [categories, setCategories] = useState(() => storageService.getItem(STORAGE_KEYS.CATEGORIES, []));
  const [suppliers, setSuppliers] = useState(() => {
    const raw = storageService.getItem(STORAGE_KEYS.SUPPLIERS, []);
    const seen = new Set();
    return raw.filter((s) => {
      const k = (s.name || '').trim().toLowerCase();
      if (!k || seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  });
  const [customers, setCustomers] = useState(() => storageService.getItem(STORAGE_KEYS.CUSTOMERS, []));
  const [purchases, setPurchases] = useState(() => storageService.getItem(STORAGE_KEYS.PURCHASES, []));
  const [sales, setSales] = useState(() => storageService.getItem(STORAGE_KEYS.SALES, []));
  const [quotations, setQuotations] = useState(() => storageService.getItem(STORAGE_KEYS.QUOTATIONS, []));
  const [lotPurchases, setLotPurchases] = useState(() => storageService.getItem(STORAGE_KEYS.LOT_PURCHASES, []));
  const [inventoryMovements, setInventoryMovements] = useState(() => storageService.getItem(STORAGE_KEYS.INVENTORY_MOVEMENTS, []));
  const [orders, setOrders] = useState(() => storageService.getItem(STORAGE_KEYS.ORDERS, []));
  const [users, setUsers] = useState(() => storageService.getItem(STORAGE_KEYS.USERS, []));
  const [settings, setSettings] = useState(() => settingsService.getSettings());
  const [cart, setCart] = useState(() => storageService.getItem(STORAGE_KEYS.CART, []));

  // UI state: Toasts and Confirm Modals
  const [toasts, setToasts] = useState([]);
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    isDestructive: false,
    onConfirm: null,
  });

  // Synchronize state with MongoDB Atlas backend if online
  const syncWithBackend = async () => {
    try {
      const isUp = await apiClient.isBackendAvailable();
      if (!isUp) return;

      const [prodsRes, catsRes, supsRes, custsRes, pursRes, salesRes, quotesRes, ordsRes, setsRes, lotsRes] = await Promise.allSettled([
        apiClient.get('/products'),
        apiClient.get('/categories'),
        apiClient.get('/suppliers'),
        apiClient.get('/customers'),
        apiClient.get('/purchases'),
        apiClient.get('/sales'),
        apiClient.get('/quotations'),
        apiClient.get('/orders'),
        apiClient.get('/settings'),
        apiClient.get('/lots'),
      ]);

      if (prodsRes.status === 'fulfilled' && prodsRes.value?.success && Array.isArray(prodsRes.value.data) && prodsRes.value.data.length > 0) {
        const normalized = prodsRes.value.data.map((p) => ({
          ...p,
          id: p._id || p.id,
          _id: p._id || p.id,
        }));
        setProducts(normalized);
        storageService.setItem(STORAGE_KEYS.PRODUCTS, normalized);
      }

      if (catsRes.status === 'fulfilled' && catsRes.value?.success && Array.isArray(catsRes.value.data) && catsRes.value.data.length > 0) {
        const normalized = catsRes.value.data.map((c) => ({
          ...c,
          id: c._id || c.id,
          _id: c._id || c.id,
        }));
        setCategories(normalized);
        storageService.setItem(STORAGE_KEYS.CATEGORIES, normalized);
      }

      if (supsRes.status === 'fulfilled' && supsRes.value?.success && Array.isArray(supsRes.value.data) && supsRes.value.data.length > 0) {
        const seen = new Set();
        const normalized = [];
        for (const s of supsRes.value.data) {
          const item = { ...s, id: s._id || s.id, _id: s._id || s.id };
          const k = (item.name || '').trim().toLowerCase();
          if (k && !seen.has(k)) {
            seen.add(k);
            normalized.push(item);
          }
        }
        setSuppliers(normalized);
        storageService.setItem(STORAGE_KEYS.SUPPLIERS, normalized);
      }

      if (custsRes.status === 'fulfilled' && custsRes.value?.success && Array.isArray(custsRes.value.data) && custsRes.value.data.length > 0) {
        const normalized = custsRes.value.data.map((c) => ({
          ...c,
          id: c._id || c.id,
          _id: c._id || c.id,
        }));
        setCustomers(normalized);
        storageService.setItem(STORAGE_KEYS.CUSTOMERS, normalized);
      }

      if (pursRes.status === 'fulfilled' && pursRes.value?.success && Array.isArray(pursRes.value.data) && pursRes.value.data.length > 0) {
        const normalized = pursRes.value.data.map((p) => {
          const tot = Number(p.total !== undefined ? p.total : p.totalAmount) || 0;
          return {
            ...p,
            id: p._id || p.id,
            _id: p._id || p.id,
            total: tot,
            totalAmount: tot,
            date: p.date || p.createdAt,
          };
        });
        setPurchases(normalized);
        storageService.setItem(STORAGE_KEYS.PURCHASES, normalized);
      }

      if (salesRes.status === 'fulfilled' && salesRes.value?.success && Array.isArray(salesRes.value.data) && salesRes.value.data.length > 0) {
        const normalized = salesRes.value.data.map((s) => {
          const tot = Number(s.total !== undefined ? s.total : s.totalAmount) || 0;
          const paid = Number(s.paidAmount !== undefined ? s.paidAmount : (s.paymentStatus === 'paid' ? tot : 0)) || 0;
          const due = Math.max(0, tot - paid);
          const inv = s.invoiceNo || s.invoiceNumber || `INV-${s._id || s.id}`;
          return {
            ...s,
            id: s._id || s.id,
            _id: s._id || s.id,
            invoiceNo: inv,
            invoiceNumber: inv,
            total: tot,
            totalAmount: tot,
            paidAmount: paid,
            dueAmount: s.dueAmount !== undefined ? Number(s.dueAmount) : due,
            date: s.date || s.createdAt,
          };
        });
        setSales(normalized);
        storageService.setItem(STORAGE_KEYS.SALES, normalized);
      }

      if (quotesRes.status === 'fulfilled' && quotesRes.value?.success && Array.isArray(quotesRes.value.data) && quotesRes.value.data.length > 0) {
        const normalized = quotesRes.value.data.map((q) => {
          const tot = Number(q.totalAmount !== undefined ? q.totalAmount : q.total) || 0;
          return {
            ...q,
            id: q._id || q.id,
            _id: q._id || q.id,
            totalAmount: tot,
            total: tot,
            date: q.date || q.createdAt,
          };
        });
        setQuotations(normalized);
        storageService.setItem(STORAGE_KEYS.QUOTATIONS, normalized);
      }

      if (ordsRes.status === 'fulfilled' && ordsRes.value?.success && Array.isArray(ordsRes.value.data) && ordsRes.value.data.length > 0) {
        const normalized = ordsRes.value.data.map((o) => {
          const tot = Number(o.totalAmount !== undefined ? o.totalAmount : o.total) || 0;
          return {
            ...o,
            id: o._id || o.id,
            _id: o._id || o.id,
            total: tot,
            totalAmount: tot,
            date: o.date || o.createdAt,
          };
        });
        setOrders(normalized);
        storageService.setItem(STORAGE_KEYS.ORDERS, normalized);
      }

      if (setsRes.status === 'fulfilled' && setsRes.value?.success && setsRes.value.data) {
        const remoteSettings = setsRes.value.data;
        setSettings((prev) => ({ ...prev, ...remoteSettings }));
        storageService.setItem(STORAGE_KEYS.SETTINGS, { ...settingsService.getSettings(), ...remoteSettings });
      }

      if (lotsRes.status === 'fulfilled' && lotsRes.value?.success && Array.isArray(lotsRes.value.data) && lotsRes.value.data.length > 0) {
        const normalized = lotsRes.value.data.map((l) => ({
          ...l,
          id: l._id || l.id,
          _id: l._id || l.id,
        }));
        setLotPurchases(normalized);
        storageService.setItem(STORAGE_KEYS.LOT_PURCHASES, normalized);
      }
    } catch (err) {
      console.info('[StockLine API Sync notice]:', err.message);
    }
  };

  // Reload all state from storage and backend
  const reloadState = () => {
    setProducts(storageService.getItem(STORAGE_KEYS.PRODUCTS, []));
    setCategories(storageService.getItem(STORAGE_KEYS.CATEGORIES, []));
    setSuppliers(storageService.getItem(STORAGE_KEYS.SUPPLIERS, []));
    setCustomers(storageService.getItem(STORAGE_KEYS.CUSTOMERS, []));
    setPurchases(storageService.getItem(STORAGE_KEYS.PURCHASES, []));
    setLotPurchases(storageService.getItem(STORAGE_KEYS.LOT_PURCHASES, []));
    setSales(storageService.getItem(STORAGE_KEYS.SALES, []));
    setQuotations(storageService.getItem(STORAGE_KEYS.QUOTATIONS, []));
    setInventoryMovements(storageService.getItem(STORAGE_KEYS.INVENTORY_MOVEMENTS, []));
    setOrders(storageService.getItem(STORAGE_KEYS.ORDERS, []));
    setUsers(storageService.getItem(STORAGE_KEYS.USERS, []));
    
    const curSettings = settingsService.getSettings();
    setSettings(curSettings);
    if (curSettings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    setCart(storageService.getItem(STORAGE_KEYS.CART, []));
    syncWithBackend();
  };

  useEffect(() => {
    const curSettings = settingsService.getSettings();
    if (curSettings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    syncWithBackend();
  }, []);

  // Toast Helpers
  const addToast = ({ title, message, type = 'success', duration = 3500 }) => {
    const id = `toast-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    setToasts((prev) => [...prev, { id, title, message, type }]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Confirmation Modal Helper
  const confirmAction = ({ title, message, confirmText = 'Confirm', cancelText = 'Cancel', isDestructive = false, onConfirm }) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      confirmText,
      cancelText,
      isDestructive,
      onConfirm: () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        if (typeof onConfirm === 'function') onConfirm();
      },
    });
  };

  const closeConfirmModal = () => {
    setConfirmModal((prev) => ({ ...prev, isOpen: false }));
  };

  // ================= PRODUCTS =================
  const addProduct = (data, performedBy) => {
    const res = productService.create(data, performedBy);
    if (res.success) {
      reloadState();
      addToast({ title: 'Product Created', message: `Product "${res.product.name}" added successfully.` });
    } else {
      addToast({ title: 'Creation Failed', message: res.message, type: 'error' });
    }
    return res;
  };

  const updateProduct = (id, updates) => {
    const res = productService.update(id, updates);
    if (res.success) {
      reloadState();
      addToast({ title: 'Product Updated', message: `Product "${res.product.name}" updated successfully.` });
    } else {
      addToast({ title: 'Update Failed', message: res.message, type: 'error' });
    }
    return res;
  };

  const deleteProduct = (id) => {
    const res = productService.remove(id);
    if (res.success) {
      reloadState();
      addToast({ title: 'Product Deleted', message: res.message });
    } else {
      addToast({ title: 'Cannot Delete', message: res.message, type: 'error' });
    }
    return res;
  };

  const importProductsCSV = (rows, performedBy) => {
    const res = productService.importCSV(rows, performedBy);
    reloadState();
    if (res.imported > 0) {
      addToast({
        title: 'CSV Import Completed',
        message: `Successfully imported ${res.imported} product(s). ${res.errors.length ? `Skipped ${res.errors.length} rows.` : ''}`,
        type: res.errors.length ? 'warning' : 'success',
      });
    } else {
      addToast({ title: 'Import Failed', message: res.errors[0] || 'No rows imported.', type: 'error' });
    }
    return res;
  };

  // ================= CATEGORIES =================
  const addCategory = (data) => {
    const res = categoryService.create(data);
    if (res.success) {
      reloadState();
      addToast({ title: 'Category Created', message: `Category "${res.category.name}" created.` });
    } else {
      addToast({ title: 'Creation Failed', message: res.message, type: 'error' });
    }
    return res;
  };

  const updateCategory = (id, updates) => {
    const res = categoryService.update(id, updates);
    if (res.success) {
      reloadState();
      addToast({ title: 'Category Updated', message: `Category "${res.category.name}" updated.` });
    } else {
      addToast({ title: 'Update Failed', message: res.message, type: 'error' });
    }
    return res;
  };

  const deleteCategory = (id) => {
    const res = categoryService.remove(id);
    if (res.success) {
      reloadState();
      addToast({ title: 'Category Deleted', message: res.message });
    } else {
      addToast({ title: 'Cannot Delete', message: res.message, type: 'error' });
    }
    return res;
  };

  // ================= SUPPLIERS =================
  const addSupplier = (data) => {
    const res = supplierService.create(data);
    if (res.success) {
      reloadState();
      addToast({ title: 'Supplier Created', message: `Supplier "${res.supplier.name}" added.` });
    }
    return res;
  };

  const updateSupplier = (id, updates) => {
    const res = supplierService.update(id, updates);
    if (res.success) {
      reloadState();
      addToast({ title: 'Supplier Updated', message: `Supplier details saved.` });
    }
    return res;
  };

  const deleteSupplier = (id) => {
    const res = supplierService.remove(id);
    if (res.success) {
      reloadState();
      addToast({ title: 'Supplier Removed', message: res.message });
    } else {
      addToast({ title: 'Cannot Delete', message: res.message, type: 'error' });
    }
    return res;
  };

  // ================= CUSTOMERS =================
  const addCustomer = (data) => {
    const res = customerService.create(data);
    if (res.success) {
      reloadState();
      addToast({ title: 'Customer Created', message: `Customer "${res.customer.name}" registered.` });
    }
    return res;
  };

  const updateCustomer = (id, updates) => {
    const res = customerService.update(id, updates);
    if (res.success) {
      reloadState();
      addToast({ title: 'Customer Updated', message: 'Customer details updated.' });
    }
    return res;
  };

  const deleteCustomer = (id) => {
    const res = customerService.remove(id);
    if (res.success) {
      reloadState();
      addToast({ title: 'Customer Removed', message: res.message });
    } else {
      addToast({ title: 'Cannot Delete', message: res.message, type: 'error' });
    }
    return res;
  };

  // ================= PURCHASES =================
  const createPurchase = (data, performedBy) => {
    const res = purchaseService.create(data, performedBy);
    if (res.success) {
      reloadState();
      addToast({
        title: 'Purchase Order Created',
        message: `Order ${res.purchase.referenceNo} (${res.purchase.status.toUpperCase()}) saved.`,
      });
    } else {
      addToast({ title: 'Purchase Failed', message: res.message, type: 'error' });
    }
    return res;
  };

  const receivePurchase = (id, performedBy) => {
    const res = purchaseService.receivePurchase(id, performedBy);
    if (res.success) {
      reloadState();
      addToast({
        title: 'Purchase Received',
        message: `Stock levels updated and inventory movements logged.`,
      });
    } else {
      addToast({ title: 'Action Failed', message: res.message, type: 'error' });
    }
    return res;
  };

  const cancelPurchase = (id, performedBy) => {
    const res = purchaseService.cancelPurchase(id, performedBy);
    if (res.success) {
      reloadState();
      addToast({
        title: 'Purchase Cancelled',
        message: `Purchase order cancelled and inventory changes reversed.`,
      });
    } else {
      addToast({ title: 'Cancellation Failed', message: res.message, type: 'error' });
    }
    return res;
  };

  // ================= SALES =================
  const createSale = (data, performedBy) => {
    const res = salesService.create(data, performedBy);
    if (res.success) {
      reloadState();
      addToast({
        title: 'Sale Recorded',
        message: `Invoice ${res.sale.invoiceNo} (${res.sale.status.toUpperCase()}) created successfully.`,
      });
    } else {
      addToast({ title: 'Sale Failed', message: res.message, type: 'error' });
    }
    return res;
  };

  const completeSale = (id, performedBy) => {
    const res = salesService.completeSale(id, performedBy);
    if (res.success) {
      reloadState();
      addToast({
        title: 'Sale Completed',
        message: `Stock deducted and inventory movement recorded.`,
      });
    } else {
      addToast({ title: 'Completion Failed', message: res.message, type: 'error' });
    }
    return res;
  };

  const cancelSale = (id, performedBy) => {
    const res = salesService.cancelSale(id, performedBy);
    if (res.success) {
      reloadState();
      addToast({
        title: 'Sale Cancelled',
        message: `Sale cancelled and items restored to available inventory.`,
      });
    } else {
      addToast({ title: 'Cancellation Failed', message: res.message, type: 'error' });
    }
    return res;
  };

  // ================= QUOTATIONS =================
  const createQuotation = (data, preparedBy = 'Sales Executive') => {
    const res = quotationService.create(data, preparedBy);
    if (res.success) {
      reloadState();
      addToast({
        title: 'দরপত্র তৈরি সম্পন্ন (Quotation Created)',
        message: `Quotation #${res.quotation.quotationNumber} successfully created.`,
        type: 'success',
      });
    } else {
      addToast({ title: 'Quotation Failed', message: res.message, type: 'error' });
    }
    return res;
  };

  const updateQuotation = (id, updates) => {
    const res = quotationService.update(id, updates);
    if (res.success) {
      reloadState();
      addToast({
        title: 'দরপত্র আপডেট হয়েছে',
        message: `Quotation updated successfully.`,
      });
    } else {
      addToast({ title: 'Update Failed', message: res.message, type: 'error' });
    }
    return res;
  };

  const deleteQuotation = (id) => {
    const res = quotationService.remove(id);
    if (res.success) {
      reloadState();
      addToast({ title: 'Quotation Removed', message: res.message });
    }
    return res;
  };

  const convertQuotationToSale = (id) => {
    const quote = quotationService.getById(id);
    if (!quote) {
      addToast({ title: 'Not Found', message: 'Quotation not found.', type: 'error' });
      return { success: false };
    }

    const salesItems = (quote.items || []).map((it) => {
      const prod = products.find((p) => p.id === it.productId || p.name === it.name);
      return {
        productId: prod?.id || it.productId || 'custom-item',
        productName: it.name,
        sku: prod?.sku || 'QUOTE-ITEM',
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        total: it.lineTotal,
      };
    });

    const res = salesService.create({
      customerId: quote.customerId,
      customerName: quote.customerName,
      customerCompany: quote.customerCompany,
      customerRole: quote.customerRole,
      customerPhone: quote.customerPhone,
      customerAddress: quote.customerAddress,
      customerLocation: quote.customerLocation,
      items: salesItems,
      subtotal: quote.subtotal,
      discount: quote.discount,
      total: quote.totalAmount,
      paidAmount: quote.totalAmount,
      dueAmount: 0,
      paymentStatus: 'paid',
      status: 'completed',
      requisitionRef: quote.requisitionRef || quote.quotationNumber,
      quotationId: quote.id,
      notes: `Converted from Quotation #${quote.quotationNumber}. ${quote.notes || ''}`.trim(),
    });

    if (res.success) {
      quotationService.update(id, {
        status: 'converted',
        convertedSaleId: res.sale.id,
      });
      reloadState();
      addToast({
        title: 'ইনভয়েসে রূপান্তর সম্পন্ন',
        message: `কোটেশন #${quote.quotationNumber} সফলভাবে সেলস ইনভয়েস #${res.sale.invoiceNo}-এ রূপান্তরিত হয়েছে।`,
        type: 'success',
      });
    }
    return res;
  };

  // ================= LOT AUCTION PURCHASES =================
  const createLotPurchase = (data) => {
    const res = lotService.create(data);
    if (res.success) {
      reloadState();
      addToast({
        title: 'নিলাম লট এন্ট্রি সম্পন্ন',
        message: `Lot #${res.lot.lotNumber} (${res.lot.lotName || 'Bulk Scrap'}) created.`,
        type: 'success',
      });
    }
    return res;
  };

  const updateLotPurchase = (id, updates) => {
    const res = lotService.update(id, updates);
    if (res.success) {
      reloadState();
      addToast({
        title: 'লট আপডেট হয়েছে',
        message: 'Lot purchase details updated.',
      });
    }
    return res;
  };

  const deleteLotPurchase = (id) => {
    const res = lotService.delete(id);
    if (res.success) {
      reloadState();
      addToast({ title: 'Lot Removed', message: 'Lot deleted from system.' });
    }
    return res;
  };

  const distributeLotToInventory = (id, performedBy = 'Warehouse Master') => {
    const res = lotService.distributeToInventory(id, performedBy);
    if (res.success) {
      reloadState();
      addToast({
        title: 'ওয়্যারহাউজে মালামাল বণ্টন সম্পন্ন',
        message: res.message,
        type: 'success',
      });
    } else {
      addToast({ title: 'Distribution Failed', message: res.message, type: 'error' });
    }
    return res;
  };

  // ================= INVENTORY ADJUSTMENT =================
  const adjustStock = (data) => {
    const res = inventoryService.adjustStock(data);
    if (res.success) {
      reloadState();
      addToast({
        title: 'Stock Adjusted',
        message: `New quantity for "${res.product.name}" is ${res.newQuantity}.`,
      });
    } else {
      addToast({ title: 'Adjustment Failed', message: res.message, type: 'error' });
    }
    return res;
  };

  // ================= ORDERS (STOREFRONT) =================
  const createOrder = (orderData) => {
    const res = orderService.create(orderData);
    if (res.success) {
      reloadState();
      clearCart();
      addToast({
        title: 'Order Placed!',
        message: `Order #${res.order.orderNumber} placed successfully.`,
      });
    } else {
      addToast({ title: 'Order Failed', message: res.message, type: 'error' });
    }
    return res;
  };

  const updateOrderStatus = (id, newStatus, performedBy) => {
    const res = orderService.updateStatus(id, newStatus, performedBy);
    if (res.success) {
      reloadState();
      addToast({
        title: 'Order Status Updated',
        message: `Order #${res.order.orderNumber} changed to "${newStatus.toUpperCase()}".`,
      });
    } else {
      addToast({ title: 'Status Update Failed', message: res.message, type: 'error' });
    }
    return res;
  };

  // ================= USERS =================
  const addUser = (data) => {
    const res = userService.create(data);
    if (res.success) {
      reloadState();
      addToast({ title: 'Demo User Created', message: `User "${res.user.name}" created.` });
    } else {
      addToast({ title: 'User Creation Failed', message: res.message, type: 'error' });
    }
    return res;
  };

  const updateUser = (id, updates, currentUserId) => {
    const res = userService.update(id, updates, currentUserId);
    if (res.success) {
      reloadState();
      addToast({ title: 'User Updated', message: 'User details saved.' });
    } else {
      addToast({ title: 'Update Failed', message: res.message, type: 'error' });
    }
    return res;
  };

  const toggleUserStatus = (id, currentUserId) => {
    const res = userService.toggleStatus(id, currentUserId);
    if (res.success) {
      reloadState();
      addToast({ title: 'Status Changed', message: `User status set to ${res.user.status}.` });
    } else {
      addToast({ title: 'Action Denied', message: res.message, type: 'error' });
    }
    return res;
  };

  const deleteUser = (id, currentUserId) => {
    const res = userService.remove(id, currentUserId);
    if (res.success) {
      reloadState();
      addToast({ title: 'User Removed', message: res.message });
    } else {
      addToast({ title: 'Cannot Delete', message: res.message, type: 'error' });
    }
    return res;
  };

  const resetUsers = () => {
    const res = userService.resetUsers();
    reloadState();
    addToast({ title: 'Demo Users Reset', message: 'Default demo user accounts restored.' });
    return res;
  };

  // ================= SETTINGS & THEME =================
  const updateSettings = (updates) => {
    const res = settingsService.updateSettings(updates);
    if (res.success) {
      setSettings(res.settings);
      addToast({ title: 'Settings Saved', message: 'System preferences have been saved.' });
    }
    return res;
  };

  const toggleTheme = () => {
    const nextTheme = settings.theme === 'dark' ? 'light' : 'dark';
    updateSettings({ theme: nextTheme });
  };

  // ================= SHOPPING CART =================
  const addToCart = (product, quantity = 1) => {
    const available = Number(product.quantity) || 0;
    if (available <= 0) {
      addToast({ title: 'Out of Stock', message: `"${product.name}" is currently out of stock.`, type: 'error' });
      return false;
    }

    const currentCart = storageService.getItem(STORAGE_KEYS.CART, []);
    const existingIndex = currentCart.findIndex((item) => item.productId === product.id);

    if (existingIndex > -1) {
      const newQty = currentCart[existingIndex].quantity + quantity;
      if (newQty > available) {
        addToast({
          title: 'Stock Limit Reached',
          message: `Only ${available} unit(s) of "${product.name}" available.`,
          type: 'warning',
        });
        return false;
      }
      currentCart[existingIndex].quantity = newQty;
    } else {
      if (quantity > available) {
        addToast({
          title: 'Stock Limit Reached',
          message: `Only ${available} unit(s) available.`,
          type: 'warning',
        });
        return false;
      }
      currentCart.push({
        productId: product.id,
        name: product.name,
        sku: product.sku,
        price: Number(product.sellingPrice) || 0,
        imageUrl: product.imageUrl,
        quantity,
      });
    }

    storageService.setItem(STORAGE_KEYS.CART, currentCart);
    setCart(currentCart);
    addToast({ title: 'Added to Cart', message: `"${product.name}" added to your cart.` });
    return true;
  };

  const updateCartQty = (productId, quantity) => {
    const prod = products.find((p) => p.id === productId);
    const available = Number(prod?.quantity) || 999;
    const currentCart = storageService.getItem(STORAGE_KEYS.CART, []);

    if (quantity <= 0) {
      return removeFromCart(productId);
    }

    if (quantity > available) {
      addToast({
        title: 'Stock Limit Reached',
        message: `Only ${available} unit(s) available in stock.`,
        type: 'warning',
      });
      return false;
    }

    const updated = currentCart.map((item) => (item.productId === productId ? { ...item, quantity } : item));
    storageService.setItem(STORAGE_KEYS.CART, updated);
    setCart(updated);
    return true;
  };

  const removeFromCart = (productId) => {
    const currentCart = storageService.getItem(STORAGE_KEYS.CART, []);
    const updated = currentCart.filter((item) => item.productId !== productId);
    storageService.setItem(STORAGE_KEYS.CART, updated);
    setCart(updated);
    addToast({ title: 'Item Removed', message: 'Item removed from shopping cart.', type: 'info' });
  };

  const clearCart = () => {
    storageService.setItem(STORAGE_KEYS.CART, []);
    setCart([]);
  };

  // ================= DEMO DATA RESET =================
  const resetAllDemoData = () => {
    storageService.resetDemoData();
    reloadState();
    addToast({
      title: 'Demo Data Reset',
      message: 'All products, categories, suppliers, customers, transactions, and settings have been reset to pristine seed data.',
    });
  };

  const value = {
    products,
    categories,
    suppliers,
    customers,
    purchases,
    sales,
    quotations,
    lotPurchases,
    inventoryMovements,
    orders,
    users,
    settings,
    cart,
    toasts,
    confirmModal,
    addToast,
    removeToast,
    confirmAction,
    closeConfirmModal,
    // Actions
    addProduct,
    updateProduct,
    deleteProduct,
    importProductsCSV,
    addCategory,
    updateCategory,
    deleteCategory,
    addSupplier,
    updateSupplier,
    deleteSupplier,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    createPurchase,
    receivePurchase,
    cancelPurchase,
    createSale,
    completeSale,
    cancelSale,
    createQuotation,
    updateQuotation,
    deleteQuotation,
    convertQuotationToSale,
    createLotPurchase,
    updateLotPurchase,
    deleteLotPurchase,
    distributeLotToInventory,
    adjustStock,
    createOrder,
    updateOrderStatus,
    addUser,
    updateUser,
    toggleUserStatus,
    deleteUser,
    resetUsers,
    updateSettings,
    toggleTheme,
    addToCart,
    updateCartQty,
    removeFromCart,
    clearCart,
    resetAllDemoData,
    reloadState,
    syncWithBackend,
  };

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
};

export const useAppData = () => {
  const context = useContext(AppDataContext);
  if (!context) {
    throw new Error('useAppData must be used within an AppDataProvider');
  }
  return context;
};
