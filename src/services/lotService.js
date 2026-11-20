import { storageService, STORAGE_KEYS } from './storageService';
import { inventoryService } from './inventoryService';
import { apiClient } from './apiClient';
import { generateStickerPriceDisplay } from '../utils/priceCipher';

class LotService {
  getAll() {
    return storageService.getItem(STORAGE_KEYS.LOT_PURCHASES, []);
  }

  getById(id) {
    const lots = this.getAll();
    return lots.find((l) => l.id === id || l._id === id || l.lotNumber === id) || null;
  }

  create(lotData) {
    const lots = this.getAll();
    const totalCost = Number(lotData.totalLotCost) || 0;
    const transport = Number(lotData.transportCost) || 0;
    const labor = Number(lotData.laborDismantleCost) || 0;
    const other = Number(lotData.otherExpenses) || 0;
    const netInvested = totalCost + transport + labor + other;

    const newLot = {
      ...lotData,
      id: `lot-${Date.now()}`,
      lotNumber: lotData.lotNumber?.trim() || `LOT-${new Date().getFullYear()}-${Math.floor(10 + Math.random() * 90)}`,
      totalLotCost: totalCost,
      transportCost: transport,
      laborDismantleCost: labor,
      otherExpenses: other,
      netInvestedAmount: netInvested,
      items: lotData.items || [],
      status: lotData.status || 'intake', // 'intake' | 'inspected' | 'distributed'
      createdAt: new Date().toISOString(),
    };

    lots.unshift(newLot);
    storageService.setItem(STORAGE_KEYS.LOT_PURCHASES, lots);

    // Sync to backend MongoDB API
    apiClient.post('/lots', newLot).then((res) => {
      if (res?.data?._id) {
        const cur = storageService.getItem(STORAGE_KEYS.LOT_PURCHASES, []);
        const idx = cur.findIndex((l) => l.id === newLot.id);
        if (idx !== -1) {
          cur[idx].id = res.data._id;
          cur[idx]._id = res.data._id;
          storageService.setItem(STORAGE_KEYS.LOT_PURCHASES, cur);
        }
      }
    }).catch((err) => {
      console.warn('[LotService] Background server sync warning:', err.message);
    });

    return { success: true, lot: newLot };
  }

  update(id, updates) {
    const lots = this.getAll();
    const idx = lots.findIndex((l) => l.id === id || l._id === id);
    if (idx === -1) return { success: false, message: 'Lot not found' };

    const totalCost = updates.totalLotCost !== undefined ? Number(updates.totalLotCost) : lots[idx].totalLotCost;
    const transport = updates.transportCost !== undefined ? Number(updates.transportCost) : lots[idx].transportCost;
    const labor = updates.laborDismantleCost !== undefined ? Number(updates.laborDismantleCost) : lots[idx].laborDismantleCost;
    const other = updates.otherExpenses !== undefined ? Number(updates.otherExpenses) : lots[idx].otherExpenses;
    const netInvested = totalCost + transport + labor + other;

    lots[idx] = {
      ...lots[idx],
      ...updates,
      totalLotCost: totalCost,
      transportCost: transport,
      laborDismantleCost: labor,
      otherExpenses: other,
      netInvestedAmount: netInvested,
      updatedAt: new Date().toISOString(),
    };

    storageService.setItem(STORAGE_KEYS.LOT_PURCHASES, lots);

    // Sync update to API
    apiClient.put(`/lots/${id}`, lots[idx]).catch((err) => {
      console.warn('[LotService] Background server update sync warning:', err.message);
    });

    return { success: true, lot: lots[idx] };
  }

  delete(id) {
    const lots = this.getAll();
    const filtered = lots.filter((l) => l.id !== id && l._id !== id);
    storageService.setItem(STORAGE_KEYS.LOT_PURCHASES, filtered);

    apiClient.delete(`/lots/${id}`).catch((err) => {
      console.warn('[LotService] Background server delete sync warning:', err.message);
    });

    return { success: true };
  }

