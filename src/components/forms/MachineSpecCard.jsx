import React, { useState, useMemo } from 'react';
import { Cpu, ChevronDown, ChevronUp, Sparkles, RotateCcw, Check } from 'lucide-react';
import { EMPTY_MACHINE_DETAILS, normalizeMachineDetails, formatMachineSummary } from '../../utils/partPriceSearch';

const COMMON_MACHINES = [
  'Bitzer Compressor',
  'Mycom Ammonia Compressor',
  'Sabroe Compressor',
  'Carrier Chiller',
  'Copeland Compressor',
  'Bock Compressor',
  'Grasso Compressor',
  'Frick Compressor',
  'York Chiller',
  'Daikin Compressor',
  'Ice Plant / Cold Storage',
];

const COMMON_TYPES = [
  'Semi-Hermetic Reciprocating',
  'Open Type Ammonia',
  'Screw Compressor',
  'Scroll Compressor',
  'Centrifugal Chiller',
  'Evaporative Condenser',
  'Air Cooled Condenser',
  'Cold Room / Blast Freezer',
];

export const MachineSpecCard = ({
  value = EMPTY_MACHINE_DETAILS,
  onChange,
  quotations = [],
  sales = [],
  priceCatalog = [],
  machineModels = [],
  language = 'bn',
  accentColor = 'purple', // 'purple' | 'emerald'
  compact = false,
  defaultExpanded = true,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const l = (texts) => {
    if (language === 'en') return texts.en;
    if (language === 'obro') return texts.obro || `${texts.bn} (${texts.en})`;
    return texts.bn;
  };

  const md = normalizeMachineDetails(value);

  // Collect previously saved distinct Machine Profiles for 1-click quick fill
  const savedProfiles = useMemo(() => {
    const map = new Map();
    const pushSpec = (raw) => {
      const m = normalizeMachineDetails(raw);
      if (!m.machineName && !m.model && !m.hp && !m.ton && !m.cylinder) return;
      const key = `${m.machineName}|${m.model}|${m.type}|${m.hp}|${m.ton}|${m.cylinder}`.toLowerCase();
      if (!map.has(key)) {
        map.set(key, {
          ...m,
          machineModelId: raw?._id || raw?.id || m.machineModelId || null,
        });
      }
    };
    (machineModels || []).forEach(pushSpec);
    (priceCatalog || []).forEach(pushSpec);
    (quotations || []).forEach((q) => pushSpec(q.machineDetails));
    (sales || []).forEach((s) => pushSpec(s.machineDetails));
    return Array.from(map.values()).slice(0, 80);
  }, [machineModels, priceCatalog, quotations, sales]);

  const knownMachineNames = useMemo(() => {
    const set = new Set(COMMON_MACHINES);
    savedProfiles.forEach((p) => {
      if (p.machineName) set.add(p.machineName);
    });
    return Array.from(set);
  }, [savedProfiles]);

  const updateField = (field, nextVal) => {
    if (typeof onChange !== 'function') return;
    onChange({
      ...md,
      [field]: nextVal,
    });
  };

  const handleApplySavedProfile = (keyIdx) => {
    if (keyIdx === '') return;
    const picked = savedProfiles[Number(keyIdx)];
    if (!picked || typeof onChange !== 'function') return;
    onChange({
      ...picked,
      autoSaveToPriceCatalog: md.autoSaveToPriceCatalog,
    });
  };

  const borderClass =
    accentColor === 'emerald'
      ? 'border-l-4 border-l-emerald-500 border-emerald-200/80 dark:border-emerald-900/60'
      : 'border-l-4 border-l-indigo-500 border-indigo-200/80 dark:border-indigo-900/60';

  const summary = formatMachineSummary(md);

  return (
    <div
      className={`rounded-2xl bg-white dark:bg-slate-900 border shadow-sm overflow-hidden ${borderClass}`}
    >
      {/* Header Strip */}
      <div className="px-4 py-3 bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200/70 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <Cpu className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                {l({
                  bn: 'মেশিন ও টেকনিক্যাল স্পেসিফিকেশন বক্স (Machine Profile)',
                  en: 'Machine & Equipment Technical Specs',
                  obro: 'Machine & Technical Spec Profile Box',
                })}
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold border border-indigo-200 dark:border-indigo-800">
                {l({
                  bn: 'প্রাইস লিস্টে সেভ হয়',
                  en: 'Auto-Indexed for Price Search',
                })}
              </span>
            </div>
            {!isExpanded && summary ? (
              <p className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold truncate mt-0.5">
                {summary}
              </p>
            ) : (
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {l({
                  bn: 'মেশিনের নাম, মডেল, ধরন, HP, টন, সিলিন্ডার ও বিবরণ লিখে রাখলে পরে শুধু মেশিন+পার্টস লিখে সার্চ করলেই আগের দাম পেয়ে যাবেন।',
                  en: 'Saved directly to MongoDB and auto-linked into your Parts Price List for future searches even if items are not in formal stock yet.',
                })}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Auto Save Price Catalog Toggle */}
          <button
            type="button"
            onClick={() => updateField('autoSaveToPriceCatalog', !md.autoSaveToPriceCatalog)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all select-none ${
              md.autoSaveToPriceCatalog
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300'
                : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-500'
            }`}
            title={l({
              bn: 'প্রতিটি কোটেশন ও বিক্রয় থেকে এই মেশিনের পার্টস ও দর প্রাইস লিস্টে সেভ হবে',
              en: 'Automatically save line items + machine spec to searchable Price List',
            })}
          >
            <span
              className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] ${
                md.autoSaveToPriceCatalog ? 'bg-emerald-600 text-white' : 'bg-slate-300 text-transparent'
              }`}
            >
              <Check className="h-2.5 w-2.5" />
            </span>
            <span>
              {md.autoSaveToPriceCatalog
                ? l({ bn: 'প্রাইস লিস্ট সেভ: চালু', en: 'Price Index: ON' })
                : l({ bn: 'প্রাইস লিস্ট সেভ: বন্ধ', en: 'Price Index: OFF' })}
            </span>
          </button>

          {/* Saved Machine Spec Picker */}
          {savedProfiles.length > 0 && (
            <select
              value=""
              onChange={(e) => handleApplySavedProfile(e.target.value)}
              className="px-2.5 py-1 text-[11px] rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/70 dark:bg-indigo-950/30 text-indigo-800 dark:text-indigo-200 font-semibold max-w-[200px]"
            >
              <option value="">
                {l({ bn: '⚡ আগের মেশিন বাছুন...', en: '⚡ Quick Pick Machine...' })}
              </option>
              {savedProfiles.map((p, idx) => (
                <option key={idx} value={idx}>
                  {formatMachineSummary(p)}
                </option>
              ))}
            </select>
          )}

          {summary && (
            <button
              type="button"
              onClick={() =>
                onChange?.({
                  ...EMPTY_MACHINE_DETAILS,
                  autoSaveToPriceCatalog: md.autoSaveToPriceCatalog,
                })
              }
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
              title={l({ bn: 'মেশিন তথ্য মুছুন', en: 'Clear Machine Fields' })}
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200/70 dark:hover:bg-slate-700 transition-colors"
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Form Fields */}
      {isExpanded && (
        <div className={`p-4 space-y-3 ${compact ? 'text-xs' : ''}`}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Machine Name */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                {l({ bn: 'মেশিনের নাম (Machine Name)', en: 'Machine Name' })}
              </label>
              <input
                type="text"
                list="stockline-machine-names"
                value={md.machineName}
                onChange={(e) => updateField('machineName', e.target.value)}
                placeholder={l({ bn: 'যেমন: Bitzer / Mycom / Sabroe', en: 'e.g. Bitzer Compressor' })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
              <datalist id="stockline-machine-names">
                {knownMachineNames.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            </div>

            {/* Model */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                {l({ bn: 'মডেল (Model)', en: 'Model Number' })}
              </label>
              <input
                type="text"
                value={md.model}
                onChange={(e) => updateField('model', e.target.value)}
                placeholder="e.g. 4EC-6.2Y / N6WA / 6GE-40"
                className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            {/* Type */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                {l({ bn: 'ধরন (Type)', en: 'Machine Type' })}
              </label>
              <input
                type="text"
                list="stockline-machine-types"
                value={md.type}
                onChange={(e) => updateField('type', e.target.value)}
                placeholder={l({ bn: 'যেমন: Semi-Hermetic / Ammonia', en: 'e.g. Semi-Hermetic / Screw' })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
              <datalist id="stockline-machine-types">
                {COMMON_TYPES.map((tp) => (
                  <option key={tp} value={tp} />
                ))}
              </datalist>
            </div>

            {/* Cylinder */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                {l({ bn: 'সিলিন্ডার (Cylinder)', en: 'Cylinder' })}
              </label>
              <input
                type="text"
                value={md.cylinder}
                onChange={(e) => updateField('cylinder', e.target.value)}
                placeholder="e.g. 4 Cyl / 6 Cylinder / 8 Cyl"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            {/* HP */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                {l({ bn: 'HP (অশ্বশক্তি)', en: 'HP' })}
              </label>
              <input
                type="text"
                value={md.hp}
                onChange={(e) => updateField('hp', e.target.value)}
                placeholder="e.g. 15 / 30"
                className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            {/* Ton */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                {l({ bn: 'টন (Ton / TR)', en: 'Ton / TR' })}
              </label>
              <input
                type="text"
                value={md.ton}
                onChange={(e) => updateField('ton', e.target.value)}
                placeholder="e.g. 10 / 50"
                className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            {/* Others */}
            <div className="lg:col-span-2">
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                {l({ bn: 'অন্যান্য (Serial / RPM / Volt / Gas)', en: 'Others (Serial / Volt / Refrigerant)' })}
              </label>
              <input
                type="text"
                value={md.others}
                onChange={(e) => updateField('others', e.target.value)}
                placeholder="e.g. 1450 RPM, 380V, R-404A / Ammonia"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            {/* Description */}
            <div className="lg:col-span-2">
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                {l({ bn: 'বিবরণ (Machine / Work Description)', en: 'Description' })}
              </label>
              <input
                type="text"
                value={md.description}
                onChange={(e) => updateField('description', e.target.value)}
                placeholder={l({
                  bn: 'যেমন: প্ল্যান্ট #২ ওভারহোলিং বা কম্প্রেসার স্পেয়ার',
                  en: 'e.g. Plant #2 Compressor overhauling parts',
                })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          {summary && (
            <div className="px-3 py-1.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/70 dark:border-indigo-900/50 text-[11px] text-indigo-800 dark:text-indigo-200 flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 shrink-0 text-indigo-600" />
              <span className="font-semibold truncate">{summary}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
