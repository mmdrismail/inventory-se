const mongoose = require('mongoose');

const moneyReceiptSchema = new mongoose.Schema(
  {
    receiptNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    entrySource: {
      type: String,
      enum: ['online', 'khata', 'offline'],
      default: 'khata',
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
    customerId: {
      type: mongoose.Schema.Types.Mixed,
      ref: 'Customer',
      default: null,
    },
    customerName: {
      type: String,
      required: true,
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
    linkedSaleId: {
      type: mongoose.Schema.Types.Mixed,
      ref: 'Sale',
      default: null,
    },
    linkedInvoiceNo: {
      type: String,
      default: '',
      trim: true,
    },
    purpose: {
      type: String,
      default: 'বকেয়া পরিশোধ / বিল জমা (Bill Payment)',
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'card', 'mobile_banking', 'bkash', 'nagad', 'bank', 'bank_transfer', 'cheque'],
      default: 'cash',
    },
    chequeOrRefNo: {
      type: String,
      default: '',
      trim: true,
    },
    status: {
      type: String,
      enum: ['active', 'cancelled'],
      default: 'active',
    },
    notes: {
      type: String,
      default: '',
    },
    receivedBy: {
      type: String,
      default: 'Accounts',
    },
  },
  { timestamps: true, strict: false }
);

moneyReceiptSchema.index({ customerId: 1, date: -1 });
moneyReceiptSchema.index({ linkedSaleId: 1 });
moneyReceiptSchema.index({ entrySource: 1, date: -1 });

module.exports = mongoose.model('MoneyReceipt', moneyReceiptSchema);
