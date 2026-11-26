const mongoose = require('mongoose');
const { slugify } = require('../utils/domainNormalizers');

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Category name is required'],
      unique: true,
      trim: true,
    },
    slug: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
    },
    parentId: {
      type: mongoose.Schema.Types.Mixed,
      ref: 'Category',
      default: null,
    },
    ancestors: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    level: {
      type: Number,
      default: 0,
      min: 0,
    },
    path: {
      type: String,
      default: '',
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    color: {
      type: String,
      default: 'emerald',
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
  },
  { timestamps: true }
);

categorySchema.pre('validate', function (next) {
  if (!this.slug && this.name) {
    this.slug = slugify(this.name);
  }
  if (!this.path && this.name) {
    this.path = this.name;
  }
  next();
});

categorySchema.index({ parentId: 1, sortOrder: 1, name: 1 });
categorySchema.index({ ancestors: 1 });
categorySchema.index({ level: 1 });
categorySchema.index({ slug: 1 });

module.exports = mongoose.model('Category', categorySchema);
