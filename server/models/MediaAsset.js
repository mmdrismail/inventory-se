const mongoose = require('mongoose');

const mediaAssetSchema = new mongoose.Schema(
  {
    sha256: {
      type: String,
      trim: true,
      default: '',
    },
    url: {
      type: String,
      required: [true, 'Media URL is required'],
      trim: true,
    },
    thumbnailUrl: {
      type: String,
      default: '',
      trim: true,
    },
    provider: {
      type: String,
      enum: ['cloudinary', 'external_url', 'inline_webp'],
      default: 'cloudinary',
    },
    publicId: {
      type: String,
      default: '',
      trim: true,
    },
    folder: {
      type: String,
      default: 'stockline/products',
      trim: true,
    },
    originalName: {
      type: String,
      default: '',
      trim: true,
    },
    mimeType: {
      type: String,
      default: 'image/webp',
      trim: true,
    },
    originalBytes: {
      type: Number,
      min: 0,
      default: 0,
    },
    compressedBytes: {
      type: Number,
      min: 0,
      default: 0,
    },
    width: {
      type: Number,
      min: 0,
      default: 0,
    },
    height: {
      type: Number,
      min: 0,
      default: 0,
    },
    tag: {
      type: String,
      enum: ['primary', 'front', 'part_number_stamp', 'nameplate', 'packaging', 'machine_diagram', 'other'],
      default: 'primary',
    },
    caption: {
      type: String,
      default: '',
      trim: true,
    },
    categoryId: {
      type: mongoose.Schema.Types.Mixed,
      ref: 'Category',
      default: null,
    },
    machineModelId: {
      type: mongoose.Schema.Types.Mixed,
      ref: 'MachineModel',
      default: null,
    },
    linkedProductIds: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    usageCount: {
      type: Number,
      min: 1,
      default: 1,
    },
    uploadedBy: {
      type: String,
      default: 'Staff',
      trim: true,
    },
  },
  { timestamps: true }
);

mediaAssetSchema.index(
  { sha256: 1 },
  { unique: true, partialFilterExpression: { sha256: { $type: 'string', $gt: '' } } }
);
mediaAssetSchema.index({ categoryId: 1, createdAt: -1 });
mediaAssetSchema.index({ machineModelId: 1, createdAt: -1 });
mediaAssetSchema.index({ linkedProductIds: 1 });
mediaAssetSchema.index({ provider: 1, tag: 1 });
mediaAssetSchema.index({
  originalName: 'text',
  caption: 'text',
  folder: 'text',
  tag: 'text',
});

module.exports = mongoose.model('MediaAsset', mediaAssetSchema);
