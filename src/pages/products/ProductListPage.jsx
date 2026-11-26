import React, { useState, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppData } from '../../context/AppDataContext';
import { useLanguage } from '../../context/LanguageContext';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { StockBadge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { EmptyState, Pagination } from '../../components/common/EmptyState';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { exportToCSV, parseCSV } from '../../utils/csv';
import {
  buildUnifiedPartsIndex,
  searchUnifiedParts,
  matchesMultiTokens,
  formatMachineSummary,
} from '../../utils/partPriceSearch';
import {
  Plus,
  Download,
  Upload,
  RefreshCw,
  Search,
  Filter,
  Eye,
  Edit2,
  Trash2,
  Package,
  ArrowUpDown,
  FileSpreadsheet,
  Barcode,
  MapPin,
  Cpu,
  History,
  PackagePlus,
  Receipt,
} from 'lucide-react';
import { BarcodeLabelModal } from '../../components/products/BarcodeLabelModal';

export const ProductListPage = () => {
  const {
    products,
    categories,
    priceCatalog,
    quotations,
    sales,
    deleteProduct,
    importProductsCSV,
    promotePriceEntryToProduct,
    reloadState,
    confirmAction,
    settings,
  } = useAppData();
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [sortField, setSortField] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [labelModalProduct, setLabelModalProduct] = useState(null);
  const pageSize = 8;

  // CSV Import Modal state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [importErrors, setImportErrors] = useState([]);
  const fileInputRef = useRef(null);

  const navigate = useNavigate();

  // Category lookup map
  const catMap = useMemo(() => {
    const map = {};
    categories.forEach((c) => (map[c.id] = c.name));
    return map;
  }, [categories]);

  // Filtering & Sorting (multi-keyword across product specs & compatible models)
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch = matchesMultiTokens(searchTerm, [
        p.name,
        p.sku,
        p.barcode,
        p.brand,
        p.modelNumber,
        p.dimensions,
        p.description,
        p.oemPartNumber,
        p.impaCode,
        p.compatibleModels,
      ]);

      // Category filter
      const matchesCategory = !selectedCategory || p.categoryId === selectedCategory;

      // Stock status filter
      let matchesStatus = true;
      const qty = Number(p.quantity) || 0;
      const reorder = Number(p.reorderLevel) || 10;
      if (selectedStatus === 'in_stock') matchesStatus = qty > reorder;
      if (selectedStatus === 'low_stock') matchesStatus = qty > 0 && qty <= reorder;
      if (selectedStatus === 'out_of_stock') matchesStatus = qty === 0;

      return matchesSearch && matchesCategory && matchesStatus;
    }).sort((a, b) => {
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
  }, [products, searchTerm, selectedCategory, selectedStatus, sortField, sortDirection]);

  // Unified Historical Machine/Parts matches from Quotations & Sales (shown when searching)
  const unifiedIndex = useMemo(
    () => buildUnifiedPartsIndex({ products, priceCatalog, quotations, sales }),
    [products, priceCatalog, quotations, sales]
  );

  const historyPriceMatches = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const { matchedPriceEntries } = searchUnifiedParts(searchTerm, unifiedIndex, { maxResults: 12 });
    return matchedPriceEntries;
  }, [searchTerm, unifiedIndex]);

  // Pagination
  const paginatedProducts = useMemo(() => {
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

  const handleDelete = (product) => {
    confirmAction({
      title: `Delete "${product.name}"?`,
      message: `Are you sure you want to delete SKU ${product.sku}? This action cannot be reversed.`,
      confirmText: 'Delete Product',
      isDestructive: true,
      onConfirm: () => {
        deleteProduct(product.id);
      },
    });
  };

  // CSV Export
  const handleExportCSV = () => {
    const dataToExport = filteredProducts.map((p) => ({
      'Product ID': p.id,
      'Product Name': p.name,
      'SKU': p.sku,
      'Category': catMap[p.categoryId] || 'Uncategorized',
      'Cost Price': p.costPrice,
      'Selling Price': p.sellingPrice,
      'Quantity': p.quantity,
      'Reorder Level': p.reorderLevel,
      'Created Date': p.createdAt,
    }));
    exportToCSV(dataToExport, `stockline_products_${new Date().toISOString().split('T')[0]}.csv`);
  };

  // CSV File reading
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setCsvText(event.target.result);
      };
      reader.readAsText(file);
    }
  };

  const handleProcessImport = () => {
    if (!csvText.trim()) {
      setImportErrors(['Please select or paste CSV data first.']);
      return;
    }
    const parsed = parseCSV(csvText);
    if (!parsed || parsed.length === 0) {
      setImportErrors(['No valid data rows found in CSV.']);
      return;
    }
    const res = importProductsCSV(parsed, 'Admin');
    if (res.success && res.errors.length === 0) {
      setIsImportModalOpen(false);
      setCsvText('');
      setImportErrors([]);
    } else {
      setImportErrors(res.errors || []);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {t('products_title', 'Products Catalog')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t('products_subtitle', 'Manage your inventory items, pricing margins, SKUs, and reorder levels.')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link to="/price-list">
            <Button variant="secondary" size="sm" icon={Cpu}>
              মেশিন ও প্রাইস লিস্ট
            </Button>
          </Link>
          <Button variant="outline" size="sm" icon={RefreshCw} onClick={reloadState}>
            {t('btn_refresh', 'Refresh')}
          </Button>
          <Button variant="outline" size="sm" icon={Download} onClick={handleExportCSV}>
            {t('btn_export_csv', 'Export CSV')}
          </Button>
          <Button variant="outline" size="sm" icon={Upload} onClick={() => setIsImportModalOpen(true)}>
            {t('btn_import_csv', 'Import CSV')}
          </Button>
          <Link to="/products/new">
            <Button variant="primary" size="sm" icon={Plus}>
              {t('btn_add_product', 'Add Product')}
            </Button>
          </Link>
        </div>
      </div>

      {/* Filter and Search controls */}
      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search box */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder={t('search_products_placeholder', 'Search by product name, model, barcode or SKU...')}
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="">{t('all_categories', 'All Categories')} ({categories.length})</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Stock Status Filter */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="">{t('all_stock_statuses', 'All Stock Statuses')}</option>
              <option value="in_stock">{t('filter_in_stock', 'In Stock (> reorder point)')}</option>
              <option value="low_stock">{t('filter_low_stock', 'Low Stock (≤ reorder point)')}</option>
              <option value="out_of_stock">{t('filter_out_of_stock', 'Out of Stock (0 units)')}</option>
            </select>
          </div>

          {/* Clear Filters */}
          <div className="flex items-center gap-2">
            {(searchTerm || selectedCategory || selectedStatus) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchTerm('');
                  setSelectedCategory('');
                  setSelectedStatus('');
                  setCurrentPage(1);
                }}
                className="text-xs"
              >
                {t('btn_reset_filters', 'Reset Filters')}
              </Button>
            )}
            <span className="text-xs text-slate-400 ml-auto font-medium">
              {filteredProducts.length} items
            </span>
          </div>
        </div>
      </Card>

      {/* Products Table Card */}
      <Card className="overflow-hidden">
        {filteredProducts.length === 0 ? (
          <EmptyState
            title={t('no_products_found', 'No products found')}
            description="No items match your search and filter criteria. You can create a new product or reset your search."
            actionText={t('btn_add_product', 'Add New Product')}
            onAction={() => navigate('/products/new')}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase text-[10px] tracking-wider select-none">
                <tr>
                  <th className="py-3 px-4">{t('col_product_details', 'Product Details')}</th>
                  <th
                    className="py-3 px-3 cursor-pointer hover:text-slate-800 dark:hover:text-slate-200"
                    onClick={() => handleSort('sku')}
                  >
                    <div className="flex items-center gap-1">
                      <span>{t('col_sku', 'SKU')}</span>
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </th>
                  <th className="py-3 px-3">{t('col_category', 'Category')}</th>
                  <th
                    className="py-3 px-3 text-right cursor-pointer hover:text-slate-800 dark:hover:text-slate-200"
                    onClick={() => handleSort('sellingPrice')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>{t('col_selling_price', 'Sell Price')}</span>
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </th>
                  <th className="py-3 px-3 text-right">{t('col_cost_price', 'Cost Price')}</th>
                  <th
                    className="py-3 px-3 text-center cursor-pointer hover:text-slate-800 dark:hover:text-slate-200"
                    onClick={() => handleSort('quantity')}
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>{t('col_on_hand', 'On Hand')}</span>
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </th>
                  <th className="py-3 px-3 text-center">{t('col_status_label', 'Status')}</th>
                  <th className="py-3 px-4 text-right">{t('col_actions_label', 'Actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {paginatedProducts.map((p) => (
                  <tr
                    key={p.id}
                    id={`product-item-${p.id}`}
                    data-item-id={p.id}
                    data-scroll-anchor={p.id}
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    {/* Image & Name */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={p.imageUrl}
                          alt=""
                          className="h-10 w-10 rounded-xl object-cover shrink-0 border border-slate-200 dark:border-slate-700 shadow-sm"
                        />
                        <div className="min-w-0">
                          <Link
                            to={`/products/${p.id}`}
                            data-transliterate="true"
                            className="font-semibold text-slate-900 dark:text-slate-100 hover:text-emerald-600 dark:hover:text-emerald-400 truncate block max-w-xs"
                          >
                            {p.name}
                          </Link>
                          <span className="text-[10px] text-slate-400 line-clamp-1" data-transliterate="true">
                            {p.description}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* SKU & Rack Location */}
                    <td className="py-3 px-3">
                      <div className="font-mono font-bold text-slate-700 dark:text-slate-300">
                        {p.sku}
                      </div>
                      {p.warehouseLocation?.code && (
                        <span className="inline-flex items-center gap-0.5 text-[9.5px] font-mono font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.2 rounded mt-0.5">
                          <MapPin className="h-2.5 w-2.5" />
                          <span>{p.warehouseLocation.code}</span>
                        </span>
                      )}
                    </td>

                    {/* Category */}
                    <td className="py-3 px-3 text-slate-600 dark:text-slate-400">
                      {catMap[p.categoryId] || 'Uncategorized'}
                    </td>

                    {/* Selling Price */}
                    <td className="py-3 px-3 text-right font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(p.sellingPrice, settings.currency)}
                    </td>

                    {/* Cost Price */}
                    <td className="py-3 px-3 text-right font-mono text-slate-500">
                      {formatCurrency(p.costPrice, settings.currency)}
                    </td>

                    {/* Quantity */}
                    <td className="py-3 px-3 text-center font-mono font-bold text-slate-800 dark:text-slate-200">
                      {p.quantity}
                    </td>

                    {/* Stock Status Badge */}
                    <td className="py-3 px-3 text-center">
                      <StockBadge quantity={p.quantity} reorderLevel={p.reorderLevel} showIcon={false} />
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setLabelModalProduct(p)}
                          title="বারকোড ও র‍্যাক লেবেল প্রিন্ট করুন"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
                        >
                          <Barcode className="h-4 w-4" />
                        </button>
                        <Link to={`/products/${p.id}`} title="View Product Details">
                          <button className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                            <Eye className="h-4 w-4" />
                          </button>
                        </Link>
                        <Link to={`/products/${p.id}/edit`} title="Edit Product">
                          <button className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors">
                            <Edit2 className="h-4 w-4" />
                          </button>
                        </Link>
                        <button
                          onClick={() => handleDelete(p)}
                          title="Delete Product"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
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

      {/* Historical Quotes & Sales Price List Matches (when searching by Machine + Part name) */}
      {searchTerm.trim() && historyPriceMatches.length > 0 && (
        <Card className="p-4 border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/30 dark:bg-indigo-950/15 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                কোটেশন ও বিক্রয় প্রাইস লিস্ট থেকে পাওয়া দাম ({historyPriceMatches.length})
              </h3>
              <span className="text-[11px] text-slate-500">
                (স্টক এন্ট্রি না থাকলেও আগের কোটেশন/মেমো থেকে দাম ও স্পেক দেখানো হচ্ছে)
              </span>
            </div>
            <Link
              to="/price-list"
              className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1"
            >
              <span>সব প্রাইস লিস্ট দেখুন</span>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {historyPriceMatches.map((row) => {
              const mSummary = formatMachineSummary(row);
              return (
                <div
                  key={row.uid}
                  className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-xs text-slate-900 dark:text-slate-100" data-transliterate="true">
                        {row.partName}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800">
                        {row.unit}
                      </span>
                      {!row.inStockDb && (
                        <span className="text-[9.5px] font-bold px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 border border-amber-200">
                          স্টকে নেই
                        </span>
                      )}
                    </div>
                    {mSummary && (
                      <div className="text-[11px] text-indigo-700 dark:text-indigo-300 font-semibold truncate" data-transliterate="true">
                        {mSummary}
                      </div>
                    )}
                    <div className="text-[10px] text-slate-500">
                      {row.lastDocNumber ? `${row.lastDocNumber} · ` : ''}
                      {row.lastCustomerName && (
                        <>
                          <span data-transliterate="true">{row.lastCustomerName}</span>
                          {' · '}
                        </>
                      )}
                      {row.lastDocDate ? formatDate(row.lastDocDate) : ''}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      <span className="text-sm font-black font-mono text-indigo-600 dark:text-indigo-400 block">
                        {formatCurrency(row.price, settings.currency)}
                      </span>
                    </div>
                    {!row.inStockDb && (
                      <button
                        type="button"
                        onClick={() => promotePriceEntryToProduct(row, { quantity: 0 })}
                        className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                        title="প্রোডাক্ট ডাটাবেজে যোগ করুন"
                      >
                        <PackagePlus className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => navigate('/quotations/new', { state: { prefillPart: row } })}
                      className="p-1.5 rounded-lg text-purple-600 hover:bg-purple-50"
                      title="কোটেশন করুন"
                    >
                      <FileSpreadsheet className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate('/sales/new', { state: { prefillPart: row } })}
                      className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50"
                      title="মেমো / বিক্রয় করুন"
                    >
                      <Receipt className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* CSV IMPORT MODAL */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => {
          setIsImportModalOpen(false);
          setImportErrors([]);
        }}
        title="Import Products from CSV"
        maxWidth="max-w-xl"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Upload a CSV file containing columns: <code className="font-mono bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-emerald-600">Product Name, SKU, Category, Cost Price, Selling Price, Quantity, Reorder Level, Description</code>.
          </p>

          <div className="flex items-center gap-3">
            <input
              type="file"
              accept=".csv"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
            />
            <Button
              variant="outline"
              size="sm"
              icon={FileSpreadsheet}
              onClick={() => fileInputRef.current?.click()}
            >
              Choose CSV File
            </Button>
            <span className="text-xs text-slate-400">or paste raw CSV text below:</span>
          </div>

          <textarea
            rows={6}
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            placeholder="Product Name,SKU,Category,Cost Price,Selling Price,Quantity,Reorder Level&#10;Wireless Headset,ELE-9988,Electronics,1200,2100,20,5"
            className="w-full text-xs font-mono p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />

          {importErrors.length > 0 && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-600 dark:text-red-400 space-y-1">
              <span className="font-bold">Errors found during import:</span>
              <ul className="list-disc pl-4 space-y-0.5">
                {importErrors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="secondary"
              onClick={() => {
                setIsImportModalOpen(false);
                setImportErrors([]);
              }}
            >
              Cancel
            </Button>
            <Button variant="primary" onClick={handleProcessImport}>
              Process Import
            </Button>
          </div>
        </div>
      </Modal>

      {/* Barcode Label Modal */}
      <BarcodeLabelModal
        isOpen={!!labelModalProduct}
        onClose={() => setLabelModalProduct(null)}
        product={labelModalProduct}
      />
    </div>
  );
};
