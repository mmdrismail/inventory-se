import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppData } from '../../context/AppDataContext';
import { formatCurrency, formatDate } from '../../utils/formatters';
import {
  buildUnifiedPartsIndex,
  searchUnifiedParts,
  matchesMultiTokens,
  formatMachineSummary,
} from '../../utils/partPriceSearch';
import {
  Search,
  Package,
  Users2,
  Truck,
  ShoppingCart,
  Receipt,
  ClipboardList,
  FileSpreadsheet,
  Layers,
  MapPin,
  Tag,
  ArrowRight,
  Sparkles,
  GitFork,
  X,
  Boxes,
  Cpu,
  History,
} from 'lucide-react';

export const GlobalSearchModal = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const {
    products,
    categories,
    suppliers,
    customers,
    purchases,
    lotPurchases,
    sales,
    quotations,
    priceCatalog,
    orders,
    settings,
  } = useAppData();
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const q = query.trim().toLowerCase();

  // Condition Badge helper
  const renderConditionBadge = (condition) => {
    switch (condition) {
      case 'original_oem':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300">Original OEM</span>;
      case 'reconditioned':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300">Reconditioned</span>;
      case 'std_overhaul':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300">STD Overhaul</span>;
      case 'used':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">Used (ব্যবহারযোগ্য)</span>;
      case 'new':
      default:
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300">New (নতুন)</span>;
    }
  };

  // Google-Like Smart Fuzzy Multi-Token Search across machinery attributes & alternatives
  const matchedProducts = useMemo(() => {
    if (!q) return [];
    return (Array.isArray(products) ? products : [])
      .filter((p) => {
        if (!p) return false;
        const variantText = Array.isArray(p.variants)
          ? p.variants.map((v) => `${v?.name || ''} ${v?.sku || ''}`).join(' ')
          : '';
        return matchesMultiTokens(q, [
          p.name,
          p.sku,
          p.barcode,
          p.brand,
          p.modelNumber,
          p.dimensions,
          p.description,
          p.oemPartNumber,
          p.impaCode,
          p.condition,
          p.lotNumber,
          p.warehouseLocation?.code,
          p.warehouseLocation?.rack,
          p.warehouseLocation?.zone,
          p.compatibleModels,
          p.alternatives,
          variantText,
        ]);
      })
      .slice(0, 6);
  }, [products, q]);

  const unifiedPartsIndex = useMemo(
    () => buildUnifiedPartsIndex({ products, priceCatalog, quotations, sales }),
    [products, priceCatalog, quotations, sales]
  );

  // Matches from Machine & Parts Price History (Quotations + Sales + PriceCatalog)
  const matchedPriceHistory = useMemo(() => {
    if (!q) return [];
    const { matchedPriceEntries } = searchUnifiedParts(q, unifiedPartsIndex, { maxResults: 6 });
    return matchedPriceEntries;
  }, [q, unifiedPartsIndex]);

  // Quotations search (including machineDetails & items)
  const matchedQuotations = useMemo(() => {
    if (!q) return [];
    return (Array.isArray(quotations) ? quotations : [])
      .filter((quote) => {
        if (!quote) return false;
        const mdText = formatMachineSummary(quote.machineDetails);
        const itemNames = (Array.isArray(quote.items) ? quote.items : [])
          .map((it) => it?.name || it?.productName || '')
          .join(' ');
        return matchesMultiTokens(q, [
          quote.quotationNumber,
          quote.customerName,
          quote.customerCompany,
          quote.requisitionRef,
          mdText,
          quote.machineDetails?.description,
          itemNames,
        ]);
      })
      .slice(0, 3);
  }, [quotations, q]);

  // Lots & Scrap Purchases search
  const matchedLots = useMemo(() => {
    if (!q) return [];
    return (Array.isArray(lotPurchases) ? lotPurchases : [])
      .filter((lot) => {
        if (!lot) return false;
        const num = String(lot.lotNumber || '').toLowerCase().includes(q);
        const name = String(lot.lotName || '').toLowerCase().includes(q);
        const ship = String(lot.sourceShip || '').toLowerCase().includes(q);
        const notes = String(lot.notes || '').toLowerCase().includes(q);
        return num || name || ship || notes;
      })
      .slice(0, 2);
  }, [lotPurchases, q]);

  if (!isOpen) return null;

  const matchedCustomers = q
    ? (Array.isArray(customers) ? customers : [])
        .filter(
          (c) =>
            c &&
            (String(c.name || '').toLowerCase().includes(q) ||
              String(c.phone || '').includes(q) ||
              String(c.companyName || '').toLowerCase().includes(q))
        )
        .slice(0, 3)
    : [];

  const matchedSales = q
    ? (Array.isArray(sales) ? sales : [])
        .filter(
          (s) =>
            s &&
            matchesMultiTokens(q, [
              s.invoiceNo,
              s.invoiceNumber,
              s.customerName,
              s.customerCompany,
              formatMachineSummary(s.machineDetails),
              (Array.isArray(s.items) ? s.items : [])
                .map((it) => it?.productName || it?.name || '')
                .join(' '),
            ])
        )
        .slice(0, 3)
    : [];

  const hasResults =
    matchedProducts.length > 0 ||
    matchedPriceHistory.length > 0 ||
    matchedQuotations.length > 0 ||
    matchedLots.length > 0 ||
    matchedCustomers.length > 0 ||
    matchedSales.length > 0;

  const handleSelect = (url) => {
    onClose();
    setQuery('');
    navigate(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-14 p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150">
        {/* Search Header Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-100 dark:border-slate-800 gap-3 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Search className="h-4 w-4" />
          </div>
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search part name, Bitzer/Carrier, model, IMPA code, OEM #, rack location, alternatives... (Ctrl+K)"
            className="flex-1 bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded font-mono border border-slate-200 dark:border-slate-700">
            ESC
          </span>
        </div>

        {/* Quick Suggestion Chips */}
        {!q && (
          <div className="px-4 py-2 bg-slate-100/60 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800/80 flex items-center gap-1.5 text-[11px] text-slate-500 overflow-x-auto">
            <span className="font-bold shrink-0 text-slate-400">Quick Filters:</span>
            <button onClick={() => setQuery('Bitzer')} className="px-2 py-0.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:text-emerald-600">Bitzer</button>
            <button onClick={() => setQuery('Connecting Rod')} className="px-2 py-0.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:text-emerald-600">Connecting Rod</button>
            <button onClick={() => setQuery('Zone-A')} className="px-2 py-0.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:text-emerald-600">Zone-A Racks</button>
            <button onClick={() => setQuery('Reconditioned')} className="px-2 py-0.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:text-emerald-600">Reconditioned</button>
            <button onClick={() => setQuery('Carrier')} className="px-2 py-0.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:text-emerald-600">Carrier Alternatives</button>
          </div>
        )}

        {/* Results Body */}
        <div className="max-h-[32rem] overflow-y-auto p-3 space-y-3">
          {!q && (
            <div className="py-12 text-center space-y-2">
              <Sparkles className="h-8 w-8 mx-auto text-emerald-500 opacity-60" />
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Google-Style Machinery & Spare Parts Instant Search
              </p>
              <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                Type any part name, brand, compressor model, OEM part number, IMPA code, or warehouse bin/rack location.
              </p>
            </div>
          )}

          {q && !hasResults && (
            <div className="py-10 text-center space-y-1">
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                কোনো মালামাল বা রেকর্ড পাওয়া যায়নি ("{query}")
              </p>
              <p className="text-[11px] text-slate-400">
                স্পেলিং চেক করুন অথবা জেনেরিক নাম দিয়ে সার্চ করুন (যেমন: "Piston", "Valve", "Bitzer")।
              </p>
            </div>
          )}

          {/* MACHINERY & PARTS MATCHES */}
          {matchedProducts.length > 0 && (
            <div>
              <div className="px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Package className="h-3.5 w-3.5" />
                  <span>যন্ত্রাংশ ও মালামাল / Machinery Parts ({matchedProducts.length})</span>
                </span>
                <span className="text-[10px] text-slate-400 font-normal">লাইভ স্টক ও বিকল্প তালিকা</span>
              </div>

              <div className="space-y-2 mt-1">
                {matchedProducts.map((p, idx) => {
                  const prodId = p.id || p._id || idx;
                  const locCode = p.warehouseLocation?.code || (p.warehouseLocation?.rack ? `${p.warehouseLocation.zone || ''} ${p.warehouseLocation.rack}` : null);
                  const hasVariants = Array.isArray(p.variants) && p.variants.length > 0;
                  const hasAlternatives = Array.isArray(p.alternatives) && p.alternatives.length > 0;
                  const compatList = Array.isArray(p.compatibleModels) ? p.compatibleModels : [];

                  return (
                    <div
                      key={prodId}
                      className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-emerald-500 dark:hover:border-emerald-500 bg-slate-50/50 dark:bg-slate-850 hover:bg-white dark:hover:bg-slate-800 transition-all shadow-xs"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          {/* Title + Brand + Condition */}
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            {p.brand && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-slate-800 text-white dark:bg-slate-700">
                                {p.brand}
                              </span>
                            )}
                            {renderConditionBadge(p.condition)}
                            <h4
                              onClick={() => handleSelect(`/products/${prodId}`)}
                              data-transliterate="true"
                              className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 hover:text-emerald-600 dark:hover:text-emerald-400 cursor-pointer truncate"
                            >
                              {p.name}
                            </h4>
                          </div>

                          {/* Technical Codes & Location */}
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 flex-wrap">
                            <span className="font-mono">SKU: {p.sku}</span>
                            {p.oemPartNumber && (
                              <span>• OEM #: <strong className="font-mono text-slate-700 dark:text-slate-300">{p.oemPartNumber}</strong></span>
                            )}
                            {p.impaCode && (
                              <span>• IMPA: <strong className="font-mono text-slate-700 dark:text-slate-300">{p.impaCode}</strong></span>
                            )}
                            {locCode && (
                              <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded">
                                <MapPin className="h-3 w-3" />
                                <span>{locCode}</span>
                              </span>
                            )}
                          </div>

                          {/* Compatible Engine Models */}
                          {compatList.length > 0 && (
                            <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 flex items-center gap-1 flex-wrap">
                              <span className="font-semibold text-slate-500">মডেল ম্যাচ:</span>
                              {compatList.slice(0, 3).map((m, i) => (
                                <span key={i} className="bg-slate-200/80 dark:bg-slate-800 px-1.5 py-0.2 rounded text-[10px] font-mono">
                                  {m}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Alternative Parts Suggestion (Google-Style) */}
                          {hasAlternatives && (
                            <div className="mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1.5 text-[10.5px]">
                              <span className="font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1">
                                <GitFork className="h-3 w-3" />
                                <span>বিকল্প পার্টস:</span>
                              </span>
                              <div className="flex items-center gap-1 flex-wrap">
                                {p.alternatives.map((alt, i) => (
                                  <button
                                    key={i}
                                    type="button"
                                    onClick={() => setQuery(alt)}
                                    className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 font-semibold hover:bg-amber-100 transition-colors"
                                  >
                                    {alt}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Variants Info */}
                          {hasVariants && (
                            <div className="mt-1 text-[10.5px] text-purple-700 dark:text-purple-300 font-semibold flex items-center gap-1">
                              <Boxes className="h-3 w-3" />
                              <span>{p.variants.length} টি ভ্যারিয়েন্ট উপলব্ধ ({p.variants.map((v) => v?.name || '').filter(Boolean).join(', ')})</span>
                            </div>
                          )}
                        </div>

                        {/* Price & Action */}
                        <div className="text-right shrink-0">
                          <div className="text-sm font-black font-mono text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(p.sellingPrice || 0, settings?.currency)}
                          </div>
                          <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                            Stock: <strong className={(p.quantity || 0) <= 5 ? 'text-red-500' : 'text-slate-800 dark:text-slate-200'}>{p.quantity || 0}</strong> pcs
                          </div>
                          <button
                            type="button"
                            onClick={() => handleSelect(`/products/${prodId}`)}
                            className="mt-2 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold shadow-xs transition-colors"
                          >
                            <span>ডিটেইলস</span>
                            <ArrowRight className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* MACHINE & PARTS PRICE HISTORY (FROM QUOTATIONS & SALES) */}
          {matchedPriceHistory.length > 0 && (
            <div>
              <div className="px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <History className="h-3.5 w-3.5" />
                  <span>মেশিন ও পার্টস প্রাইস লিস্ট (কোটেশন ও বিক্রয় ইতিহাস: {matchedPriceHistory.length})</span>
                </span>
                <button
                  type="button"
                  onClick={() => handleSelect('/price-list')}
                  className="text-[10px] text-indigo-600 hover:underline font-semibold"
                >
                  প্রাইস লিস্ট খুলুন
                </button>
              </div>
              <div className="space-y-1.5 mt-1">
                {matchedPriceHistory.map((row) => {
                  const mSummary = formatMachineSummary(row);
                  return (
                    <button
                      key={row.uid}
                      type="button"
                      onClick={() => handleSelect('/price-list')}
                      className="w-full text-left p-2.5 rounded-xl border border-indigo-200/80 dark:border-indigo-900/50 bg-indigo-50/40 dark:bg-indigo-950/20 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 flex items-center justify-between text-xs transition-colors"
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 flex-wrap">
                          <span data-transliterate="true">{row.partName}</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                            {row.unit}
                          </span>
                          {!row.inStockDb && (
                            <span className="text-[9.5px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                              স্টকে নেই · প্রাইস লিস্ট
                            </span>
                          )}
                        </div>
                        {mSummary && (
                          <div className="text-[10.5px] text-indigo-700 dark:text-indigo-300 font-semibold flex items-center gap-1 mt-0.5 truncate">
                            <Cpu className="h-3 w-3 shrink-0" />
                            <span data-transliterate="true">{mSummary}</span>
                          </div>
                        )}
                        <div className="text-[10px] text-slate-500 mt-0.5">
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
                      <div className="text-right shrink-0">
                        <div className="font-mono font-black text-sm text-indigo-600 dark:text-indigo-400">
                          {formatCurrency(row.price, settings?.currency)}
                        </div>
                        <div className="text-[10px] text-slate-400">সর্বশেষ দর</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* QUOTATION MATCHES */}
          {matchedQuotations.length > 0 && (
            <div>
              <div className="px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
                <FileSpreadsheet className="h-3.5 w-3.5" />
                <span>দরপত্র ও কোটেশন / Quotations ({matchedQuotations.length})</span>
              </div>
              <div className="space-y-1.5 mt-1">
                {matchedQuotations.map((qItem) => (
                  <button
                    key={qItem.id}
                    onClick={() => handleSelect(`/quotations/${qItem.id}`)}
                    className="w-full text-left p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between text-xs transition-colors"
                  >
                    <div>
                      <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <span className="font-mono text-purple-600 dark:text-purple-400">{qItem.quotationNumber}</span>
                        <span>• <span data-transliterate={qItem.customerName ? 'true' : undefined}>{qItem.customerName}</span></span>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        <span data-transliterate={qItem.customerCompany ? 'true' : undefined}>{qItem.customerCompany || 'Direct Client'}</span> · {qItem.items?.length || 0} items · Req: {qItem.requisitionRef || 'N/A'}
                      </div>
                    </div>
                    <div className="text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                      {formatCurrency(qItem.totalAmount, settings?.currency)}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* LOT SCRAP PURCHASES MATCHES */}
          {matchedLots.length > 0 && (
            <div>
              <div className="px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5" />
                <span>জাহাজ নিলাম লট / Ship Lot Purchases ({matchedLots.length})</span>
              </div>
              <div className="space-y-1.5 mt-1">
                {matchedLots.map((lot) => (
                  <button
                    key={lot.id}
                    onClick={() => handleSelect('/purchases')}
                    className="w-full text-left p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between text-xs transition-colors"
                  >
                    <div>
                      <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <span className="font-mono text-amber-600 dark:text-amber-400">{lot.lotNumber}</span>
                        <span>• {lot.lotName}</span>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {lot.sourceShip || 'Ship Scrap Yard'} · Status: {lot.status}
                      </div>
                    </div>
                    <div className="text-right font-mono font-bold text-amber-600 dark:text-amber-400">
                      {formatCurrency(lot.totalLotCost, settings?.currency)}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* CUSTOMERS MATCHES */}
          {matchedCustomers.length > 0 && (
            <div>
              <div className="px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                <Users2 className="h-3.5 w-3.5" />
                <span>গ্রাহক / Customers ({matchedCustomers.length})</span>
              </div>
              <div className="space-y-1.5 mt-1">
                {matchedCustomers.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => handleSelect(`/customers/${c.id}`)}
                    className="w-full text-left p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between text-xs transition-colors"
                  >
                    <div>
                      <div className="font-bold text-slate-900 dark:text-slate-100" data-transliterate="true">{c.name}</div>
                      <div className="text-[11px] text-slate-400" data-transliterate={c.companyName ? 'true' : undefined}>{c.companyName || c.phone}</div>
                    </div>
                    <span className="text-blue-600 dark:text-blue-400 font-semibold text-[11px]">লেজার দেখুন</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* SALES MATCHES */}
          {matchedSales.length > 0 && (
            <div>
              <div className="px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <Receipt className="h-3.5 w-3.5" />
                <span>বিক্রয় চালান / Invoices ({matchedSales.length})</span>
              </div>
              <div className="space-y-1.5 mt-1">
                {matchedSales.map((s, idx) => (
                  <button
                    key={s.id || s._id || idx}
                    onClick={() => handleSelect(`/sales/${s.id || s._id}`)}
                    className="w-full text-left p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between text-xs transition-colors"
                  >
                    <div>
                      <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <span className="font-mono text-emerald-600 dark:text-emerald-400">{s.invoiceNo || s.invoiceNumber}</span>
                        <span>• <span data-transliterate={s.customerName ? 'true' : undefined}>{s.customerName || 'Walk-in'}</span></span>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {s.items?.length || 0} items · {String(s.paymentStatus || 'PAID').toUpperCase()}
                      </div>
                    </div>
                    <div className="text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                      {formatCurrency(s.total || s.totalAmount || 0, settings?.currency)}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
