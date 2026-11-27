import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAppData } from '../../context/AppDataContext';
import { useLanguage } from '../../context/LanguageContext';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { EmptyState } from '../../components/common/EmptyState';
import { formatCurrency } from '../../utils/formatters';
import { Search, ShoppingBag, Eye, CheckCircle2, AlertTriangle, XCircle, ArrowUpDown } from 'lucide-react';

export const ShopPage = () => {
  const { products, categories, flatCategories, categoryById, categoryDescendantMap, addToCart, settings } = useAppData();
  const { l } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [sortBy, setSortBy] = useState('featured'); // 'featured', 'price_asc', 'price_desc', 'name'

  const catMap = useMemo(() => {
    const map = {};
    (categories || []).forEach((c) => {
      const node = categoryById?.get(String(c.id || c._id));
      map[c.id || c._id] = node?.path || c.path || c.name;
    });
    return map;
  }, [categories, categoryById]);

  const orderedCategories = useMemo(
    () => (flatCategories && flatCategories.length > 0 ? flatCategories : categories),
    [flatCategories, categories]
  );

  // Only public products
  const publicProducts = useMemo(() => {
    return products.filter((p) => p.isPublic !== false);
  }, [products]);

  const filteredProducts = useMemo(() => {
    const catFilterSet = selectedCategory
      ? categoryDescendantMap?.[String(selectedCategory)] || new Set([String(selectedCategory)])
      : null;
    return publicProducts
      .filter((p) => {
        const q = searchTerm.toLowerCase();
        const matchesSearch =
          !searchTerm || p.name.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q);
        const matchesCategory = !catFilterSet || (p.categoryId && catFilterSet.has(String(p.categoryId)));
        return matchesSearch && matchesCategory;
      })
      .sort((a, b) => {
        if (sortBy === 'price_asc') return a.sellingPrice - b.sellingPrice;
        if (sortBy === 'price_desc') return b.sellingPrice - a.sellingPrice;
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        return 0; // featured / default
      });
  }, [publicProducts, searchTerm, selectedCategory, categoryDescendantMap, sortBy]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Banner */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-3xl p-8 sm:p-12 relative overflow-hidden shadow-lg shadow-emerald-700/10">
        <div className="max-w-2xl space-y-3 relative z-10">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-200">
            StockLine Storefront Catalog
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Premium Hardware, Electronics & Office Supplies
          </h1>
          <p className="text-sm text-emerald-100 leading-relaxed">
            Browse our live inventory catalog. Quantities reflect active warehouse stock in real time.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <div className="relative sm:col-span-2">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search catalog products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="">All Categories ({orderedCategories.length})</option>
              {orderedCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.indentLabel || c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="featured">Sort: Featured</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="name">Product Name (A-Z)</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Product Cards Grid */}
      {filteredProducts.length === 0 ? (
        <EmptyState
          title="No products available"
          description="Try choosing a different department or clear your search term."
          actionText="Clear Filter"
          onAction={() => {
            setSearchTerm('');
            setSelectedCategory('');
          }}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredProducts.map((p) => {
            const qty = Number(p.quantity) || 0;
            const isOutOfStock = qty <= 0;

            return (
              <Card
                key={p.id}
                id={`shop-item-${p.id}`}
                data-item-id={p.id}
                data-scroll-anchor={p.id}
                className="overflow-hidden flex flex-col justify-between group hover:shadow-xl transition-all duration-300"
              >
                <div>
                  {/* Image container */}
                  <div className="relative h-48 bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <img
                      src={p.thumbnailUrl || p.imageUrl}
                      alt={p.name}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-2.5 left-2.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-white/90 dark:bg-slate-900/90 text-slate-700 dark:text-slate-300 backdrop-blur-sm shadow-sm">
                        {catMap[p.categoryId] || 'Catalog'}
                      </span>
                    </div>

                    <div className="absolute top-2.5 right-2.5">
                      {isOutOfStock ? (
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-red-500 text-white shadow-sm">
                          Out of Stock
                        </span>
                      ) : qty <= 10 ? (
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-amber-500 text-white shadow-sm" data-no-translate="true">
                          {l({ bn: `মাত্র ${qty}টি বাকি`, en: `Only ${qty} left`, obro: `Matro ${qty}-ti baki` })}
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-emerald-600 text-white shadow-sm">
                          In Stock
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="p-4 space-y-2">
                    <Link
                      to={`/shop/products/${p.id}`}
                      data-transliterate="true"
                      className="font-bold text-sm text-slate-900 dark:text-slate-100 hover:text-emerald-600 dark:hover:text-emerald-400 line-clamp-1"
                    >
                      {p.name}
                    </Link>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {p.description}
                    </p>
                  </div>
                </div>

                {/* Card Footer: Price & Actions */}
                <div className="p-4 pt-0 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between mt-3">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Price</span>
                    <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                      {formatCurrency(p.sellingPrice, settings.currency)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Link to={`/shop/products/${p.id}`}>
                      <Button variant="outline" size="sm" className="px-2.5">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={isOutOfStock}
                      icon={ShoppingBag}
                      onClick={() => addToCart(p, 1)}
                    >
                      {isOutOfStock ? 'Sold Out' : 'Add'}
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
