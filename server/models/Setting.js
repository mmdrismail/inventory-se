const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema(
  {
    companyName: {
      type: String,
      default: 'StockLine Commerce Ltd.',
    },
    companyEmail: {
      type: String,
      default: 'support@stockline.io',
    },
    companyPhone: {
      type: String,
      default: '+880 1711 000000',
    },
    companyAddress: {
      type: String,
      default: 'House 42, Road 11, Banani, Dhaka-1213, Bangladesh',
    },
    currency: {
      type: String,
      default: 'BDT',
    },
    currencySymbol: {
      type: String,
      default: '৳',
    },
    taxRate: {
      type: Number,
      default: 5,
    },
    defaultReorderThreshold: {
      type: Number,
      default: 10,
    },
    theme: {
      type: String,
      enum: ['light', 'dark', 'system'],
      default: 'light',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Setting', settingSchema);
