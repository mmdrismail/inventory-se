const mongoose = require('mongoose');
const Setting = require('../models/Setting');
const Product = require('../models/Product');
const Category = require('../models/Category');
const Customer = require('../models/Customer');
const Sale = require('../models/Sale');
const Quotation = require('../models/Quotation');
const MoneyReceipt = require('../models/MoneyReceipt');
const PartPriceCatalog = require('../models/PartPriceCatalog');
const Purchase = require('../models/Purchase');
const StockMovement = require('../models/StockMovement');
const Supplier = require('../models/Supplier');
const Order = require('../models/Order');
const LotPurchase = require('../models/LotPurchase');
const MachineModel = require('../models/MachineModel');
const MediaAsset = require('../models/MediaAsset');
const User = require('../models/User');

const TRACKED_COLLECTIONS = [
  { key: 'products', label: 'পণ্য তালিকা (Products)', model: Product },
  { key: 'priceCatalog', label: 'পার্টস প্রাইস লিস্ট (PriceCatalog)', model: PartPriceCatalog },
  { key: 'sales', label: 'বিক্রয় চালান (Sales)', model: Sale },
  { key: 'quotations', label: 'কোটেশন (Quotations)', model: Quotation },
  { key: 'customers', label: 'গ্রাহক (Customers)', model: Customer },
  { key: 'moneyReceipts', label: 'মানি রিসিপ্ট (MoneyReceipts)', model: MoneyReceipt },
  { key: 'purchases', label: 'ক্রয় অর্ডার (Purchases)', model: Purchase },
  { key: 'lotPurchases', label: 'শিপ অকশন লট (LotPurchases)', model: LotPurchase },
  { key: 'stockMovements', label: 'স্টক মুভমেন্ট (StockMovements)', model: StockMovement },
  { key: 'orders', label: 'অনলাইন অর্ডার (Orders)', model: Order },
  { key: 'categories', label: 'ক্যাটাগরি (Categories)', model: Category },
  { key: 'machineModels', label: 'মেশিন প্রোফাইল (MachineModels)', model: MachineModel },
  { key: 'mediaAssets', label: 'মিডিয়া রেফারেন্স (MediaAssets)', model: MediaAsset },
  { key: 'suppliers', label: 'সাপ্লায়ার (Suppliers)', model: Supplier },
  { key: 'users', label: 'ইউজার (Users)', model: User },
  { key: 'settings', label: 'সেটিংস (Settings)', model: Setting },
];

const estimateCollectionStats = async ({ key, label, model }) => {
  try {
    const count = await model.estimatedDocumentCount();
    if (count === 0) {
      return { key, label, count: 0, avgDocBytes: 0, estimatedTotalBytes: 0 };
    }
    const sample = await model.find().sort({ _id: -1 }).limit(20).lean();
    const totalSampleBytes = sample.reduce(
      (sum, doc) => sum + Math.round(Buffer.byteLength(JSON.stringify(doc), 'utf8') * 1.15),
      0
    );
    const avgDocBytes = sample.length > 0 ? Math.round(totalSampleBytes / sample.length) : 512;
    return {
      key,
      label,
      count,
      avgDocBytes,
      estimatedTotalBytes: count * avgDocBytes,
    };
  } catch {
    return { key, label, count: 0, avgDocBytes: 0, estimatedTotalBytes: 0 };
  }
};

/**
 * Strictly READ-ONLY storage, compression, and capacity forecaster across MongoDB Atlas & Media Vault.
 */
