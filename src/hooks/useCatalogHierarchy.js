import { useMemo } from 'react';
import { useAppData } from '../context/AppDataContext';
import { getDescendantCategoryIds } from '../domain/categoryHierarchy';
import { normalizeMachineDetails, buildMachineKey } from '../domain/machineSpecs';

/**
 * Modular domain hook providing unified, hierarchical access to
 * Categories (tree + descendant lookup), Machine Profiles (Brand -> Model -> Parts),
 * and quick part/price lookup without duplicating tree aggregation inside pages.
 */
export const useCatalogHierarchy = () => {
  const {
    categories,
    categoryTree,
    categoryById,
    categoryDescendantMap,
    flatCategories,
    machineModels,
    machineCatalogHierarchy,
    products,
    priceCatalog,
    quotations,
    sales,
    saveMachineModel,
    deleteMachineModel,
  } = useAppData();

  const savedMachineProfiles = useMemo(() => {
    const map = new Map();
    const pushProfile = (raw) => {
      if (!raw || typeof raw !== 'object') return;
      const md = normalizeMachineDetails(raw);
      if (!md.machineName && !md.model && !md.hp && !md.ton && !md.cylinder) return;
      const key = buildMachineKey(md);
      if (key && !map.has(key)) {
        map.set(key, {
          ...md,
          machineModelId: raw._id || raw.id || md.machineModelId || null,
        });
      }
    };

    (machineModels || []).forEach(pushProfile);
    (priceCatalog || []).forEach(pushProfile);
    (quotations || []).forEach((q) => pushProfile(q.machineDetails));
    (sales || []).forEach((s) => pushProfile(s.machineDetails));
    return Array.from(map.values()).slice(0, 100);
  }, [machineModels, priceCatalog, quotations, sales]);

  const filterProductsByCategory = (selectedCategoryId, sourceProducts = products) => {
    if (!selectedCategoryId) return sourceProducts;
    const validIds =
      categoryDescendantMap?.[String(selectedCategoryId)] ||
      getDescendantCategoryIds(categories, selectedCategoryId);
    return (sourceProducts || []).filter((p) => p.categoryId && validIds.has(String(p.categoryId)));
  };

  return {
    categoryTree: categoryTree || [],
    categoryById,
    categoryDescendantMap,
    flatCategories: flatCategories || [],
    machineModels: machineModels || [],
    machineCatalogHierarchy: machineCatalogHierarchy || [],
    savedMachineProfiles,
    filterProductsByCategory,
    saveMachineModel,
    deleteMachineModel,
  };
};
