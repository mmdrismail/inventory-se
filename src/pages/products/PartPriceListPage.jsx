import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppData } from '../../context/AppDataContext';
import { useLanguage } from '../../context/LanguageContext';
import { Card, CardContent } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { getUnitSelectOptions, normalizeUnit } from '../../utils/units';
import {
  buildUnifiedPartsIndex,
  matchesMultiTokens,
  EMPTY_MACHINE_DETAILS,
} from '../../utils/partPriceSearch';
import {
  Cpu,
  Search,
  Plus,
  RefreshCw,
  PackagePlus,
  FileSpreadsheet,
  Receipt,
  Trash2,
  History,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export const PartPriceListPage = () => {
  const {
    products,
    priceCatalog,
    quotations,
    sales,
    savePriceCatalogEntry,
    deletePriceCatalogEntry,
    syncPriceCatalogHistory,
    promotePriceEntryToProduct,
    confirmAction,
    settings,
  } = useAppData();

  const { language } = useLanguage();
  const navigate = useNavigate();

  const l = (texts) => {
    if (language === 'en') return texts.en;
    if (language === 'obro') return texts.obro || `${texts.bn} (${texts.en})`;
    return texts.bn;
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [machineFilter, setMachineFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState('all'); // 'all' | 'price_only' | 'in_stock' | 'quotation' | 'sale'
  const [expandedRowKey, setExpandedRowKey] = useState(null);

  // Add / Edit Price Entry Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [entryForm, setEntryForm] = useState({
    partName: '',
    unit: 'pc',
    lastPrice: '',
    ...EMPTY_MACHINE_DETAILS,
  });

  // Promote to Stock Product Modal State
  const [promoteTarget, setPromoteTarget] = useState(null);
  const [promoteForm, setPromoteForm] = useState({
    sku: '',
    quantity: '0',
    costPrice: '0',
    sellingPrice: '0',
  });

  const unifiedIndex = useMemo(
    () => buildUnifiedPartsIndex({ products, priceCatalog, quotations, sales }),
    [products, priceCatalog, quotations, sales]
  );

  const distinctMachines = useMemo(() => {
    const set = new Set();
    unifiedIndex.priceListEntries.forEach((e) => {
      if (e.machineName) set.add(e.machineName.trim());
    });
    return Array.from(set).sort();
  }, [unifiedIndex.priceListEntries]);

  const filteredEntries = useMemo(() => {
    return unifiedIndex.priceListEntries.filter((row) => {
      if (machineFilter !== 'all' && row.machineName?.toLowerCase() !== machineFilter.toLowerCase()) {
        return false;
      }
      if (stockFilter === 'price_only' && row.inStockDb) return false;
      if (stockFilter === 'in_stock' && !row.inStockDb) return false;
      if (stockFilter === 'quotation' && row.sourceType !== 'quotation') return false;
      if (stockFilter === 'sale' && row.sourceType !== 'sale' && row.sourceType !== 'challan') return false;

      return matchesMultiTokens(searchTerm, [
        row.partName,
        row.machineName,
        row.model,
        row.type,
        row.hp,
        row.ton,
        row.cylinder,
        row.others,
        row.description,
        row.lastDocNumber,
        row.lastCustomerName,
      ]);
    });
  }, [unifiedIndex.priceListEntries, searchTerm, machineFilter, stockFilter]);

  const stats = useMemo(() => {
    const all = unifiedIndex.priceListEntries;
    const priceOnlyCount = all.filter((x) => !x.inStockDb).length;
    const linkedCount = all.filter((x) => x.inStockDb).length;
    return {
      total: all.length,
      priceOnlyCount,
      linkedCount,
      machinesCount: distinctMachines.length,
    };
  }, [unifiedIndex.priceListEntries, distinctMachines]);

  const handleSaveManual = (e) => {
    e.preventDefault();
    if (!entryForm.partName.trim()) return;
    const res = savePriceCatalogEntry({
      ...entryForm,
      sourceType: 'manual',
    });
    if (res?.success) {
      setIsAddModalOpen(false);
      setEntryForm({ partName: '', unit: 'pc', lastPrice: '', ...EMPTY_MACHINE_DETAILS });
    }
  };

  const openPromoteModal = (row) => {
    const baseSku =
      (row.machineName || row.partName || 'PART')
        .replace(/[^a-zA-Z0-9]/g, '')
        .slice(0, 4)
        .toUpperCase() || 'PART';
    setPromoteForm({
      sku: `${baseSku}-${Math.floor(1000 + Math.random() * 9000)}`,
      quantity: '0',
      costPrice: '0',
      sellingPrice: String(row.lastPrice || row.lastQuotedPrice || row.lastSoldPrice || 0),
    });
    setPromoteTarget(row);
  };

  const handleConfirmPromote = (e) => {
    e.preventDefault();
    if (!promoteTarget) return;
    const res = promotePriceEntryToProduct(promoteTarget, {
      sku: promoteForm.sku,
      quantity: Number(promoteForm.quantity) || 0,
      costPrice: Number(promoteForm.costPrice) || 0,
      sellingPrice: Number(promoteForm.sellingPrice) || 0,
    });
    if (res?.success) {
      setPromoteTarget(null);
    }
  };

  const openInQuotation = (row) => {
    navigate('/quotations/new', { state: { prefillPart: row } });
  };

  const openInSale = (row) => {
    navigate('/sales/new', { state: { prefillPart: row } });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <Badge variant="purple" size="sm">
              <Cpu className="h-3 w-3" />
              {l({ bn: 'মেশিন ও পার্টস প্রাইস ইন্টেলিজেন্স', en: 'Machine & Parts Price Intelligence' })}
            </Badge>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {l({
              bn: 'মেশিন, স্পেসিফিকেশন ও পার্টস প্রাইস লিস্ট',
              en: 'Machine Specs & Parts Price Catalog',
            })}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {l({
              bn: 'কোটেশন ও সেলস মেমোর প্রতিটি পার্টস (মেশিনের নাম, মডেল, ধরন, HP, টন, সিলিন্ডার সহ) স্বয়ংক্রিয়ভাবে এখানে সেভ হয়—স্টকে এন্ট্রি থাকুক বা না থাকুক।',
              en: 'Automatically builds a searchable price list from every quotation and sale (even for items sitting in shop without formal stock entry).',
            })}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            icon={RefreshCw}
            onClick={syncPriceCatalogHistory}
          >
            {l({ bn: 'পূর্বের কোটেশন/বিক্রয় সিঙ্ক করুন', en: 'Sync Quotes & Sales' })}
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            icon={Plus}
            onClick={() => setIsAddModalOpen(true)}
          >
            {l({ bn: '+ নতুন পার্টস ও দাম যোগ করুন', en: '+ Add Price List Item' })}
          </Button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <span className="text-[11px] font-semibold text-slate-500 block">
            {l({ bn: 'মোট প্রাইস এন্ট্রি', en: 'Total Catalog Entries' })}
          </span>
          <span className="text-2xl font-black font-mono text-slate-900 dark:text-slate-100 mt-1 block">
            {stats.total}
          </span>
        </Card>
        <Card className="p-4">
          <span className="text-[11px] font-semibold text-amber-600 block">
            {l({ bn: 'স্টক এন্ট্রি নেই (শুধু প্রাইস লিস্ট)', en: 'Price List Only (Not in Stock DB)' })}
          </span>
          <span className="text-2xl font-black font-mono text-amber-600 mt-1 block">
            {stats.priceOnlyCount}
          </span>
        </Card>
        <Card className="p-4">
          <span className="text-[11px] font-semibold text-emerald-600 block">
            {l({ bn: 'স্টক ইনভেন্টরির সাথে যুক্ত', en: 'Linked in Stock Inventory' })}
          </span>
          <span className="text-2xl font-black font-mono text-emerald-600 mt-1 block">
            {stats.linkedCount}
          </span>
        </Card>
        <Card className="p-4">
          <span className="text-[11px] font-semibold text-indigo-600 block">
            {l({ bn: 'নিবন্ধিত মেশিনের ধরন', en: 'Distinct Machine Brands' })}
          </span>
          <span className="text-2xl font-black font-mono text-indigo-600 mt-1 block">
            {stats.machinesCount}
          </span>
        </Card>
      </div>

      {/* Search & Filters Bar */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-6 relative">
            <Search className="h-4 w-4 text-indigo-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={l({
                bn: 'মেশিনের নাম, পার্টসের নাম, মডেল, HP, টন বা সিলিন্ডার লিখুন... (যেমন: Bitzer 4EC Valve)',
                en: 'Search machine + part + model + type + HP + Ton + Cylinder...',
              })}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div className="md:col-span-3">
            <select
              value={machineFilter}
              onChange={(e) => setMachineFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
            >
              <option value="all">{l({ bn: 'সব মেশিন / ব্র্যান্ড', en: 'All Machines' })}</option>
              {distinctMachines.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-3">
            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
            >
              <option value="all">{l({ bn: 'সব উৎস ও স্ট্যাটাস', en: 'All Entries' })}</option>
              <option value="price_only">
                {l({ bn: 'শুধু প্রাইস লিস্ট (স্টকে এন্ট্রি নেই)', en: 'Price List Only (Not in Stock)' })}
              </option>
              <option value="in_stock">
                {l({ bn: 'স্টক প্রোডাক্টে যুক্ত আছে', en: 'Already in Stock DB' })}
              </option>
              <option value="quotation">{l({ bn: 'কোটেশন থেকে পাওয়া', en: 'From Quotations' })}</option>
              <option value="sale">{l({ bn: 'বিক্রয় / চালান থেকে পাওয়া', en: 'From Sales / Challan' })}</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Catalog Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 text-slate-500">
                <th className="py-3 px-4">{l({ bn: 'পার্টস / পণ্যের নাম', en: 'Part / Item Name' })}</th>
                <th className="py-3 px-4">{l({ bn: 'মেশিন ও টেকনিক্যাল স্পেক', en: 'Machine & Specs' })}</th>
                <th className="py-3 px-4 text-right">{l({ bn: 'দর / প্রাইস ইতিহাস', en: 'Last & Range Price' })}</th>
                <th className="py-3 px-4">{l({ bn: 'শেষ উৎস ও তারিখ', en: 'Last Reference' })}</th>
                <th className="py-3 px-4 text-right">{l({ bn: 'অ্যাকশন', en: 'Actions' })}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-12 text-center text-slate-400">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    {l({
                      bn: 'কোনো মিল খুঁজে পাওয়া যায়নি। নতুন কোটেশন/মেমোতে মেশিনের নাম দিলে বা উপরের "+ নতুন পার্টস ও দাম যোগ করুন" বাটনে ক্লিক করলে এখানে যুক্ত হবে।',
                      en: 'No matching machine parts found yet.',
                    })}
                  </td>
                </tr>
              ) : (
                filteredEntries.map((row) => {
                  const rowKey = row.id || row._id || row.compositeKey;
                  const isOpenHist = expandedRowKey === rowKey;
                  const hasHistory = Array.isArray(row.history) && row.history.length > 0;
                  return (
                    <React.Fragment key={rowKey}>
                      <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                            {row.partName}
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1">
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                              {row.unit}
                            </span>
                            {row.inStockDb ? (
                              <Link
                                to={`/products/${row.linkedProductId}`}
                                className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800 hover:underline"
                              >
                                <CheckCircle2 className="h-2.5 w-2.5" />
                                স্টকে আছে ({row.stockQty})
                                <ExternalLink className="h-2.5 w-2.5" />
                              </Link>
                            ) : (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800">
                                স্টকে এন্ট্রি নেই
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1">
                            {row.machineName && (
                              <Badge variant="blue" size="sm">
                                {row.machineName}
                              </Badge>
                            )}
                            {row.model && (
                              <Badge variant="purple" size="sm">
                                Model: {row.model}
                              </Badge>
                            )}
                            {row.type && (
                              <Badge variant="slate" size="sm">
                                {row.type}
                              </Badge>
                            )}
                            {row.hp && (
                              <Badge variant="emerald" size="sm">
                                {row.hp} HP
                              </Badge>
                            )}
                            {row.ton && (
                              <Badge variant="amber" size="sm">
                                {row.ton} Ton
                              </Badge>
                            )}
                            {row.cylinder && (
                              <Badge variant="slate" size="sm">
                                {row.cylinder} Cyl
                              </Badge>
                            )}
                          </div>
                          {(row.others || row.description) && (
                            <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                              {[row.others, row.description].filter(Boolean).join(' · ')}
                            </p>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="font-mono font-black text-sm text-indigo-600 dark:text-indigo-400">
                            {formatCurrency(row.lastPrice, settings.currency)}
                          </div>
                          <div className="text-[10px] text-slate-500 space-y-0.5 mt-0.5">
                            {row.lastQuotedPrice > 0 && (
                              <span className="block text-purple-600 dark:text-purple-400">
                                Quote: {formatCurrency(row.lastQuotedPrice, settings.currency)}
                              </span>
                            )}
                            {row.lastSoldPrice > 0 && (
                              <span className="block text-emerald-600 dark:text-emerald-400">
                                Sold: {formatCurrency(row.lastSoldPrice, settings.currency)}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="font-mono font-semibold text-slate-700 dark:text-slate-200 block">
                            {row.lastDocNumber || '—'}
                          </span>
                          <span className="text-[10px] text-slate-400 block">
                            {row.lastCustomerName ? `${row.lastCustomerName} · ` : ''}
                            {formatDate(row.lastDocDate)}
                          </span>
                          {hasHistory && (
                            <button
                              type="button"
                              onClick={() => setExpandedRowKey(isOpenHist ? null : rowKey)}
                              className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 hover:underline"
                            >
                              <History className="h-3 w-3" />
                              <span>{row.history.length}টি রেট ইতিহাস</span>
                              {isOpenHist ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                            </button>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
                            {!row.inStockDb && (
                              <button
                                type="button"
                                onClick={() => openPromoteModal(row)}
                                className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 text-[11px] font-bold flex items-center gap-1"
                                title={l({
                                  bn: 'প্রোডাক্ট ডাটাবেজে যোগ করুন',
                                  en: 'Add to Product Inventory',
                                })}
                              >
                                <PackagePlus className="h-3.5 w-3.5" />
                                <span>+ প্রোডাক্টে নিন</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => openInQuotation(row)}
                              className="p-1.5 rounded-lg text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/30"
                              title={l({ bn: 'এই দামে কোটেশন বানান', en: 'Create Quotation with this item' })}
                            >
                              <FileSpreadsheet className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => openInSale(row)}
                              className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                              title={l({ bn: 'এই দামে ক্যাশ মেমো বানান', en: 'Create Sale with this item' })}
                            >
                              <Receipt className="h-4 w-4" />
                            </button>
                            {row.id && (
                              <button
                                type="button"
                                onClick={() =>
                                  confirmAction({
                                    title: l({ bn: 'প্রাইস এন্ট্রি মুছবেন?', en: 'Delete Price Entry?' }),
                                    message: `Remove "${row.partName}" from the Price List?`,
                                    confirmText: 'Delete',
                                    isDestructive: true,
                                    onConfirm: () => deletePriceCatalogEntry(row.id),
                                  })
                                }
                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {isOpenHist && hasHistory && (
                        <tr className="bg-indigo-50/30 dark:bg-indigo-950/20">
                          <td colSpan="5" className="px-6 py-3">
                            <div className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 mb-1.5">
                              {l({ bn: 'দামের ধারাবাহিক ইতিহাস:', en: 'Historical Price Log:' })}
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                              {row.history.map((h, i) => (
                                <div
                                  key={i}
                                  className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px]"
                                >
                                  <div>
                                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                                      {h.docNumber || h.docType}
                                    </span>
                                    <span className="block text-[10px] text-slate-400">
                                      {h.customerName || 'Client'} · {formatDate(h.date)}
                                    </span>
                                  </div>
                                  <span className="font-mono font-black text-indigo-600 dark:text-indigo-400">
                                    {formatCurrency(h.price, settings.currency)} / {h.unit}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Manual Add to Price List Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={l({
          bn: 'প্রাইস লিস্ট ও মেশিন স্পেক যোগ করুন (স্টক ছাড়াই)',
          en: 'Add Part & Machine Spec to Price List',
        })}
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSaveManual} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                {l({ bn: 'পার্টস বা পণ্যের নাম *', en: 'Part / Item Name *' })}
              </label>
              <input
                type="text"
                required
                value={entryForm.partName}
                onChange={(e) => setEntryForm((p) => ({ ...p, partName: e.target.value }))}
                placeholder="e.g. Valve Plate Complete / Piston Ring Set"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {l({ bn: 'একক (Unit)', en: 'Unit' })}
                </label>
                <select
                  value={normalizeUnit(entryForm.unit)}
                  onChange={(e) => setEntryForm((p) => ({ ...p, unit: e.target.value }))}
                  className="w-full px-2 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                >
                  {getUnitSelectOptions(entryForm.unit, language).map((u) => (
                    <option key={u.value} value={u.value}>
                      {u.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {l({ bn: 'দর (টাকা)', en: 'Rate (BDT)' })}
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={entryForm.lastPrice}
                  onChange={(e) => setEntryForm((p) => ({ ...p, lastPrice: e.target.value }))}
                  placeholder="0"
                  className="w-full px-2.5 py-2 font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Machine Name</label>
              <input
                type="text"
                value={entryForm.machineName}
                onChange={(e) => setEntryForm((p) => ({ ...p, machineName: e.target.value }))}
                placeholder="e.g. Bitzer"
                className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Model</label>
              <input
                type="text"
                value={entryForm.model}
                onChange={(e) => setEntryForm((p) => ({ ...p, model: e.target.value }))}
                placeholder="e.g. 4EC-6.2Y"
                className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Type</label>
              <input
                type="text"
                value={entryForm.type}
                onChange={(e) => setEntryForm((p) => ({ ...p, type: e.target.value }))}
                placeholder="e.g. Semi-Hermetic"
                className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-600 mb-1">HP</label>
              <input
                type="text"
                value={entryForm.hp}
                onChange={(e) => setEntryForm((p) => ({ ...p, hp: e.target.value }))}
                placeholder="e.g. 15"
                className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Ton</label>
              <input
                type="text"
                value={entryForm.ton}
                onChange={(e) => setEntryForm((p) => ({ ...p, ton: e.target.value }))}
                placeholder="e.g. 10"
                className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Cylinder</label>
              <input
                type="text"
                value={entryForm.cylinder}
                onChange={(e) => setEntryForm((p) => ({ ...p, cylinder: e.target.value }))}
                placeholder="e.g. 4"
                className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Others (Serial / Volt / Gas)</label>
              <input
                type="text"
                value={entryForm.others}
                onChange={(e) => setEntryForm((p) => ({ ...p, others: e.target.value }))}
                className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Description</label>
              <input
                type="text"
                value={entryForm.description}
                onChange={(e) => setEntryForm((p) => ({ ...p, description: e.target.value }))}
                className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>
              {l({ bn: 'বাতিল', en: 'Cancel' })}
            </Button>
            <Button type="submit" variant="primary" icon={CheckCircle2}>
              {l({ bn: 'প্রাইস লিস্টে সেভ করুন', en: 'Save to Price List' })}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Promote to Formal Stock Product Modal */}
      <Modal
        isOpen={Boolean(promoteTarget)}
        onClose={() => setPromoteTarget(null)}
        title={l({
          bn: 'প্রোডাক্ট ডাটাবেজে যোগ করুন (Add to Inventory Catalog)',
          en: 'Promote to Product Catalog',
        })}
        maxWidth="max-w-md"
      >
        {promoteTarget && (
          <form onSubmit={handleConfirmPromote} className="space-y-4 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <div className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                {promoteTarget.partName}
              </div>
              <div className="text-[11px] text-indigo-600 dark:text-indigo-400 mt-0.5">
                {[
                  promoteTarget.machineName,
                  promoteTarget.model,
                  promoteTarget.hp && `${promoteTarget.hp} HP`,
                  promoteTarget.ton && `${promoteTarget.ton} Ton`,
                  promoteTarget.cylinder && `${promoteTarget.cylinder} Cyl`,
                ]
                  .filter(Boolean)
                  .join(' · ') || 'General Part'}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-600 mb-1">SKU *</label>
                <input
                  type="text"
                  required
                  value={promoteForm.sku}
                  onChange={(e) => setPromoteForm((p) => ({ ...p, sku: e.target.value }))}
                  className="w-full px-2.5 py-2 font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-600 mb-1">
                  {l({ bn: 'দোকানে বর্তমান স্টক (Qty)', en: 'Initial Stock Qty' })}
                </label>
                <input
                  type="number"
                  min="0"
                  value={promoteForm.quantity}
                  onChange={(e) => setPromoteForm((p) => ({ ...p, quantity: e.target.value }))}
                  className="w-full px-2.5 py-2 font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-600 mb-1">
                  {l({ bn: 'ক্রয় মূল্য (Cost)', en: 'Cost Price' })}
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={promoteForm.costPrice}
                  onChange={(e) => setPromoteForm((p) => ({ ...p, costPrice: e.target.value }))}
                  className="w-full px-2.5 py-2 font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-600 mb-1">
                  {l({ bn: 'বিক্রয় মূল্য (Selling Price)', en: 'Selling Price' })}
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={promoteForm.sellingPrice}
                  onChange={(e) => setPromoteForm((p) => ({ ...p, sellingPrice: e.target.value }))}
                  className="w-full px-2.5 py-2 font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <Button type="button" variant="outline" onClick={() => setPromoteTarget(null)}>
                {l({ bn: 'বাতিল', en: 'Cancel' })}
              </Button>
              <Button type="submit" variant="primary" icon={PackagePlus}>
                {l({ bn: 'প্রোডাক্টে যুক্ত করুন', en: 'Create Product' })}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
