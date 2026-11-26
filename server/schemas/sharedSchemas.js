const mongoose = require('mongoose');

/**
 * Shared Mongoose sub-schemas for consistent hierarchical data modeling across models.
 */

const machineDetailsSchema = new mongoose.Schema(
  {
    machineModelId: {
      type: mongoose.Schema.Types.Mixed,
      ref: 'MachineModel',
      default: null,
    },
    machineName: { type: String, default: '', trim: true },
    model: { type: String, default: '', trim: true },
    type: { type: String, default: '', trim: true },
    hp: { type: String, default: '', trim: true },
    ton: { type: String, default: '', trim: true },
    cylinder: { type: String, default: '', trim: true },
    others: { type: String, default: '', trim: true },
    description: { type: String, default: '', trim: true },
    autoSaveToPriceCatalog: { type: Boolean, default: true },
  },
  { _id: false }
);

const createLineItemSchema = ({ style = 'quotation' } = {}) => {
  if (style === 'sale') {
    return new mongoose.Schema({
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
      description: {
        type: String,
        default: '',
      },
      quantity: {
        type: Number,
        required: true,
        min: 0.01,
      },
      unit: {
        type: String,
        default: 'pc',
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
  }

  return new mongoose.Schema({
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
};

module.exports = {
  machineDetailsSchema,
  createLineItemSchema,
};
