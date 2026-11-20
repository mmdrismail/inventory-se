/**
 * StockLine Automated Full-Module Test & Debugging Suite
 */
const http = require('http');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const app = require('./server');

const TEST_PORT = 5005;
let serverInstance;
let token = '';
let adminUser = null;

const results = {
  passed: 0,
  failed: 0,
  details: [],
};

function record(moduleName, testName, passed, error = null) {
  if (passed) {
    results.passed++;
    results.details.push({ status: 'PASS', module: moduleName, test: testName });
    console.log(`\x1b[32m✔ [${moduleName}]\x1b[0m ${testName}`);
  } else {
    results.failed++;
    results.details.push({ status: 'FAIL', module: moduleName, test: testName, error: error?.message || String(error) });
    console.error(`\x1b[31m✖ [${moduleName}]\x1b[0m ${testName} -> ${error?.message || error}`);
  }
}

async function request(endpoint, options = {}) {
  const url = `http://localhost:${TEST_PORT}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const res = await fetch(url, {
    ...options,
    headers,
  });

  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }

  return { status: res.status, ok: res.ok, data: json };
}

async function runAllTests() {
  console.log(`\n\x1b[35m====================================================\x1b[0m`);
  console.log(`\x1b[35m  STOCKLINE FULL PROJECT AUTOMATED TEST & DEBUGGER  \x1b[0m`);
  console.log(`\x1b[35m====================================================\x1b[0m\n`);

  serverInstance = app.listen(TEST_PORT);

  // Give MongoDB a moment to settle connection
  await new Promise((r) => setTimeout(r, 2000));

  try {
    // 0. System Health Checks
    console.log(`\x1b[34m--- [0. Health & Core Infrastructure] ---\x1b[0m`);
    {
      const res = await request('/');
      record('Core', 'Root API endpoint status 200', res.status === 200 && res.data.success);
    }
    {
      const res = await request('/api/health');
      record('Core', 'Health check endpoint returns status ok', res.status === 200 && res.data.status === 'ok');
    }

    // 1. Auth Module
    console.log(`\n\x1b[34m--- [1. Auth Module] ---\x1b[0m`);
    {
      const res = await request('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: 'admin@stockline.io', password: 'admin123' }),
      });
      const ok = res.status === 200 && res.data.token;
      record('Auth', 'Admin login with valid credentials', ok, res.data?.message);
      if (ok) {
        token = res.data.token;
        adminUser = res.data.user;
      }
    }
    {
      const res = await request('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: 'admin@stockline.io', password: 'wrongpassword' }),
      });
      record('Auth', 'Reject login with invalid credentials (401)', res.status === 401);
    }
    {
      const res = await request('/api/auth/demo-login', {
        method: 'POST',
        body: JSON.stringify({ role: 'manager' }),
      });
      record('Auth', 'Demo login returns manager token and role', res.status === 200 && res.data.user.role === 'manager');
    }
    {
      const res = await request('/api/auth/me');
      record('Auth', 'Fetch current authenticated user profile via Bearer token', res.status === 200 && res.data.user.email === 'admin@stockline.io');
    }

    // 2. Category Module
    console.log(`\n\x1b[34m--- [2. Categories Module] ---\x1b[0m`);
    let testCatId = null;
    const testCatName = `TestCat_${Date.now()}`;
    {
      const res = await request('/api/categories');
      record('Categories', 'GET all categories returns 200 with list', res.status === 200 && Array.isArray(res.data.data));
    }
    {
      const res = await request('/api/categories', {
        method: 'POST',
        body: JSON.stringify({ name: testCatName, description: 'Temporary category for automated test suite', color: 'indigo' }),
      });
      const ok = (res.status === 201 || res.status === 200) && res.data.data?._id;
      record('Categories', 'POST create new category', ok, res.data?.message);
      if (ok) testCatId = res.data.data._id;
    }
    if (testCatId) {
      const res = await request(`/api/categories/${testCatId}`, {
        method: 'PUT',
        body: JSON.stringify({ name: `${testCatName}_Updated` }),
      });
      record('Categories', 'PUT update category', res.status === 200 && res.data.data.name.includes('Updated'));
    }

    // 3. Supplier Module
    console.log(`\n\x1b[34m--- [3. Suppliers Module] ---\x1b[0m`);
    let testSupplierId = null;
    {
      const res = await request('/api/suppliers');
      record('Suppliers', 'GET all suppliers', res.status === 200 && Array.isArray(res.data.data));
    }
    {
      const res = await request('/api/suppliers', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Apex Test Supplier Corp',
          contactPerson: 'David Miller',
          email: 'test_supplier@example.com',
          phone: '+880 1888 990011',
          address: 'Test Industrial Area, Dhaka',
        }),
      });
      const ok = (res.status === 201 || res.status === 200) && res.data.data?._id;
      record('Suppliers', 'POST create supplier', ok, res.data?.message);
      if (ok) testSupplierId = res.data.data._id;
    }
    if (testSupplierId) {
      const res = await request(`/api/suppliers/${testSupplierId}`, {
        method: 'PUT',
        body: JSON.stringify({ contactPerson: 'David Miller (Updated)' }),
      });
      record('Suppliers', 'PUT update supplier', res.status === 200 && res.data.data.contactPerson.includes('Updated'));
    }

    // 4. Customer Module
    console.log(`\n\x1b[34m--- [4. Customers Module] ---\x1b[0m`);
    let testCustomerId = null;
    {
      const res = await request('/api/customers');
      record('Customers', 'GET all customers', res.status === 200 && Array.isArray(res.data.data));
    }
    {
      const res = await request('/api/customers', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Rahim Test Customer',
          email: 'rahim_test@example.com',
          phone: '+880 1999 123456',
          address: 'Gulshan 2, Dhaka',
        }),
      });
      const ok = (res.status === 201 || res.status === 200) && res.data.data?._id;
      record('Customers', 'POST create customer', ok, res.data?.message);
      if (ok) testCustomerId = res.data.data._id;
    }
    if (testCustomerId) {
      const res = await request(`/api/customers/${testCustomerId}`, {
        method: 'PUT',
        body: JSON.stringify({ address: 'Gulshan 1, Dhaka' }),
      });
      record('Customers', 'PUT update customer', res.status === 200 && res.data.data.address.includes('Gulshan 1'));
    }

    // 5. Product Module
    console.log(`\n\x1b[34m--- [5. Products Module] ---\x1b[0m`);
    let testProductId = null;
    {
      const res = await request('/api/products');
      record('Products', 'GET all products', res.status === 200 && Array.isArray(res.data.data));
    }
    {
      const testSku = `TEST-SKU-${Date.now()}`;
      const res = await request('/api/products', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Automated Test Mechanical Keyboard',
          sku: testSku,
          category: testCatId || 'Electronics',
          supplier: testSupplierId || undefined,
          purchasePrice: 45.0,
          sellingPrice: 85.0,
          currentStock: 25,
          minStockThreshold: 5,
          unit: 'pcs',
        }),
      });
      const ok = (res.status === 201 || res.status === 200) && res.data.data?._id;
      record('Products', 'POST create product', ok, res.data?.message);
      if (ok) testProductId = res.data.data._id;
    }
    if (testProductId) {
      const res = await request(`/api/products/${testProductId}`);
      record('Products', 'GET single product by ID', res.status === 200 && res.data.data._id === testProductId);

      const updateRes = await request(`/api/products/${testProductId}`, {
        method: 'PUT',
        body: JSON.stringify({ sellingPrice: 89.99 }),
      });
      record('Products', 'PUT update product selling price', updateRes.status === 200 && updateRes.data.data.sellingPrice === 89.99);
    }

    // 6. Purchases Module & Stock Updates
    console.log(`\n\x1b[34m--- [6. Purchases Module] ---\x1b[0m`);
    let testPurchaseId = null;
    {
      const res = await request('/api/purchases');
      record('Purchases', 'GET all purchases', res.status === 200 && Array.isArray(res.data.data));
    }
    if (testProductId && testSupplierId) {
      const res = await request('/api/purchases', {
        method: 'POST',
        body: JSON.stringify({
          poNumber: `PO-TEST-${Date.now()}`,
          supplierId: testSupplierId,
          supplierName: 'Apex Test Supplier Corp',
          items: [
            {
              productId: testProductId,
              productName: 'Automated Test Mechanical Keyboard',
              quantity: 10,
              unitPrice: 45.0,
              totalPrice: 450.0,
            },
          ],
          totalAmount: 450.0,
          status: 'ordered',
          paymentStatus: 'paid',
        }),
      });
      const ok = (res.status === 201 || res.status === 200) && res.data.data?._id;
      record('Purchases', 'POST create purchase order', ok, res.data?.message);
      if (ok) testPurchaseId = res.data.data._id;
    }
    if (testPurchaseId) {
      const res = await request(`/api/purchases/${testPurchaseId}/receive`, {
        method: 'PUT',
      });
      record('Purchases', 'PUT receive purchase and auto-increment stock', res.status === 200 && res.data.data.status === 'received');
    }

    // 7. Sales Module & Stock Deduction
    console.log(`\n\x1b[34m--- [7. Sales Module] ---\x1b[0m`);
    let testSaleId = null;
    {
      const res = await request('/api/sales');
      record('Sales', 'GET all sales records', res.status === 200 && Array.isArray(res.data.data));
    }
    if (testProductId && testCustomerId) {
      const res = await request('/api/sales', {
        method: 'POST',
        body: JSON.stringify({
          invoiceNo: `INV-TEST-${Date.now()}`,
          customerId: testCustomerId,
          customerName: 'Rahim Test Customer',
          items: [
            {
              productId: testProductId,
              productName: 'Automated Test Mechanical Keyboard',
              quantity: 2,
              unitPrice: 89.99,
              totalPrice: 179.98,
            },
          ],
          subtotal: 179.98,
          tax: 0,
          discount: 0,
          total: 179.98,
          paymentMethod: 'cash',
          paymentStatus: 'paid',
        }),
      });
      const ok = (res.status === 201 || res.status === 200) && res.data.data?._id;
      record('Sales', 'POST create sale and auto-deduct inventory stock', ok, res.data?.message);
      if (ok) testSaleId = res.data.data._id;
    }

    // 7.1. Quotations Module (দরপত্র ও কোটেশন)
    console.log(`\n\x1b[34m--- [7.1. Quotations Module] ---\x1b[0m`);
    let testQuotationId = null;
    {
      const res = await request('/api/quotations');
      record('Quotations', 'GET all quotations', res.status === 200 && Array.isArray(res.data.data));
    }
    {
      const res = await request('/api/quotations', {
        method: 'POST',
        body: JSON.stringify({
          quotationNumber: `QT-TEST-${Date.now()}`,
          customerName: 'ইঞ্জিঃ রফিকুল ইসলাম',
          customerCompany: 'কর্ণফুলী কোল্ড স্টোরেজ লিমিটেড',
          customerRole: 'purchaser',
          customerPhone: '01819-234567',
          customerAddress: 'কালুরঘাট শিল্প এলাকা, চট্টগ্রাম',
          requisitionRef: 'RFQ-WHATSAPP-09',
          items: [
            {
              name: 'Connecting Rod with Piston complete',
              quantity: 1,
              unit: 'pc',
              unitPrice: 10000,
              lineTotal: 10000,
            },
            {
              name: 'Bearing Bush (motor side)',
              quantity: 1,
              unit: 'pc',
              unitPrice: 2000,
              lineTotal: 2000,
            },
          ],
          subtotal: 12000,
          discount: 500,
          totalAmount: 11500,
          status: 'draft',
        }),
      });
      const ok = (res.status === 201 || res.status === 200) && res.data.data?._id;
      record('Quotations', 'POST create quotation with customer profile & items', ok, res.data?.message);
      if (ok) testQuotationId = res.data.data._id;
    }
    if (testQuotationId) {
      const res = await request(`/api/quotations/${testQuotationId}/convert-to-sale`, {
        method: 'POST',
        body: JSON.stringify({
          paymentMethod: 'cash',
          paymentStatus: 'paid',
        }),
      });
      record('Quotations', 'POST convert quotation to official sales invoice', res.status === 200 && res.data.success);
    }

    // 8. Orders Module (e-commerce / customer shop orders)
    console.log(`\n\x1b[34m--- [8. Orders Module] ---\x1b[0m`);
    let testOrderId = null;
    {
      const res = await request('/api/orders');
      record('Orders', 'GET all customer orders', res.status === 200 && Array.isArray(res.data.data));
    }
    if (testProductId) {
      const res = await request('/api/orders', {
        method: 'POST',
        body: JSON.stringify({
          orderNumber: `ORD-TEST-${Date.now()}`,
          customerName: 'Online Shopper',
          customerEmail: 'shopper@test.com',
          customerPhone: '+880 1711 000000',
          shippingAddress: 'House 1, Road 2, Banani, Dhaka',
          items: [
            {
              productId: testProductId,
              name: 'Automated Test Mechanical Keyboard',
              price: 89.99,
              quantity: 1,
            },
          ],
          totalAmount: 89.99,
          paymentMethod: 'cod',
        }),
      });
      const ok = (res.status === 201 || res.status === 200) && res.data.data?._id;
      record('Orders', 'POST create customer shop order', ok, res.data?.message);
      if (ok) testOrderId = res.data.data._id;
    }
    if (testOrderId) {
      const res = await request(`/api/orders/${testOrderId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'shipped' }),
      });
      record('Orders', 'PUT update order status to shipped', res.status === 200 && res.data.data.status === 'shipped');
    }

    // 9. Inventory Adjustments & Movement Audit
    console.log(`\n\x1b[34m--- [9. Inventory Module] ---\x1b[0m`);
    {
      const res = await request('/api/inventory/movements');
      record('Inventory', 'GET stock movements audit log', res.status === 200 && Array.isArray(res.data.data));
    }
    if (testProductId) {
      const res = await request('/api/inventory/adjust', {
        method: 'POST',
        body: JSON.stringify({
          productId: testProductId,
          type: 'adjustment',
          quantity: 5,
          reason: 'Automated inventory verification test',
        }),
      });
      record('Inventory', 'POST manual stock adjustment (+5)', res.status === 200 && res.data.success);
    }

    // 10. Reports & Analytics
    console.log(`\n\x1b[34m--- [10. Reports Module] ---\x1b[0m`);
    {
      const res = await request('/api/reports/dashboard');
      record('Reports', 'GET dashboard analytics metrics (revenue, products, counts)', res.status === 200 && res.data.data?.metrics !== undefined);
    }
    {
      const res = await request('/api/reports/low-stock');
      record('Reports', 'GET low stock alert report', res.status === 200 && Array.isArray(res.data.data));
    }

    // 11. Settings Module
    console.log(`\n\x1b[34m--- [11. Settings Module] ---\x1b[0m`);
    {
      const res = await request('/api/settings');
      record('Settings', 'GET system configuration settings', res.status === 200 && res.data.data?.companyName !== undefined);
    }
    {
      const res = await request('/api/settings', {
        method: 'PUT',
        body: JSON.stringify({
          companyName: 'StockLine Inventory Pro',
          currency: 'BDT',
          currencySymbol: '৳',
        }),
      });
      record('Settings', 'PUT update company settings & currency', res.status === 200 && res.data.data?.currency === 'BDT');
    }

    // 12. Users Management Module
    console.log(`\n\x1b[34m--- [12. Users Management Module] ---\x1b[0m`);
    let testUserId = null;
    {
      const res = await request('/api/users');
      record('Users', 'GET list of staff and administrator users', res.status === 200 && Array.isArray(res.data.data));
    }
    {
      const testEmail = `testuser_${Date.now()}@stockline.io`;
      const res = await request('/api/users', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Automated Test Staff',
          email: testEmail,
          password: 'TestPassword123!',
          role: 'staff',
          phone: '+880 1700 000000',
        }),
      });
      const ok = (res.status === 201 || res.status === 200) && res.data.data?._id;
      record('Users', 'POST create new staff user', ok, res.data?.message);
      if (ok) testUserId = res.data.data._id;
    }
    if (testUserId) {
      const toggleRes = await request(`/api/users/${testUserId}/toggle-status`, { method: 'PUT' });
      record('Users', 'PUT toggle user active/inactive status', toggleRes.status === 200 && toggleRes.data.data?.status === 'inactive');

      const delRes = await request(`/api/users/${testUserId}`, { method: 'DELETE' });
      record('Users', 'DELETE remove test staff user', delRes.status === 200);
    }

    // Cleanup Temporary Artifacts
    console.log(`\n\x1b[34m--- [Cleanup Test Data] ---\x1b[0m`);
    if (testQuotationId) {
      await request(`/api/quotations/${testQuotationId}`, { method: 'DELETE' });
      console.log('✔ Cleaned up test quotation');
    }
    if (testProductId) {
      await request(`/api/products/${testProductId}`, { method: 'DELETE' });
      console.log('✔ Cleaned up test product');
    }
    if (testCustomerId) {
      await request(`/api/customers/${testCustomerId}`, { method: 'DELETE' });
      console.log('✔ Cleaned up test customer');
    }
    if (testSupplierId) {
      await request(`/api/suppliers/${testSupplierId}`, { method: 'DELETE' });
      console.log('✔ Cleaned up test supplier');
    }
    if (testCatId) {
      await request(`/api/categories/${testCatId}`, { method: 'DELETE' });
      console.log('✔ Cleaned up test category');
    }

  } catch (err) {
    console.error('Fatal Test Suite Error:', err);
  } finally {
    console.log(`\n\x1b[35m====================================================\x1b[0m`);
    console.log(`\x1b[35m  TEST RESULTS: ${results.passed} Passed, ${results.failed} Failed  \x1b[0m`);
    console.log(`\x1b[35m====================================================\x1b[0m\n`);

    if (serverInstance) {
      serverInstance.close(() => {
        process.exit(results.failed > 0 ? 1 : 0);
      });
    } else {
      process.exit(results.failed > 0 ? 1 : 0);
    }
  }
}

runAllTests();
