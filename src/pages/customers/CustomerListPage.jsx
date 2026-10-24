import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAppData } from '../../context/AppDataContext';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input, Textarea, Select } from '../../components/forms/FormControls';
import { Modal } from '../../components/common/Modal';
import { Badge } from '../../components/common/Badge';
import { EmptyState } from '../../components/common/EmptyState';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Plus, Search, Edit2, Trash2, Users2, Eye, Mail, Phone, MapPin } from 'lucide-react';

export const CustomerListPage = () => {
  const { customers, sales, orders, addCustomer, updateCustomer, deleteCustomer, confirmAction, settings } = useAppData();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    customerType: 'Retail',
    notes: '',
  });
  const [errors, setErrors] = useState({});

  // Compute spend stats per customer
  const customerStats = useMemo(() => {
    const map = {};
    sales.forEach((s) => {
      if (s.customerId) {
        if (!map[s.customerId]) map[s.customerId] = { count: 0, totalSpend: 0 };
        map[s.customerId].count += 1;
        if (s.status === 'completed') {
          map[s.customerId].totalSpend += Number(s.total) || 0;
        }
      }
    });
    return map;
  }, [sales]);

  const filteredCustomers = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return customers.filter((c) => {
      const matchesSearch =
        c.name.toLowerCase().includes(q) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.phone && c.phone.includes(q));
      const matchesType = !selectedType || c.customerType === selectedType;
      return matchesSearch && matchesType;
    });
  }, [customers, searchTerm, selectedType]);

  const handleOpenAdd = () => {
    setEditingCustomer(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      address: '',
      customerType: 'Retail',
      notes: '',
    });
    setErrors({});
    setIsModalOpen(true);
  };

  const handleOpenEdit = (c) => {
    setEditingCustomer(c);
    setFormData({
      name: c.name,
      email: c.email || '',
      phone: c.phone || '',
      address: c.address || '',
      customerType: c.customerType || 'Retail',
      notes: c.notes || '',
    });
    setErrors({});
    setIsModalOpen(true);
  };

  const handleDelete = (c) => {
    const stats = customerStats[c.id];
    if (stats && stats.count > 0) {
      alert(`Cannot delete customer "${c.name}" because ${stats.count} sales invoices are registered under their account.`);
      return;
    }

    confirmAction({
      title: `Delete Customer "${c.name}"?`,
      message: 'Are you sure you want to remove this customer record?',
      confirmText: 'Delete Customer',
      isDestructive: true,
      onConfirm: () => {
        deleteCustomer(c.id);
      },
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setErrors({ name: 'Customer name is required.' });
      return;
    }

    if (editingCustomer) {
      const res = updateCustomer(editingCustomer.id, formData);
      if (res.success) {
        setIsModalOpen(false);
      } else {
        setErrors({ form: res.message });
      }
    } else {
      const res = addCustomer(formData);
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
            Customer Directory
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage client profiles, contact points, and lifetime purchase volumes.
          </p>
        </div>

        <Button variant="primary" size="sm" icon={Plus} onClick={handleOpenAdd}>
          Add Customer
        </Button>
      </div>

      {/* Filter and Search */}
      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative sm:col-span-2">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by customer name, phone number, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <div>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="">All Customer Types</option>
              <option value="Retail">Retail</option>
              <option value="Wholesale">Wholesale</option>
              <option value="Corporate">Corporate</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Customers Grid */}
      {filteredCustomers.length === 0 ? (
        <EmptyState
          title="No customers found"
          description="Try adjusting your search filters or add a new customer."
          actionText="Add Customer"
          onAction={handleOpenAdd}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCustomers.map((c) => {
            const stats = customerStats[c.id] || { count: 0, totalSpend: 0 };
            return (
              <Card key={c.id} className="p-5 flex flex-col justify-between hover:shadow-md transition-all">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                      <Users2 className="h-5 w-5" />
                    </div>
                    <Badge
                      variant={
                        c.customerType === 'Corporate'
                          ? 'purple'
                          : c.customerType === 'Wholesale'
                          ? 'blue'
                          : 'emerald'
                      }
                      size="sm"
                    >
                      {c.customerType || 'Retail'}
                    </Badge>
                  </div>

                  <div>
                    <Link
                      to={`/customers/${c.id}`}
                      className="text-base font-bold text-slate-900 dark:text-slate-100 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                    >
                      {c.name}
                    </Link>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Registered: {formatDate(c.createdAt)}
                    </p>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 pt-1">
                    {c.email && (
                      <div className="flex items-center gap-1.5 text-slate-500 truncate">
                        <Mail className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{c.email}</span>
                      </div>
                    )}
                    {c.phone && (
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <Phone className="h-3.5 w-3.5 shrink-0" />
                        <span>{c.phone}</span>
                      </div>
                    )}
                    {c.address && (
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{c.address}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div className="text-xs">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Spend</span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(stats.totalSpend, settings.currency)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <Link to={`/customers/${c.id}`} title="View Profile">
                      <button className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                        <Eye className="h-4 w-4" />
                      </button>
                    </Link>
                    <button
                      onClick={() => handleOpenEdit(c)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
                      title="Edit Customer"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(c)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                      title="Delete Customer"
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

      {/* CREATE / EDIT CUSTOMER MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCustomer ? 'Edit Customer' : 'Add New Customer'}
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
              label="Full Name / Client Name"
              name="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              error={errors.name}
              placeholder="e.g. Modern Logistics Ltd."
              required
            />
            <Select
              label="Customer Type"
              name="customerType"
              value={formData.customerType}
              onChange={(e) => setFormData({ ...formData, customerType: e.target.value })}
              options={[
                { value: 'Retail', label: 'Retail Customer' },
                { value: 'Wholesale', label: 'Wholesale Client' },
                { value: 'Corporate', label: 'Corporate Partner' },
              ]}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Email Address"
              type="email"
              name="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="client@domain.com"
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
            label="Delivery / Billing Address"
            name="address"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            placeholder="Street address, City, Country"
          />

          <Textarea
            label="Notes"
            name="notes"
            rows={2}
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Special delivery notes, credit limit terms, or branch locations..."
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              {editingCustomer ? 'Update Customer' : 'Add Customer'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
