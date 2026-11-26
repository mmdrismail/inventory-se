import React, { useState, useMemo } from 'react';
import { useAppData } from '../../context/AppDataContext';
import { useLanguage } from '../../context/LanguageContext';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input, Textarea, Select } from '../../components/forms/FormControls';
import { Modal } from '../../components/common/Modal';
import { Badge } from '../../components/common/Badge';
import { EmptyState } from '../../components/common/EmptyState';
import { Plus, Search, Edit2, Trash2, FolderTree, Package } from 'lucide-react';

export const CategoryListPage = () => {
  const {
    categories,
    flatCategories,
    categoryById,
    categoryDescendantMap,
    products,
    addCategory,
    updateCategory,
    deleteCategory,
    confirmAction,
  } = useAppData();
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    parentId: '',
    description: '',
    status: 'active',
  });
  const [errors, setErrors] = useState({});

  const orderedCategories = useMemo(
    () => (flatCategories && flatCategories.length > 0 ? flatCategories : categories),
    [flatCategories, categories]
  );

  const filteredCategories = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return orderedCategories.filter((c) => {
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        (c.pathLabel && c.pathLabel.toLowerCase().includes(q)) ||
        (c.description && c.description.toLowerCase().includes(q))
      );
    });
  }, [orderedCategories, searchTerm]);

  const validParentOptions = useMemo(() => {
    const blockedIds = editingCategory ? categoryDescendantMap?.[editingCategory.id] || new Set([editingCategory.id]) : new Set();
    return [
      { value: '', label: 'মূল ক্যাটাগরি (Root Category)' },
      ...orderedCategories
        .filter((c) => !blockedIds.has(String(c.id)))
        .map((c) => ({ value: c.id, label: c.indentLabel || c.pathLabel || c.name })),
    ];
  }, [orderedCategories, editingCategory, categoryDescendantMap]);

  const handleOpenAdd = (defaultParentId = '') => {
    setEditingCategory(null);
    setFormData({ name: '', parentId: defaultParentId, description: '', status: 'active' });
    setErrors({});
    setIsModalOpen(true);
  };

  const handleOpenEdit = (category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      parentId: category.parentId || '',
      description: category.description || '',
      status: category.status || 'active',
    });
    setErrors({});
    setIsModalOpen(true);
  };

  const handleDelete = (category) => {
    const hasChild = orderedCategories.some((c) => c.parentId && String(c.parentId) === String(category.id));
    if (hasChild) {
      alert(`Cannot delete "${category.name}" because it has child sub-categories. Remove or move child categories first.`);
      return;
    }

    const ownCount = category.ownProductCount ?? products.filter((p) => String(p.categoryId) === String(category.id)).length;
    if (ownCount > 0) {
      alert(`Cannot delete category "${category.name}" because it currently has ${ownCount} product(s) assigned. Please reassign or delete those products first.`);
      return;
    }

    confirmAction({
      title: `Delete Category "${category.name}"?`,
      message: 'Are you sure you want to remove this category? This cannot be undone.',
      confirmText: 'Delete Category',
      isDestructive: true,
      onConfirm: () => {
        deleteCategory(category.id);
      },
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setErrors({ name: 'Category name is required.' });
      return;
    }

    const payload = {
      ...formData,
      parentId: formData.parentId || null,
    };

    if (editingCategory) {
      const res = updateCategory(editingCategory.id, payload);
      if (res.success) {
        setIsModalOpen(false);
      } else {
        setErrors({ form: res.message });
      }
    } else {
      const res = addCategory(payload);
      if (res.success) {
        setIsModalOpen(false);
      } else {
        setErrors({ form: res.message });
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {t('categories_title', 'Product Categories')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t('categories_subtitle', 'Organize catalog inventory into clear departmental groupings.')}
          </p>
        </div>

        <Button variant="primary" size="sm" icon={Plus} onClick={() => handleOpenAdd('')}>
          {t('btn_add_category', 'Add Category')}
        </Button>
      </div>

      {/* Search Bar */}
      <Card className="p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search categories by name or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
          <span className="text-xs text-slate-400 font-medium">
            {filteredCategories.length} categories
          </span>
        </div>
      </Card>

      {/* Grid of Category Cards */}
      {filteredCategories.length === 0 ? (
        <EmptyState
          title="No categories found"
          description="Try adjusting your search query or create a new category."
          actionText="Add Category"
          onAction={() => handleOpenAdd('')}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCategories.map((c) => {
            const ownCount = c.ownProductCount ?? products.filter((p) => String(p.categoryId) === String(c.id)).length;
            const totalCount = c.totalProductCount ?? ownCount;
            const depth = c.depth || c.level || 0;
            const parentCat = c.parentId ? categoryById?.get(String(c.parentId)) : null;
            return (
              <Card key={c.id} className="p-5 flex flex-col justify-between hover:shadow-md transition-all">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                        <FolderTree className="h-5 w-5" />
                      </div>
                      {depth > 0 && (
                        <Badge variant="blue" size="sm">
                          Sub-level {depth}
                        </Badge>
                      )}
                    </div>
                    <Badge variant={c.status === 'active' ? 'emerald' : 'slate'} size="sm">
                      {c.status || 'Active'}
                    </Badge>
                  </div>

                  <div>
                    {parentCat && (
                      <div className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 mb-0.5 truncate">
                        {c.pathLabel || `${parentCat.name} › ${c.name}`}
                      </div>
                    )}
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                      {c.name}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      {c.description || 'No description provided.'}
                    </p>
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                    <Package className="h-3.5 w-3.5 text-slate-400" />
                    <span>
                      {totalCount} product{totalCount === 1 ? '' : 's'}
                      {totalCount > ownCount ? ` (${ownCount} direct)` : ''}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenAdd(c.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors"
                      title="Add Sub-Category"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleOpenEdit(c)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
                      title="Edit Category"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(c)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                      title="Delete Category"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT CATEGORY MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCategory ? 'Edit Category' : 'Create New Category'}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {errors.form && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-600 dark:text-red-400 font-medium">
              {errors.form}
            </div>
          )}

          <Input
            label="Category Name"
            name="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            error={errors.name}
            placeholder="e.g. Electrical & Lighting"
            required
          />

          <Select
            label="Parent Category (Hierarchy)"
            name="parentId"
            value={formData.parentId}
            onChange={(e) => setFormData({ ...formData, parentId: e.target.value })}
            options={validParentOptions}
          />

          <Textarea
            label="Description"
            name="description"
            rows={3}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Brief description of items cataloged in this department..."
          />

          <Select
            label="Status"
            name="status"
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            options={[
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
            ]}
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              {editingCategory ? 'Save Changes' : 'Create Category'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
