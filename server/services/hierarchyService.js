const mongoose = require('mongoose');
const Category = require('../models/Category');
const MachineModel = require('../models/MachineModel');
const {
  cleanStr,
  slugify,
  inferBrandFromMachineName,
  normalizeMachineDetails,
  buildMachineKey,
} = require('../utils/domainNormalizers');

/**
 * Computes hierarchical tree metadata (`slug`, `parentId`, `ancestors`, `level`, `path`)
 * for a Category before save/update, rejecting self-parenting and cycles.
 */
const computeCategoryHierarchyFields = async ({ name, parentId, existingId = null }) => {
  const cleanName = cleanStr(name);
  const slug = slugify(cleanName);

  if (!parentId || parentId === 'root' || parentId === 'none') {
    return {
      slug,
      parentId: null,
      ancestors: [],
      level: 0,
      path: cleanName,
    };
  }

  if (existingId && String(parentId) === String(existingId)) {
    const err = new Error('A category cannot be its own parent.');
    err.statusCode = 400;
    throw err;
  }

  let parent = null;
  if (mongoose.Types.ObjectId.isValid(parentId)) {
    parent = await Category.findById(parentId).lean();
  } else {
    parent = await Category.findOne({ $or: [{ id: String(parentId) }, { slug: String(parentId).toLowerCase() }] }).lean();
  }

  if (!parent) {
    const err = new Error('Parent category not found.');
    err.statusCode = 400;
    throw err;
  }

  const parentAncestors = Array.isArray(parent.ancestors) ? parent.ancestors : [];
  if (existingId && parentAncestors.some((aid) => String(aid) === String(existingId))) {
    const err = new Error('Circular category hierarchy detected (parent is a descendant of this category).');
    err.statusCode = 400;
    throw err;
  }

  const ancestors = [...parentAncestors, parent._id];
  const parentPath = cleanStr(parent.path || parent.name);

  return {
    slug,
    parentId: parent._id,
    ancestors,
    level: ancestors.length,
    path: parentPath ? `${parentPath} / ${cleanName}` : cleanName,
  };
};

/**
 * Updates descendant `ancestors`, `level`, and `path` whenever an existing category is renamed or reparented.
 */
const cascadeUpdateDescendantCategoryPaths = async (parentDoc) => {
  if (!parentDoc || !parentDoc._id) return;
  const directChildren = await Category.find({ parentId: parentDoc._id });
  for (const child of directChildren) {
    const parentAncestors = Array.isArray(parentDoc.ancestors) ? parentDoc.ancestors : [];
    const nextAncestors = [...parentAncestors, parentDoc._id];
    const parentPath = cleanStr(parentDoc.path || parentDoc.name);
    child.ancestors = nextAncestors;
    child.level = nextAncestors.length;
    child.path = parentPath ? `${parentPath} / ${cleanStr(child.name)}` : cleanStr(child.name);
    child.slug = child.slug || slugify(child.name);
    await child.save();
    await cascadeUpdateDescendantCategoryPaths(child);
  }
};

/**
 * Pure hierarchical category tree builder with recursive descendant counts.
 */
const buildCategoryTreeNodes = (categories = [], productCountByCat = {}) => {
  const byId = new Map();
  const nodes = (Array.isArray(categories) ? categories : []).map((raw) => {
    const idStr = String(raw._id || raw.id);
    const node = {
      ...raw,
      id: idStr,
      parentId: raw.parentId ? String(raw.parentId) : null,
      children: [],
      ownProductCount: Number(productCountByCat[idStr] || 0),
      totalProductCount: Number(productCountByCat[idStr] || 0),
      descendantIds: [idStr],
    };
    byId.set(idStr, node);
    return node;
  });

  const roots = [];
  for (const node of nodes) {
    if (node.parentId && node.parentId !== node.id && byId.has(node.parentId)) {
      byId.get(node.parentId).children.push(node);
    } else {
      roots.push(node);
    }
  }

  const computeSubtree = (node, depth = 0, parentPath = '', visited = new Set()) => {
    if (visited.has(node.id)) return { total: 0, ids: [] };
    visited.add(node.id);

    node.level = depth;
    node.path = parentPath ? `${parentPath} / ${cleanStr(node.name)}` : cleanStr(node.name);
    node.children.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0) || cleanStr(a.name).localeCompare(cleanStr(b.name)));

    let total = node.ownProductCount;
    const descIds = [node.id];
    for (const child of node.children) {
      const sub = computeSubtree(child, depth + 1, node.path, visited);
      total += sub.total;
      for (const cid of sub.ids) descIds.push(cid);
    }
    node.totalProductCount = total;
    node.descendantIds = Array.from(new Set(descIds));
    return { total, ids: node.descendantIds };
  };

  roots.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0) || cleanStr(a.name).localeCompare(cleanStr(b.name)));
  for (const root of roots) {
    computeSubtree(root, 0, '', new Set());
  }

  return roots;
};

