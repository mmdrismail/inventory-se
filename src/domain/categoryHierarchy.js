import { cleanStr } from './machineSpecs';

/**
 * Pure hierarchical category tree builder & selector helpers.
 * Works identically on flat MongoDB categories (`parentId === null`) and nested multi-level categories.
 */

export const buildCategoryTree = (categories = [], products = []) => {
  const safeCats = Array.isArray(categories) ? categories.filter((c) => c && typeof c === 'object') : [];
  const safeProds = Array.isArray(products) ? products.filter((p) => p && typeof p === 'object') : [];

  const ownCountMap = {};
  for (const prod of safeProds) {
    const cid = prod.categoryId ? String(prod.categoryId) : '';
    if (cid) ownCountMap[cid] = (ownCountMap[cid] || 0) + 1;
  }

  const byId = new Map();
  for (const cat of safeCats) {
    const id = String(cat._id || cat.id);
    if (!id) continue;
    byId.set(id, {
      ...cat,
      id,
      _id: cat._id || cat.id,
      parentId: cat.parentId ? String(cat.parentId) : null,
      children: [],
      level: Number(cat.level) || 0,
      path: cleanStr(cat.path || cat.name),
      ownProductCount: ownCountMap[id] || 0,
      totalProductCount: ownCountMap[id] || 0,
      descendantIds: [id],
    });
  }

  const roots = [];
  for (const node of byId.values()) {
    if (node.parentId && node.parentId !== node.id && byId.has(node.parentId)) {
      byId.get(node.parentId).children.push(node);
    } else {
      roots.push(node);
    }
  }

  const sortNodes = (list) =>
    list.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0) || cleanStr(a.name).localeCompare(cleanStr(b.name)));

  const walk = (node, depth = 0, parentPath = '', visited = new Set()) => {
    if (visited.has(node.id)) return { total: 0, ids: [] };
    visited.add(node.id);

    node.level = depth;
    node.path = parentPath ? `${parentPath} › ${cleanStr(node.name)}` : cleanStr(node.name);
    sortNodes(node.children);

    let total = node.ownProductCount;
    const descIds = [node.id];
    for (const child of node.children) {
      const sub = walk(child, depth + 1, node.path, visited);
      total += sub.total;
      for (const did of sub.ids) descIds.push(did);
    }
    node.totalProductCount = total;
    node.descendantIds = Array.from(new Set(descIds));
    return { total, ids: node.descendantIds };
  };

  sortNodes(roots);
  for (const root of roots) {
    walk(root, 0, '', new Set());
  }

  const descendantMap = {};
  for (const node of byId.values()) {
    descendantMap[node.id] = new Set(node.descendantIds);
  }

  return {
    roots,
    byId,
    descendantMap,
    ownCountMap,
  };
};

export const flattenCategoryTree = (roots = []) => {
  const flat = [];
  const visit = (node, depth = 0) => {
    const prefix = depth > 0 ? `${'── '.repeat(depth)}` : '';
    flat.push({
      ...node,
      depth,
      indentLabel: `${prefix}${node.name}`,
      pathLabel: node.path || node.name,
    });
    for (const child of node.children || []) {
      visit(child, depth + 1);
    }
  };
  for (const root of roots) {
    visit(root, 0);
  }
  return flat;
};

export const getDescendantCategoryIds = (categories = [], selectedCategoryId = '') => {
  const target = cleanStr(selectedCategoryId);
  if (!target) return new Set();
  const { descendantMap } = buildCategoryTree(categories, []);
  return descendantMap[target] || new Set([target]);
};
