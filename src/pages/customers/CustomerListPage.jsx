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
import { formatCurrency, formatDate } from '../../utils/formatters';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Users2,
  Eye,
  Mail,
  Phone,
  MapPin,
  Building2,
  UserCheck,
  AlertCircle,
  CreditCard,
  FileSpreadsheet,
} from 'lucide-react';

export const CustomerListPage = () => {
  const {
    customers,
    sales,
    orders,
    quotations,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    confirmAction,
    settings,
  } = useAppData();
  const { t } = useLanguage();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    companyName: '',
    designationRole: 'owner',
    customerType: 'Retail',
    email: '',
    phone: '',
    location: '',
    address: '',
    totalDue: 0,
    notes: '',
  });
  const [errors, setErrors] = useState({});

  // Compute spend and due stats per customer
  const customerStats = useMemo(() => {
    const map = {};
    sales.forEach((s) => {
      if (s.customerId) {
        if (!map[s.customerId]) {
          map[s.customerId] = { count: 0, totalSpend: 0, totalDue: 0, quotationsCount: 0 };
        }
        map[s.customerId].count += 1;
        if (s.status === 'completed') {
          map[s.customerId].totalSpend += Number(s.total) || 0;
          if (s.paymentStatus === 'due') {
            map[s.customerId].totalDue += Number(s.dueAmount !== undefined ? s.dueAmount : s.total) || 0;
          } else if (s.paymentStatus === 'partial') {
            map[s.customerId].totalDue += Number(s.dueAmount !== undefined ? s.dueAmount : 0) || 0;
          }
        }
      }
    });

    // Count quotations per customer
    (quotations || []).forEach((q) => {
      if (q.customerId && map[q.customerId]) {
        map[q.customerId].quotationsCount += 1;
      }
    });

    return map;
  }, [sales, quotations]);

  const filteredCustomers = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return customers.filter((c) => {
      const matchesSearch =
        c.name.toLowerCase().includes(q) ||
        (c.companyName && c.companyName.toLowerCase().includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.phone && c.phone.includes(q)) ||
        (c.location && c.location.toLowerCase().includes(q));
      const matchesType = !selectedType || c.customerType === selectedType;
      const matchesRole = !selectedRole || c.designationRole === selectedRole;
      return matchesSearch && matchesType && matchesRole;
    });
  }, [customers, searchTerm, selectedType, selectedRole]);

  const getRoleBadge = (role) => {
    switch (role) {
      case 'owner':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">কোম্পানির মালিক (Owner)</span>;
      case 'agent':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">কোম্পানির এজেন্ট (Agent)</span>;
      case 'purchaser':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300">ক্রয় কর্মকর্তা (Purchaser)</span>;
      case 'supplier_rep':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300">ভেন্ডর প্রতিনিধি (Supplier Rep)</span>;
      case 'wholesale':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300">পাইকারি ডিলার (Wholesale)</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">গ্রাহক (Retail)</span>;
    }
  };

  const handleOpenAdd = () => {
    setEditingCustomer(null);
    setFormData({
      name: '',
      companyName: '',
      designationRole: 'owner',
      customerType: 'Retail',
      email: '',
      phone: '',
      location: '',
      address: '',
      totalDue: 0,
      notes: '',
    });
    setErrors({});
    setIsModalOpen(true);
  };

  const handleOpenEdit = (c) => {
    setEditingCustomer(c);
    setFormData({
      name: c.name || '',
      companyName: c.companyName || '',
      designationRole: c.designationRole || 'owner',
      customerType: c.customerType || 'Retail',
      email: c.email || '',
      phone: c.phone || '',
      location: c.location || '',
      address: c.address || '',
      totalDue: c.totalDue || 0,
      notes: c.notes || '',
    });
    setErrors({});
    setIsModalOpen(true);
  };

  const handleDelete = (c) => {
    const custId = c.id || c._id;
    const stats = customerStats[custId] || customerStats[c.id] || customerStats[c._id];
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
        deleteCustomer(custId);
      },
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setErrors({ name: 'Customer name is required.' });
      return;
    }

    const payload = {
      ...formData,
      totalDue: Number(formData.totalDue) || 0,
    };

    if (editingCustomer) {
      const res = updateCustomer(editingCustomer.id || editingCustomer._id, payload);
      if (res.success) {
        setIsModalOpen(false);
      } else {
        setErrors({ form: res.message });
      }
    } else {
      const res = addCustomer(payload);
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
            {t('customers_title', 'Customer Directory (গ্রাহক ও করপোরেট ক্লায়েন্ট তালিকা)')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t('customers_subtitle', 'Manage company profiles, corporate roles, contact points, receivables & lifetime ledger.')}
          </p>
        </div>

        <Button variant="primary" size="sm" icon={Plus} onClick={handleOpenAdd}>
          {t('btn_add_customer', 'Add Customer (নতুন গ্রাহক)')}
        </Button>
      </div>

      {/* Filter and Search */}
      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="relative sm:col-span-2">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, company, phone, location, email..."
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
              <option value="Retail">Retail Customer</option>
              <option value="Wholesale">Wholesale Client</option>
              <option value="Corporate">Corporate Partner</option>
            </select>
          </div>

          <div>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="">All Roles (সকল পদবী)</option>
              <option value="owner">কোম্পানির মালিক (Owner)</option>
              <option value="agent">কোম্পানির এজেন্ট (Agent)</option>
              <option value="purchaser">ক্রয় কর্মকর্তা (Purchaser)</option>
              <option value="supplier_rep">ভেন্ডর প্রতিনিধি (Supplier Rep)</option>
              <option value="wholesale">পাইকারি ডিলার (Wholesale)</option>
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
            const stats = customerStats[c.id] || customerStats[c._id] || { count: 0, totalSpend: 0, totalDue: 0, quotationsCount: 0 };
            const effectiveDue = Math.max(Number(c.totalDue || 0), stats.totalDue);

            return (
              <Card key={c.id} className="p-5 flex flex-col justify-between hover:shadow-md transition-all border border-slate-200/80 dark:border-slate-800">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                      <Users2 className="h-5 w-5" />
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {getRoleBadge(c.designationRole)}
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
                  </div>

                  <div>
                    <Link
                      to={`/customers/${c.id}`}
                      className="text-base font-bold text-slate-900 dark:text-slate-100 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                    >
                      {c.name}
                    </Link>

                    {c.companyName && (
                      <div className="text-xs font-semibold text-purple-600 dark:text-purple-400 flex items-center gap-1 mt-0.5">
                        <Building2 className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{c.companyName}</span>
                      </div>
                    )}

                    <p className="text-[11px] text-slate-400 mt-1">
                      Registered: {formatDate(c.createdAt)}
                    </p>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 pt-1">
                    {c.phone && (
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <Phone className="h-3.5 w-3.5 shrink-0" />
                        <span>{c.phone}</span>
                      </div>
                    )}
                    {c.email && (
                      <div className="flex items-center gap-1.5 text-slate-500 truncate">
                        <Mail className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{c.email}</span>
                      </div>
                    )}
                    {(c.address || c.location) && (
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{c.address || c.location}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Ledger & Outstanding Balance Strip */}
                <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800">
                  <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Sales</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                        {formatCurrency(stats.totalSpend || c.totalSales || 0, settings.currency)}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        কাস্টমার থেকে পাওনা (Due)
                      </span>
                      <span
                        className={`font-mono font-black ${
                          effectiveDue > 0
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        {formatCurrency(effectiveDue, settings.currency)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-dashed border-slate-100 dark:border-slate-800 text-[11px] text-slate-400">
                    <span>
                      {stats.count} bill{stats.count === 1 ? '' : 's'} · {stats.quotationsCount} quote{stats.quotationsCount === 1 ? '' : 's'}
                    </span>

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
        title={editingCustomer ? 'গ্রাহকের তথ্য আপডেট (Edit Customer Profile)' : 'নতুন গ্রাহক যোগ করুন (Add Customer)'}
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {errors.form && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-600 dark:text-red-400 font-medium">
              {errors.form}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Contact Person / Client Name *"
              name="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              error={errors.name}
              placeholder="e.g. ইঞ্জিঃ কামরুল ইসলাম"
              required
            />
            <Input
              label="Company / Firm Name (প্রতিষ্ঠানের নাম)"
              name="companyName"
              value={formData.companyName}
              onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
              placeholder="e.g. মেঘনা কোল্ড স্টোরেজ লিঃ"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Designation / Role (কাস্টমার স্ট্যাটাস)"
              name="designationRole"
              value={formData.designationRole}
              onChange={(e) => setFormData({ ...formData, designationRole: e.target.value })}
              options={[
                { value: 'owner', label: 'কোম্পানির মালিক / স্বত্বাধিকারী (Owner)' },
                { value: 'agent', label: 'কোম্পানির এজেন্ট / প্রতিনিধি (Agent)' },
                { value: 'purchaser', label: 'ক্রয় কর্মকর্তা / প্রকিউরমেন্ট ম্যানেজার (Purchaser)' },
                { value: 'supplier_rep', label: 'ভেন্ডর প্রতিনিধি (Supplier Rep)' },
                { value: 'wholesale', label: 'পাইকারি ডিলার (Wholesale Dealer)' },
                { value: 'retail', label: 'সাধারণ খুচরা ক্রেতা (Retail Customer)' },
              ]}
            />
            <Select
              label="Customer Category"
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
              label="Phone Number (মোবাইল নম্বর)"
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="01711-xxxxxx"
            />
            <Input
              label="Email Address"
              type="email"
              name="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="client@domain.com"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Location / Area (এলাকা / জেলা)"
              name="location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="e.g. পাহাড়তলী, চট্টগ্রাম"
            />
            <Input
              label="Opening Due Balance / বকেয়া স্থিতি (BDT)"
              type="number"
              name="totalDue"
              value={formData.totalDue}
              onChange={(e) => setFormData({ ...formData, totalDue: e.target.value })}
              placeholder="0"
            />
          </div>

          <Input
            label="Full Address (কারখানা বা পূর্ণ ঠিকানা)"
            name="address"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            placeholder="রাস্তা নং, হোল্ডিং নং, শিল্প এলাকা..."
          />

          <Textarea
            label="Notes"
            name="notes"
            rows={2}
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Special credit terms, delivery preferences, or remarks..."
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
