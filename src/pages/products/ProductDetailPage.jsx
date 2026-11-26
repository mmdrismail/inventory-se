import React, { useMemo, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAppData } from '../../context/AppDataContext';
import { useLanguage } from '../../context/LanguageContext';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { StockBadge } from '../../components/common/Badge';
import { BackLink } from '../../components/common/BackLink';
import { BarcodeLabelModal } from '../../components/products/BarcodeLabelModal';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import {
  ArrowLeft,
  Edit2,
  Trash2,
  Package,
  Boxes,
  Truck,
  TrendingUp,
  SlidersHorizontal,
  History,
  Printer,
  Barcode,
  MapPin,
  Tag,
  GitFork,
  CheckCircle2,
  Layers,
  Wrench,
} from 'lucide-react';

export const ProductDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { products, categories, suppliers, inventoryMovements, deleteProduct, confirmAction, settings } = useAppData();
  const { language, t } = useLanguage();

  const l = (texts) => {
    if (language === 'en') return texts.en;
    if (language === 'obro') return texts.obro || `${texts.bn} (${texts.en})`;
    return texts.bn;
  };

  const [isLabelModalOpen, setIsLabelModalOpen] = useState(false);
  const [selectedVariantForLabel, setSelectedVariantForLabel] = useState(null);

  const product = products.find((p) => p.id === id);

  const category = useMemo(() => {
    return categories.find((c) => c.id === product?.categoryId);
  }, [categories, product]);

  const supplier = useMemo(() => {
    return suppliers.find((s) => s.id === product?.supplierId);
  }, [suppliers, product]);

  // Product-specific movements
  const productMovements = useMemo(() => {
    return (inventoryMovements || []).filter((m) => m.productId === id);
  }, [inventoryMovements, id]);

  if (!product) {
    return (
      <div className="py-12 text-center space-y-4">
        <h2 className="text-xl font-bold">{l({ bn: 'পণ্যটি খুঁজে পাওয়া যায়নি', en: 'Product Not Found', obro: 'Product Not Found' })}</h2>
        <p className="text-sm text-slate-500">{l({ bn: 'অনুরোধকৃত পণ্যটি ডেটাবেজে বিদ্যমান নেই।', en: 'The requested product could not be located.', obro: 'Product paowa jayni.' })}</p>
        <Link to="/products">
          <Button variant="primary">{l({ bn: 'পণ্য তালিকায় ফিরে যান', en: 'Return to Catalog', obro: 'Return to Catalog' })}</Button>
        </Link>
      </div>
    );
  }

  const cost = Number(product.costPrice) || 0;
  const price = Number(product.sellingPrice) || 0;
  const qty = Number(product.quantity) || 0;
  const margin = price > 0 ? (((price - cost) / price) * 100).toFixed(1).replace(/\.0$/, '') : 0;
  const totalCostVal = cost * qty;
  const totalRetailVal = price * qty;

  const loc = product.warehouseLocation || {};
  const locationCode = loc.code || (loc.rack ? `${loc.zone || ''} ${loc.rack}` : 'GENERAL');

  const getConditionBadge = (cond) => {
    switch (cond) {
      case 'original_oem':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300">
            {l({ bn: 'জেনুইন (Original OEM)', en: 'Original OEM', obro: 'Original OEM' })}
          </span>
        );
      case 'reconditioned':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300">
            {l({ bn: 'রিকন্ডিশন্ড (Reconditioned)', en: 'Reconditioned', obro: 'Reconditioned' })}
          </span>
        );
      case 'std_overhaul':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300">
            {l({ bn: 'ওভারহল (STD Overhaul)', en: 'STD Overhaul', obro: 'STD Overhaul' })}
          </span>
        );
      case 'used':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            {l({ bn: 'ব্যবহারযোগ্য (Used)', en: 'Used', obro: 'Used' })}
          </span>
        );
      case 'new':
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300">
            {l({ bn: 'নতুন (Brand New)', en: 'Brand New', obro: 'Brand New' })}
          </span>
        );
    }
  };

  const handleDelete = () => {
    confirmAction({
      title: l({
        bn: `"${product.name}" পণ্যটি মুছে ফেলতে চান?`,
        en: `Delete "${product.name}"?`,
        obro: `Delete "${product.name}"?`,
      }),
      message: l({
        bn: `আপনি কি নিশ্চিত যে SKU ${product.sku} মুছে ফেলবেন? এটি অপরিবর্তনীয়।`,
        en: `Are you sure you want to delete SKU ${product.sku}? This action cannot be reversed.`,
        obro: `SKU ${product.sku} delete korte chan?`,
      }),
      confirmText: l({ bn: 'পণ্য মুছুন', en: 'Delete Product', obro: 'Delete Product' }),
      isDestructive: true,
      onConfirm: () => {
        const res = deleteProduct(product.id);
        if (res.success) {
          navigate('/products');
        }
      },
    });
  };

  const handlePrintLabel = (variant = null) => {
    setSelectedVariantForLabel(variant);
    setIsLabelModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Top back & actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <BackLink to="/products">
          {l({ bn: 'পণ্য তালিকায় ফিরে যান', en: 'Back to Products', obro: 'Back to Products' })}
        </BackLink>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Barcode & Thermal Sticker Print Button */}
          <Button
            variant="outline"
            size="sm"
            icon={Barcode}
            onClick={() => handlePrintLabel(null)}
            className="border-emerald-500 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
          >
            {l({ bn: 'প্রিন্ট বারকোড লেবেল', en: 'Print Barcode Label', obro: 'Print Barcode Label' })}
          </Button>

          <Link to={`/products/${product.id}/edit`}>
            <Button variant="outline" size="sm" icon={Edit2}>
              {l({ bn: 'পণ্য সম্পাদনা (Edit)', en: 'Edit Product', obro: 'Edit Product' })}
            </Button>
          </Link>
          <button
            onClick={handleDelete}
            className="p-2 text-slate-400 hover:text-red-600 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
            title="Delete product"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Main product header card */}
      <Card className="p-6">
        <div className="flex flex-col md:flex-row gap-6 items-start">
          <img
            src={product.imageUrl || 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=500&auto=format&fit=crop&q=60'}
            alt={product.name}
            className="w-full md:w-56 h-56 rounded-2xl object-cover border border-slate-200 dark:border-slate-700 shadow-sm shrink-0 bg-slate-100"
          />

          <div className="flex-1 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                SKU: {product.sku}
              </span>
              {product.brand && (
                <span className="font-bold text-xs px-2.5 py-1 rounded-lg bg-slate-900 text-white dark:bg-slate-700">
                  {product.brand}
                </span>
              )}
              {getConditionBadge(product.condition)}
              <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">
                {category?.name || 'Uncategorized'}
              </span>
              <StockBadge quantity={product.quantity} reorderLevel={product.reorderLevel} />
              {product.lotNumber && (
                <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                  Lot: #{product.lotNumber}
                </span>
              )}
            </div>

            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white" data-transliterate="true">
                {product.name}
              </h1>
              <p
                className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed"
                data-transliterate={product.description ? 'true' : undefined}
              >
                {product.description || 'No detailed description specified.'}
              </p>
            </div>

            {/* Financial & Stock Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-[11px] uppercase font-semibold text-slate-400">Selling Price</span>
                <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {formatCurrency(price, settings.currency)}
                </div>
              </div>
              <div>
                <span className="text-[11px] uppercase font-semibold text-slate-400">Cost Price</span>
                <div className="text-lg font-bold text-slate-700 dark:text-slate-300 mt-0.5">
                  {formatCurrency(cost, settings.currency)}
                </div>
              </div>
              <div>
                <span className="text-[11px] uppercase font-semibold text-slate-400">Gross Margin</span>
                <div className="text-lg font-bold text-slate-800 dark:text-slate-200 mt-0.5 flex items-center gap-1">
                  <span>{margin}%</span>
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                </div>
              </div>
              <div>
                <span className="text-[11px] uppercase font-semibold text-slate-400">Reorder Level</span>
                <div className="text-lg font-bold text-amber-500 mt-0.5">
                  {product.reorderLevel} units
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Warehouse Bin/Rack Location & Machinery Specs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Warehouse Location Card (Z-A-R-S-B) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-emerald-500" />
              <span>ওয়্যারহাউজ ও দোকান লোকেশন (Rack & Bin Tracking)</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 font-semibold">স্ট্যান্ডার্ড লোকেশন কোড:</span>
                <span className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-mono font-black text-sm tracking-wide">
                  {locationCode}
                </span>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 text-center text-xs">
                <div className="p-2 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Zone</span>
                  <strong className="text-slate-800 dark:text-slate-200">{loc.zone || 'Zone-A'}</strong>
                </div>
                <div className="p-2 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Aisle</span>
                  <strong className="text-slate-800 dark:text-slate-200">{loc.aisle || '01'}</strong>
                </div>
                <div className="p-2 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Rack</span>
                  <strong className="text-slate-800 dark:text-slate-200">{loc.rack || '01'}</strong>
                </div>
                <div className="p-2 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Shelf</span>
                  <strong className="text-slate-800 dark:text-slate-200">{loc.shelf || '1'}</strong>
                </div>
                <div className="p-2 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Bin</span>
                  <strong className="text-slate-800 dark:text-slate-200">{loc.bin || 'A'}</strong>
                </div>
              </div>
            </div>

            <div className="mt-3 text-xs text-slate-500 space-y-1">
              {product.oemPartNumber && (
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span>OEM Part Number:</span>
                  <strong className="font-mono text-slate-800 dark:text-slate-200">{product.oemPartNumber}</strong>
                </div>
              )}
              {product.impaCode && (
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span>Marine IMPA Code:</span>
                  <strong className="font-mono text-slate-800 dark:text-slate-200">{product.impaCode}</strong>
                </div>
              )}
              {product.dimensions && (
                <div className="flex justify-between py-1">
                  <span>ডাইমেনশন ও সাইজ:</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">{product.dimensions}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Compatibility & Alternative Spares */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GitFork className="h-4 w-4 text-purple-500" />
              <span>কম্প্যাটিবল মডেল ও বিকল্প পার্টস (Cross-References)</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Compatible Engine / Compressor Models */}
            <div>
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1.5">
                কম্প্রেসার / ইঞ্জিন মডেল কম্প্যাটিবিলিটি:
              </span>
              {Array.isArray(product.compatibleModels) && product.compatibleModels.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {product.compatibleModels.map((m, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono font-semibold text-slate-800 dark:text-slate-200"
                    >
                      {m}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400">কোনো নির্দিষ্ট মডেল ট্যাগ করা নেই।</p>
              )}
            </div>

            {/* Alternatives */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <span className="text-xs font-bold text-amber-700 dark:text-amber-400 block mb-1.5 flex items-center gap-1">
                <Wrench className="h-3.5 w-3.5" />
                <span>বিকল্প ইন্টারচেঞ্জেবল পার্টস (Alternative Compatible Spares):</span>
              </span>
              {Array.isArray(product.alternatives) && product.alternatives.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {product.alternatives.map((alt, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 text-xs font-semibold"
                    >
                      {alt}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400">কোনো বিকল্প পার্টস তালিকাভুক্ত নেই।</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Product Variants & Differential Pricing */}
      {Array.isArray(product.variants) && product.variants.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Boxes className="h-4 w-4 text-purple-600" />
                <span>ভ্যারিয়েন্ট ও ভিন্ন ভিন্ন দামের তালিকা (Product Variants & Differential Pricing)</span>
              </CardTitle>
              <p className="text-xs text-slate-400 mt-0.5">
                একই মালের একাধিক সাইজ (+0.25, STD, OEM, রিকন্ডিশন) ও আলাদা বিক্রয় মূল্য
              </p>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-y border-slate-200 dark:border-slate-800 text-slate-500 uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-4">ভ্যারিয়েন্ট নাম / সাইজ</th>
                    <th className="py-2.5 px-3">কন্ডিশন</th>
                    <th className="py-2.5 px-3">SKU কোড</th>
                    <th className="py-2.5 px-3">র‍্যাক লোকেশন</th>
                    <th className="py-2.5 px-3 text-right">কেনা দর</th>
                    <th className="py-2.5 px-3 text-right">বিক্রয় দর</th>
                    <th className="py-2.5 px-3 text-center">স্টক</th>
                    <th className="py-2.5 px-4 text-right">অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {product.variants.map((v, i) => (
                    <tr key={v.id || i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-100">
                        {v.name}
                      </td>
                      <td className="py-3 px-3">
                        {getConditionBadge(v.condition || product.condition)}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-500">
                        {v.sku || product.sku}
                      </td>
                      <td className="py-3 px-3 font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                        {v.location || locationCode}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-600 dark:text-slate-400">
                        {formatCurrency(v.costPrice, settings.currency)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(v.sellingPrice, settings.currency)}
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-bold">
                        <span className={v.quantity <= 3 ? 'text-red-500' : 'text-slate-800 dark:text-slate-200'}>
                          {v.quantity} pcs
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handlePrintLabel(v)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-700 dark:text-slate-300 hover:text-emerald-600 font-bold text-[11px] border border-slate-200 dark:border-slate-700 transition-colors"
                        >
                          <Barcode className="h-3.5 w-3.5" />
                          <span>লেবেল</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Supplier & Valuation row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Supplier Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-emerald-500" />
              <span>সাপ্লায়ার বা জাহাজ অকশন সূত্র</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {supplier ? (
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400">সাপ্লায়ার নাম:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{supplier.name}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400">প্রতিষ্ঠান:</span>
                  <span className="text-slate-700 dark:text-slate-300">{supplier.companyName}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400">ফোন:</span>
                  <span className="text-slate-700 dark:text-slate-300">{supplier.phone || '—'}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">ঠিকানা:</span>
                  <span className="text-slate-700 dark:text-slate-300">{supplier.address || '—'}</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400">No primary supplier assigned to this product.</p>
            )}
          </CardContent>
        </Card>

        {/* Inventory Value Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Boxes className="h-4 w-4 text-blue-500" />
              <span>স্টক ইনভেন্টরি মোট মূল্যায়ন</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">মোট মজুদ সংখ্যা:</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{qty} units</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">মোট ইনভেস্টমেন্ট মূল্য:</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  {formatCurrency(totalCostVal, settings.currency)}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">মোট সম্ভাব্য বিক্রয় মূল্য:</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(totalRetailVal, settings.currency)}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">প্রত্যাশিত মোট লাভ:</span>
                <span className="font-mono font-bold text-purple-600 dark:text-purple-400">
                  {formatCurrency(totalRetailVal - totalCostVal, settings.currency)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Movement Ledger */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-4 w-4 text-emerald-500" />
            <span>পার্টস স্টক মুভমেন্ট লেজার (Movement History)</span>
          </CardTitle>
          <p className="text-xs text-slate-400 mt-0.5">
            লট অকশন রিসিভ, সেলস ডেলিভারি ও স্টক পরিবর্তনের পূর্ণাঙ্গ হিসাব
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-y border-slate-200 dark:border-slate-800 text-slate-500 uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-4">তারিখ ও সময়</th>
                  <th className="py-2.5 px-3">ধরন</th>
                  <th className="py-2.5 px-3">রেফারেন্স / কারণ</th>
                  <th className="py-2.5 px-3 text-center">পরিবর্তন</th>
                  <th className="py-2.5 px-4 text-right">অবশিষ্ট স্টক</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {productMovements.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-6 text-center text-slate-400">
                      কোনো মুভমেন্ট ইতিহাস নেই।
                    </td>
                  </tr>
                ) : (
                  productMovements.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="py-2.5 px-4 text-slate-500">{formatDateTime(m.timestamp)}</td>
                      <td className="py-2.5 px-3 font-semibold capitalize text-slate-700 dark:text-slate-300">
                        {m.type?.replace('_', ' ')}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
                        <div>{m.reason}</div>
                        <span className="text-[10px] font-mono text-slate-400">{m.referenceId}</span>
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold">
                        <span className={m.quantityChange > 0 ? 'text-emerald-600' : 'text-red-600'}>
                          {m.quantityChange > 0 ? `+${m.quantityChange}` : m.quantityChange}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                        {m.balanceAfter}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Barcode & Thermal Sticker Print Modal */}
      <BarcodeLabelModal
        isOpen={isLabelModalOpen}
        onClose={() => setIsLabelModalOpen(false)}
        product={product}
        selectedVariant={selectedVariantForLabel}
      />
    </div>
  );
};
