const mongoose = require('mongoose');

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

module.exports = mongoose.model('Product', productSchema);
