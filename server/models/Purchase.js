const mongoose = require('mongoose');

const purchaseItemSchema = new mongoose.Schema({
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
  unitCost: {
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

const purchaseSchema = new mongoose.Schema(
  {
    purchaseNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    supplierId: {
      type: mongoose.Schema.Types.Mixed,
      ref: 'Supplier',
      required: true,
    },
    items: [purchaseItemSchema],
    subtotal: {
      type: Number,
      required: true,
      default: 0,
    },
    tax: {
      type: Number,
      default: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
      default: 0,
    },
    status: {
      type: String,
      enum: ['draft', 'received', 'cancelled'],
      default: 'draft',
    },
    receivedDate: {
      type: Date,
      default: null,
    },
    notes: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Purchase', purchaseSchema);
