import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAppData } from '../../context/AppDataContext';
import { useLanguage } from '../../context/LanguageContext';
import { CopyBadge } from '../../components/common/CopyBadge';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { StockBadge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Input, Select, Textarea } from '../../components/forms/FormControls';
import { EmptyState, Pagination } from '../../components/common/EmptyState';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { exportToCSV } from '../../utils/csv';
import {
  Boxes,
  Search,
  Filter,
  SlidersHorizontal,
  Download,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  History,
  ArrowUpDown,
  RefreshCw,
} from 'lucide-react';

export const InventoryPage = () => {
  const { products, categories, inventoryMovements, adjustStock, reloadState, settings } = useAppData();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('inventory'); // 'inventory' or 'movements'
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [sortField, setSortField] = useState('quantity');
  const [sortDirection, setSortDirection] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // Stock Adjustment Modal state
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustFormData, setAdjustFormData] = useState({
    productId: products[0]?.id || '',
    type: 'add', // 'add', 'reduce', 'correction'
    quantity: '5',
    reason: 'Stock count intake verification',
    notes: '',
  });
  const [adjustError, setAdjustError] = useState('');

  // Category map
  const catMap = useMemo(() => {
    const map = {};
    categories.forEach((c) => (map[c.id] = c.name));
    return map;
  }, [categories]);

  // Movements product map (find last movement per product)
  const lastMovementMap = useMemo(() => {
    const map = {};
    (inventoryMovements || []).forEach((m) => {
      if (!map[m.productId]) {
        map[m.productId] = m.timestamp;
      }
    });
    return map;
  }, [inventoryMovements]);

  // Filtered & sorted products
  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        const q = searchTerm.toLowerCase();
        const matchesSearch =
          !searchTerm || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);

        const matchesCat = !selectedCategory || p.categoryId === selectedCategory;

        let matchesStatus = true;
        const qty = Number(p.quantity) || 0;
        const reorder = Number(p.reorderLevel) || 10;
        if (statusFilter === 'out_of_stock') matchesStatus = qty === 0;
        if (statusFilter === 'low_stock') matchesStatus = qty > 0 && qty <= reorder;
        if (statusFilter === 'in_stock') matchesStatus = qty > reorder;

        return matchesSearch && matchesCat && matchesStatus;
      })
      .sort((a, b) => {
        let valA = a[sortField];
        let valB = b[sortField];

        if (typeof valA === 'string') {
          valA = valA.toLowerCase();
          valB = valB ? valB.toLowerCase() : '';
        }

        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
  }, [products, searchTerm, selectedCategory, statusFilter, sortField, sortDirection]);

  // Paginated inventory items
  const paginatedInventory = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredProducts.slice(start, start + pageSize);
  }, [filteredProducts, currentPage]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleOpenAdjust = (prod = null) => {
    setAdjustFormData({
      productId: prod?.id || products[0]?.id || '',
      type: 'add',
      quantity: '5',
      reason: 'Physical shelf count adjustment',
      notes: '',
    });
    setAdjustError('');
    setIsAdjustModalOpen(true);
  };

  const handleProcessAdjust = (e) => {
    e.preventDefault();
    setAdjustError('');

    const res = adjustStock({
      productId: adjustFormData.productId,
      type: adjustFormData.type,
      quantity: Number(adjustFormData.quantity),
      reason: `${adjustFormData.reason}${adjustFormData.notes ? ` (${adjustFormData.notes})` : ''}`,
      performedBy: 'Operations Manager',
    });

    if (res.success) {
      setIsAdjustModalOpen(false);
    } else {
      setAdjustError(res.message);
    }
  };

  const handleExportCSV = () => {
    const dataToExport = filteredProducts.map((p) => ({
      'Product Name': p.name,
      'SKU': p.sku,
      'Category': catMap[p.categoryId] || 'Uncategorized',
      'Available Quantity': p.quantity,
      'Reorder Threshold': p.reorderLevel,
      'Stock Status': Number(p.quantity) <= 0 ? 'Out of Stock' : (Number(p.quantity) <= Number(p.reorderLevel) ? 'Low Stock' : 'In Stock'),
      'Unit Cost': p.costPrice,
      'Total Cost Valuation': (Number(p.quantity) || 0) * (Number(p.costPrice) || 0),
      'Last Movement Date': lastMovementMap[p.id] || '—',
    }));
    exportToCSV(dataToExport, `stockline_inventory_${new Date().toISOString().split('T')[0]}.csv`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {t('inventory_title', 'Inventory & Stock Control')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t('inventory_subtitle', 'Real-time on-hand stock quantities, reorder thresholds, and complete audit movement history.')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" icon={RefreshCw} onClick={reloadState}>
            {t('btn_refresh', 'Refresh')}
          </Button>
          <Button variant="outline" size="sm" icon={Download} onClick={handleExportCSV}>
            {t('btn_export_csv', 'Export CSV')}
          </Button>
          <Button variant="primary" size="sm" icon={SlidersHorizontal} onClick={() => handleOpenAdjust()}>
            {t('btn_stock_adjustment', 'Stock Adjustment')}
          </Button>
        </div>
      </div>

      {/* Tabs: Live Inventory vs Movement Audit Trail */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('inventory')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${
            activeTab === 'inventory'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Boxes className="h-4 w-4" />
          <span>{t('tab_current_stock', 'Current Stock Levels')} ({products.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('movements')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${
            activeTab === 'movements'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <History className="h-4 w-4" />
          <span>{t('tab_movement_ledger', 'Movement Audit Ledger')} ({inventoryMovements.length})</span>
        </button>
      </div>

      {activeTab === 'inventory' ? (
        <>
          {/* Filters Bar */}
          <Card className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              <div className="relative sm:col-span-2">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search inventory by product name or SKU..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div>
                <select
                  value={selectedCategory}
                  onChange={(e) => {
                    setSelectedCategory(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="">All Categories</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="">All Stock Statuses</option>
                  <option value="in_stock">In Stock (&gt; reorder point)</option>
                  <option value="low_stock">Low Stock (≤ reorder point)</option>
                  <option value="out_of_stock">Out of Stock (0 units)</option>
                </select>
              </div>
            </div>
          </Card>

          {/* Inventory Table */}
          <Card className="overflow-hidden">
            {filteredProducts.length === 0 ? (
              <EmptyState
                title="No inventory items found"
                description="Try adjusting your filter options or add a new product."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase text-[10px] tracking-wider select-none">
                    <tr>
                      <th className="py-3 px-4">{t('col_product', 'Product / SKU')}</th>
                      <th className="py-3 px-3">{t('col_category', 'Category')}</th>
                      <th
                        className="py-3 px-3 text-center cursor-pointer hover:text-slate-800 dark:hover:text-slate-200"
                        onClick={() => handleSort('quantity')}
                      >
                        <div className="flex items-center justify-center gap-1">
                          <span>{t('col_stock_level', 'Available Qty')}</span>
                          <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </th>
                      <th className="py-3 px-3 text-center">{t('col_reorder_point', 'Safety Level')}</th>
                      <th className="py-3 px-3 text-center">{t('col_status_label', 'Stock Status')}</th>
                      <th
                        className="py-3 px-3 text-right cursor-pointer hover:text-slate-800 dark:hover:text-slate-200"
                        onClick={() => handleSort('costPrice')}
                      >
                        <div className="flex items-center justify-end gap-1">
                          <span>{t('col_valuation', 'Inventory Value')}</span>
                          <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </th>
                      <th className="py-3 px-3">{t('col_last_movement', 'Last Movement')}</th>
                      <th className="py-3 px-4 text-right">{t('col_actions_label', 'Adjust')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {paginatedInventory.map((p) => {
                      const qty = Number(p.quantity) || 0;
                      const costVal = qty * (Number(p.costPrice) || 0);
                      const lastMove = lastMovementMap[p.id];

                      return (
                        <tr key={p.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <img
                                src={p.imageUrl}
                                alt=""
                                className="h-8 w-8 rounded-lg object-cover shrink-0 border border-slate-200 dark:border-slate-700"
                              />
                              <div>
                                <Link
                                  to={`/products/${p.id}`}
                                  className="font-semibold text-slate-900 dark:text-slate-100 hover:text-emerald-600 truncate block max-w-xs"
                                >
                                  {p.name}
                                </Link>
                                <div className="mt-0.5">
                                  <CopyBadge text={p.sku} label="SKU" />
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-3 text-slate-600 dark:text-slate-400">
                            {catMap[p.categoryId] || 'Uncategorized'}
                          </td>

                          <td className="py-3 px-3 text-center font-mono font-bold text-sm text-slate-800 dark:text-slate-100">
                            {qty}
                          </td>

                          <td className="py-3 px-3 text-center font-mono text-slate-500">
                            {p.reorderLevel}
                          </td>

                          <td className="py-3 px-3 text-center">
                            <StockBadge quantity={p.quantity} reorderLevel={p.reorderLevel} showIcon={false} />
                          </td>

                          <td className="py-3 px-3 text-right font-mono font-semibold text-slate-800 dark:text-slate-200">
                            {formatCurrency(costVal, settings.currency)}
                          </td>

                          <td className="py-3 px-3 text-slate-500 dark:text-slate-400 text-[11px]">
                            {lastMove ? formatDateTime(lastMove) : 'Initial setup'}
                          </td>

                          <td className="py-3 px-4 text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-[11px] py-1 px-2.5"
                              icon={SlidersHorizontal}
                              onClick={() => handleOpenAdjust(p)}
                            >
                              Adjust
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <Pagination
              currentPage={currentPage}
              totalItems={filteredProducts.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
            />
          </Card>
        </>
      ) : (
        /* AUDIT MOVEMENT LEDGER TAB */
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-3">Product Name / SKU</th>
                  <th className="py-3 px-3">Movement Type</th>
                  <th className="py-3 px-3">Reference / Reason</th>
                  <th className="py-3 px-3 text-center">Quantity Delta</th>
                  <th className="py-3 px-3 text-right">Balance After</th>
                  <th className="py-3 px-4 text-right">Performed By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {inventoryMovements.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-8 text-center text-slate-400">
                      No stock movement audit events recorded yet.
                    </td>
                  </tr>
                ) : (
                  inventoryMovements.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="py-2.5 px-4 text-slate-500 whitespace-nowrap">
                        {formatDateTime(m.timestamp)}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[200px]">
                          {m.productName}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">{m.sku}</div>
                      </td>
                      <td className="py-2.5 px-3 font-semibold capitalize text-slate-700 dark:text-slate-300">
                        {m.type.replace(/_/g, ' ')}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
                        <div>{m.reason}</div>
                        <span className="text-[10px] font-mono text-slate-400">{m.referenceId}</span>
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold">
                        <span
                          className={`inline-flex items-center gap-0.5 ${
                            m.quantityChange > 0
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-red-600 dark:text-red-400'
                          }`}
                        >
                          {m.quantityChange > 0 ? (
                            <>
                              <TrendingUp className="h-3 w-3" />
                              +{m.quantityChange}
                            </>
                          ) : (
                            <>
                              <TrendingDown className="h-3 w-3" />
                              {m.quantityChange}
                            </>
                          )}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                        {m.balanceAfter}
                      </td>
                      <td className="py-2.5 px-4 text-right text-slate-500 text-[11px]">
                        {m.performedBy}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* STOCK ADJUSTMENT MODAL */}
      <Modal
        isOpen={isAdjustModalOpen}
        onClose={() => setIsAdjustModalOpen(false)}
        title="Manual Stock Adjustment"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleProcessAdjust} className="space-y-4">
          {adjustError && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-600 dark:text-red-400 font-semibold">
              {adjustError}
            </div>
          )}

          <Select
            label="Product to Adjust"
            value={adjustFormData.productId}
            onChange={(e) => setAdjustFormData({ ...adjustFormData, productId: e.target.value })}
            required
            options={products.map((p) => ({
              value: p.id,
              label: `${p.name} (${p.sku}) · Current: ${p.quantity}`,
            }))}
          />

          <Select
            label="Adjustment Type"
            value={adjustFormData.type}
            onChange={(e) => setAdjustFormData({ ...adjustFormData, type: e.target.value })}
            options={[
              { value: 'add', label: 'Add Stock (+ Increase On-Hand)' },
              { value: 'reduce', label: 'Reduce Stock (- Damage / Write-off)' },
              { value: 'correction', label: 'Set Explicit Quantity (Reconciliation Count)' },
            ]}
          />

          <Input
            label={adjustFormData.type === 'correction' ? 'Target Stock Count' : 'Quantity Delta'}
            type="number"
            min="0"
            value={adjustFormData.quantity}
            onChange={(e) => setAdjustFormData({ ...adjustFormData, quantity: e.target.value })}
            required
          />

          <Input
            label="Reason for Adjustment"
            value={adjustFormData.reason}
            onChange={(e) => setAdjustFormData({ ...adjustFormData, reason: e.target.value })}
            placeholder="e.g. Broken packaging, physical audit recount"
            required
          />

          <Textarea
            label="Additional Notes"
            rows={2}
            value={adjustFormData.notes}
            onChange={(e) => setAdjustFormData({ ...adjustFormData, notes: e.target.value })}
            placeholder="Authorized by warehouse manager, shelf location..."
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button variant="secondary" onClick={() => setIsAdjustModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Record Adjustment
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
