#!/usr/bin/env node
/**
 * StockLine Inventory SE - Mock Data Generator
 * Authored by: Saiful Ahnm Sajed <saifulahnmsajed>
 * Description: Generates realistic mock inventory records for local demonstrations and testing.
 */

const fs = require('fs');
const path = require('path');

const CATEGORIES = ['Electronics', 'Mechanical', 'Electrical', 'Packaging', 'Raw Materials'];
const SUPPLIERS = ['Apex Industrial Ltd', 'Bengal Hardware Supply', 'Delta Automation', 'Meghna Imports'];

function generateMockInventory(count = 25) {
  const products = [];
  for (let i = 1; i <= count; i++) {
    const category = CATEGORIES[i % CATEGORIES.length];
    const supplier = SUPPLIERS[i % SUPPLIERS.length];
    const cost = Math.floor(Math.random() * 800) + 100;
    const price = Math.round(cost * 1.35);
    const stock = Math.floor(Math.random() * 150) + 10;
    const reorder = Math.floor(stock * 0.25) + 5;

    products.push({
      id: `PROD-${String(i).padStart(4, '0')}`,
      name: `${category} Component Grade-${String.fromCharCode(65 + (i % 6))}`,
      sku: `SKU-${category.substring(0, 3).toUpperCase()}-${String(i).padStart(3, '0')}`,
      barcode: `880${String(Math.floor(1000000000 + Math.random() * 9000000000))}`,
      category,
      supplier,
      costPrice: cost,
      price,
      stock,
      reorderLevel: reorder,
      status: stock <= reorder ? 'low_stock' : 'in_stock',
      createdAt: new Date().toISOString()
    });
  }
  return products;
}

const outputPath = path.resolve(__dirname, '..', 'src', 'data', 'generatedMockInventory.json');
const data = generateMockInventory(30);

fs.writeFileSync(outputPath, JSON.stringify(data, null, 2), 'utf-8');
console.log(`[SUCCESS] Generated ${data.length} mock inventory items at: ${outputPath}`);
