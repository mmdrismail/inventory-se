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
const quotationRoutes = require('./routes/quotationRoutes');
const lotRoutes = require('./routes/lotRoutes');
const moneyReceiptRoutes = require('./routes/moneyReceiptRoutes');

const compression = require('compression');
const { cacheMiddleware, cacheInvalidator } = require('./middleware/cache');
const { authRateLimiter, apiRateLimiter } = require('./middleware/rateLimiter');

// Initialize MongoDB connection
connectDB();

const app = express();

// Security Hardening: Disable fingerprinting
app.disable('x-powered-by');

// Security & Privacy Headers (OWASP compliant)
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

// Support Chrome Private Network Access (PNA) preflight so live HTTPS sites (e.g. GitHub Pages) can reach local/private backend cleanly
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Private-Network', 'true');
  next();
});

// High-speed response compression (Gzip / Deflate)
app.use(compression());

// CORS Configuration supporting multiple environments & GitHub Pages live deployment
const defaultOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'https://saifulahnmsajed.github.io',
  'https://mmdrismail.github.io',
];
const rawClientUrl = process.env.CLIENT_URL || '';
const envOrigins = rawClientUrl.split(',').map((u) => u.trim()).filter(Boolean);
const allowedOrigins = Array.from(new Set([...defaultOrigins, ...envOrigins]));

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow non-browser requests, matching origins, github.io origins, or wildcard in development
      if (
        !origin ||
        allowedOrigins.includes('*') ||
        allowedOrigins.includes(origin) ||
        origin.endsWith('.github.io') ||
        process.env.NODE_ENV !== 'production'
      ) {
        callback(null, true);
      } else {
        callback(new Error(`CORS policy violation: Origin '${origin}' is not authorized.`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control', 'Pragma', 'Expires'],
  })
);

// Payload size safety to prevent memory flooding / DoS
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Global API rate limiter on /api endpoints
app.use('/api', apiRateLimiter);

// Automatic cache invalidation on any POST/PUT/DELETE
app.use(cacheInvalidator());

// Request logger with status & origin visibility
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    const origin = req.headers.origin || 'direct';
    console.log(`\x1b[36m[API Request]\x1b[0m ${req.method} ${req.originalUrl} | ${res.statusCode} (${ms}ms) | ${origin}`);
  });
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
      quotations: '/api/quotations',
      moneyReceipts: '/api/money-receipts',
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
app.use('/api/quotations', cacheMiddleware(15), quotationRoutes);
app.use('/api/lots', cacheMiddleware(15), lotRoutes);
app.use('/api/money-receipts', cacheMiddleware(15), moneyReceiptRoutes);

// Error Handling Middleware
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
let server;

if (require.main === module) {
  server = app.listen(PORT, () => {
    console.log(`\n\x1b[32m=================================================\x1b[0m`);
    console.log(`\x1b[32m✔ StockLine Backend Server running on port ${PORT}\x1b[0m`);
    console.log(`\x1b[36m➜ API Root: http://localhost:${PORT}/\x1b[0m`);
    console.log(`\x1b[36m➜ Health:   http://localhost:${PORT}/api/health\x1b[0m`);
    console.log(`\x1b[32m=================================================\x1b[0m\n`);
  });
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('\x1b[31mUnhandled Rejection:\x1b[0m', err.message);
});

// International Standard Graceful Shutdown (Cloud/Container lifecycle compliance)
const gracefulShutdown = (signal) => {
  console.log(`\n\x1b[33m[Process] Received ${signal}. Starting graceful shutdown...\x1b[0m`);
  if (server) {
    server.close(async () => {
      console.log('\x1b[32m✔ HTTP server closed to new incoming requests.\x1b[0m');
      try {
        const mongoose = require('mongoose');
        await mongoose.connection.close(false);
        console.log('\x1b[32m✔ MongoDB connections closed successfully.\x1b[0m');
        process.exit(0);
      } catch (err) {
        console.error('Error during shutdown:', err);
        process.exit(1);
      }
    });
  } else {
    process.exit(0);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

module.exports = app;
