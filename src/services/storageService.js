import {
  INITIAL_CATEGORIES,
  INITIAL_SUPPLIERS,
  INITIAL_CUSTOMERS,
  INITIAL_PRODUCTS,
  INITIAL_PURCHASES,
  INITIAL_SALES,
  INITIAL_INVENTORY_MOVEMENTS,
  INITIAL_ORDERS,
  INITIAL_USERS,
  INITIAL_SETTINGS,
  INITIAL_QUOTATIONS,
  INITIAL_LOT_PURCHASES,
} from '../data/seedData';

const PREFIX = 'stockline_demo_v1_';

export const STORAGE_KEYS = {
  PRODUCTS: `${PREFIX}products`,
  CATEGORIES: `${PREFIX}categories`,
  SUPPLIERS: `${PREFIX}suppliers`,
  CUSTOMERS: `${PREFIX}customers`,
  PURCHASES: `${PREFIX}purchases`,
  LOT_PURCHASES: `${PREFIX}lot_purchases`,
  SALES: `${PREFIX}sales`,
  QUOTATIONS: `${PREFIX}quotations`,
  MONEY_RECEIPTS: `${PREFIX}money_receipts`,
  PRICE_CATALOG: `${PREFIX}price_catalog`,
  MACHINE_MODELS: `${PREFIX}machine_models`,
  INVENTORY_MOVEMENTS: `${PREFIX}inventory_movements`,
  ORDERS: `${PREFIX}orders`,
  USERS: `${PREFIX}users`,
  SETTINGS: `${PREFIX}settings`,
  SESSION: `${PREFIX}session`,
  CART: `${PREFIX}cart`,
  INITIALIZED: `${PREFIX}initialized`,
};

class StorageService {
  getItem(key, defaultValue = null) {
    try {
      const data = localStorage.getItem(key);
      if (data === null || data === undefined) return defaultValue;
      return JSON.parse(data);
    } catch (err) {
      console.warn(`[StockLine Storage] Failed to read key: ${key}`, err);
      return defaultValue;
    }
  }

  setItem(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (err) {
      console.error(`[StockLine Storage] Failed to write key: ${key}`, err);
      if (err.name === 'QuotaExceededError') {
        alert('Browser LocalStorage quota exceeded. Please clear some demo data.');
      }
      return false;
    }
  }

  removeItem(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (err) {
      console.error(`[StockLine Storage] Failed to remove key: ${key}`, err);
      return false;
    }
  }

