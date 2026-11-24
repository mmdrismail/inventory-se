import { storageService, STORAGE_KEYS } from './storageService';
import { inventoryService } from './inventoryService';
import { apiClient } from './apiClient';

class ProductService {
  getAll() {
    return storageService.getItem(STORAGE_KEYS.PRODUCTS, []);
  }

  getById(id) {
    const products = this.getAll();
    return products.find((p) => p.id === id) || null;
  }

  create(productData, performedBy = 'Staff') {
    const products = this.getAll();
    
    // Validate SKU uniqueness
    const skuExists = products.some((p) => p.sku.toLowerCase() === productData.sku.trim().toLowerCase());
    if (skuExists) {
      return { success: false, message: `A product with SKU "${productData.sku}" already exists.` };
    }

    const newProduct = {
      ...productData,
      id: `prod-${Date.now()}`,
      sku: productData.sku.trim().toUpperCase(),
      costPrice: Number(productData.costPrice) || 0,
      sellingPrice: Number(productData.sellingPrice) || 0,
      quantity: Number(productData.quantity) || 0,
      reorderLevel: Number(productData.reorderLevel) || 10,
      isPublic: productData.isPublic !== undefined ? Boolean(productData.isPublic) : true,
      imageUrl: productData.imageUrl?.trim() || 'https://images.unsplash.com/photo-1589710751893-f9a6770ad71b?w=500&auto=format&fit=crop&q=60',
      createdAt: new Date().toISOString(),
    };

    products.unshift(newProduct);
    storageService.setItem(STORAGE_KEYS.PRODUCTS, products);

    // Initial stock inventory movement log if initial quantity > 0
    if (newProduct.quantity > 0) {
      inventoryService.recordMovement({
        productId: newProduct.id,
        productName: newProduct.name,
        sku: newProduct.sku,
        type: 'adjustment',
        quantityChange: newProduct.quantity,
        balanceAfter: newProduct.quantity,
        referenceId: 'INITIAL_STOCK',
        reason: 'Initial stock intake upon product creation',
        performedBy,
      });
    }

    // Live sync to MongoDB Atlas backend
    apiClient.post('/products', {
      name: newProduct.name,
      sku: newProduct.sku,
      barcode: newProduct.barcode || '',
      description: newProduct.description || '',
      categoryId: newProduct.categoryId || null,
      supplierId: newProduct.supplierId || null,
      costPrice: newProduct.costPrice,
      sellingPrice: newProduct.sellingPrice,
      quantity: newProduct.quantity,
      reorderLevel: newProduct.reorderLevel,
      unit: newProduct.unit || 'pcs',
      imageUrl: newProduct.imageUrl,
      isPublic: newProduct.isPublic,
    }).then((res) => {
      if (res && res.data && res.data._id) {
        const currentProducts = storageService.getItem(STORAGE_KEYS.PRODUCTS, []);
        const idx = currentProducts.findIndex((p) => p.sku === newProduct.sku);
        if (idx !== -1) {
          currentProducts[idx].id = res.data._id;
          currentProducts[idx]._id = res.data._id;
          storageService.setItem(STORAGE_KEYS.PRODUCTS, currentProducts);
        }
      }
    }).catch((err) => {
      console.warn('[MongoDB Atlas sync notice]:', err.message);
    });

    return { success: true, product: newProduct };
  }

  update(id, updates) {
    const products = this.getAll();
    const index = products.findIndex((p) => p.id === id || p._id === id);
    if (index === -1) {
      return { success: false, message: 'Product not found.' };
    }

    // If SKU changed, check uniqueness
    if (updates.sku && updates.sku.trim().toLowerCase() !== products[index].sku.toLowerCase()) {
      const skuExists = products.some((p) => (p.id !== id && p._id !== id) && p.sku.toLowerCase() === updates.sku.trim().toLowerCase());
      if (skuExists) {
        return { success: false, message: `Another product already has the SKU "${updates.sku}".` };
      }
    }

    const updatedProduct = {
      ...products[index],
      ...updates,
      sku: updates.sku ? updates.sku.trim().toUpperCase() : products[index].sku,
      costPrice: updates.costPrice !== undefined ? Number(updates.costPrice) : products[index].costPrice,
      sellingPrice: updates.sellingPrice !== undefined ? Number(updates.sellingPrice) : products[index].sellingPrice,
      reorderLevel: updates.reorderLevel !== undefined ? Number(updates.reorderLevel) : products[index].reorderLevel,
      updatedAt: new Date().toISOString(),
    };

    products[index] = updatedProduct;
    storageService.setItem(STORAGE_KEYS.PRODUCTS, products);

    // Live sync to MongoDB Atlas backend
    const targetId = updatedProduct._id || updatedProduct.id || id;
    const syncPromise = apiClient.put(`/products/${targetId}`, updates).catch((err) => {
      console.warn('[MongoDB Product update notice]:', err.message);
      return null;
    });

    return { success: true, product: updatedProduct, syncPromise };
  }

