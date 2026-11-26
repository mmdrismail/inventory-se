const mongoose = require('mongoose');
const { slugify, inferBrandFromMachineName } = require('../utils/domainNormalizers');

const machineModelSchema = new mongoose.Schema(
  {
    machineName: {
      type: String,
      required: [true, 'Machine or equipment name is required'],
      trim: true,
    },
    brand: {
      type: String,
      default: '',
      trim: true,
    },
    model: {
      type: String,
      default: '',
      trim: true,
    },
    type: {
      type: String,
      default: '',
      trim: true,
    },
    hp: {
      type: String,
      default: '',
      trim: true,
    },
    ton: {
      type: String,
      default: '',
      trim: true,
    },
    cylinder: {
      type: String,
      default: '',
      trim: true,
    },
    others: {
      type: String,
      default: '',
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    machineKey: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    slug: {
      type: String,
      default: '',
      trim: true,
      lowercase: true,
    },
    categoryId: {
      type: mongoose.Schema.Types.Mixed,
      ref: 'Category',
      default: null,
    },
    aliases: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ['active', 'archived'],
      default: 'active',
    },
  },
  { timestamps: true }
);

machineModelSchema.pre('validate', function (next) {
  if (!this.brand && this.machineName) {
    this.brand = inferBrandFromMachineName(this.machineName);
  }
  if (!this.slug && (this.machineName || this.model)) {
    this.slug = slugify([this.machineName, this.model, this.hp, this.ton].filter(Boolean).join('-'));
  }
  next();
});

machineModelSchema.index({ brand: 1, model: 1 });
machineModelSchema.index({ machineName: 1, model: 1 });
machineModelSchema.index({ categoryId: 1, status: 1 });
machineModelSchema.index({
  machineName: 'text',
  brand: 'text',
  model: 'text',
  type: 'text',
  hp: 'text',
  ton: 'text',
  cylinder: 'text',
  aliases: 'text',
});

module.exports = mongoose.model('MachineModel', machineModelSchema);
