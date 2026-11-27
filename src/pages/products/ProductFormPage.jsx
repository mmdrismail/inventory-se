import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAppData } from '../../context/AppDataContext';
import { useLanguage } from '../../context/LanguageContext';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { BackLink } from '../../components/common/BackLink';
import { Input, Select, Textarea } from '../../components/forms/FormControls';
import { generateSKU } from '../../utils/formatters';
import { getUnitSelectOptions, normalizeUnit } from '../../utils/units';
import { QuickAddSupplierModal } from '../../components/suppliers/QuickAddSupplierModal';
import { ProductMediaManager } from '../../components/products/ProductMediaManager';
import { generateStickerPriceDisplay, calculateTierDefaults } from '../../utils/priceCipher';
import {
  ArrowLeft,
  Save,
  Sparkles,
  MapPin,
  GitFork,
  Boxes,
  Plus,
  Trash2,
  Tag,
  Wrench,
  KeyRound,
} from 'lucide-react';

export const ProductFormPage = () => {
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const navigate = useNavigate();
  const { language, t } = useLanguage();

  const l = (texts) => {
    if (language === 'en') return texts.en;
    if (language === 'obro') return texts.obro || `${texts.bn} (${texts.en})`;
    return texts.bn;
  };

  const { products, categories, flatCategories, machineModels, suppliers, addProduct, updateProduct } = useAppData();

  const uniqueSuppliers = useMemo(() => {
    const seen = new Set();
    return (suppliers || []).filter((s) => {
      const key = (s.name || '').trim().toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [suppliers]);

  const [isAddSupplierOpen, setIsAddSupplierOpen] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    brand: '',
    modelNumber: '',
    condition: 'original_oem', // 'new' | 'original_oem' | 'reconditioned' | 'used' | 'std_overhaul'
    oemPartNumber: '',
    impaCode: '',
    dimensions: '',
    description: '',
    categoryId: '',
    primaryMachineModelId: '',
    supplierId: '',
    costPrice: '',
    staffPrice: '',
    managerPrice: '',
    sellingPrice: '',
    quantity: '',
    reorderLevel: '10',
    unit: 'pc',
    imageUrl: '',
    thumbnailUrl: '',
    images: [],
    isPublic: true,
    lotNumber: '',
    compatibleModelsText: '',
    alternativesText: '',
    // Warehouse location breakdown
    locZone: 'Zone-A',
    locAisle: '02',
    locRack: '04',
    locShelf: '3',
    locBin: 'B',
  });

  // Dynamic variants list
  const [variants, setVariants] = useState([]);

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Prepopulate if edit mode
  useEffect(() => {
    if (isEditMode) {
      const existing = products.find((p) => p.id === id);
      if (existing) {
        const loc = existing.warehouseLocation || {};
        setFormData({
          name: existing.name || '',
          sku: existing.sku || '',
          brand: existing.brand || '',
          modelNumber: existing.modelNumber || '',
          condition: existing.condition || 'original_oem',
          oemPartNumber: existing.oemPartNumber || '',
          impaCode: existing.impaCode || '',
          dimensions: existing.dimensions || '',
          description: existing.description || '',
          categoryId: existing.categoryId || '',
          primaryMachineModelId: existing.primaryMachineModelId || '',
          supplierId: existing.supplierId || '',
          costPrice: Number(existing.costPrice) > 0 ? String(existing.costPrice) : '',
          staffPrice: Number(existing.staffPrice) > 0 ? String(existing.staffPrice) : '',
          managerPrice: Number(existing.managerPrice) > 0 ? String(existing.managerPrice) : '',
          sellingPrice: Number(existing.sellingPrice || existing.customerPrice) > 0 ? String(existing.sellingPrice || existing.customerPrice) : '',
          quantity: Number(existing.quantity) > 0 ? String(existing.quantity) : '',
          reorderLevel: existing.reorderLevel ? String(existing.reorderLevel) : '10',
          unit: normalizeUnit(existing.unit, 'pc'),
          imageUrl: existing.imageUrl || '',
          thumbnailUrl: existing.thumbnailUrl || '',
          images: Array.isArray(existing.images) ? existing.images : [],
          isPublic: existing.isPublic !== undefined ? existing.isPublic : true,
          lotNumber: existing.lotNumber || '',
          compatibleModelsText: Array.isArray(existing.compatibleModels) ? existing.compatibleModels.join(', ') : '',
          alternativesText: Array.isArray(existing.alternatives) ? existing.alternatives.join(', ') : '',
          locZone: loc.zone || 'Zone-A',
          locAisle: loc.aisle?.replace(/\D/g, '') || '02',
          locRack: loc.rack?.replace(/\D/g, '') || '04',
          locShelf: loc.shelf?.replace(/\D/g, '') || '3',
          locBin: loc.bin?.replace(/Bin-?/i, '') || 'B',
        });
        if (Array.isArray(existing.variants)) {
          setVariants(
            existing.variants.map((v) => ({
              ...v,
              costPrice: Number(v.costPrice) > 0 ? String(v.costPrice) : '',
              sellingPrice: Number(v.sellingPrice) > 0 ? String(v.sellingPrice) : '',
              quantity: Number(v.quantity) > 0 ? String(v.quantity) : '',
            }))
          );
        }
      } else {
        navigate('/products');
      }
    } else {
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
    setFormData((prev) => {
      const updated = {
        ...prev,
        [name]: type === 'checkbox' ? checked : value,
      };
      if (name === 'costPrice') {
        const cost = Number(value) || 0;
        if (cost > 0) {
          if (!prev.staffPrice || Number(prev.staffPrice) === 0) updated.staffPrice = String(Math.round(cost * 1.3));
          if (!prev.managerPrice || Number(prev.managerPrice) === 0) updated.managerPrice = String(Math.round(cost * 1.5));
          if (!prev.sellingPrice || Number(prev.sellingPrice) === 0) updated.sellingPrice = String(Math.round(cost * 1.8));
        }
      }
      return updated;
    });
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleAutoGenerateSKU = () => {
    const selectedCat = categories.find((c) => c.id === formData.categoryId);
    const prefix = formData.brand ? formData.brand.substring(0, 3).toUpperCase() : (selectedCat?.name || 'PRD');
    const sku = generateSKU(prefix);
    setFormData((prev) => ({ ...prev, sku }));
    if (errors.sku) setErrors((prev) => ({ ...prev, sku: '' }));
  };

  // Variants handlers
  const handleAddVariant = () => {
    setVariants((prev) => [
      ...prev,
      {
        id: `v-${Date.now()}`,
        name: '+0.25 mm Oversize',
        condition: formData.condition || 'original_oem',
        sku: `${formData.sku || 'SKU'}-${prev.length + 1}`,
        costPrice: Number(formData.costPrice) > 0 ? formData.costPrice : '',
        sellingPrice: Number(formData.sellingPrice) > 0 ? formData.sellingPrice : '',
        quantity: 5,
        location: `${formData.locZone.charAt(5) || 'A'}-${formData.locAisle}-${formData.locRack}-${formData.locShelf}-${formData.locBin}`,
      },
    ]);
  };

  const handleUpdateVariant = (index, field, val) => {
    setVariants((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: val };
      return updated;
    });
  };

  const handleRemoveVariant = (index) => {
    setVariants((prev) => prev.filter((_, i) => i !== index));
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

    const zoneLetter = formData.locZone.replace(/[^A-Za-z]/g, '').slice(-1) || 'A';
    const locationCode = `${zoneLetter}-${formData.locAisle.padStart(2, '0')}-${formData.locRack.padStart(2, '0')}-${formData.locShelf}-${formData.locBin.toUpperCase()}`;

    const compatibleModels = formData.compatibleModelsText
      ? formData.compatibleModelsText.split(',').map((s) => s.trim()).filter(Boolean)
      : [];

    const alternatives = formData.alternativesText
      ? formData.alternativesText.split(',').map((s) => s.trim()).filter(Boolean)
      : [];

    const cost = Number(formData.costPrice) || 0;
    const staff = Number(formData.staffPrice) || Math.round(cost * 1.3);
    const mgr = Number(formData.managerPrice) || Math.round(cost * 1.5);
    const cust = Number(formData.sellingPrice) || Math.round(cost * 1.8);
    const code = generateStickerPriceDisplay({
      buyingPrice: cost,
      staffPrice: staff,
      managerPrice: mgr,
      customerPrice: cust,
      format: 'role_code',
    });

    const payload = {
      ...formData,
      costPrice: cost,
      staffPrice: staff,
      managerPrice: mgr,
      customerPrice: cust,
      sellingPrice: cust,
      priceCode: code,
      quantity: Number(formData.quantity),
      reorderLevel: Number(formData.reorderLevel),
      compatibleModels,
      alternatives,
      warehouseLocation: {
        zone: formData.locZone,
        aisle: `Aisle-${formData.locAisle.padStart(2, '0')}`,
        rack: `Rack-${formData.locRack.padStart(2, '0')}`,
        shelf: `Shelf-${formData.locShelf}`,
        bin: `Bin-${formData.locBin.toUpperCase()}`,
        code: locationCode,
      },
      variants,
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
        <BackLink to="/products">
          {l({ bn: 'পণ্য তালিকায় ফিরে যান', en: 'Back to Product List', obro: 'Back to Product List' })}
        </BackLink>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {isEditMode
              ? l({ bn: 'পণ্যের তথ্য ও স্পেকস সম্পাদন', en: 'Edit Product & Machinery Details', obro: 'Edit Product Details' })
              : l({ bn: 'নতুন পণ্য ও স্পেয়ার পার্টস যোগ করুন', en: 'Add New Machinery / Spare Part', obro: 'Add New Product / Part' })}
          </CardTitle>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {l({
              bn: 'আন্তর্জাতিক সুপারশপ ও ওয়্যারহাউজ স্ট্যান্ডার্ড: পার্টস স্পেসিফিকেশন, ভ্যারিয়েন্ট, ভিন্ন ভিন্ন দাম ও র‍্যাক লোকেশন সেট করুন।',
              en: 'Standard warehouse inventory: Configure part specs, variants, tier pricing, and rack location.',
              obro: 'Warehouse inventory: Part specs, variants, tier pricing o rack location configure korun.',
            })}
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
                label="Product / Spare Part Name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                error={errors.name}
                placeholder="e.g. Connecting Rod with Piston Complete"
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
                  placeholder="e.g. MACH-BIT-CR01"
                  className={`w-full rounded-xl border px-3.5 py-2 text-sm uppercase font-mono bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 ${
                    errors.sku ? 'border-red-400' : 'border-slate-200 dark:border-slate-800 focus:border-emerald-500'
                  }`}
                  required
                />
                {errors.sku && <span className="text-xs text-red-500">{errors.sku}</span>}
              </div>
            </div>

            {/* Machinery Brand, Model & Condition */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Input
                label="Brand / Make (ব্র্যান্ড)"
                name="brand"
                value={formData.brand}
                onChange={handleChange}
                placeholder="e.g. Bitzer, Carrier, Bock, Copeland"
              />

              <Input
                label="Model Number (মডেল নং)"
                name="modelNumber"
                value={formData.modelNumber}
                onChange={handleChange}
                placeholder="e.g. 4EC-4.2 / 06D Series"
              />

              <Select
                label="Condition / Grading (মালের অবস্থা)"
                name="condition"
                value={formData.condition}
                onChange={handleChange}
                options={[
                  { value: 'original_oem', label: 'Original OEM (জেনুইন অরিজিনাল)' },
                  { value: 'reconditioned', label: 'Reconditioned (রিকন্ডিশন রি-ইউজ)' },
                  { value: 'std_overhaul', label: 'STD Overhaul (ওভারহল স্ট্যান্ডার্ড)' },
                  { value: 'new', label: 'Brand New (নতুন ইনটেক)' },
                  { value: 'used', label: 'Used Scrap (ব্যবহারযোগ্য)' },
                ]}
              />
            </div>

            {/* Technical Codes: OEM Part #, IMPA Marine Code, Dimensions */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="OEM Part Number"
                name="oemPartNumber"
                value={formData.oemPartNumber}
                onChange={handleChange}
                placeholder="e.g. 302-230-01"
              />

              <Input
                label="Marine IMPA Code"
                name="impaCode"
                value={formData.impaCode}
                onChange={handleChange}
                placeholder="e.g. 172101"
              />

              <Input
                label="Dimensions / Size (ডাইমেনশন)"
                name="dimensions"
                value={formData.dimensions}
                onChange={handleChange}
                placeholder="e.g. Pin 28mm x Piston 60mm"
              />
            </div>

            {/* Category & Supplier */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Category (Hierarchy)"
                name="categoryId"
                value={formData.categoryId}
                onChange={handleChange}
                error={errors.categoryId}
                required
                options={(flatCategories && flatCategories.length > 0 ? flatCategories : categories).map((c) => ({
                  value: c.id,
                  label: c.indentLabel || c.name,
                }))}
              />

              {Array.isArray(machineModels) && machineModels.length > 0 && (
                <Select
                  label="Linked Machine Profile (Optional)"
                  name="primaryMachineModelId"
                  value={formData.primaryMachineModelId}
                  onChange={(e) => {
                    const pickedId = e.target.value;
                    const mach = machineModels.find((m) => String(m.id || m._id) === String(pickedId));
                    setFormData((prev) => ({
                      ...prev,
                      primaryMachineModelId: pickedId,
                      brand: prev.brand || mach?.brand || mach?.machineName || '',
                      modelNumber: prev.modelNumber || mach?.model || '',
                    }));
                  }}
                  options={[
                    { value: '', label: 'কোনো মেশিন সিলেক্ট করুন (Optional)...' },
                    ...machineModels.map((m) => ({
                      value: m.id || m._id,
                      label: [m.machineName, m.model, m.hp ? `${m.hp}HP` : '', m.ton ? `${m.ton}T` : '']
                        .filter(Boolean)
                        .join(' · '),
                    })),
                  ]}
                />
              )}

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Primary Supplier / Yard
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsAddSupplierOpen(true)}
                    className="inline-flex items-center gap-0.5 text-[11px] font-bold text-emerald-600 hover:text-emerald-700 hover:underline"
                  >
                    <Plus className="h-3 w-3" />
                    <span>New Supplier</span>
                  </button>
                </div>
                <div className="flex items-center gap-1.5">
                  <select
                    name="supplierId"
                    value={formData.supplierId}
                    onChange={handleChange}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="">Select supplier (optional)</option>
                    {uniqueSuppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} {s.companyName && s.companyName !== s.name ? `(${s.companyName})` : ''}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setIsAddSupplierOpen(true)}
                    className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shrink-0 shadow-xs transition-colors"
                    title="Add new supplier / yard"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Description */}
            <Textarea
              label="Technical Description & Notes"
              name="description"
              rows={2}
              value={formData.description}
              onChange={handleChange}
              placeholder="Provide technical specifications, applications, compatibility or scrap lot origin details..."
            />

            {/* Warehouse Rack / Shelf Location (Z-A-R-S-B) */}
            <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="font-bold text-xs sm:text-sm text-emerald-950 dark:text-emerald-200">
                    ওয়্যারহাউজ ও দোকান লোকেশন (Z-A-R-S-B Location Tracking)
                  </span>
                </div>
                <span className="text-[11px] font-mono font-bold text-emerald-700 dark:text-emerald-300 bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-emerald-300 dark:border-emerald-800">
                  Code: {formData.locZone.replace(/[^A-Za-z]/g, '').slice(-1) || 'A'}-{formData.locAisle.padStart(2, '0')}-{formData.locRack.padStart(2, '0')}-{formData.locShelf}-{formData.locBin.toUpperCase()}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-xs">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Zone (জোন)</label>
                  <input
                    type="text"
                    name="locZone"
                    value={formData.locZone}
                    onChange={handleChange}
                    placeholder="Zone-A"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-semibold text-slate-800 dark:text-slate-200"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Aisle (গলি/আইল)</label>
                  <input
                    type="text"
                    name="locAisle"
                    value={formData.locAisle}
                    onChange={handleChange}
                    placeholder="02"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-semibold text-slate-800 dark:text-slate-200"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Rack (র‍্যাক)</label>
                  <input
                    type="text"
                    name="locRack"
                    value={formData.locRack}
                    onChange={handleChange}
                    placeholder="04"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-semibold text-slate-800 dark:text-slate-200"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Shelf (তাক)</label>
                  <input
                    type="text"
                    name="locShelf"
                    value={formData.locShelf}
                    onChange={handleChange}
                    placeholder="3"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-semibold text-slate-800 dark:text-slate-200"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Bin (খোপ/বক্স)</label>
                  <input
                    type="text"
                    name="locBin"
                    value={formData.locBin}
                    onChange={handleChange}
                    placeholder="B"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-semibold text-slate-800 dark:text-slate-200"
                  />
                </div>
              </div>
            </div>

            {/* 4-Tier Pricing Architecture & Secret Price Code */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-amber-500" />
                  <span className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-200">
                    ৪-স্তরের প্রাইসিং কাঠামো ও গোপন মূল্য কোড (Multi-Tier & Secret Price Code)
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-mono self-start sm:self-auto">
                  <span className="text-[11px] text-slate-400 font-bold">স্টিকার কোড:</span>
                  <span className="px-2 py-0.5 rounded bg-slate-900 text-amber-300 font-bold border border-amber-400/30">
                    {generateStickerPriceDisplay({
                      buyingPrice: formData.costPrice,
                      staffPrice: formData.staffPrice,
                      managerPrice: formData.managerPrice,
                      customerPrice: formData.sellingPrice,
                      format: 'role_code',
                    })}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                    ১. ক্রয় খরচ (Buying Cost) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    name="costPrice"
                    value={formData.costPrice}
                    onChange={handleChange}
                    placeholder="0"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono font-semibold text-slate-800 dark:text-slate-200"
                    required
                  />
                  {errors.costPrice && <p className="text-[10px] text-red-500 mt-1">{errors.costPrice}</p>}
                </div>

                <div>
                  <label className="text-[11px] font-bold text-blue-600 dark:text-blue-400 block mb-1">
                    ২. স্টাফ দর (Staff Min Limit)
                  </label>
                  <input
                    type="number"
                    step="any"
                    name="staffPrice"
                    value={formData.staffPrice}
                    onChange={handleChange}
                    placeholder="স্টাফ সর্বনিম্ন বিক্রয় সীমা"
                    className="w-full px-3 py-2 rounded-xl border border-blue-300 dark:border-blue-700 bg-white dark:bg-slate-900 font-mono font-semibold text-blue-700 dark:text-blue-300"
                  />
                  <span className="text-[10px] text-slate-400">স্টাফ এর নিচে নামতে পারবে না</span>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-purple-600 dark:text-purple-400 block mb-1">
                    ৩. ম্যানেজার দর (Manager Floor)
                  </label>
                  <input
                    type="number"
                    step="any"
                    name="managerPrice"
                    value={formData.managerPrice}
                    onChange={handleChange}
                    placeholder="ম্যানেজার ডিসকাউন্ট সীমা"
                    className="w-full px-3 py-2 rounded-xl border border-purple-300 dark:border-purple-700 bg-white dark:bg-slate-900 font-mono font-semibold text-purple-700 dark:text-purple-300"
                  />
                  <span className="text-[10px] text-slate-400">ম্যানেজার নেগোশিয়েশন লিমিট</span>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 block mb-1">
                    ৪. কাস্টমার দর (Customer Quote) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    name="sellingPrice"
                    value={formData.sellingPrice}
                    onChange={handleChange}
                    placeholder="0"
                    className="w-full px-3 py-2 rounded-xl border border-emerald-400 dark:border-emerald-600 bg-white dark:bg-slate-900 font-mono font-bold text-emerald-600 dark:text-emerald-300"
                    required
                  />
                  <span className="text-[10px] text-slate-400">গ্রাহককে উদ্ধৃত সর্বোচ্চ দর</span>
                  {errors.sellingPrice && <p className="text-[10px] text-red-500 mt-1">{errors.sellingPrice}</p>}
                </div>
              </div>
            </div>

            {/* Stock Counts & Measurement Unit */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label={isEditMode ? 'Current Stock Quantity' : 'Initial Stock Quantity'}
                type="number"
                name="quantity"
                value={formData.quantity}
                onChange={handleChange}
                error={errors.quantity}
                placeholder="0"
                required
              />

              <Select
                label={l({ bn: 'একক (Unit)', en: 'Measurement Unit', obro: 'Unit (একক)' })}
                name="unit"
                value={normalizeUnit(formData.unit)}
                onChange={handleChange}
                options={getUnitSelectOptions(formData.unit, language)}
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
              />
            </div>

            {/* Compatibility & Alternative Cross-References */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Input
                label="Compatible Engine / Compressor Models (কমা দিয়ে লিখুন)"
                name="compatibleModelsText"
                value={formData.compatibleModelsText}
                onChange={handleChange}
                placeholder="e.g. Bitzer 4EC-4.2, Carrier 06D, Bock HG34"
                helperText="একাধিক মডেলের সাথে মিললে কমা (,) দিয়ে আলাদা করুন।"
              />

              <Input
                label="Alternative Interchangeable Parts (বিকল্প মালামাল)"
                name="alternativesText"
                value={formData.alternativesText}
                onChange={handleChange}
                placeholder="e.g. Carrier 06D Rod, Bock HG34 Piston Set"
                helperText="কাস্টমার সার্চ করলে এই বিকল্প মালামালগুলো সাজেশনে আসবে।"
              />
            </div>

            {/* Product Variants & Differential Pricing Section */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Boxes className="h-4 w-4 text-purple-600" />
                    <span>ভ্যারিয়েন্ট ও ভিন্ন ভিন্ন দাম (Variants & Differential Pricing)</span>
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    একই মালের একাধিক সাইজ (+0.25, STD, OEM, রিকন্ডিশন) ও আলাদা দাম
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  icon={Plus}
                  onClick={handleAddVariant}
                  className="border-purple-300 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/40"
                >
                  ভ্যারিয়েন্ট যোগ করুন
                </Button>
              </div>

              {variants.length > 0 && (
                <div className="space-y-2 border border-slate-200 dark:border-slate-800 rounded-xl p-3 bg-slate-50/50 dark:bg-slate-900/40">
                  {variants.map((v, idx) => (
                    <div key={v.id || idx} className="grid grid-cols-1 sm:grid-cols-6 gap-2 items-center p-2 rounded-lg bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 text-xs">
                      <div className="sm:col-span-2">
                        <label className="text-[10px] font-bold text-slate-400 block">সাইজ / ভ্যারিয়েন্ট নাম</label>
                        <input
                          type="text"
                          value={v.name}
                          onChange={(e) => handleUpdateVariant(idx, 'name', e.target.value)}
                          placeholder="e.g. Standard (STD), +0.25 mm"
                          className="w-full px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-transparent font-semibold"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 block">কেনা দর</label>
                        <input
                          type="number"
                          step="any"
                          value={v.costPrice}
                          onChange={(e) => handleUpdateVariant(idx, 'costPrice', e.target.value)}
                          placeholder="0"
                          className="w-full px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-transparent font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 block">বিক্রয় দর</label>
                        <input
                          type="number"
                          step="any"
                          value={v.sellingPrice}
                          onChange={(e) => handleUpdateVariant(idx, 'sellingPrice', e.target.value)}
                          placeholder="0"
                          className="w-full px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-transparent font-mono font-bold text-emerald-600"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 block">মজুদ (Qty)</label>
                        <input
                          type="number"
                          value={v.quantity}
                          onChange={(e) => handleUpdateVariant(idx, 'quantity', e.target.value)}
                          placeholder="0"
                          className="w-full px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-transparent font-mono font-bold text-center"
                        />
                      </div>
                      <div className="flex justify-end pt-3 sm:pt-0">
                        <button
                          type="button"
                          onClick={() => handleRemoveVariant(idx)}
                          className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                          title="ভ্যারিয়েন্ট মুছে ফেলুন"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Product Multi-Reference Image Gallery & Compression Pipeline */}
            <div className="space-y-3">
              <ProductMediaManager
                imageUrl={formData.imageUrl}
                images={formData.images}
                sku={formData.sku}
                categoryId={formData.categoryId || null}
                machineModelId={formData.primaryMachineModelId || null}
                productId={isEditMode ? id : null}
                onChange={({ imageUrl: nextUrl, thumbnailUrl: nextThumb, images: nextImages }) =>
                  setFormData((prev) => ({
                    ...prev,
                    imageUrl: nextUrl,
                    thumbnailUrl: nextThumb,
                    images: nextImages,
                  }))
                }
              />

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

      {/* Quick Add Supplier Modal */}
      <QuickAddSupplierModal
        isOpen={isAddSupplierOpen}
        onClose={() => setIsAddSupplierOpen(false)}
        onSuccess={(newSup) => {
          setFormData((prev) => ({ ...prev, supplierId: newSup.id }));
        }}
      />
    </div>
  );
};
