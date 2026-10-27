const mongoose = require('mongoose');

const saleItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.Mixed,
    ref: 'Product',
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  unitPrice: {
    type: Number,
    required: true,
    min: 0,
  },
  lineTotal: {
    type: Number,
    required: true,
    min: 0,
  },
});

const saleSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    customerId: {
      type: mongoose.Schema.Types.Mixed,
      ref: 'Customer',
      required: true,
    },
    items: [saleItemSchema],
    subtotal: {
      type: Number,
      required: true,
      default: 0,
    },
    tax: {
      type: Number,
      default: 0,
    },
    discount: {
      type: Number,
      default: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
      default: 0,
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'card', 'mobile_banking'],
      default: 'cash',
    },
    paymentStatus: {
      type: String,
      enum: ['paid', 'partial', 'pending'],
      default: 'paid',
    },
    status: {
      type: String,
      enum: ['draft', 'completed', 'cancelled'],
      default: 'completed',
    },
    cashierName: {
      type: String,
      default: 'Staff Cashier',
    },
    notes: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Sale', saleSchema);
