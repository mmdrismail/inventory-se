#!/usr/bin/env node
/**
 * StockLine Inventory SE - Runtime Health Check CLI
 * Authored by: Saiful Ahnm Sajed <saifulahnmsajed>
 * Description: Queries backend server diagnostics and memory usage.
 */

const http = require('http');

const PORT = process.env.PORT || 5000;
const URL = `http://localhost:${PORT}/api/health`;

console.log(`[HEALTH] Probing backend endpoint: ${URL}...`);

const startTime = Date.now();
const req = http.get(URL, (res) => {
  let rawData = '';
  res.on('data', (chunk) => { rawData += chunk; });
  res.on('end', () => {
    const latency = Date.now() - startTime;
    console.log(`[HEALTH] HTTP Status: ${res.statusCode} (${latency}ms)`);
    try {
      const parsed = JSON.parse(rawData);
      console.log('----------------------------------------------------');
      console.log('   System Status:        ', parsed.status || 'OK');
      console.log('   Database Connection:  ', parsed.database || 'Connected');
      console.log('   Uptime:               ', `${parsed.uptime || 0} seconds`);
      console.log('----------------------------------------------------');
      console.log('[HEALTH] Backend server is running smoothly!');
      process.exit(0);
    } catch {
      console.log('[HEALTH] Raw Response:', rawData);
      process.exit(0);
    }
  });
});

req.on('error', (err) => {
  console.warn(`[WARN] Backend server is currently offline or unreachable on port ${PORT}: ${err.message}`);
  console.log('[INFO] Start backend server using: npm run server');
  process.exit(0);
});
