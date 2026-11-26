const mongoose = require('mongoose');

const priceHistoryPointSchema = new mongoose.Schema(
  {
    price: { type: Number, required: true, min: 0 },
    unit: { type: String, default: 'pc', trim: true },
    docType: { type: String, enum: ['quotation', 'sale', 'challan', 'manual', 'product'], default: 'quotation' },
    docNumber: { type: String, default: '', trim: true },
    date: { type: Date, default: Date.now },
    customerName: { type: String, default: '', trim: true },
    machineName: { type: String, default: '', trim: true },
    model: { type: String, default: '', trim: true },
    hp: { type: String, default: '', trim: true },
    ton: { type: String, default: '', trim: true },
    cylinder: { type: String, default: '', trim: true },
  },
  { _id: false }
);

const partPriceCatalogSchema = new mongoose.Schema(
  {
    partName: {
      type: String,
      required: [true, 'Part / Product name is required'],
      trim: true,
    },
    normalizedPartName: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    machineName: { type: String, default: '', trim: true },
    model: { type: String, default: '', trim: true },
    type: { type: String, default: '', trim: true },
    hp: { type: String, default: '', trim: true },
    ton: { type: String, default: '', trim: true },
    cylinder: { type: String, default: '', trim: true },
    others: { type: String, default: '', trim: true },
    description: { type: String, default: '', trim: true },
    machineKey: {
      type: String,
      default: '',
      trim: true,
      lowercase: true,
    },
    unit: {
      type: String,
      default: 'pc',
      trim: true,
    },
    lastQuotedPrice: {
      type: Number,
      min: 0,
      default: 0,
    },
    lastSoldPrice: {
      type: Number,
      min: 0,
      default: 0,
    },
    lastPrice: {
      type: Number,
      min: 0,
      default: 0,
    },
    minPrice: {
      type: Number,
      min: 0,
      default: 0,
    },
    maxPrice: {
      type: Number,
      min: 0,
      default: 0,
    },
    sourceType: {
      type: String,
      enum: ['sale', 'challan', 'quotation', 'product', 'manual'],
      default: 'quotation',
    },
    lastDocNumber: {
      type: String,
      default: '',
      trim: true,
    },
    lastDocDate: {
      type: Date,
      default: Date.now,
    },
    lastCustomerName: {
      type: String,
      default: '',
      trim: true,
    },
    linkedProductId: {
      type: mongoose.Schema.Types.Mixed,
      ref: 'Product',
      default: null,
    },
    machineModelId: {
      type: mongoose.Schema.Types.Mixed,
      ref: 'MachineModel',
      default: null,
    },
    categoryId: {
      type: mongoose.Schema.Types.Mixed,
      ref: 'Category',
      default: null,
    },
    entryCount: {
      type: Number,
      default: 1,
    },
    history: {
      type: [priceHistoryPointSchema],
      default: [],
    },
  },
  { timestamps: true }
);

partPriceCatalogSchema.index({ normalizedPartName: 1, machineKey: 1 }, { unique: true });
partPriceCatalogSchema.index({ machineName: 1, model: 1 });
partPriceCatalogSchema.index({ machineModelId: 1 });
partPriceCatalogSchema.index({ categoryId: 1 });
partPriceCatalogSchema.index({ linkedProductId: 1 });
partPriceCatalogSchema.index({ lastDocDate: -1, updatedAt: -1 });
partPriceCatalogSchema.index({
  partName: 'text',
  machineName: 'text',
  model: 'text',
  type: 'text',
  hp: 'text',
  ton: 'text',
  cylinder: 'text',
  others: 'text',
  description: 'text',
});

module.exports = mongoose.model('PartPriceCatalog', partPriceCatalogSchema);
