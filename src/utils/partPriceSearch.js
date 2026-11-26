/**
 * Facade re-exporting canonical machine specs & unified hierarchical parts index
 * from `src/domain/*` so all existing page imports continue working seamlessly.
 */
export {
  EMPTY_MACHINE_DETAILS,
  normalizeMachineDetails,
  hasAnyMachineDetails,
  formatMachineSummary,
  buildMachineKey,
  inferBrandFromMachineName,
} from '../domain/machineSpecs';

export {
  matchesMultiTokens,
  buildUnifiedPartsIndex,
  buildMachineCatalogTree,
  searchUnifiedParts,
} from '../domain/catalogHierarchy';
