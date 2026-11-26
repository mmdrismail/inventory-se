const mongoose = require('mongoose');
const { machineDetailsSchema, createLineItemSchema } = require('../schemas/sharedSchemas');

const saleItemSchema = createLineItemSchema({ style: 'sale' });

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
      enum: ['cash', 'card', 'mobile_banking', 'bkash', 'nagad', 'bank', 'bank_transfer', 'cheque'],
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
    documentType: {
      type: String,
      enum: ['cash_memo', 'challan', 'invoice'],
      default: 'cash_memo',
    },
    date: {
      type: Date,
      default: Date.now,
    },
    entrySource: {
      type: String,
      enum: ['online', 'khata', 'offline'],
      default: 'online',
    },
    bookNumber: {
      type: String,
      default: '',
      trim: true,
    },
    manualSerialNo: {
      type: String,
      default: '',
      trim: true,
    },
    deductStock: {
      type: Boolean,
      default: true,
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
    machineDetails: {
      type: machineDetailsSchema,
      default: () => ({}),
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
saleSchema.index({ entrySource: 1, date: -1 });
saleSchema.index({ documentType: 1, date: -1 });
saleSchema.index({ 'items.productId': 1 });
saleSchema.index({ 'machineDetails.machineName': 1, 'machineDetails.model': 1 });

module.exports = mongoose.model('Sale', saleSchema);
