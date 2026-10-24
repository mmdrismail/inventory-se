import React, { useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAppData } from '../../context/AppDataContext';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { StockBadge } from '../../components/common/Badge';
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
} from 'lucide-react';

export const ProductDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { products, categories, suppliers, inventoryMovements, deleteProduct, confirmAction, settings } = useAppData();

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
        <h2 className="text-xl font-bold">Product Not Found</h2>
        <p className="text-sm text-slate-500">The requested product could not be located.</p>
        <Link to="/products">
          <Button variant="primary">Return to Catalog</Button>
        </Link>
      </div>
    );
  }

  const cost = Number(product.costPrice) || 0;
  const price = Number(product.sellingPrice) || 0;
  const qty = Number(product.quantity) || 0;
  const margin = price > 0 ? (((price - cost) / price) * 100).toFixed(1) : 0;
  const totalCostVal = cost * qty;
  const totalRetailVal = price * qty;

  const handleDelete = () => {
    confirmAction({
      title: `Delete "${product.name}"?`,
      message: `Are you sure you want to delete SKU ${product.sku}? This action cannot be reversed.`,
      confirmText: 'Delete Product',
      isDestructive: true,
      onConfirm: () => {
        const res = deleteProduct(product.id);
        if (res.success) {
          navigate('/products');
        }
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Top back & actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          to="/products"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Products</span>
        </Link>

        <div className="flex items-center gap-2">
          <Link to={`/products/${product.id}/edit`}>
            <Button variant="outline" size="sm" icon={Edit2}>
              Edit Product
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
            src={product.imageUrl}
            alt={product.name}
            className="w-full md:w-56 h-56 rounded-2xl object-cover border border-slate-200 dark:border-slate-700 shadow-sm shrink-0"
          />

          <div className="flex-1 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                {product.sku}
              </span>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">
                {category?.name || 'Uncategorized'}
              </span>
              <StockBadge quantity={product.quantity} reorderLevel={product.reorderLevel} />
              {product.isPublic && (
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
                  Public Storefront
                </span>
              )}
            </div>

            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                {product.name}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
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

      {/* Supplier & Valuation row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Supplier Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-emerald-500" />
              <span>Assigned Supplier</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {supplier ? (
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400">Supplier Name:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{supplier.name}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400">Company:</span>
                  <span className="text-slate-700 dark:text-slate-300">{supplier.companyName}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400">Contact Email:</span>
                  <span className="text-slate-700 dark:text-slate-300">{supplier.email || '—'}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Phone:</span>
                  <span className="text-slate-700 dark:text-slate-300">{supplier.phone || '—'}</span>
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
              <span>Inventory Valuation</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">Current On Hand:</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{qty} units</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">Total Cost Valuation:</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  {formatCurrency(totalCostVal, settings.currency)}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">Total Retail Potential:</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(totalRetailVal, settings.currency)}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Potential Gross Profit:</span>
                <span className="font-mono font-bold text-purple-600 dark:text-purple-400">
                  {formatCurrency(totalRetailVal - totalCostVal, settings.currency)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Product-Specific Movement History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-4 w-4 text-emerald-500" />
            <span>Product Inventory Movement Ledger</span>
          </CardTitle>
          <p className="text-xs text-slate-400 mt-0.5">
            Historical audit log of all intakes, sales, and corrections for SKU {product.sku}
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-y border-slate-200 dark:border-slate-800 text-slate-500 uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-4">Date / Time</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Reference / Reason</th>
                  <th className="py-2.5 px-3 text-center">Change</th>
                  <th className="py-2.5 px-4 text-right">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {productMovements.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-6 text-center text-slate-400">
                      No stock movement history recorded for this product yet.
                    </td>
                  </tr>
                ) : (
                  productMovements.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="py-2.5 px-4 text-slate-500">{formatDateTime(m.timestamp)}</td>
                      <td className="py-2.5 px-3 font-semibold capitalize text-slate-700 dark:text-slate-300">
                        {m.type.replace('_', ' ')}
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
    </div>
  );
};
