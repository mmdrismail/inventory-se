import React, { useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAppData } from '../../context/AppDataContext';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { BackLink } from '../../components/common/BackLink';
import { formatCurrency } from '../../utils/formatters';
import { ArrowLeft, ShoppingBag, CheckCircle2, ShieldCheck, Truck, RefreshCw } from 'lucide-react';

export const StorefrontProductDetailPage = () => {
  const { id } = useParams();
  const { products, categories, addToCart, settings } = useAppData();
  const [quantity, setQuantity] = useState(1);
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const navigate = useNavigate();

  const product = products.find((p) => p.id === id);

  const galleryImages = useMemo(() => {
    if (!product) return [];
    const list = Array.isArray(product.images) ? product.images.filter((im) => im && im.url) : [];
    if (list.length > 0) return list;
    return product.imageUrl ? [{ url: product.imageUrl, thumbnailUrl: product.thumbnailUrl || product.imageUrl }] : [];
  }, [product]);

  const category = useMemo(() => {
    return categories.find((c) => c.id === product?.categoryId);
  }, [categories, product]);

  if (!product) {
    return (
      <div className="py-16 text-center space-y-4">
        <h2 className="text-xl font-bold">Product Not Found</h2>
        <Link to="/shop">
          <Button variant="primary">Return to Storefront</Button>
        </Link>
      </div>
    );
  }

  const available = Number(product.quantity) || 0;
  const isOutOfStock = available <= 0;

  const handleAddToCart = () => {
    const success = addToCart(product, quantity);
    if (success) {
      navigate('/cart');
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Back button */}
      <BackLink to="/shop">
        Back to Storefront Catalog
      </BackLink>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 items-start">
        {/* Product Image Gallery */}
        <div className="rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm p-4 space-y-3">
          <img
            src={(galleryImages[activeImageIdx] || galleryImages[0])?.url || product.imageUrl}
            alt={product.name}
            className="w-full h-96 object-cover rounded-2xl"
          />
          {galleryImages.length > 1 && (
            <div className="grid grid-cols-5 gap-2">
              {galleryImages.map((im, idx) => (
                <button
                  key={`${im.url.slice(0, 30)}-${idx}`}
                  type="button"
                  onClick={() => setActiveImageIdx(idx)}
                  className={`h-16 rounded-xl overflow-hidden border transition-all ${
                    idx === activeImageIdx
                      ? 'border-emerald-500 ring-2 ring-emerald-500/30'
                      : 'border-slate-200 dark:border-slate-700 opacity-75 hover:opacity-100'
                  }`}
                >
                  <img src={im.thumbnailUrl || im.url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Information */}
        <div className="space-y-6">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              {category?.name || 'Catalog Item'}
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mt-1">
              {product.name}
            </h1>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs font-mono text-slate-400">SKU: {product.sku}</span>
              <span className="text-slate-300">·</span>
              {isOutOfStock ? (
                <span className="text-xs font-bold text-red-500">Currently Out of Stock</span>
              ) : available <= 10 ? (
                <span className="text-xs font-bold text-amber-500">Only {available} units available</span>
              ) : (
                <span className="text-xs font-bold text-emerald-600">In Stock ({available} available)</span>
              )}
            </div>
          </div>

          {/* Pricing */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 flex items-baseline gap-3">
            <span className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
              {formatCurrency(product.sellingPrice, settings.currency)}
            </span>
            <span className="text-xs text-slate-400">Standard retail pricing (incl. demo VAT)</span>
          </div>

          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            {product.description || 'No detailed specifications recorded.'}
          </p>

          {/* Quantity and Add to Cart */}
          <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-4">
              <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 overflow-hidden">
                <button
                  type="button"
                  disabled={quantity <= 1 || isOutOfStock}
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="px-3.5 py-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40"
                >
                  -
                </button>
                <span className="w-12 text-center text-sm font-bold font-mono text-slate-800 dark:text-slate-200">
                  {quantity}
                </span>
                <button
                  type="button"
                  disabled={quantity >= available || isOutOfStock}
                  onClick={() => setQuantity((q) => Math.min(available, q + 1))}
                  className="px-3.5 py-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40"
                >
                  +
                </button>
              </div>

              <Button
                variant="primary"
                size="lg"
                disabled={isOutOfStock}
                icon={ShoppingBag}
                className="flex-1"
                onClick={handleAddToCart}
              >
                {isOutOfStock ? 'Sold Out' : 'Add to Cart & Checkout'}
              </Button>
            </div>

            {/* Value propositions */}
            <div className="grid grid-cols-2 gap-3 pt-4 text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-emerald-500 shrink-0" />
                <span>Simulated Fast Courier Dispatch</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
                <span>Verified StockLine Quality Guarantee</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
