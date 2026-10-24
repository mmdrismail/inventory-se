import { storageService, STORAGE_KEYS } from './storageService';

class CategoryService {
  getAll() {
    return storageService.getItem(STORAGE_KEYS.CATEGORIES, []);
  }

  getById(id) {
    const categories = this.getAll();
    return categories.find((c) => c.id === id) || null;
  }

  create(data) {
    const categories = this.getAll();
    const exists = categories.some((c) => c.name.toLowerCase() === data.name.trim().toLowerCase());
    if (exists) {
      return { success: false, message: `Category "${data.name}" already exists.` };
    }

    const newCategory = {
      id: `cat-${Date.now()}`,
      name: data.name.trim(),
      description: data.description?.trim() || '',
      status: data.status || 'active',
      createdAt: new Date().toISOString(),
    };

    categories.push(newCategory);
    storageService.setItem(STORAGE_KEYS.CATEGORIES, categories);
    return { success: true, category: newCategory };
  }

  update(id, updates) {
    const categories = this.getAll();
    const index = categories.findIndex((c) => c.id === id);
    if (index === -1) {
      return { success: false, message: 'Category not found.' };
    }

    if (updates.name && updates.name.trim().toLowerCase() !== categories[index].name.toLowerCase()) {
      const exists = categories.some((c) => c.id !== id && c.name.toLowerCase() === updates.name.trim().toLowerCase());
      if (exists) {
        return { success: false, message: `Another category named "${updates.name}" already exists.` };
      }
    }

    categories[index] = {
      ...categories[index],
      ...updates,
      name: updates.name ? updates.name.trim() : categories[index].name,
      updatedAt: new Date().toISOString(),
    };

    storageService.setItem(STORAGE_KEYS.CATEGORIES, categories);
    return { success: true, category: categories[index] };
  }

  remove(id) {
    const categories = this.getAll();
    const category = categories.find((c) => c.id === id);
    if (!category) {
      return { success: false, message: 'Category not found.' };
    }

    // Safety check: are there products assigned to this category?
    const products = storageService.getItem(STORAGE_KEYS.PRODUCTS, []);
    const assignedProducts = products.filter((p) => p.categoryId === id);
    if (assignedProducts.length > 0) {
      return {
        success: false,
        message: `Cannot delete "${category.name}" because ${assignedProducts.length} product(s) are assigned to it. Please reassign those products first.`,
      };
    }

    const filtered = categories.filter((c) => c.id !== id);
    storageService.setItem(STORAGE_KEYS.CATEGORIES, filtered);
    return { success: true, message: `Category "${category.name}" removed.` };
  }
}

export const categoryService = new CategoryService();
