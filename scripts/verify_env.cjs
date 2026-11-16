#!/usr/bin/env node
/**
 * StockLine Inventory SE - Environment Verification Script
 * Authored by: Saiful Ahnm Sajed <saifulahnmsajed>
 * Description: Verifies runtime prerequisites, environment variables, and folder structures.
 */

const fs = require('fs');
const path = require('path');

console.log('====================================================');
console.log('   StockLine Inventory SE - Environment Check       ');
console.log('====================================================');

let issuesFound = 0;

// 1. Check Node Version
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.replace('v', '').split('.')[0], 10);
if (majorVersion >= 18) {
  console.log(`[PASS] Node.js Version: ${nodeVersion} (Supported)`);
} else {
  console.error(`[FAIL] Node.js Version: ${nodeVersion} (Requires >= v18.x)`);
  issuesFound++;
}

// 2. Check Required Configuration Files
const requiredFiles = [
  'package.json',
  'vite.config.js',
  'tailwind.config.js',
  'server/server.js',
  'server/package.json'
];

requiredFiles.forEach((file) => {
  const filePath = path.resolve(__dirname, '..', file);
  if (fs.existsSync(filePath)) {
    console.log(`[PASS] File exists: ${file}`);
  } else {
    console.error(`[FAIL] Missing required file: ${file}`);
    issuesFound++;
  }
});

// 3. Check Server Environment File
const serverEnvPath = path.resolve(__dirname, '..', 'server', '.env');
const serverEnvExamplePath = path.resolve(__dirname, '..', 'server', '.env.example');

if (fs.existsSync(serverEnvPath)) {
  console.log('[PASS] Server environment file (.env) detected.');
} else if (fs.existsSync(serverEnvExamplePath)) {
  console.warn('[WARN] server/.env not found, but server/.env.example is present. Remember to configure .env before starting production backend.');
} else {
  console.error('[FAIL] Neither server/.env nor server/.env.example was found.');
  issuesFound++;
}

console.log('----------------------------------------------------');
if (issuesFound === 0) {
  console.log('[SUCCESS] All environment checks passed! Ready for development & deployment.');
  process.exit(0);
} else {
  console.error(`[WARNING] Found ${issuesFound} configuration issue(s). Please review above.`);
  process.exit(1);
}
