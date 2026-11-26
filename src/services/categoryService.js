import { storageService, STORAGE_KEYS } from './storageService';
import { apiClient } from './apiClient';
import { getDescendantCategoryIds } from '../domain/categoryHierarchy';

class CategoryService {
  getAll() {
    return storageService.getItem(STORAGE_KEYS.CATEGORIES, []);
  }

  getById(id) {
    const categories = this.getAll();
    return categories.find((c) => c.id === id || c._id === id) || null;
  }

  create(data) {
    const categories = this.getAll();
    const cleanName = String(data.name || '').trim();
    if (!cleanName) {
      return { success: false, message: 'Category name is required.' };
    }

    const exists = categories.some((c) => c.name.toLowerCase() === cleanName.toLowerCase());
    if (exists) {
      return { success: false, message: `Category "${cleanName}" already exists.` };
    }

    const parentId = data.parentId || null;
    const parent = parentId ? categories.find((c) => String(c.id || c._id) === String(parentId)) : null;

    const newCategory = {
      id: `cat-${Date.now()}`,
      name: cleanName,
      parentId: parent ? parent._id || parent.id : parentId,
      level: parent ? (Number(parent.level) || 0) + 1 : 0,
      path: parent ? `${parent.path || parent.name} › ${cleanName}` : cleanName,
      description: data.description?.trim() || '',
      color: data.color || 'emerald',
      status: data.status || 'active',
      createdAt: new Date().toISOString(),
    };

    categories.push(newCategory);
    storageService.setItem(STORAGE_KEYS.CATEGORIES, categories);

    const syncPromise = apiClient
      .post('/categories', {
        name: newCategory.name,
        description: newCategory.description,
        parentId: newCategory.parentId || null,
        color: newCategory.color,
        status: newCategory.status,
      })
      .then((res) => {
        if (res && res.data && res.data._id) {
          const cur = storageService.getItem(STORAGE_KEYS.CATEGORIES, []);
          const idx = cur.findIndex((c) => c.name.toLowerCase() === newCategory.name.toLowerCase());
          if (idx !== -1) {
            cur[idx] = {
              ...cur[idx],
              ...res.data,
              id: res.data._id,
              _id: res.data._id,
            };
            storageService.setItem(STORAGE_KEYS.CATEGORIES, cur);
          }
        }
        return res;
      })
      .catch((err) => {
        console.warn('[MongoDB Category sync]:', err.message);
        return null;
      });

    return { success: true, category: newCategory, syncPromise };
  }

  update(id, updates) {
    const categories = this.getAll();
    const index = categories.findIndex((c) => String(c.id || c._id) === String(id));
    if (index === -1) {
      return { success: false, message: 'Category not found.' };
    }

    const current = categories[index];
    const nextName = updates.name ? updates.name.trim() : current.name;

    if (updates.name && nextName.toLowerCase() !== current.name.toLowerCase()) {
      const exists = categories.some(
        (c) => String(c.id || c._id) !== String(id) && c.name.toLowerCase() === nextName.toLowerCase()
      );
      if (exists) {
        return { success: false, message: `Another category named "${updates.name}" already exists.` };
      }
    }

    const nextParentId = updates.parentId !== undefined ? updates.parentId || null : current.parentId || null;
    if (nextParentId) {
      const descIds = getDescendantCategoryIds(categories, id);
      if (descIds.has(String(nextParentId))) {
        return { success: false, message: 'Cannot move a category inside itself or one of its sub-categories.' };
      }
    }

    const parent = nextParentId
      ? categories.find((c) => String(c.id || c._id) === String(nextParentId))
      : null;

    categories[index] = {
      ...current,
      ...updates,
      name: nextName,
      parentId: parent ? parent._id || parent.id : nextParentId,
      level: parent ? (Number(parent.level) || 0) + 1 : 0,
      path: parent ? `${parent.path || parent.name} › ${nextName}` : nextName,
      updatedAt: new Date().toISOString(),
    };

    storageService.setItem(STORAGE_KEYS.CATEGORIES, categories);

    const targetId = categories[index]._id || categories[index].id || id;
    const syncPromise = apiClient
      .put(`/categories/${targetId}`, {
        ...updates,
        name: nextName,
        parentId: nextParentId,
      })
      .catch((err) => {
        console.warn('[MongoDB Category update notice]:', err.message);
        return null;
      });

    return { success: true, category: categories[index], syncPromise };
  }

  remove(id) {
    const categories = this.getAll();
    const category = categories.find((c) => String(c.id || c._id) === String(id));
    if (!category) {
      return { success: false, message: 'Category not found.' };
    }

    const catIds = new Set([category.id, category._id, id].filter(Boolean).map(String));

    const hasChild = categories.some((c) => c.parentId && catIds.has(String(c.parentId)));
    if (hasChild) {
      return {
        success: false,
        message: `Cannot delete "${category.name}" because it contains child sub-categories. Remove or re-parent child categories first.`,
      };
    }

    const products = storageService.getItem(STORAGE_KEYS.PRODUCTS, []);
    const assignedProducts = products.filter((p) => p.categoryId && catIds.has(String(p.categoryId)));
    if (assignedProducts.length > 0) {
      return {
        success: false,
        message: `Cannot delete "${category.name}" because ${assignedProducts.length} product(s) are assigned to it. Please reassign those products first.`,
      };
    }

    const filtered = categories.filter((c) => !catIds.has(String(c.id || c._id)));
    storageService.setItem(STORAGE_KEYS.CATEGORIES, filtered);

    const targetId = category._id || category.id || id;
    const syncPromise = apiClient.delete(`/categories/${targetId}`).catch((err) => {
      console.warn('[MongoDB Category delete notice]:', err.message);
      return null;
    });

    return { success: true, message: `Category "${category.name}" removed.`, syncPromise };
  }
}

export const categoryService = new CategoryService();