  /**
   * Distribute lot parts into active inventory racks and update stock counts
   */
  distributeToInventory(id, performedBy = 'Warehouse Master') {
    const lot = this.getById(id);
    if (!lot) return { success: false, message: 'Lot not found' };

    const products = storageService.getItem(STORAGE_KEYS.PRODUCTS, []);
    const movements = storageService.getItem(STORAGE_KEYS.INVENTORY_MOVEMENTS, []);

    const createdProductIds = [];

    (lot.items || []).forEach((item, itemIdx) => {
      const qty = Number(item.quantity) || 1;
      const allocatedCost = Number(item.allocatedCost) || 0;
      const targetSellingPrice = Number(item.targetSellingPrice) || allocatedCost * 1.5;

      // Check if product with identical brand & part name already exists
      const existingIdx = products.findIndex(
        (p) => p.name?.toLowerCase().trim() === item.partName?.toLowerCase().trim()
      );

      if (existingIdx !== -1) {
        // Increase existing product stock
        const existing = products[existingIdx];
        const oldQty = existing.quantity || 0;
        const newQty = oldQty + qty;

        // Weighted average cost update
        const oldCostTotal = oldQty * (existing.costPrice || 0);
        const newCostTotal = qty * allocatedCost;
        const avgCost = Math.round((oldCostTotal + newCostTotal) / (newQty || 1));

        const staffP = Number(item.staffPrice) || Math.round(allocatedCost * 1.3);
        const mgrP = Number(item.managerPrice) || Math.round(allocatedCost * 1.5);
        const custP = targetSellingPrice;
        const code = item.priceCode || generateStickerPriceDisplay({
          buyingPrice: allocatedCost,
          staffPrice: staffP,
          managerPrice: mgrP,
          customerPrice: custP,
          format: 'role_code',
        });

        products[existingIdx] = {
          ...existing,
          quantity: newQty,
          costPrice: avgCost,
          staffPrice: staffP,
          managerPrice: mgrP,
          customerPrice: custP,
          priceCode: code,
          warehouseLocation: item.warehouseLocation || existing.warehouseLocation,
          lotNumber: lot.lotNumber,
          lotId: lot.id,
          updatedAt: new Date().toISOString(),
        };

        apiClient.put(`/products/${existing.id || existing._id}`, {
          quantity: newQty,
          costPrice: avgCost,
          staffPrice: staffP,
          managerPrice: mgrP,
          customerPrice: custP,
          priceCode: code,
          warehouseLocation: item.warehouseLocation || existing.warehouseLocation,
          lotNumber: lot.lotNumber,
        }).catch(() => {});

        movements.unshift({
          id: `mov-${Date.now()}-${itemIdx}`,
          productId: existing.id,
          productName: existing.name,
          sku: existing.sku,
          type: 'lot_intake',
          quantity: qty,
          previousQuantity: oldQty,
          newQuantity: newQty,
          reason: `Lot Auction Intake: #${lot.lotNumber} (${lot.lotName || 'Bulk Scrap'})`,
          referenceId: lot.lotNumber,
          performedBy,
          timestamp: new Date().toISOString(),
        });

        createdProductIds.push(existing.id);
      } else {
        // Create new inventory product record
        const newProdId = `prod-mach-${Date.now()}-${itemIdx}`;
        const prefix = (item.brand || 'MACH').replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase() || 'MCH';
        const newSku = `${prefix}-${Math.floor(1000 + Math.random() * 9000)}`;

        // Match category based on itemType or category name
        let targetCat = 'cat-refrig';
        const typeStr = (item.itemType || item.category || '').toLowerCase();
        if (typeStr.includes('engine') || typeStr.includes('generator') || typeStr.includes('marine')) {
          targetCat = 'cat-marine';
        } else if (typeStr.includes('tool') || typeStr.includes('hardware')) {
          targetCat = 'cat-2';
        }

        const staffP = Number(item.staffPrice) || Math.round(allocatedCost * 1.3);
        const mgrP = Number(item.managerPrice) || Math.round(allocatedCost * 1.5);
        const custP = targetSellingPrice;
        const code = item.priceCode || generateStickerPriceDisplay({
          buyingPrice: allocatedCost,
          staffPrice: staffP,
          managerPrice: mgrP,
          customerPrice: custP,
          format: 'role_code',
        });

        const newProduct = {
          id: newProdId,
          name: item.partName || 'Machinery Equipment',
          sku: newSku,
          barcode: `${Math.floor(894100000000 + Math.random() * 99999999)}`,
          brand: item.brand || 'Industrial',
          modelNumber: item.modelNumber || '',
          condition: item.condition || 'reconditioned',
          categoryId: item.categoryId || targetCat,
          costPrice: allocatedCost,
          staffPrice: staffP,
          managerPrice: mgrP,
          customerPrice: custP,
          priceCode: code,
          sellingPrice: targetSellingPrice,
          quantity: qty,
          reorderLevel: 3,
          supplierId: lot.supplierId || 'sup-shipbreak',
          warehouseLocation: item.warehouseLocation || {
            zone: 'Zone-A',
            aisle: 'Aisle-01',
            rack: 'Rack-01',
            shelf: 'Shelf-1',
            bin: 'Bin-A',
            code: 'A-01-01-1-A',
          },
          lotNumber: lot.lotNumber,
          lotId: lot.id,
          description: `Acquired via Lot #${lot.lotNumber} (${lot.lotName || 'Ship Bulk Intake'}). Condition: ${item.condition}. Location: ${item.warehouseLocation?.code || 'A-01-01'}.`,
          isPublic: true,
          createdAt: new Date().toISOString(),
        };

        products.unshift(newProduct);

        // Live sync new product to backend API
        apiClient.post('/products', newProduct).catch((err) => {
          console.warn('[LotService] Product creation API sync warning:', err.message);
        });

        movements.unshift({
          id: `mov-${Date.now()}-${itemIdx}`,
          productId: newProdId,
          productName: newProduct.name,
          sku: newSku,
          type: 'lot_intake',
          quantity: qty,
          previousQuantity: 0,
          newQuantity: qty,
          reason: `New Lot Intake from Auction #${lot.lotNumber}`,
          referenceId: lot.lotNumber,
          performedBy,
          timestamp: new Date().toISOString(),
        });

        createdProductIds.push(newProdId);
      }
    });

    // Save updated products and movements to LocalStorage
    storageService.setItem(STORAGE_KEYS.PRODUCTS, products);
    storageService.setItem(STORAGE_KEYS.INVENTORY_MOVEMENTS, movements);

    // Update lot status
    const updateRes = this.update(lot.id, {
      status: 'distributed',
      distributedAt: new Date().toISOString(),
      distributedBy: performedBy,
    });

    // Trigger API distribution live sync
    apiClient.post(`/lots/${id}/distribute`, { performedBy }).catch((err) => {
      console.warn('[LotService] Background server distribute sync warning:', err.message);
    });

    return {
      success: true,
      message: `${lot.items?.length || 0} items successfully distributed to warehouse racks and active inventory.`,
      lot: updateRes.lot,
      productIds: createdProductIds,
    };
  }
}

export const lotService = new LotService();