const getStorageAnalytics = async (overrides = {}) => {
  const settingsDoc = await Setting.findOne().lean().catch(() => null);
  const mongoQuotaMb = Math.max(50, Number(overrides.mongoQuotaMb || settingsDoc?.mongoQuotaMb) || 512);
  const cloudMediaQuotaMb = Math.max(50, Number(overrides.cloudMediaQuotaMb || settingsDoc?.cloudMediaQuotaMb) || 1024);
  const cloudMonthlyCreditsLimit = Math.max(1, Number(settingsDoc?.cloudMonthlyCreditsLimit) || 25);

  let dbStats = { dataSize: 0, storageSize: 0, indexSize: 0, objects: 0, collections: 0 };
  if (mongoose.connection?.readyState === 1 && mongoose.connection?.db) {
    try {
      dbStats = await mongoose.connection.db.stats();
    } catch {
      // Fall back to estimated sizes below if Atlas user lacks dbStats role
    }
  }

  const [collections, mediaAgg, inlineCount] = await Promise.all([
    Promise.all(TRACKED_COLLECTIONS.map(estimateCollectionStats)),
    MediaAsset.aggregate([
      {
        $group: {
          _id: '$provider',
          count: { $sum: 1 },
          originalBytes: { $sum: '$originalBytes' },
          compressedBytes: { $sum: '$compressedBytes' },
          totalUsages: { $sum: '$usageCount' },
        },
      },
    ]).catch(() => []),
    Product.countDocuments({
      $or: [{ imageUrl: { $regex: '^data:image/' } }, { 'images.url': { $regex: '^data:image/' } }],
    }).catch(() => 0),
  ]);

  const sortedCollections = collections.sort((a, b) => b.estimatedTotalBytes - a.estimatedTotalBytes);
  const estimatedDataBytes = sortedCollections.reduce((s, c) => s + c.estimatedTotalBytes, 0);
  const dataBytes = Number(dbStats.dataSize) > 0 ? Number(dbStats.dataSize) : estimatedDataBytes;
  const indexBytes = Number(dbStats.indexSize) || 0;
  const totalDbBytes = dataBytes + indexBytes;
  const mongoQuotaBytes = mongoQuotaMb * 1024 * 1024;
  const mongoUsedPercent = Math.min(100, Math.round((totalDbBytes / mongoQuotaBytes) * 10000) / 100);
  const mongoRemainingBytes = Math.max(0, mongoQuotaBytes - totalDbBytes);

  const productStats = sortedCollections.find((c) => c.key === 'products');
  const totalObjects = Number(dbStats.objects) || sortedCollections.reduce((s, c) => s + c.count, 0);
  const overallAvgDocBytes = totalObjects > 0 ? Math.max(512, Math.round(totalDbBytes / totalObjects)) : 1200;
  const avgProductDocBytes = productStats?.avgDocBytes > 0 ? productStats.avgDocBytes : 1800;

  let totalAssets = 0;
  let cloudinaryCount = 0;
  let externalCount = 0;
  let inlineAssetCount = 0;
  let totalOriginalBytes = 0;
  let totalCompressedBytes = 0;
  let totalUsages = 0;

  for (const row of mediaAgg) {
    totalAssets += row.count || 0;
    totalOriginalBytes += row.originalBytes || 0;
    totalCompressedBytes += row.compressedBytes || 0;
    totalUsages += row.totalUsages || row.count || 0;
    if (row._id === 'cloudinary') cloudinaryCount = row.count || 0;
    else if (row._id === 'inline_webp') inlineAssetCount = row.count || 0;
    else externalCount += row.count || 0;
  }

  const cloudQuotaBytes = cloudMediaQuotaMb * 1024 * 1024;
  const effectiveAvgImageBytes =
    totalAssets > 0 && totalCompressedBytes > 0
      ? Math.max(15 * 1024, Math.round(totalCompressedBytes / totalAssets))
      : 90 * 1024; // 90 KB typical 1200px WebP baseline

  const cloudUsedPercent = Math.min(100, Math.round((totalCompressedBytes / cloudQuotaBytes) * 10000) / 100);
  const cloudRemainingBytes = Math.max(0, cloudQuotaBytes - totalCompressedBytes);

  const alerts = [];
  if (mongoUsedPercent >= 85) {
    alerts.push({
      level: 'critical',
      target: 'mongodb',
      message: `MongoDB Atlas ব্যবহৃত স্পেস ${mongoUsedPercent}% ছুঁয়েছে! অবিলম্বে পুরোনো অর্ডার আর্কাইভ বা ক্লাস্টার আপগ্রেড করুন।`,
    });
  } else if (mongoUsedPercent >= 70) {
    alerts.push({
      level: 'warning',
      target: 'mongodb',
      message: `MongoDB Atlas স্পেস ${mongoUsedPercent}% পূর্ণ হয়েছে। নিয়মিত JSON ব্যাকআপ রাখুন।`,
    });
  }

  if (cloudUsedPercent >= 80) {
    alerts.push({
      level: 'warning',
      target: 'media',
      message: `Cloud Media স্টোরেজ ${cloudUsedPercent}% ব্যবহার হয়েছে। অব্যবহৃত ছবি পরিষ্কার বা ক্রেডিট কোটা বাড়ান।`,
    });
  }

  if (inlineCount > 0) {
    alerts.push({
      level: 'warning',
      target: 'inline',
      message: `${inlineCount}টি প্রোডাক্টে সরাসরি Base64/Inline ছবি আছে—Cloudinary সেট করলে ডাটাবেজ আরও হালকা থাকবে।`,
    });
  }

  if (!settingsDoc?.cloudinaryCloudName || !settingsDoc?.cloudinaryUploadPreset) {
    alerts.push({
      level: 'info',
      target: 'cloudinary_setup',
      message: 'Cloudinary Cloud Name ও Upload Preset সেট করলে হাজার-লাখ রেফারেন্স ছবি ডাটাবেজের জায়গা না নিয়েই CDN-এ সেভ হবে।',
    });
  }

  return {
    connected: mongoose.connection?.readyState === 1,
    databaseName: mongoose.connection?.name || 'stockline_db',
    mongodb: {
      dataBytes,
      storageBytes: Number(dbStats.storageSize) || 0,
      indexBytes,
      totalDbBytes,
      quotaMb: mongoQuotaMb,
      quotaBytes: mongoQuotaBytes,
      usedPercent: mongoUsedPercent,
      remainingBytes: mongoRemainingBytes,
      totalRecords: totalObjects,
      avgProductDocBytes,
      overallAvgDocBytes,
      estimatedMoreProducts: Math.floor(mongoRemainingBytes / avgProductDocBytes),
      estimatedMoreRecords: Math.floor(mongoRemainingBytes / overallAvgDocBytes),
      collections: sortedCollections,
    },
    media: {
      totalAssets,
      totalUsages,
      dedupeReuses: Math.max(0, totalUsages - totalAssets),
      providers: {
        cloudinary: cloudinaryCount,
        external_url: externalCount,
        inline_webp: inlineAssetCount,
      },
      inlineProductImageCount: inlineCount,
      totalOriginalBytes,
      totalCompressedBytes,
      bytesSaved: Math.max(0, totalOriginalBytes - totalCompressedBytes),
      avgImageBytes: effectiveAvgImageBytes,
      quotaMb: cloudMediaQuotaMb,
      quotaBytes: cloudQuotaBytes,
      usedPercent: cloudUsedPercent,
      remainingBytes: cloudRemainingBytes,
      estimatedMoreImages: Math.floor(cloudRemainingBytes / effectiveAvgImageBytes),
      monthlyCreditsLimit: cloudMonthlyCreditsLimit,
      cloudinaryConfigured: Boolean(settingsDoc?.cloudinaryCloudName && settingsDoc?.cloudinaryUploadPreset),
    },
    alerts,
    generatedAt: new Date().toISOString(),
  };
};

module.exports = {
  getStorageAnalytics,
};
