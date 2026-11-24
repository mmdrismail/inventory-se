const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true,
    },
    companyName: {
      type: String,
      default: '',
      trim: true,
    },
    designationRole: {
      type: String,
      enum: [
        'owner',
        'agent',
        'purchaser',
        'supplier_rep',
        'wholesale',
        'retail',
        'manager',
        'other',
        'managing_director',
        'purchase_manager',
        'project_director',
        'contractor',
        'retail_customer',
        '',
      ],
      default: 'owner',
    },
    email: {
      type: String,
      trim: true,
      default: '',
    },
    phone: {
      type: String,
      default: '',
      trim: true,
    },
    companyPhone: {
      type: String,
      default: '',
      trim: true,
    },
    address: {
      type: String,
      default: '',
      trim: true,
    },
    location: {
      type: String,
      default: '',
      trim: true,
    },
    city: {
      type: String,
      default: '',
      trim: true,
    },
    type: {
      type: String,
      enum: ['retail', 'wholesale', 'corporate'],
      default: 'retail',
    },
    customerType: {
      type: String,
      default: 'Retail',
    },
    balance: {
      type: Number,
      default: 0,
    },
    totalSales: {
      type: Number,
      default: 0,
    },
    totalPaid: {
      type: Number,
      default: 0,
    },
    totalDue: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    notes: {
      type: String,
      default: '',
    },
  },
  { timestamps: true, strict: false }
);

// High-speed customer search and corporate debt management indexes
customerSchema.index({ phone: 1 });
customerSchema.index({ email: 1 });
customerSchema.index({ name: 1 });
customerSchema.index({ companyName: 1 });
customerSchema.index({ status: 1, createdAt: -1 });
customerSchema.index({ totalDue: -1 });
customerSchema.index({
  name: 'text',
  companyName: 'text',
  phone: 'text',
});

module.exports = mongoose.model('Customer', customerSchema);
