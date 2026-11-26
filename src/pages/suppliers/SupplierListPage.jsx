import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAppData } from '../../context/AppDataContext';
import { useLanguage } from '../../context/LanguageContext';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input, Textarea, Select } from '../../components/forms/FormControls';
import { Modal } from '../../components/common/Modal';
import { Badge } from '../../components/common/Badge';
import { EmptyState } from '../../components/common/EmptyState';
import { formatCurrency } from '../../utils/formatters';
import { Plus, Search, Edit2, Trash2, Truck, Eye, Mail, Phone, MapPin, ShoppingCart } from 'lucide-react';

export const SupplierListPage = () => {
  const { suppliers, purchases, addSupplier, updateSupplier, deleteSupplier, confirmAction, settings } = useAppData();
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    companyName: '',
    email: '',
    phone: '',
    address: '',
    contactPerson: '',
    notes: '',
    status: 'active',
  });
  const [errors, setErrors] = useState({});

  // Compute total purchases and count per supplier
  const supplierPurchaseStats = useMemo(() => {
    const map = {};
    purchases.forEach((p) => {
      if (!map[p.supplierId]) {
        map[p.supplierId] = { count: 0, totalAmount: 0 };
      }
      map[p.supplierId].count += 1;
      if (p.status === 'received') {
        map[p.supplierId].totalAmount += Number(p.total) || 0;
      }
    });
    return map;
  }, [purchases]);

  const filteredSuppliers = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return suppliers.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.companyName && s.companyName.toLowerCase().includes(q)) ||
        (s.email && s.email.toLowerCase().includes(q)) ||
        (s.contactPerson && s.contactPerson.toLowerCase().includes(q))
    );
  }, [suppliers, searchTerm]);

  const handleOpenAdd = () => {
    setEditingSupplier(null);
    setFormData({
      name: '',
      companyName: '',
      email: '',
      phone: '',
      address: '',
      contactPerson: '',
      notes: '',
      status: 'active',
    });
    setErrors({});
    setIsModalOpen(true);
  };

  const handleOpenEdit = (sup) => {
    setEditingSupplier(sup);
    setFormData({
      name: sup.name,
      companyName: sup.companyName || '',
      email: sup.email || '',
      phone: sup.phone || '',
      address: sup.address || '',
      contactPerson: sup.contactPerson || '',
      notes: sup.notes || '',
      status: sup.status || 'active',
    });
    setErrors({});
    setIsModalOpen(true);
  };

  const handleDelete = (sup) => {
    const stats = supplierPurchaseStats[sup.id];
    if (stats && stats.count > 0) {
      alert(`Cannot delete supplier "${sup.name}" because ${stats.count} purchase order(s) reference this record. Please change supplier status to Inactive instead.`);
      return;
    }

    confirmAction({
      title: `Delete Supplier "${sup.name}"?`,
      message: 'Are you sure you want to delete this supplier profile? This action is permanent.',
      confirmText: 'Delete Supplier',
      isDestructive: true,
      onConfirm: () => {
        deleteSupplier(sup.id);
      },
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setErrors({ name: 'Supplier name is required.' });
      return;
    }

    if (editingSupplier) {
      const res = updateSupplier(editingSupplier.id, formData);
      if (res.success) {
        setIsModalOpen(false);
      } else {
        setErrors({ form: res.message });
      }
    } else {
      const res = addSupplier(formData);
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
            {t('suppliers_title', 'Suppliers & Vendors')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t('suppliers_subtitle', 'Maintain authorized supplier contacts, company details, and procurement histories.')}
          </p>
        </div>

        <Button variant="primary" size="sm" icon={Plus} onClick={handleOpenAdd}>
          {t('btn_add_supplier', 'Add Supplier')}
        </Button>
      </div>

      {/* Search */}
      <Card className="p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by supplier name, company, or contact person..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
          <span className="text-xs text-slate-400 font-medium">
            {filteredSuppliers.length} suppliers
          </span>
        </div>
      </Card>

      {/* Grid of Suppliers */}
      {filteredSuppliers.length === 0 ? (
        <EmptyState
          title="No suppliers found"
          description="Try adjusting your search query or register a new vendor."
          actionText="Add Supplier"
          onAction={handleOpenAdd}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredSuppliers.map((s) => {
            const stats = supplierPurchaseStats[s.id] || { count: 0, totalAmount: 0 };
            return (
              <Card
                key={s.id}
                id={`supplier-item-${s.id}`}
                data-item-id={s.id}
                data-scroll-anchor={s.id}
                className="supplier-card p-5 flex flex-col justify-between hover:shadow-md transition-all"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                      <Truck className="h-5 w-5" />
                    </div>
                    <Badge variant={s.status === 'active' ? 'emerald' : 'slate'} size="sm">
                      {s.status}
                    </Badge>
                  </div>

                  <div>
                    <Link
                      to={`/suppliers/${s.id}`}
                      data-transliterate="true"
                      className="text-base font-bold text-slate-900 dark:text-slate-100 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                    >
                      {s.name}
                    </Link>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5" data-transliterate="true">
                      {s.companyName}
                    </p>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 pt-1">
                    {s.contactPerson && (
                      <div className="text-[11px] text-slate-500">
                        Contact: <strong className="font-semibold text-slate-700 dark:text-slate-200" data-transliterate="true">{s.contactPerson}</strong>
                      </div>
                    )}
                    {s.email && (
                      <div className="flex items-center gap-1.5 text-slate-500 truncate">
                        <Mail className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{s.email}</span>
                      </div>
                    )}
                    {s.phone && (
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <Phone className="h-3.5 w-3.5 shrink-0" />
                        <span>{s.phone}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div className="text-xs">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Spend</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                      {formatCurrency(stats.totalAmount, settings.currency)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <Link to={`/suppliers/${s.id}`} title="View Purchases">
                      <button className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                        <Eye className="h-4 w-4" />
                      </button>
                    </Link>
                    <button
                      onClick={() => handleOpenEdit(s)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
                      title="Edit Supplier"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(s)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                      title="Delete Supplier"
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

      {/* CREATE / EDIT SUPPLIER MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingSupplier ? 'Edit Supplier' : 'Register New Supplier'}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {errors.form && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-600 dark:text-red-400 font-medium">
              {errors.form}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Supplier / Brand Name"
              name="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              error={errors.name}
              placeholder="e.g. Apex Global Distributors"
              required
            />
            <Input
              label="Company Name"
              name="companyName"
              value={formData.companyName}
              onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
              placeholder="e.g. Apex Logistics Ltd."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Contact Person"
              name="contactPerson"
              value={formData.contactPerson}
              onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
              placeholder="e.g. Rahim Uddin"
            />
            <Select
              label="Status"
              name="status"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              options={[
                { value: 'active', label: 'Active Partner' },
                { value: 'inactive', label: 'Inactive / Suspended' },
              ]}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Email"
              type="email"
              name="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="procurement@supplier.com"
            />
            <Input
              label="Phone Number"
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+880 1711-..."
            />
          </div>

          <Input
            label="Address"
            name="address"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            placeholder="Plot 45, Tejgaon I/A, Dhaka"
          />

          <Textarea
            label="Notes & Terms"
            name="notes"
            rows={2}
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Lead times, payment terms, or discount tier agreements..."
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              {editingSupplier ? 'Save Changes' : 'Register Supplier'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
