import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAppData } from '../../context/AppDataContext';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input, Select, Textarea } from '../../components/forms/FormControls';
import { generateSKU } from '../../utils/formatters';
import { ArrowLeft, Save, Sparkles, Image as ImageIcon } from 'lucide-react';

export const ProductFormPage = () => {
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const navigate = useNavigate();

  const { products, categories, suppliers, addProduct, updateProduct } = useAppData();

  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    description: '',
    categoryId: '',
    supplierId: '',
    costPrice: '',
    sellingPrice: '',
    quantity: '',
    reorderLevel: '10',
    imageUrl: '',
    isPublic: true,
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Prepopulate if edit mode
  useEffect(() => {
    if (isEditMode) {
      const existing = products.find((p) => p.id === id);
      if (existing) {
        setFormData({
          name: existing.name || '',
          sku: existing.sku || '',
          description: existing.description || '',
          categoryId: existing.categoryId || '',
          supplierId: existing.supplierId || '',
          costPrice: String(existing.costPrice || 0),
          sellingPrice: String(existing.sellingPrice || 0),
          quantity: String(existing.quantity || 0),
          reorderLevel: String(existing.reorderLevel || 10),
          imageUrl: existing.imageUrl || '',
          isPublic: existing.isPublic !== undefined ? existing.isPublic : true,
        });
      } else {
        navigate('/products');
      }
    } else {
      // Default to first category and supplier if available
      if (categories.length > 0 || suppliers.length > 0) {
        setFormData((prev) => ({
          ...prev,
          categoryId: prev.categoryId || categories[0]?.id || '',
          supplierId: prev.supplierId || suppliers[0]?.id || '',
        }));
      }
    }
  }, [id, isEditMode, products, categories, suppliers, navigate]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    // Clear field-specific error
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleAutoGenerateSKU = () => {
    const selectedCat = categories.find((c) => c.id === formData.categoryId);
    const sku = generateSKU(selectedCat?.name || 'PRD');
    setFormData((prev) => ({ ...prev, sku }));
    if (errors.sku) setErrors((prev) => ({ ...prev, sku: '' }));
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Product name is required.';
    }

    if (!formData.sku.trim()) {
      newErrors.sku = 'SKU is required.';
    }

    if (!formData.categoryId) {
      newErrors.categoryId = 'Please select a product category.';
    }

    const cost = Number(formData.costPrice);
    if (formData.costPrice === '' || isNaN(cost) || cost < 0) {
      newErrors.costPrice = 'Cost price must be a non-negative number.';
    }

    const price = Number(formData.sellingPrice);
    if (formData.sellingPrice === '' || isNaN(price) || price < 0) {
      newErrors.sellingPrice = 'Selling price must be a non-negative number.';
    }

    if (cost > price) {
      newErrors.sellingPrice = `Selling price (${price}) is lower than cost price (${cost}). This will result in negative profit margin.`;
    }

    const qty = Number(formData.quantity);
    if (formData.quantity === '' || isNaN(qty) || qty < 0) {
      newErrors.quantity = 'Quantity must be a non-negative whole number.';
    }

    const reorder = Number(formData.reorderLevel);
    if (formData.reorderLevel === '' || isNaN(reorder) || reorder < 0) {
      newErrors.reorderLevel = 'Reorder level must be a non-negative number.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);

    const payload = {
      ...formData,
      costPrice: Number(formData.costPrice),
      sellingPrice: Number(formData.sellingPrice),
      quantity: Number(formData.quantity),
      reorderLevel: Number(formData.reorderLevel),
    };

    setTimeout(() => {
      let res;
      if (isEditMode) {
        res = updateProduct(id, payload);
      } else {
        res = addProduct(payload, 'Staff');
      }

      setIsSubmitting(false);

      if (res.success) {
        navigate('/products');
      } else {
        setErrors((prev) => ({ ...prev, form: res.message }));
      }
    }, 250);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top action header */}
      <div className="flex items-center justify-between">
        <Link
          to="/products"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Product List</span>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{isEditMode ? 'Edit Product Details' : 'Add New Product to Catalog'}</CardTitle>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {isEditMode
              ? `Update pricing, stock thresholds, and descriptions for SKU ${formData.sku}.`
              : 'Enter specifications, pricing margins, initial inventory, and reorder triggers.'}
          </p>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {errors.form && (
              <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-600 dark:text-red-400 font-semibold">
                {errors.form}
              </div>
            )}

            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Product Name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                error={errors.name}
                placeholder="e.g. Industrial Cordless Drill Kit"
                required
              />

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    SKU (Stock Keeping Unit) <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleAutoGenerateSKU}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 hover:underline"
                  >
                    <Sparkles className="h-3 w-3" />
                    Auto-Generate
                  </button>
                </div>
                <input
                  type="text"
                  name="sku"
                  value={formData.sku}
                  onChange={handleChange}
                  placeholder="e.g. TOO-1002"
                  className={`w-full rounded-xl border px-3.5 py-2 text-sm uppercase font-mono bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 ${
                    errors.sku ? 'border-red-400' : 'border-slate-200 dark:border-slate-800 focus:border-emerald-500'
                  }`}
                  required
                />
                {errors.sku && <span className="text-xs text-red-500">{errors.sku}</span>}
              </div>
            </div>

            {/* Description */}
            <Textarea
              label="Product Description"
              name="description"
              rows={3}
              value={formData.description}
              onChange={handleChange}
              placeholder="Provide a concise summary of product features, dimensions, or specifications..."
            />

            {/* Category & Supplier */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Category"
                name="categoryId"
                value={formData.categoryId}
                onChange={handleChange}
                error={errors.categoryId}
                required
                options={categories.map((c) => ({ value: c.id, label: c.name }))}
              />

              <Select
                label="Primary Supplier"
                name="supplierId"
                value={formData.supplierId}
                onChange={handleChange}
                placeholder="Select supplier (optional)"
                options={suppliers.map((s) => ({ value: s.id, label: `${s.name} (${s.companyName})` }))}
              />
            </div>

            {/* Financials & Stock */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Input
                label="Cost Price (Unit Cost)"
                type="number"
                step="any"
                name="costPrice"
                value={formData.costPrice}
                onChange={handleChange}
                error={errors.costPrice}
                placeholder="0.00"
                required
              />

              <Input
                label="Selling Price (Unit Retail)"
                type="number"
                step="any"
                name="sellingPrice"
                value={formData.sellingPrice}
                onChange={handleChange}
                error={errors.sellingPrice}
                placeholder="0.00"
                required
              />

              <Input
                label={isEditMode ? 'Current Stock Quantity' : 'Initial Stock Quantity'}
                type="number"
                name="quantity"
                value={formData.quantity}
                onChange={handleChange}
                error={errors.quantity}
                placeholder="0"
                required
                helperText={isEditMode ? 'Can also be adjusted via Inventory adjustments' : 'Auto-logs initial inventory movement'}
              />

              <Input
                label="Reorder Safety Level"
                type="number"
                name="reorderLevel"
                value={formData.reorderLevel}
                onChange={handleChange}
                error={errors.reorderLevel}
                placeholder="10"
                required
                helperText="Triggers low stock alarm"
              />
            </div>

            {/* Product Image URL & Live Preview */}
            <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-start">
                <div className="sm:col-span-3">
                  <Input
                    label="Image URL"
                    name="imageUrl"
                    type="url"
                    value={formData.imageUrl}
                    onChange={handleChange}
                    placeholder="https://images.unsplash.com/..."
                    helperText="Paste any image web link or leave blank for a default placeholder."
                  />
                </div>
                <div className="sm:col-span-1 flex flex-col items-center">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 self-start sm:self-center">
                    Image Preview
                  </span>
                  <div className="w-20 h-20 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex items-center justify-center overflow-hidden">
                    {formData.imageUrl ? (
                      <img
                        src={formData.imageUrl}
                        alt="Preview"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = 'https://images.unsplash.com/photo-1589710751893-f9a6770ad71b?w=500&auto=format&fit=crop&q=60';
                        }}
                      />
                    ) : (
                      <ImageIcon className="h-6 w-6 text-slate-400" />
                    )}
                  </div>
                </div>
              </div>

              {/* Public Storefront visibility */}
              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    name="isPublic"
                    checked={formData.isPublic}
                    onChange={handleChange}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                  />
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    Display in public customer storefront (/shop)
                  </span>
                </label>
              </div>
            </div>

            {/* Form actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button variant="secondary" onClick={() => navigate('/products')}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" icon={Save} isLoading={isSubmitting}>
                {isEditMode ? 'Update Product' : 'Create Product'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
