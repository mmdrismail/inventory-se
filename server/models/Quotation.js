const mongoose = require('mongoose');

const quotationItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.Mixed,
    ref: 'Product',
    default: null,
  },
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    default: '',
  },
  quantity: {
    type: Number,
    required: true,
    default: 1,
    min: 0.1,
  },
  unit: {
    type: String,
    default: 'pc',
  },
  unitPrice: {
    type: Number,
    required: true,
    default: 0,
    min: 0,
  },
  lineTotal: {
    type: Number,
    required: true,
    default: 0,
    min: 0,
  },
});

const quotationSchema = new mongoose.Schema(
  {
    quotationNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    validUntil: {
      type: Date,
    },
    requisitionRef: {
      type: String,
      default: '',
      trim: true,
    },
    customerId: {
      type: mongoose.Schema.Types.Mixed,
      ref: 'Customer',
      default: null,
    },
    customerName: {
      type: String,
      required: false,
      default: 'Direct Client',
      trim: true,
    },
    customerCompany: {
      type: String,
      default: '',
      trim: true,
    },
    customerRole: {
      type: String,
      enum: ['owner', 'agent', 'purchaser', 'supplier_rep', 'wholesale', 'retail', 'manager', 'other'],
      default: 'owner',
    },
    customerPhone: {
      type: String,
      default: '',
      trim: true,
    },
    customerEmail: {
      type: String,
      default: '',
      trim: true,
    },
    customerAddress: {
      type: String,
      default: '',
      trim: true,
    },
    items: [quotationItemSchema],
    subtotal: {
      type: Number,
      required: true,
      default: 0,
    },
    discount: {
      type: Number,
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
      enum: ['draft', 'sent', 'approved', 'rejected', 'converted'],
      default: 'draft',
    },
    termsAndConditions: {
      type: String,
      default: '১. সকল মালামাল প্রাপ্যতা সাপেক্ষে সরবরাহ করা হইবে।\n২. কার্যাদেশ প্রাপ্তির ৩ কার্যদিবসের মধ্যে ডেলিভারি সম্পন্ন হইবে।\n৩. এই কোটেশনের মেয়াদ জারির তারিখ হইতে ১৫ দিন পর্যন্ত বৈধ।',
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
    convertedSaleId: {
      type: mongoose.Schema.Types.Mixed,
      ref: 'Sale',
      default: null,
    },
    preparedBy: {
      type: String,
      default: 'Sales Executive',
    },
  },
  { timestamps: true, strict: false }
);

// High-speed quotation search, expiration alerts & reporting indexes
quotationSchema.index({ customerId: 1, createdAt: -1 });
quotationSchema.index({ status: 1, createdAt: -1 });
quotationSchema.index({ createdAt: -1 });
quotationSchema.index({ validUntil: 1 });
quotationSchema.index({ requisitionRef: 1 });
quotationSchema.index({ convertedSaleId: 1 });
quotationSchema.index({ 'items.productId': 1 });

module.exports = mongoose.model('Quotation', quotationSchema);