/**
 * Resolves an existing canonical MachineModel by ID or machineKey, or creates it atomically on writes.
 */
const resolveOrUpsertMachineModel = async (rawMachineDetails = {}, { categoryId = null, createIfMissing = false } = {}) => {
  const md = normalizeMachineDetails(rawMachineDetails);
  const machineKey = buildMachineKey(md);

  if (!machineKey) {
    return {
      machineModelId: md.machineModelId || null,
      machineKey: '',
      machineDetails: md,
      machineModel: null,
    };
  }

  let doc = null;
  if (md.machineModelId && mongoose.Types.ObjectId.isValid(md.machineModelId)) {
    doc = await MachineModel.findById(md.machineModelId).lean();
  }
  if (!doc) {
    doc = await MachineModel.findOne({ machineKey }).lean();
  }

  if (!doc && createIfMissing && md.machineName) {
    const brand = cleanStr(rawMachineDetails?.brand) || inferBrandFromMachineName(md.machineName);
    doc = await MachineModel.findOneAndUpdate(
      { machineKey },
      {
        $setOnInsert: {
          machineName: md.machineName,
          brand,
          model: md.model,
          type: md.type,
          hp: md.hp,
          ton: md.ton,
          cylinder: md.cylinder,
          others: md.others,
          description: md.description,
          machineKey,
          slug: slugify([md.machineName, md.model, md.hp, md.ton].filter(Boolean).join('-')),
          categoryId: categoryId || null,
          status: 'active',
        },
      },
      { upsert: true, new: true }
    ).lean();
  }

  const resolvedId = doc?._id || md.machineModelId || null;
  return {
    machineModelId: resolvedId,
    machineKey,
    machineDetails: {
      ...md,
      machineModelId: resolvedId,
    },
    machineModel: doc,
  };
};

/**
 * Pure read-only hierarchical aggregator across explicit MachineModel docs, Products,
 * PartPriceCatalog entries, Quotations, and Sales. Safe for production (zero DB writes).
 */
