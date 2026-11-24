const mongoose = require('mongoose');

const saleItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.Mixed,
    ref: 'Product',
    required: false,
    default: null,
  },
  productName: {
    type: String,
    default: '',
  },
  sku: {
    type: String,
    default: '',
  },
  quantity: {
    type: Number,
    required: true,
    min: 0.01,
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
      default: null,
    },
    customerName: {
      type: String,
      default: 'Walk-in Retail Customer',
    },
    customerCompany: {
      type: String,
      default: '',
    },
    customerRole: {
      type: String,
      default: 'owner',
    },
    customerPhone: {
      type: String,
      default: '',
    },
    customerEmail: {
      type: String,
      default: '',
    },
    customerAddress: {
      type: String,
      default: '',
    },
    customerLocation: {
      type: String,
      default: '',
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
    paidAmount: {
      type: Number,
      default: 0,
    },
    dueAmount: {
      type: Number,
      default: 0,
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'card', 'mobile_banking', 'bank_transfer', 'cheque'],
      default: 'cash',
    },
    paymentStatus: {
      type: String,
      enum: ['paid', 'partial', 'pending', 'due'],
      default: 'paid',
    },
    status: {
      type: String,
      enum: ['draft', 'completed', 'cancelled'],
      default: 'completed',
    },
    requisitionRef: {
      type: String,
      default: '',
    },
    quotationId: {
      type: mongoose.Schema.Types.Mixed,
      ref: 'Quotation',
      default: null,
    },
    cashierName: {
      type: String,
      default: 'Staff Cashier',
    },
    notes: {
      type: String,
      default: '',
    },
    showRate: {
      type: Boolean,
      default: true,
    },
    showLineTotal: {
      type: Boolean,
      default: true,
    },
    showGrandTotal: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true, strict: false }
);

// High-speed sales history & reporting indexes
saleSchema.index({ customerId: 1, createdAt: -1 });
saleSchema.index({ status: 1, createdAt: -1 });
saleSchema.index({ createdAt: -1 });
saleSchema.index({ paymentStatus: 1, createdAt: -1 });
saleSchema.index({ quotationId: 1 });
saleSchema.index({ 'items.productId': 1 });

module.exports = mongoose.model('Sale', saleSchema);
