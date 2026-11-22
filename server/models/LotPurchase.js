const mongoose = require('mongoose');

const lotDecomposedItemSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  brand: {
    type: String,
    default: '',
  },
  modelNumber: {
    type: String,
    default: '',
  },
  condition: {
    type: String,
    enum: ['new', 'original_oem', 'reconditioned', 'used', 'std_overhaul'],
    default: 'reconditioned',
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
    default: 1,
  },
  unit: {
    type: String,
    default: 'pcs',
  },
  allocatedCost: {
    type: Number,
    required: true,
    min: 0,
    default: 0, // ওই লট থেকে এই নির্দিষ্ট মালামালের জন্য বরাদ্দকৃত খরচ (Buying Price)
  },
  staffPrice: {
    type: Number,
    min: 0,
    default: 0, // স্টাফদের জন্য ন্যূনতম বিক্রয় মূল্য
  },
  managerPrice: {
    type: Number,
    min: 0,
    default: 0, // ম্যানেজার বা পাইকারি বিক্রয় মূল্য
  },
  customerPrice: {
    type: Number,
    min: 0,
    default: 0, // সাধারণ গ্রাহক বিক্রয় মূল্য
  },
  priceCode: {
    type: String,
    default: '', // গোপন মূল্য কোড (e.g. COD: B45K·S80K·M90K·C100K)
  },
  targetSellingPrice: {
    type: Number,
    required: true,
    min: 0,
    default: 0,
  },
  category: {
    type: String,
    default: '',
  },
  warehouseLocation: {
    type: String,
    default: '', // e.g. "Zone A · Rack 02 · Shelf 3"
  },
  productId: {
    type: mongoose.Schema.Types.Mixed,
    ref: 'Product',
    default: null,
  },
  isDistributed: {
    type: Boolean,
    default: false,
  },
});

const lotPurchaseSchema = new mongoose.Schema(
  {
    lotNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    lotName: {
      type: String,
      required: true,
      trim: true, // e.g. "সীতাকুণ্ড শিপ ব্রেকিং অকশন লট #০৮ (এমভি আল-মদিনা)"
    },
    sourceType: {
      type: String,
      enum: ['ship_scrap', 'auction', 'container_import', 'bulk_wholesale', 'factory_liquidation'],
      default: 'ship_scrap',
    },
    sourceShipOrOrigin: {
      type: String,
      default: '', // e.g. "M.V. Al Madina, Scrap Yard Yard-4"
    },
    supplierId: {
      type: mongoose.Schema.Types.Mixed,
      ref: 'Supplier',
      default: null,
    },
    supplierName: {
      type: String,
      default: '',
    },
    purchaseDate: {
      type: Date,
      default: Date.now,
    },
    totalLotCost: {
      type: Number,
      required: true,
      min: 0,
      default: 0, // সম্পূর্ণ লট কেনার মোট খরচ (যেমন: ৳৫,০০,০০০)
    },
    otherExpenses: {
      type: Number,
      default: 0, // পরিবহন, আনলোডিং, লেবার ও ব্রেকিং খরচ
    },
    netInvestedAmount: {
      type: Number,
      default: 0, // totalLotCost + otherExpenses
    },
    status: {
      type: String,
      enum: ['draft', 'inspected', 'intake_completed'],
      default: 'draft',
    },
    items: [lotDecomposedItemSchema],
    totalExtractedItems: {
      type: Number,
      default: 0,
    },
    totalEstimatedSalesValue: {
      type: Number,
      default: 0,
    },
    totalSoldRevenue: {
      type: Number,
      default: 0,
    },
    notes: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

lotPurchaseSchema.index({ status: 1, createdAt: -1 });
lotPurchaseSchema.index({ supplierId: 1, createdAt: -1 });
lotPurchaseSchema.index({ purchaseDate: -1 });
lotPurchaseSchema.index({ createdAt: -1 });
lotPurchaseSchema.index({ 'items.productId': 1 });

module.exports = mongoose.model('LotPurchase', lotPurchaseSchema);
