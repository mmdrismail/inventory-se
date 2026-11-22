const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Supplier name is required'],
      trim: true,
    },
    contactPerson: {
      type: String,
      default: '',
    },
    email: {
      type: String,
      trim: true,
      default: '',
    },
    phone: {
      type: String,
      default: '',
    },
    address: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
  },
  { timestamps: true }
);

// High-speed supplier indexing
supplierSchema.index({ name: 1 });
supplierSchema.index({ phone: 1 });
supplierSchema.index({ email: 1 });
supplierSchema.index({ status: 1 });

module.exports = mongoose.model('Supplier', supplierSchema);
