/**
 * Canonical frontend machine specification helpers.
 * Single source of truth for MachineProfile forms, PriceCatalog, Search, and Hierarchy trees.
 */

export const cleanStr = (v) => String(v || '').trim();

export const inferBrandFromMachineName = (machineName = '') => {
  const clean = cleanStr(machineName);
  if (!clean) return '';
  const firstWord = clean.split(/[\s/-]+/)[0] || '';
  return firstWord.length >= 2 ? firstWord : clean;
};

export const EMPTY_MACHINE_DETAILS = {
  machineModelId: null,
  machineName: '',
  model: '',
  type: '',
  hp: '',
  ton: '',
  cylinder: '',
  others: '',
  description: '',
  autoSaveToPriceCatalog: true,
};

export const normalizeMachineDetails = (raw = {}) => {
  if (!raw || typeof raw !== 'object') return { ...EMPTY_MACHINE_DETAILS };
  return {
    machineModelId: raw.machineModelId || null,
    machineName: cleanStr(raw.machineName),
    model: cleanStr(raw.model || raw.machineModel),
    type: cleanStr(raw.type || raw.machineType),
    hp: cleanStr(raw.hp),
    ton: cleanStr(raw.ton),
    cylinder: cleanStr(raw.cylinder || raw.cylender),
    others: cleanStr(raw.others),
    description: cleanStr(raw.description),
    autoSaveToPriceCatalog:
      raw.autoSaveToPriceCatalog !== undefined ? Boolean(raw.autoSaveToPriceCatalog) : true,
  };
};

export const hasAnyMachineDetails = (md = {}) => {
  if (!md || typeof md !== 'object') return false;
  return Boolean(
    cleanStr(md.machineName) ||
      cleanStr(md.model || md.machineModel) ||
      cleanStr(md.type || md.machineType) ||
      cleanStr(md.hp) ||
      cleanStr(md.ton) ||
      cleanStr(md.cylinder || md.cylender) ||
      cleanStr(md.others) ||
      cleanStr(md.description)
  );
};

export const formatMachineSummary = (md = {}) => {
  if (!md || typeof md !== 'object') return '';
  const parts = [
    cleanStr(md.machineName),
    cleanStr(md.model || md.machineModel) ? `Model: ${cleanStr(md.model || md.machineModel)}` : '',
    cleanStr(md.type || md.machineType) ? `Type: ${cleanStr(md.type || md.machineType)}` : '',
    cleanStr(md.hp) ? `${cleanStr(md.hp)} HP` : '',
    cleanStr(md.ton) ? `${cleanStr(md.ton)} Ton` : '',
    cleanStr(md.cylinder || md.cylender) ? `${cleanStr(md.cylinder || md.cylender)} Cyl` : '',
    cleanStr(md.others),
  ].filter(Boolean);
  return parts.join(' · ');
};

export const buildMachineKey = (md = {}) =>
  [
    md.machineName,
    md.model || md.machineModel,
    md.type || md.machineType,
    md.hp,
    md.ton,
    md.cylinder || md.cylender,
  ]
    .map((x) => cleanStr(x).toLowerCase())
    .filter(Boolean)
    .join('|');
