import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { storageService, STORAGE_KEYS } from '../services/storageService';
import { productService } from '../services/productService';
import { categoryService } from '../services/categoryService';
import { supplierService } from '../services/supplierService';
import { customerService } from '../services/customerService';
import { purchaseService } from '../services/purchaseService';
import { salesService } from '../services/salesService';
import { quotationService } from '../services/quotationService';
import { moneyReceiptService } from '../services/moneyReceiptService';
import { priceCatalogService } from '../services/priceCatalogService';
import { machineService } from '../services/machineService';
import { lotService } from '../services/lotService';
import { inventoryService } from '../services/inventoryService';
import { orderService } from '../services/orderService';
import { userService } from '../services/userService';
import { settingsService } from '../services/settingsService';
import { apiClient } from '../services/apiClient';
import { buildCategoryTree, flattenCategoryTree } from '../domain/categoryHierarchy';
import { buildMachineCatalogTree } from '../domain/catalogHierarchy';
import {
  normalizeReconcileKey,
  normalizeReconcilePhone,
  reconcileAndPushNewerLocal,
  settleReconcilePushes,
} from './modules/syncReconciler';
import {
  withNormalizedId,
  normalizeSupplierList,
  normalizePurchaseRecord,
  normalizeSaleRecord,
  normalizeQuotationRecord,
  normalizeMoneyReceiptRecord,
  normalizeOrderRecord,
} from './modules/collectionNormalizers';

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
  const [moneyReceipts, setMoneyReceipts] = useState(() => storageService.getItem(STORAGE_KEYS.MONEY_RECEIPTS, []));
  const [priceCatalog, setPriceCatalog] = useState(() => storageService.getItem(STORAGE_KEYS.PRICE_CATALOG, []));
  const [machineModels, setMachineModels] = useState(() => storageService.getItem(STORAGE_KEYS.MACHINE_MODELS, []));
  const [lotPurchases, setLotPurchases] = useState(() => storageService.getItem(STORAGE_KEYS.LOT_PURCHASES, []));
  const [inventoryMovements, setInventoryMovements] = useState(() => storageService.getItem(STORAGE_KEYS.INVENTORY_MOVEMENTS, []));
  const [orders, setOrders] = useState(() => storageService.getItem(STORAGE_KEYS.ORDERS, []));
  const [users, setUsers] = useState(() => storageService.getItem(STORAGE_KEYS.USERS, []));
  const [settings, setSettings] = useState(() => settingsService.getSettings());
  const [cart, setCart] = useState(() => storageService.getItem(STORAGE_KEYS.CART, []));

  // UI & Live MongoDB Sync state
  const [toasts, setToasts] = useState([]);
  const [syncState, setSyncState] = useState(() => apiClient.getSyncSnapshot());
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
  const syncWithBackend = async (forceFresh = false) => {
    try {
      // Do not overwrite local state while a mutation HTTP request is actively in-flight
      if (apiClient.activeMutations > 0 && !forceFresh) {
        return;
      }

      const isUp = await apiClient.isBackendAvailable();
      if (!isUp) return;

      // Flush any offline-queued mutations FIRST so MongoDB gets local updates before we pull!
      if (apiClient.getPendingQueue().length > 0) {
        await apiClient.flushPendingQueue();
      }

      const reqConfig = { bypassCache: true };
      const [prodsRes, catsRes, supsRes, custsRes, pursRes, salesRes, quotesRes, mrRes, pcRes, machRes, ordsRes, setsRes, lotsRes] =
        await Promise.allSettled([
          apiClient.get('/products', {}, reqConfig),
          apiClient.get('/categories', {}, reqConfig),
          apiClient.get('/suppliers', {}, reqConfig),
          apiClient.get('/customers', {}, reqConfig),
          apiClient.get('/purchases', {}, reqConfig),
          apiClient.get('/sales', {}, reqConfig),
          apiClient.get('/quotations', {}, reqConfig),
          apiClient.get('/money-receipts', {}, reqConfig),
          apiClient.get('/price-catalog', {}, reqConfig),
          apiClient.get('/machines', {}, reqConfig),
          apiClient.get('/orders', {}, reqConfig),
          apiClient.get('/settings', {}, reqConfig),
          apiClient.get('/lots', {}, reqConfig),
        ]);

      // Skip applying stale fetch results if a new user mutation started mid-fetch
      if (apiClient.activeMutations > 0) {
        return;
      }

      if (prodsRes.status === 'fulfilled' && prodsRes.value?.success && Array.isArray(prodsRes.value.data) && prodsRes.value.data.length > 0) {
        const localProds = storageService.getItem(STORAGE_KEYS.PRODUCTS, []);
        const { merged, pushPromises } = reconcileAndPushNewerLocal(
          localProds,
          prodsRes.value.data,
          (id, item) => apiClient.put(`/products/${id}`, item).catch(() => null)
        );
        setProducts(merged);
        storageService.setItem(STORAGE_KEYS.PRODUCTS, merged);
        if (pushPromises.length > 0) await Promise.allSettled(pushPromises);
      }

      if (catsRes.status === 'fulfilled' && catsRes.value?.success && Array.isArray(catsRes.value.data) && catsRes.value.data.length > 0) {
        const normalized = catsRes.value.data.map(withNormalizedId);
        setCategories(normalized);
        storageService.setItem(STORAGE_KEYS.CATEGORIES, normalized);
      }

      if (supsRes.status === 'fulfilled' && supsRes.value?.success && Array.isArray(supsRes.value.data) && supsRes.value.data.length > 0) {
        const normalized = normalizeSupplierList(supsRes.value.data);
        setSuppliers(normalized);
        storageService.setItem(STORAGE_KEYS.SUPPLIERS, normalized);
      }

      if (custsRes.status === 'fulfilled' && custsRes.value?.success && Array.isArray(custsRes.value.data) && custsRes.value.data.length > 0) {
        const localCusts = storageService.getItem(STORAGE_KEYS.CUSTOMERS, []);
        const buildCustomerPayload = (item) => ({
          name: item.name,
          companyName: item.companyName,
          designationRole: item.designationRole,
          phone: item.phone,
          companyPhone: item.companyPhone,
          email: item.email,
          address: item.address,
          location: item.location,
          city: item.city,
          customerType: item.customerType,
          notes: item.notes,
        });
        const { merged, pushPromises } = reconcileAndPushNewerLocal(
          localCusts,
          custsRes.value.data,
          (id, item) => apiClient.put(`/customers/${id}`, buildCustomerPayload(item)).catch(() => null),
          {
            entityTag: 'customer',
            getFallbackKeys: (c) => {
              const keys = [];
              const phone = normalizeReconcilePhone(c?.phone);
              if (phone) keys.push(`phone:${phone}`);
              const name = normalizeReconcileKey(c?.name);
              if (name) keys.push(`name:${name}`);
              return keys;
            },
            shouldAutoCreate: (c) => Boolean(c?.name && c.name !== 'Rahim Test Customer'),
            createFn: (item) => apiClient.post('/customers', buildCustomerPayload(item)).catch(() => null),
          }
        );
        setCustomers(merged);
        storageService.setItem(STORAGE_KEYS.CUSTOMERS, merged);
        await settleReconcilePushes(pushPromises, merged, setCustomers, STORAGE_KEYS.CUSTOMERS);
      }

      if (pursRes.status === 'fulfilled' && pursRes.value?.success && Array.isArray(pursRes.value.data) && pursRes.value.data.length > 0) {
        const normalized = pursRes.value.data.map(normalizePurchaseRecord);
        setPurchases(normalized);
        storageService.setItem(STORAGE_KEYS.PURCHASES, normalized);
      }

      if (salesRes.status === 'fulfilled' && salesRes.value?.success && Array.isArray(salesRes.value.data) && salesRes.value.data.length > 0) {
        const localSales = storageService.getItem(STORAGE_KEYS.SALES, []);
        const rawNormalized = salesRes.value.data.map(normalizeSaleRecord);
        const { merged, pushPromises } = reconcileAndPushNewerLocal(
          localSales,
          rawNormalized,
          (id, item) => apiClient.put(`/sales/${id}`, item).catch(() => null),
          {
            entityTag: 'sale',
            getFallbackKeys: (s) => {
              const inv = normalizeReconcileKey(s?.invoiceNumber || s?.invoiceNo);
              return inv ? [`inv:${inv}`] : [];
            },
            shouldAutoCreate: (s) => {
              const inv = normalizeReconcileKey(s?.invoiceNumber || s?.invoiceNo);
              return Boolean(s?.customerName && !inv.startsWith('inv-test-'));
            },
            createFn: (item) => {
              const { id: _tid, _id: _oid, ...payload } = item;
              return apiClient.post('/sales', payload).catch(() => null);
            },
          }
        );
        setSales(merged);
        storageService.setItem(STORAGE_KEYS.SALES, merged);
        await settleReconcilePushes(pushPromises, merged, setSales, STORAGE_KEYS.SALES);
      }

      if (quotesRes.status === 'fulfilled' && quotesRes.value?.success && Array.isArray(quotesRes.value.data) && quotesRes.value.data.length > 0) {
        const localQuotes = storageService.getItem(STORAGE_KEYS.QUOTATIONS, []);
        const rawNormalized = quotesRes.value.data.map(normalizeQuotationRecord);
        const { merged, pushPromises } = reconcileAndPushNewerLocal(
          localQuotes,
          rawNormalized,
          (id, item) => apiClient.put(`/quotations/${id}`, item).catch(() => null),
          {
            entityTag: 'quotation',
            getFallbackKeys: (q) => {
              const qn = normalizeReconcileKey(q?.quotationNumber);
              return qn ? [`qt:${qn}`] : [];
            },
            shouldAutoCreate: (q) => {
              const qn = normalizeReconcileKey(q?.quotationNumber);
              return Boolean((q?.customerName || q?.quotationNumber) && !qn.startsWith('qt-test-'));
            },
            createFn: (item) => {
              const { id: _tid, _id: _oid, ...payload } = item;
              return apiClient.post('/quotations', payload).catch(() => null);
            },
          }
        );
        setQuotations(merged);
        storageService.setItem(STORAGE_KEYS.QUOTATIONS, merged);
        await settleReconcilePushes(pushPromises, merged, setQuotations, STORAGE_KEYS.QUOTATIONS);
      }

      if (mrRes.status === 'fulfilled' && mrRes.value?.success && Array.isArray(mrRes.value.data)) {
        const localReceipts = storageService.getItem(STORAGE_KEYS.MONEY_RECEIPTS, []);
        const rawNormalized = mrRes.value.data.map(normalizeMoneyReceiptRecord);
        const { merged, pushPromises } = reconcileAndPushNewerLocal(
          localReceipts,
          rawNormalized,
          (id, item) => apiClient.put(`/money-receipts/${id}`, item).catch(() => null),
          {
            entityTag: 'moneyreceipt',
            getFallbackKeys: (r) => {
              const rn = normalizeReconcileKey(r?.receiptNumber);
              return rn ? [`mr:${rn}`] : [];
            },
            shouldAutoCreate: (r) => Boolean(r?.customerName && Number(r?.amount) > 0),
            createFn: (item) => {
              const { id: _tid, _id: _oid, ...payload } = item;
              return apiClient.post('/money-receipts', payload).catch(() => null);
            },
          }
        );
        setMoneyReceipts(merged);
        storageService.setItem(STORAGE_KEYS.MONEY_RECEIPTS, merged);
        await settleReconcilePushes(pushPromises, merged, setMoneyReceipts, STORAGE_KEYS.MONEY_RECEIPTS);
      }

      if (pcRes.status === 'fulfilled' && pcRes.value?.success && Array.isArray(pcRes.value.data)) {
        const localPc = storageService.getItem(STORAGE_KEYS.PRICE_CATALOG, []);
        const rawPc = pcRes.value.data.map(withNormalizedId);
        const { merged, pushPromises } = reconcileAndPushNewerLocal(
          localPc,
          rawPc,
          (id, item) => apiClient.put(`/price-catalog/${id}`, item).catch(() => null),
          {
            entityTag: 'pricecatalog',
            getFallbackKeys: (r) => {
              const p = normalizeReconcileKey(r?.normalizedPartName || r?.partName);
              const mk = normalizeReconcileKey(r?.machineKey);
              return p ? [`pc:${p}|${mk}`] : [];
            },
            shouldAutoCreate: (r) => Boolean(r?.partName),
            createFn: (item) => {
              const { id: _tid, _id: _oid, ...payload } = item;
              return apiClient.post('/price-catalog', payload).catch(() => null);
            },
          }
        );
        setPriceCatalog(merged);
        storageService.setItem(STORAGE_KEYS.PRICE_CATALOG, merged);
        await settleReconcilePushes(pushPromises, merged, setPriceCatalog, STORAGE_KEYS.PRICE_CATALOG);
      }

      if (machRes.status === 'fulfilled' && machRes.value?.success && Array.isArray(machRes.value.data)) {
        const normalizedMachines = machRes.value.data.map(withNormalizedId);
        setMachineModels(normalizedMachines);
        storageService.setItem(STORAGE_KEYS.MACHINE_MODELS, normalizedMachines);
      }

      if (ordsRes.status === 'fulfilled' && ordsRes.value?.success && Array.isArray(ordsRes.value.data) && ordsRes.value.data.length > 0) {
        const normalized = ordsRes.value.data.map(normalizeOrderRecord);
        setOrders(normalized);
        storageService.setItem(STORAGE_KEYS.ORDERS, normalized);
      }

      if (setsRes.status === 'fulfilled' && setsRes.value?.success && setsRes.value.data) {
        const remoteSettings = setsRes.value.data;
        setSettings((prev) => ({ ...prev, ...remoteSettings }));
        storageService.setItem(STORAGE_KEYS.SETTINGS, { ...settingsService.getSettings(), ...remoteSettings });
      }

      if (lotsRes.status === 'fulfilled' && lotsRes.value?.success && Array.isArray(lotsRes.value.data) && lotsRes.value.data.length > 0) {
        const normalized = lotsRes.value.data.map(withNormalizedId);
        setLotPurchases(normalized);
        storageService.setItem(STORAGE_KEYS.LOT_PURCHASES, normalized);
      }
    } catch (err) {
      console.info('[StockLine API Sync notice]:', err.message);
    }
  };

  // Reload all state from storage, optionally skipping premature backend GET race
  const reloadState = (skipBackendSync = false) => {
    setProducts(storageService.getItem(STORAGE_KEYS.PRODUCTS, []));
    setCategories(storageService.getItem(STORAGE_KEYS.CATEGORIES, []));
    setSuppliers(storageService.getItem(STORAGE_KEYS.SUPPLIERS, []));
    setCustomers(storageService.getItem(STORAGE_KEYS.CUSTOMERS, []));
    setPurchases(storageService.getItem(STORAGE_KEYS.PURCHASES, []));
    setLotPurchases(storageService.getItem(STORAGE_KEYS.LOT_PURCHASES, []));
    setSales(storageService.getItem(STORAGE_KEYS.SALES, []));
    setQuotations(storageService.getItem(STORAGE_KEYS.QUOTATIONS, []));
    setMoneyReceipts(storageService.getItem(STORAGE_KEYS.MONEY_RECEIPTS, []));
    setPriceCatalog(storageService.getItem(STORAGE_KEYS.PRICE_CATALOG, []));
    setMachineModels(storageService.getItem(STORAGE_KEYS.MACHINE_MODELS, []));
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
    if (!skipBackendSync) {
      syncWithBackend();
    }
  };

  // Update React UI immediately and trigger clean backend sync ONLY AFTER MongoDB commit finishes
  const reloadAfterMutation = (res) => {
    reloadState(true);
    if (res?.syncPromise && typeof res.syncPromise.then === 'function') {
      res.syncPromise.finally(() => {
        if (apiClient.activeMutations === 0) {
          syncWithBackend(true);
        }
      });
    }
  };

  useEffect(() => {
    const curSettings = settingsService.getSettings();
    if (curSettings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    const unsubscribeSync = apiClient.subscribeSync((snapshot, evt) => {
      setSyncState(snapshot);
      if (evt?.type === 'mutation-error' && evt.error) {
        addToast({
          title: 'MongoDB সিঙ্ক সতর্কতা (Sync Error)',
          message: `ডাটাবেজ আপডেটে সমস্যা: ${evt.error}`,
          type: 'error',
          duration: 6000,
        });
      }
    });

    syncWithBackend();

    // Auto-reconnect and flush pending offline queue every 20 seconds or on browser online event
    const handleOnline = () => syncWithBackend(true);
    window.addEventListener('online', handleOnline);
    const syncTimer = setInterval(() => {
      if (document.visibilityState === 'visible') {
        const snap = apiClient.getSyncSnapshot();
        if (snap.pendingCount > 0 || snap.isOnline === false) {
          syncWithBackend(true);
        }
      }
    }, 20000);

    return () => {
      unsubscribeSync();
      window.removeEventListener('online', handleOnline);
      clearInterval(syncTimer);
    };
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
      reloadAfterMutation(res);
      addToast({ title: 'Product Created', message: `Product "${res.product.name}" added successfully.` });
    } else {
      addToast({ title: 'Creation Failed', message: res.message, type: 'error' });
    }
    return res;
  };

  const updateProduct = (id, updates) => {
    const res = productService.update(id, updates);
    if (res.success) {
      reloadAfterMutation(res);
      addToast({ title: 'Product Updated', message: `Product "${res.product.name}" updated successfully.` });
    } else {
      addToast({ title: 'Update Failed', message: res.message, type: 'error' });
    }
    return res;
  };

  const deleteProduct = (id) => {
    const res = productService.remove(id);
    if (res.success) {
      reloadAfterMutation(res);
      addToast({ title: 'Product Deleted', message: res.message });
    } else {
      addToast({ title: 'Cannot Delete', message: res.message, type: 'error' });
    }
    return res;
  };

  const importProductsCSV = (rows, performedBy) => {
    const res = productService.importCSV(rows, performedBy);
    reloadState(true);
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
      reloadAfterMutation(res);
      addToast({ title: 'Category Created', message: `Category "${res.category.name}" created.` });
    } else {
      addToast({ title: 'Creation Failed', message: res.message, type: 'error' });
    }
    return res;
  };

  const updateCategory = (id, updates) => {
    const res = categoryService.update(id, updates);
    if (res.success) {
      reloadAfterMutation(res);
      addToast({ title: 'Category Updated', message: `Category "${res.category.name}" updated.` });
    } else {
      addToast({ title: 'Update Failed', message: res.message, type: 'error' });
    }
    return res;
  };

  const deleteCategory = (id) => {
    const res = categoryService.remove(id);
    if (res.success) {
      reloadAfterMutation(res);
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
      reloadAfterMutation(res);
      addToast({ title: 'Supplier Created', message: `Supplier "${res.supplier.name}" added.` });
    }
    return res;
  };

  const updateSupplier = (id, updates) => {
    const res = supplierService.update(id, updates);
    if (res.success) {
      reloadAfterMutation(res);
      addToast({ title: 'Supplier Updated', message: `Supplier details saved.` });
    }
    return res;
  };

  const deleteSupplier = (id) => {
    const res = supplierService.remove(id);
    if (res.success) {
      reloadAfterMutation(res);
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
      reloadAfterMutation(res);
      addToast({ title: 'Customer Created', message: `Customer "${res.customer.name}" registered.` });
    }
    return res;
  };

  const updateCustomer = (id, updates) => {
    const res = customerService.update(id, updates);
    if (res.success) {
      reloadAfterMutation(res);
      addToast({ title: 'Customer Updated', message: 'Customer details updated.' });
    }
    return res;
  };

  const deleteCustomer = (id) => {
    const res = customerService.remove(id);
    if (res.success) {
      reloadAfterMutation(res);
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
      reloadAfterMutation(res);
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
      reloadAfterMutation(res);
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
      reloadAfterMutation(res);
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
      reloadAfterMutation(res);
      addToast({
        title: 'Sale Recorded',
        message: `Invoice ${res.sale.invoiceNo} (${res.sale.status.toUpperCase()}) created successfully.`,
      });
    } else {
      addToast({ title: 'Sale Failed', message: res.message, type: 'error' });
    }
    return res;
  };

  const updateSale = (id, data, performedBy) => {
    const res = salesService.update(id, data, performedBy);
    if (res.success) {
      reloadAfterMutation(res);
      addToast({
        title: 'Sale Updated',
        message: `Invoice ${res.sale.invoiceNo} updated successfully.`,
      });
    } else {
      addToast({ title: 'Update Failed', message: res.message, type: 'error' });
    }
    return res;
  };

  const completeSale = (id, performedBy) => {
    const res = salesService.completeSale(id, performedBy);
    if (res.success) {
      reloadAfterMutation(res);
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
      reloadAfterMutation(res);
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
      reloadAfterMutation(res);
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
      reloadAfterMutation(res);
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
      reloadAfterMutation(res);
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
        unit: it.unit || prod?.unit || 'pc',
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
      machineDetails: quote.machineDetails || {},
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
      const qRes = quotationService.update(id, {
        status: 'converted',
        convertedSaleId: res.sale.id,
      });
      reloadAfterMutation({
        syncPromise: Promise.allSettled([res.syncPromise, qRes?.syncPromise]),
      });
      addToast({
        title: 'ইনভয়েসে রূপান্তর সম্পন্ন',
        message: `কোটেশন #${quote.quotationNumber} সফলভাবে সেলস ইনভয়েস #${res.sale.invoiceNo}-এ রূপান্তরিত হয়েছে।`,
        type: 'success',
      });
    }
    return res;
  };

  // ================= MONEY RECEIPTS (টাকা জমার রসিদ) =================
  const createMoneyReceipt = (data, receivedBy = 'Accounts') => {
    const res = moneyReceiptService.create(data, receivedBy);
    if (res.success) {
      reloadAfterMutation(res);
      addToast({
        title: 'মানি রিসিপ্ট সংরক্ষিত',
        message: `রসিদ #${res.receipt.receiptNumber} (৳${(Math.round(((Number(res.receipt.amount) || 0) + Number.EPSILON) * 100) / 100).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}) যুক্ত হয়েছে।`,
        type: 'success',
      });
    } else {
      addToast({ title: 'Receipt Failed', message: res.message, type: 'error' });
    }
    return res;
  };

  const updateMoneyReceipt = (id, updates) => {
    const res = moneyReceiptService.update(id, updates);
    if (res.success) {
      reloadAfterMutation(res);
      addToast({ title: 'মানি রিসিপ্ট আপডেট হয়েছে', message: 'Money receipt updated.', type: 'success' });
    } else {
      addToast({ title: 'Update Failed', message: res.message, type: 'error' });
    }
    return res;
  };

  const deleteMoneyReceipt = (id) => {
    const res = moneyReceiptService.remove(id);
    if (res.success) {
      reloadAfterMutation(res);
      addToast({ title: 'মানি রিসিপ্ট মুছে ফেলা হয়েছে', message: res.message });
    }
    return res;
  };

  // ================= MACHINE & PARTS PRICE CATALOG =================
  const savePriceCatalogEntry = (data) => {
    const res = priceCatalogService.saveManualEntry(data);
    if (res.success) {
      reloadAfterMutation(res);
      addToast({
        title: 'প্রাইস লিস্টে সংরক্ষিত',
        message: `"${res.entry.partName}" প্রাইস লিস্টে যোগ/আপডেট হয়েছে।`,
        type: 'success',
      });
    } else {
      addToast({ title: 'Error', message: res.message, type: 'error' });
    }
    return res;
  };

  const deletePriceCatalogEntry = (id) => {
    const res = priceCatalogService.remove(id);
    if (res.success) {
      reloadAfterMutation(res);
      addToast({ title: 'প্রাইস লিস্ট থেকে মোছা হয়েছে', message: res.message });
    }
    return res;
  };

  const syncPriceCatalogHistory = () => {
    const res = priceCatalogService.syncHistoryLocal(quotations, sales);
    if (res.success) {
      reloadAfterMutation(res);
      addToast({
        title: 'পূর্বের ইতিহাস সিঙ্ক সম্পন্ন',
        message: `কোটেশন ও বিক্রয় থেকে ${res.entries.length}টি পার্টস প্রাইস এন্ট্রি তৈরি/আপডেট হয়েছে।`,
        type: 'success',
      });
    }
    return res;
  };

  const promotePriceEntryToProduct = (entry, overrides = {}) => {
    const res = priceCatalogService.promoteToProduct(entry, overrides);
    if (res.success) {
      reloadAfterMutation(res.product?.syncPromise ? { syncPromise: res.product.syncPromise } : {});
      addToast({
        title: 'প্রোডাক্ট ডাটাবেজে যুক্ত হয়েছে',
        message: `"${res.product.name}" (SKU: ${res.product.sku}) এখন প্রোডাক্ট ক্যাটালগে যুক্ত।`,
        type: 'success',
      });
    } else {
      addToast({ title: 'Failed', message: res.message, type: 'error' });
    }
    return res;
  };

  // ================= HIERARCHICAL MACHINE MODELS & UNIFIED TREE =================
  const saveMachineModel = (data) => {
    const res = machineService.saveOrUpsert(data);
    if (res.success) {
      reloadAfterMutation(res);
      addToast({
        title: 'মেশিন প্রোফাইল সংরক্ষিত',
        message: `"${res.machine.machineName}" প্রোফাইল মাস্টার ক্যাটালগে সেভ হয়েছে।`,
        type: 'success',
      });
    } else {
      addToast({ title: 'Error', message: res.message, type: 'error' });
    }
    return res;
  };

  const deleteMachineModel = (id) => {
    const res = machineService.remove(id);
    if (res.success) {
      reloadAfterMutation(res);
      addToast({ title: 'মেশিন প্রোফাইল সরানো হয়েছে', message: res.message });
    } else {
      addToast({ title: 'Error', message: res.message, type: 'error' });
    }
    return res;
  };

  const categoryTreeData = useMemo(
    () => buildCategoryTree(categories, products),
    [categories, products]
  );

  const flatCategories = useMemo(
    () => flattenCategoryTree(categoryTreeData.roots),
    [categoryTreeData]
  );

  const machineCatalogHierarchy = useMemo(
    () =>
      buildMachineCatalogTree({
        machineModels,
        products,
        priceCatalog,
        quotations,
        sales,
      }),
    [machineModels, products, priceCatalog, quotations, sales]
  );

  // ================= LOT AUCTION PURCHASES =================
  const createLotPurchase = (data) => {
    const res = lotService.create(data);
    if (res.success) {
      reloadAfterMutation(res);
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
      reloadAfterMutation(res);
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
      reloadAfterMutation(res);
      addToast({ title: 'Lot Removed', message: 'Lot deleted from system.' });
    }
    return res;
  };

  const distributeLotToInventory = (id, performedBy = 'Warehouse Master') => {
    const res = lotService.distributeToInventory(id, performedBy);
    if (res.success) {
      reloadAfterMutation(res);
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
      reloadAfterMutation(res);
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
      reloadAfterMutation(res);
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
      reloadAfterMutation(res);
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
      reloadAfterMutation(res);
      addToast({ title: 'Demo User Created', message: `User "${res.user.name}" created.` });
    } else {
      addToast({ title: 'User Creation Failed', message: res.message, type: 'error' });
    }
    return res;
  };

  const updateUser = (id, updates, currentUserId) => {
    const res = userService.update(id, updates, currentUserId);
    if (res.success) {
      reloadAfterMutation(res);
      addToast({ title: 'User Updated', message: 'User details saved.' });
    } else {
      addToast({ title: 'Update Failed', message: res.message, type: 'error' });
    }
    return res;
  };

  const toggleUserStatus = (id, currentUserId) => {
    const res = userService.toggleStatus(id, currentUserId);
    if (res.success) {
      reloadAfterMutation(res);
      addToast({ title: 'Status Changed', message: `User status set to ${res.user.status}.` });
    } else {
      addToast({ title: 'Action Denied', message: res.message, type: 'error' });
    }
    return res;
  };

  const deleteUser = (id, currentUserId) => {
    const res = userService.remove(id, currentUserId);
    if (res.success) {
      reloadAfterMutation(res);
      addToast({ title: 'User Removed', message: res.message });
    } else {
      addToast({ title: 'Cannot Delete', message: res.message, type: 'error' });
    }
    return res;
  };

  const resetUsers = () => {
    const res = userService.resetUsers();
    reloadState(true);
    addToast({ title: 'Demo Users Reset', message: 'Default demo user accounts restored.' });
    return res;
  };

  // ================= SETTINGS & THEME =================
  const updateSettings = (updates) => {
    const res = settingsService.updateSettings(updates);
    if (res.success) {
      setSettings(res.settings);
      if (res.syncPromise) {
        res.syncPromise.finally(() => {
          if (apiClient.activeMutations === 0) syncWithBackend(true);
        });
      }
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
    moneyReceipts,
    priceCatalog,
    machineModels,
    categoryTree: categoryTreeData.roots,
    categoryById: categoryTreeData.byId,
    categoryDescendantMap: categoryTreeData.descendantMap,
    flatCategories,
    machineCatalogHierarchy,
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
    updateSale,
    completeSale,
    cancelSale,
    createQuotation,
    updateQuotation,
    deleteQuotation,
    convertQuotationToSale,
    createMoneyReceipt,
    updateMoneyReceipt,
    deleteMoneyReceipt,
    savePriceCatalogEntry,
    deletePriceCatalogEntry,
    syncPriceCatalogHistory,
    promotePriceEntryToProduct,
    saveMachineModel,
    deleteMachineModel,
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
    syncState,
    syncNow: () => syncWithBackend(true),
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
