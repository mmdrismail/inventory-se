/**
 * Standard Inventory, Quotation, Sales & Procurement Measurement Units
 */
export const UNIT_OPTIONS = [
  { value: 'pc', bn: 'পিস (pc)', en: 'pc', obro: 'pc (পিস)' },
  { value: 'pair', bn: 'জোড়া (pair)', en: 'pair', obro: 'pair (জোড়া)' },
  { value: 'set', bn: 'সেট (set)', en: 'set', obro: 'set (সেট)' },
  { value: 'kg', bn: 'কেজি (kg)', en: 'kg', obro: 'kg (কেজি)' },
  { value: 'can', bn: 'ক্যান (can)', en: 'can', obro: 'can (ক্যান)' },
  { value: 'cylinder', bn: 'সিলিন্ডার (cylinder)', en: 'cylinder', obro: 'cylinder (সিলিন্ডার)' },
  { value: 'drum', bn: 'ড্রাম (drum)', en: 'drum', obro: 'drum (ড্রাম)' },
  { value: 'box', bn: 'বক্স (box)', en: 'box', obro: 'box (বক্স)' },
];

export const STANDARD_UNIT_VALUES = new Set(UNIT_OPTIONS.map((u) => u.value));

export const normalizeUnit = (unit, fallback = 'pc') => {
  if (!unit) return fallback;
  const trimmed = String(unit).trim();
  if (!trimmed) return fallback;
  if (trimmed.toLowerCase() === 'pcs') return 'pc';
  return trimmed;
};

export const getUnitLabel = (opt, language = 'en') => {
  if (language === 'en') return opt.en;
  if (language === 'obro') return opt.obro || `${opt.bn} (${opt.en})`;
  return opt.bn;
};

export const getUnitSelectOptions = (currentUnit, language = 'en', extraOptions = []) => {
  const seen = new Set();
  const list = [];

  for (const opt of [...UNIT_OPTIONS, ...extraOptions]) {
    if (!opt?.value || seen.has(opt.value)) continue;
    seen.add(opt.value);
    list.push({
      value: opt.value,
      label: getUnitLabel(opt, language),
    });
  }

  const normalized = normalizeUnit(currentUnit, '');
  if (normalized && !seen.has(normalized)) {
    list.push({ value: normalized, label: normalized });
  }

  return list;
};