const buildMachineCatalogTreeReadOnly = ({
  machineModels = [],
  products = [],
  priceCatalog = [],
  quotations = [],
  sales = [],
} = {}) => {
  const modelMap = new Map();

  const ensureNode = (rawSpec = {}, extra = {}) => {
    const md = normalizeMachineDetails(rawSpec);
    const machineKey = buildMachineKey(md);
    if (!machineKey) return null;

    if (!modelMap.has(machineKey)) {
      const displayMachine = md.machineName || md.model || 'General Machinery';
      modelMap.set(machineKey, {
        machineKey,
        machineModelId: extra.machineModelId || md.machineModelId || null,
        brand: cleanStr(rawSpec.brand) || inferBrandFromMachineName(displayMachine),
        machineName: displayMachine,
        model: md.model,
        type: md.type,
        hp: md.hp,
        ton: md.ton,
        cylinder: md.cylinder,
        others: md.others,
        description: md.description,
        categoryId: extra.categoryId || rawSpec.categoryId || null,
        stockProducts: [],
        priceEntries: [],
        quotationCount: 0,
        saleCount: 0,
        _productIds: new Set(),
        _priceIds: new Set(),
      });
    } else {
      const node = modelMap.get(machineKey);
      if (!node.machineModelId && (extra.machineModelId || md.machineModelId)) {
        node.machineModelId = extra.machineModelId || md.machineModelId;
      }
      if (!node.categoryId && (extra.categoryId || rawSpec.categoryId)) {
        node.categoryId = extra.categoryId || rawSpec.categoryId;
      }
    }
    return modelMap.get(machineKey);
  };

  for (const mm of machineModels) {
    ensureNode(mm, { machineModelId: mm._id || mm.id, categoryId: mm.categoryId });
  }

  // Index products by ID & lowercase name + model token map
  const productsByModelId = new Map();
  const productsByModelToken = new Map();
  for (const prod of products) {
    if (prod.primaryMachineModelId) {
      const pid = String(prod.primaryMachineModelId);
      if (!productsByModelId.has(pid)) productsByModelId.set(pid, []);
      productsByModelId.get(pid).push(prod);
    }
    for (const cmId of prod.compatibleMachineIds || []) {
      const cid = String(cmId);
      if (!productsByModelId.has(cid)) productsByModelId.set(cid, []);
      productsByModelId.get(cid).push(prod);
    }
    const tokens = [prod.modelNumber, ...(Array.isArray(prod.compatibleModels) ? prod.compatibleModels : [])]
      .map((t) => cleanStr(t).toLowerCase())
      .filter(Boolean);
    for (const tok of tokens) {
      if (!productsByModelToken.has(tok)) productsByModelToken.set(tok, []);
      productsByModelToken.get(tok).push(prod);
    }
  }

  for (const pc of priceCatalog) {
    const node = ensureNode(pc, { machineModelId: pc.machineModelId, categoryId: pc.categoryId });
    if (!node) continue;
    const key = String(pc._id || pc.id || pc.normalizedPartName);
    if (!node._priceIds.has(key)) {
      node._priceIds.add(key);
      node.priceEntries.push(pc);
    }
  }

  for (const q of quotations) {
    const node = ensureNode(q.machineDetails);
    if (node) node.quotationCount += 1;
  }

  for (const s of sales) {
    if (s.status === 'cancelled') continue;
    const node = ensureNode(s.machineDetails);
    if (node) node.saleCount += 1;
  }

  // Attach products matching explicit machineModelId or compatible model tokens
  for (const node of modelMap.values()) {
    const mid = node.machineModelId ? String(node.machineModelId) : null;
    if (mid && productsByModelId.has(mid)) {
      for (const prod of productsByModelId.get(mid)) {
        const pid = String(prod._id || prod.id);
        if (!node._productIds.has(pid)) {
          node._productIds.add(pid);
          node.stockProducts.push(prod);
        }
      }
    }
    const modelTok = cleanStr(node.model).toLowerCase();
    if (modelTok && productsByModelToken.has(modelTok)) {
      for (const prod of productsByModelToken.get(modelTok)) {
        const pid = String(prod._id || prod.id);
        if (!node._productIds.has(pid)) {
          node._productIds.add(pid);
          node.stockProducts.push(prod);
        }
      }
    }
  }

  // Group model nodes under Brand / Equipment Family
  const brandGroups = new Map();
  for (const node of modelMap.values()) {
    const { _productIds, _priceIds, ...cleanNode } = node;
    const groupKey = cleanStr(cleanNode.brand || cleanNode.machineName).toLowerCase();
    if (!brandGroups.has(groupKey)) {
      brandGroups.set(groupKey, {
        brand: cleanNode.brand || cleanNode.machineName,
        machineNames: new Set(),
        models: [],
        totalStockProducts: 0,
        totalPriceEntries: 0,
      });
    }
    const g = brandGroups.get(groupKey);
    if (cleanNode.machineName) g.machineNames.add(cleanNode.machineName);
    g.models.push(cleanNode);
    g.totalStockProducts += cleanNode.stockProducts.length;
    g.totalPriceEntries += cleanNode.priceEntries.length;
  }

  return Array.from(brandGroups.values())
    .map((g) => ({
      brand: g.brand,
      machineNames: Array.from(g.machineNames),
      models: g.models.sort((a, b) => cleanStr(a.model || a.machineName).localeCompare(cleanStr(b.model || b.machineName))),
      totalStockProducts: g.totalStockProducts,
      totalPriceEntries: g.totalPriceEntries,
    }))
    .sort((a, b) => a.brand.localeCompare(b.brand));
};

module.exports = {
  computeCategoryHierarchyFields,
  cascadeUpdateDescendantCategoryPaths,
  buildCategoryTreeNodes,
  resolveOrUpsertMachineModel,
  buildMachineCatalogTreeReadOnly,
};
