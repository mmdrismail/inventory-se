const mongoose = require('mongoose');

const stockMovementSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.Mixed,
      ref: 'Product',
      required: true,
    },
    type: {
      type: String,
      enum: ['purchase_in', 'sale_out', 'adjustment', 'reversal', 'order_hold'],
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
    },
    balanceAfter: {
      type: Number,
      required: true,
    },
    reference: {
      type: String,
      required: true,
      trim: true,
    },
    reason: {
      type: String,
      default: '',
    },
    performedBy: {
      type: String,
      default: 'System',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('StockMovement', stockMovementSchema);