  /**
   * Initializes seed data on first run without overwriting user changes on subsequent refreshes.
   */
  initializeSeedData() {
    const isInitialized = this.getItem(STORAGE_KEYS.INITIALIZED, false);
    if (isInitialized) {
      return false;
    }

    if (!this.getItem(STORAGE_KEYS.CATEGORIES)) {
      this.setItem(STORAGE_KEYS.CATEGORIES, INITIAL_CATEGORIES);
    }
    if (!this.getItem(STORAGE_KEYS.SUPPLIERS)) {
      this.setItem(STORAGE_KEYS.SUPPLIERS, INITIAL_SUPPLIERS);
    }
    if (!this.getItem(STORAGE_KEYS.CUSTOMERS)) {
      this.setItem(STORAGE_KEYS.CUSTOMERS, INITIAL_CUSTOMERS);
    }
    if (!this.getItem(STORAGE_KEYS.PRODUCTS)) {
      this.setItem(STORAGE_KEYS.PRODUCTS, INITIAL_PRODUCTS);
    }
    if (!this.getItem(STORAGE_KEYS.PURCHASES)) {
      this.setItem(STORAGE_KEYS.PURCHASES, INITIAL_PURCHASES);
    }
    if (!this.getItem(STORAGE_KEYS.LOT_PURCHASES)) {
      this.setItem(STORAGE_KEYS.LOT_PURCHASES, INITIAL_LOT_PURCHASES);
    }
    if (!this.getItem(STORAGE_KEYS.SALES)) {
      this.setItem(STORAGE_KEYS.SALES, INITIAL_SALES);
    }
    if (!this.getItem(STORAGE_KEYS.QUOTATIONS)) {
      this.setItem(STORAGE_KEYS.QUOTATIONS, INITIAL_QUOTATIONS);
    }
    if (!this.getItem(STORAGE_KEYS.MONEY_RECEIPTS)) {
      this.setItem(STORAGE_KEYS.MONEY_RECEIPTS, []);
    }
    if (!this.getItem(STORAGE_KEYS.PRICE_CATALOG)) {
      this.setItem(STORAGE_KEYS.PRICE_CATALOG, []);
    }
    if (!this.getItem(STORAGE_KEYS.MACHINE_MODELS)) {
      this.setItem(STORAGE_KEYS.MACHINE_MODELS, []);
    }
    if (!this.getItem(STORAGE_KEYS.INVENTORY_MOVEMENTS)) {
      this.setItem(STORAGE_KEYS.INVENTORY_MOVEMENTS, INITIAL_INVENTORY_MOVEMENTS);
    }
    if (!this.getItem(STORAGE_KEYS.ORDERS)) {
      this.setItem(STORAGE_KEYS.ORDERS, INITIAL_ORDERS);
    }
    if (!this.getItem(STORAGE_KEYS.USERS)) {
      this.setItem(STORAGE_KEYS.USERS, INITIAL_USERS);
    }
    if (!this.getItem(STORAGE_KEYS.SETTINGS)) {
      this.setItem(STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS);
    }
    if (!this.getItem(STORAGE_KEYS.CART)) {
      this.setItem(STORAGE_KEYS.CART, []);
    }

    this.setItem(STORAGE_KEYS.INITIALIZED, true);
    return true;
  }

  /**
   * Hard reset back to pristine initial seed demo records
   */
  resetDemoData() {
    this.setItem(STORAGE_KEYS.CATEGORIES, INITIAL_CATEGORIES);
    this.setItem(STORAGE_KEYS.SUPPLIERS, INITIAL_SUPPLIERS);
    this.setItem(STORAGE_KEYS.CUSTOMERS, INITIAL_CUSTOMERS);
    this.setItem(STORAGE_KEYS.PRODUCTS, INITIAL_PRODUCTS);
    this.setItem(STORAGE_KEYS.PURCHASES, INITIAL_PURCHASES);
    this.setItem(STORAGE_KEYS.LOT_PURCHASES, INITIAL_LOT_PURCHASES);
    this.setItem(STORAGE_KEYS.SALES, INITIAL_SALES);
    this.setItem(STORAGE_KEYS.QUOTATIONS, INITIAL_QUOTATIONS);
    this.setItem(STORAGE_KEYS.MONEY_RECEIPTS, []);
    this.setItem(STORAGE_KEYS.PRICE_CATALOG, []);
    this.setItem(STORAGE_KEYS.MACHINE_MODELS, []);
    this.setItem(STORAGE_KEYS.INVENTORY_MOVEMENTS, INITIAL_INVENTORY_MOVEMENTS);
    this.setItem(STORAGE_KEYS.ORDERS, INITIAL_ORDERS);
    this.setItem(STORAGE_KEYS.USERS, INITIAL_USERS);
    this.setItem(STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS);
    this.setItem(STORAGE_KEYS.CART, []);
    this.setItem(STORAGE_KEYS.INITIALIZED, true);
    return true;
  }

  /**
   * Export all demo data as a single JSON backup
   */
  exportAllData() {
    const backup = {};
    Object.entries(STORAGE_KEYS).forEach(([name, key]) => {
      backup[name] = this.getItem(key);
    });
    return JSON.stringify(backup, null, 2);
  }

  /**
   * Import complete data backup
   */
  importAllData(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      Object.entries(STORAGE_KEYS).forEach(([name, key]) => {
        if (data[name] !== undefined) {
          this.setItem(key, data[name]);
        }
      });
      return true;
    } catch (err) {
      console.error('[StockLine Storage] Import failed:', err);
      return false;
    }
  }
}

export const storageService = new StorageService();
