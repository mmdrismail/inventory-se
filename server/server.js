const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

const connectDB = require('./config/db');
const { notFound, errorHandler } = require('./middleware/errorHandler');

// Route imports
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const supplierRoutes = require('./routes/supplierRoutes');
const customerRoutes = require('./routes/customerRoutes');
const purchaseRoutes = require('./routes/purchaseRoutes');
const saleRoutes = require('./routes/saleRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const orderRoutes = require('./routes/orderRoutes');
const reportRoutes = require('./routes/reportRoutes');
const userRoutes = require('./routes/userRoutes');
const settingRoutes = require('./routes/settingRoutes');

const compression = require('compression');
const { cacheMiddleware, cacheInvalidator } = require('./middleware/cache');

// Initialize MongoDB connection
connectDB();

const app = express();

// High-speed response compression (Gzip / Deflate)
app.use(compression());

// CORS & Body Parsers
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control'],
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Automatic cache invalidation on any POST/PUT/DELETE
app.use(cacheInvalidator());

// Request logger
app.use((req, res, next) => {
  console.log(`\x1b[36m[API Request]\x1b[0m ${req.method} ${req.originalUrl}`);
  next();
});

// Root & Health check
app.get('/', (req, res) => {
  res.json({
    success: true,
    name: 'StockLine Inventory Management System API',
    version: '1.0.0',
    status: 'Running',
    database: global.isMongoConnected ? 'Connected' : 'Offline / Local Fallback',
    timestamp: new Date().toISOString(),
    endpoints: {
      auth: '/api/auth',
      products: '/api/products',
      categories: '/api/categories',
      suppliers: '/api/suppliers',
      customers: '/api/customers',
      purchases: '/api/purchases',
      sales: '/api/sales',
      inventory: '/api/inventory',
      orders: '/api/orders',
      reports: '/api/reports',
      users: '/api/users',
      settings: '/api/settings',
    },
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    database: global.isMongoConnected ? 'Connected' : 'Offline / Standalone',
  });
});

// Mount Routes with High-Speed In-Memory Caching on GET requests
app.use('/api/auth', authRoutes);
app.use('/api/products', cacheMiddleware(20), productRoutes);
app.use('/api/categories', cacheMiddleware(30), categoryRoutes);
app.use('/api/suppliers', cacheMiddleware(30), supplierRoutes);
app.use('/api/customers', cacheMiddleware(30), customerRoutes);
app.use('/api/purchases', cacheMiddleware(15), purchaseRoutes);
app.use('/api/sales', cacheMiddleware(15), saleRoutes);
app.use('/api/inventory', cacheMiddleware(15), inventoryRoutes);
app.use('/api/orders', cacheMiddleware(15), orderRoutes);
app.use('/api/reports', cacheMiddleware(30), reportRoutes);
app.use('/api/users', cacheMiddleware(15), userRoutes);
app.use('/api/settings', cacheMiddleware(60), settingRoutes);

// Error Handling Middleware
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`\n\x1b[32m=================================================\x1b[0m`);
  console.log(`\x1b[32m✔ StockLine Backend Server running on port ${PORT}\x1b[0m`);
  console.log(`\x1b[36m➜ API Root: http://localhost:${PORT}/\x1b[0m`);
  console.log(`\x1b[36m➜ Health:   http://localhost:${PORT}/api/health\x1b[0m`);
  console.log(`\x1b[32m=================================================\x1b[0m\n`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('\x1b[31mUnhandled Rejection:\x1b[0m', err.message);
});

module.exports = app;
