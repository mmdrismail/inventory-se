import React, { useState, useMemo } from 'react';
import {
  Search,
  X,
  Package,
  History,
  Cpu,
  Plus,
  FileSpreadsheet,
  Receipt,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { useAppData } from '../../context/AppDataContext';
import { useLanguage } from '../../context/LanguageContext';
import {
  buildUnifiedPartsIndex,
  searchUnifiedParts,
  formatMachineSummary,
} from '../../utils/partPriceSearch';
import { formatCurrency, formatDate } from '../../utils/formatters';

/**
 * Interactive Modal for looking up ANY part by Machine Name + Part Name + Model/HP/Ton/Cyl
 * across BOTH active Inventory Stock AND past Quotations / Sales Price List.
 */
export const SmartPartLookupModal = ({
  isOpen,
  onClose,
  onSelectPart,
  preferredMachine = {},
  initialQuery = '',
}) => {
  const { products, priceCatalog, quotations, sales, settings } = useAppData();
  const { language } = useLanguage();

  const l = (texts) => {
    if (language === 'en') return texts.en;
    if (language === 'obro') return texts.obro || `${texts.bn} (${texts.en})`;
    return texts.bn;
  };

  const [query, setQuery] = useState(initialQuery || '');

  const handleClose = () => {
    setQuery('');
    onClose();
  };

  const unifiedIndex = useMemo(
    () => buildUnifiedPartsIndex({ products, priceCatalog, quotations, sales }),
    [products, priceCatalog, quotations, sales]
  );

  const { matchedProducts, matchedPriceEntries } = useMemo(
    () => searchUnifiedParts(query, unifiedIndex, { preferredMachine, maxResults: 30 }),
    [query, unifiedIndex, preferredMachine]
  );

  if (!isOpen) return null;

  const machineHint = preferredMachine?.machineName || preferredMachine?.model || '';

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-10 p-4 overflow-y-auto">
      <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={handleClose} />

      <div className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden z-10">
        {/* Header Search Input */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/80 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {l({
                  bn: 'মেশিন ও পার্টস প্রাইস সার্চ (স্টক + পূর্বের কোটেশন ও বিক্রয়)',
                  en: 'Smart Machine & Parts Price Lookup (Stock + Past Quotes/Sales)',
                })}
              </h3>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/70 dark:hover:bg-slate-800"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="relative">
            <Search className="h-4 w-4 text-indigo-500 absolute left-3 top-2.5" />
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={l({
                bn: 'মেশিনের নাম ও পার্টস লিখুন... যেমন: Bitzer Valve, Mycom Piston, 4EC 15HP, Ring...',
                en: 'Type machine name + part name + model + HP/Ton/Cyl (e.g. "Bitzer Valve")...',
              })}
              className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {machineHint && (
            <div className="flex flex-wrap items-center gap-2 text-[11px]">
              <span className="text-slate-500">
                {l({ bn: 'বর্তমান ফর্মের মেশিন:', en: 'Current Form Machine:' })}
              </span>
              <button
                type="button"
                onClick={() => setQuery(machineHint)}
                className="px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-semibold hover:bg-indigo-100"
              >
                🔍 {machineHint}
              </button>
            </div>
          )}
        </div>

        {/* Results Body */}
        <div className="max-h-[65vh] overflow-y-auto p-4 space-y-5">
          {/* Section 1: Historical Price List (Past Quotations + Sales + Price Catalog) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              <span className="flex items-center gap-1.5">
                <History className="h-3.5 w-3.5" />
                <span>
                  {l({
                    bn: `পূর্বের কোটেশন ও বিক্রয় প্রাইস লিস্ট (${matchedPriceEntries.length})`,
                    en: `Past Quotes & Sales Price List (${matchedPriceEntries.length})`,
                  })}
                </span>
              </span>
              <span className="text-[10px] text-slate-400 font-normal normal-case">
                {l({
                  bn: 'স্টক এন্ট্রি থাকুক বা না থাকুক, আগের দর দেখে সাথে সাথে যোগ করুন',
                  en: 'Shows historical prices even for items not added to stock DB',
                })}
              </span>
            </div>

            {matchedPriceEntries.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400">
                {l({
                  bn: 'প্রাইস লিস্টে এই নামে কোনো পার্টস বা মেশিন পাওয়া যায়নি।',
                  en: 'No matching entries found in past quotations or sales price list.',
                })}
              </div>
            ) : (
              <div className="space-y-2">
                {matchedPriceEntries.map((row) => {
                  const mSummary = formatMachineSummary(row);
                  return (
                    <div
                      key={row.uid}
                      className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 bg-slate-50/50 dark:bg-slate-800/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors"
                    >
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100">
                            {row.partName}
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200/70 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                            {row.unit}
                          </span>
                          {row.inStockDb ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800">
                              <CheckCircle2 className="h-2.5 w-2.5" />
                              স্টকে আছে ({row.stockQty})
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800">
                              স্টক এন্ট্রি নেই · প্রাইস লিস্ট
                            </span>
                          )}
                        </div>

                        {mSummary && (
                          <div className="text-[11px] text-indigo-700 dark:text-indigo-300 font-semibold flex items-center gap-1.5 flex-wrap">
                            <Cpu className="h-3 w-3 shrink-0" />
                            <span>{mSummary}</span>
                          </div>
                        )}

                        <div className="flex flex-wrap items-center gap-3 text-[10.5px] text-slate-500">
                          {row.lastDocNumber && (
                            <span className="inline-flex items-center gap-1 font-mono">
                              {row.sourceType === 'quotation' ? (
                                <FileSpreadsheet className="h-3 w-3 text-purple-500" />
                              ) : (
                                <Receipt className="h-3 w-3 text-emerald-500" />
                              )}
                              {row.lastDocNumber}
                            </span>
                          )}
                          {row.lastCustomerName && <span>• {row.lastCustomerName}</span>}
                          {row.lastDocDate && <span>• {formatDate(row.lastDocDate)}</span>}
                          {row.lastQuotedPrice > 0 && (
                            <span className="text-purple-600 dark:text-purple-400 font-semibold">
                              Quote: {formatCurrency(row.lastQuotedPrice, settings.currency)}
                            </span>
                          )}
                          {row.lastSoldPrice > 0 && (
                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                              Sold: {formatCurrency(row.lastSoldPrice, settings.currency)}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 justify-between sm:justify-end">
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block">
                            {l({ bn: 'সর্বশেষ দর', en: 'Last Price' })}
                          </span>
                          <span className="font-mono font-black text-sm text-indigo-600 dark:text-indigo-400">
                            {formatCurrency(row.price, settings.currency)}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            onSelectPart({
                              productId: row.linkedProductId || 'custom',
                              name: row.partName,
                              unit: row.unit || 'pc',
                              unitPrice: row.price,
                              machineDetails: row,
                            });
                            handleClose();
                          }}
                          className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1 transition-colors"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>{l({ bn: 'বসান', en: 'Use' })}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section 2: Formal Stock Inventory Products */}
          <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              <span className="flex items-center gap-1.5">
                <Package className="h-3.5 w-3.5" />
                <span>
                  {l({
                    bn: `ইনভেন্টরি স্টক ক্যাটালগ (${matchedProducts.length})`,
                    en: `Stock Inventory Catalog (${matchedProducts.length})`,
                  })}
                </span>
              </span>
            </div>

            {matchedProducts.length === 0 ? (
              <div className="p-3 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400">
                {l({ bn: 'স্টক ক্যাটালগে ম্যাচ পাওয়া যায়নি।', en: 'No formal inventory products matched.' })}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {matchedProducts.map((p) => (
                  <div
                    key={p.uid}
                    className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-emerald-500 bg-white dark:bg-slate-900 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
                        {p.partName}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate">
                        {[p.machineName, p.model, `SKU: ${p.sku}`].filter(Boolean).join(' · ')}
                      </div>
                      <div className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 font-semibold mt-0.5">
                        {formatCurrency(p.price, settings.currency)} · Stock: {p.stockQty} {p.unit}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onSelectPart({
                          productId: p.productId,
                          name: p.partName,
                          unit: p.unit,
                          unitPrice: p.price,
                        });
                        handleClose();
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold shrink-0"
                    >
                      + {l({ bn: 'যোগ', en: 'Add' })}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
