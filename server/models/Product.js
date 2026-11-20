const mongoose = require('mongoose');

const variantSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true, // e.g. "STD (স্ট্যান্ডার্ড)", "+0.25 (ওভারসাইজ)", "+0.50", "Reconditioned", "Original OEM"
  },
  condition: {
    type: String,
    enum: ['new', 'original_oem', 'reconditioned', 'used', 'std_overhaul'],
    default: 'new',
  },
  sku: {
    type: String,
    default: '',
  },
  costPrice: {
    type: Number,
    min: 0,
    default: 0,
  },
  sellingPrice: {
    type: Number,
    min: 0,
    default: 0,
  },
  quantity: {
    type: Number,
    min: 0,
    default: 0,
  },
  location: {
    type: String,
    default: '', // e.g. "Rack-A2, Shelf-3, Bin-1"
  },
});

const warehouseLocationSchema = new mongoose.Schema({
  zone: { type: String, default: '' }, // e.g. "Zone A (Refrigeration)"
  aisle: { type: String, default: '' }, // e.g. "Aisle 02"
  rack: { type: String, default: '' }, // e.g. "Rack 04"
  shelf: { type: String, default: '' }, // e.g. "Shelf 3"
  bin: { type: String, default: '' }, // e.g. "Bin B-12"
  code: { type: String, default: '' }, // e.g. "A-02-04-3-B"
});

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
    },
    sku: {
      type: String,
      required: [true, 'SKU is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    barcode: {
      type: String,
      trim: true,
      default: '',
    },
    brand: {
      type: String,
      trim: true,
      default: '', // e.g. "Bitzer", "Carrier", "Copeland", "Daikin", "Bock", "Siemens", "Danfoss"
    },
    modelNumber: {
      type: String,
      trim: true,
      default: '', // e.g. "4PES-12Y", "6GE-40"
    },
    compatibleModels: {
      type: [String],
      default: [], // e.g. ["4PES-12Y", "4NES-14Y", "4G-20.2", "Daikin 4C-75"]
    },
    condition: {
      type: String,
      enum: ['new', 'original_oem', 'reconditioned', 'used', 'std_overhaul'],
      default: 'new', // নতুন, অরিজিনাল, রিকন্ডিশন্ড, পুরাতন/ব্যবহৃত, স্ট্যান্ডার্ড ওভারহল
    },
    dimensions: {
      type: String,
      default: '', // e.g. "75mm Bore x 20mm Pin" / "15 HP, 1450 RPM, 380V"
    },
    impaCode: {
      type: String,
      trim: true,
      default: '', // 6-digit marine ship stores code e.g. "791234"
    },
    oemPartNumber: {
      type: String,
      trim: true,
      default: '', // Original maker part number e.g. "372805-01"
    },
    warehouseLocation: {
      type: warehouseLocationSchema,
      default: () => ({}),
    },
    variants: {
      type: [variantSchema],
      default: [],
    },
    alternatives: {
      type: [String],
      default: [], // Alternative / cross-compatible product IDs or SKUs
    },
    // Bulk Lot / Scrap Auction tracking
    lotId: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    lotNumber: {
      type: String,
      default: '', // e.g. "LOT-2026-CHG-08"
    },
    sourceShip: {
      type: String,
      default: '', // e.g. "M.V. Ever Glory - Scrap Auction"
    },
    sourceLotCost: {
      type: Number,
      default: 0,
    },
    description: {
      type: String,
      default: '',
    },
    categoryId: {
      type: mongoose.Schema.Types.Mixed,
      ref: 'Category',
      default: null,
    },
    supplierId: {
      type: mongoose.Schema.Types.Mixed,
      ref: 'Supplier',
      default: null,
    },
    costPrice: {
      type: Number,
      required: [true, 'Cost price is required'],
      min: [0, 'Cost price cannot be negative'],
      default: 0,
    },
    staffPrice: {
      type: Number,
      min: [0, 'Staff price cannot be negative'],
      default: 0,
    },
    managerPrice: {
      type: Number,
      min: [0, 'Manager price cannot be negative'],
      default: 0,
    },
    customerPrice: {
      type: Number,
      min: [0, 'Customer price cannot be negative'],
      default: 0,
    },
    priceCode: {
      type: String,
      default: '',
    },
    sellingPrice: {
      type: Number,
      required: [true, 'Selling price is required'],
      min: [0, 'Selling price cannot be negative'],
      default: 0,
    },
    quantity: {
      type: Number,
      required: true,
      min: [0, 'Quantity cannot be negative'],
      default: 0,
    },
    reorderLevel: {
      type: Number,
      min: [0, 'Reorder level cannot be negative'],
      default: 10,
    },
    unit: {
      type: String,
      default: 'pcs',
    },
    imageUrl: {
      type: String,
      default: '',
    },
    isPublic: {
      type: Boolean,
      default: true,
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
  },
  { timestamps: true }
);

// High-speed query & search indexes
productSchema.index({ categoryId: 1, status: 1 });
productSchema.index({ status: 1, createdAt: -1 });
productSchema.index({ brand: 1 });
productSchema.index({ modelNumber: 1 });
productSchema.index({ impaCode: 1 });
productSchema.index({ oemPartNumber: 1 });
productSchema.index({ lotNumber: 1 });

module.exports = mongoose.model('Product', productSchema);