  remove(id) {
    const products = this.getAll();
    const product = products.find((p) => p.id === id || p._id === id);
    if (!product) {
      return { success: false, message: 'Product not found.' };
    }

    const prodIds = new Set([product.id, product._id, id].filter(Boolean));

    // Safety check: is product referenced in purchases?
    const purchases = storageService.getItem(STORAGE_KEYS.PURCHASES, []);
    const inPurchases = purchases.some((pur) => pur.items?.some((item) => prodIds.has(item.productId)));
    if (inPurchases) {
      return {
        success: false,
        message: `Cannot delete "${product.name}" because it is referenced in historical purchase orders.`,
      };
    }

    // Safety check: is product referenced in sales?
    const sales = storageService.getItem(STORAGE_KEYS.SALES, []);
    const inSales = sales.some((sal) => sal.items?.some((item) => prodIds.has(item.productId)));
    if (inSales) {
      return {
        success: false,
        message: `Cannot delete "${product.name}" because it is recorded in past sales invoices.`,
      };
    }

    // Safety check: is product in open customer orders?
    const orders = storageService.getItem(STORAGE_KEYS.ORDERS, []);
    const inOrders = orders.some((ord) => ord.items?.some((item) => prodIds.has(item.productId)));
    if (inOrders) {
      return {
        success: false,
        message: `Cannot delete "${product.name}" because it belongs to customer orders.`,
      };
    }

    const filtered = products.filter((p) => p.id !== id && p._id !== id);
    storageService.setItem(STORAGE_KEYS.PRODUCTS, filtered);

    // Live sync to MongoDB Atlas backend
    const targetId = product._id || product.id || id;
    const syncPromise = apiClient.delete(`/products/${targetId}`).catch((err) => {
      console.warn('[MongoDB Product delete notice]:', err.message);
      return null;
    });

    return { success: true, message: `Product "${product.name}" deleted successfully.`, syncPromise };
  }

  importCSV(parsedRows, _performedBy = 'Admin') {
    let imported = 0;
    const errors = [];
    const products = this.getAll();
    const categories = storageService.getItem(STORAGE_KEYS.CATEGORIES, []);

    parsedRows.forEach((row, idx) => {
      const name = row['Product Name'] || row['name'] || row['Name'];
      const sku = (row['SKU'] || row['sku'] || '').trim().toUpperCase();
      const costPrice = Number(row['Cost Price'] || row['costPrice'] || 0);
      const sellingPrice = Number(row['Selling Price'] || row['sellingPrice'] || 0);
      const quantity = Number(row['Quantity'] || row['quantity'] || 0);
      const reorderLevel = Number(row['Reorder Level'] || row['reorderLevel'] || 10);
      const categoryName = row['Category'] || row['category'];

      if (!name || !sku) {
        errors.push(`Row ${idx + 2}: Missing required Product Name or SKU.`);
        return;
      }

      if (products.some((p) => p.sku.toLowerCase() === sku.toLowerCase())) {
        errors.push(`Row ${idx + 2}: SKU "${sku}" already exists. Skipping.`);
        return;
      }

      // Match or fallback category
      let categoryId = categories[0]?.id || 'cat-1';
      if (categoryName) {
        const found = categories.find((c) => c.name.toLowerCase() === categoryName.trim().toLowerCase());
        if (found) categoryId = found.id;
      }

      const newProd = {
        id: `prod-${Date.now()}-${idx}`,
        name: name.trim(),
        sku,
        description: row['Description'] || row['description'] || 'Imported via CSV',
        categoryId,
        costPrice,
        sellingPrice,
        quantity,
        reorderLevel,
        isPublic: true,
        imageUrl: row['Image URL'] || 'https://images.unsplash.com/photo-1589710751893-f9a6770ad71b?w=500&auto=format&fit=crop&q=60',
        createdAt: new Date().toISOString(),
      };

      products.push(newProd);
      imported++;
    });

    storageService.setItem(STORAGE_KEYS.PRODUCTS, products);
    return { success: true, imported, errors };
  }
}

export const productService = new ProductService();
