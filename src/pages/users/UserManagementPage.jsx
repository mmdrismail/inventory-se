import React, { useState, useMemo } from 'react';
import { useAppData } from '../../context/AppDataContext';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input, Select } from '../../components/forms/FormControls';
import { Modal } from '../../components/common/Modal';
import { Badge } from '../../components/common/Badge';
import { EmptyState } from '../../components/common/EmptyState';
import { formatDate } from '../../utils/formatters';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Power,
  RotateCcw,
} from 'lucide-react';

export const UserManagementPage = () => {
  const { users, addUser, updateUser, toggleUserStatus, deleteUser, resetUsers, confirmAction } = useAppData();
  const { currentUser } = useAuth();
  const { language, t } = useLanguage();

  const l = (texts) => {
    if (language === 'en') return texts.en;
    if (language === 'obro') return texts.obro || `${texts.bn} (${texts.en})`;
    return texts.bn;
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'staff',
    department: 'Operations',
    status: 'active',
  });
  const [errors, setErrors] = useState({});

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.department?.toLowerCase().includes(q);

      const matchesRole = !roleFilter || u.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, searchTerm, roleFilter]);

  const handleOpenAdd = () => {
    setEditingUser(null);
    setFormData({
      name: '',
      email: '',
      role: 'staff',
      department: 'Operations',
      status: 'active',
    });
    setErrors({});
    setIsModalOpen(true);
  };

  const handleOpenEdit = (user) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department || 'Operations',
      status: user.status || 'active',
    });
    setErrors({});
    setIsModalOpen(true);
  };

  const handleToggle = (user) => {
    if (user.id === currentUser?.id) {
      alert(
        l({
          bn: 'আপনি আপনার নিজের সক্রিয় অ্যাকাউন্ট নিষ্ক্রিয় করতে পারবেন না।',
          en: 'You cannot deactivate your own active session account.',
          obro: 'Apnar nijer active account deactivate kora jabe na.',
        })
      );
      return;
    }
    toggleUserStatus(user.id, currentUser?.id);
  };

  const handleDelete = (user) => {
    if (user.id === currentUser?.id) {
      alert(
        l({
          bn: 'আপনি আপনার নিজের প্রশাসক অ্যাকাউন্ট মুছে ফেলতে পারবেন না।',
          en: 'You cannot delete your own active administrator account.',
          obro: 'Apnar nijer admin account delete kora jabe na.',
        })
      );
      return;
    }

    confirmAction({
      title: l({
        bn: `ইউজার "${user.name}" মুছে ফেলবেন?`,
        en: `Delete User "${user.name}"?`,
        obro: `User "${user.name}" delete korben?`,
      }),
      message: l({
        bn: 'আপনি কি নিশ্চিত যে এই ডেমো ইউজারটিকে সিস্টেম থেকে মুছে ফেলবেন?',
        en: 'Are you sure you want to remove this demo user from the system?',
        obro: 'Ei demo user-ke system theke muche felte chan?',
      }),
      confirmText: l({
        bn: 'মুছে ফেলুন',
        en: 'Delete User',
        obro: 'Delete User',
      }),
      isDestructive: true,
      onConfirm: () => {
        deleteUser(user.id, currentUser?.id);
      },
    });
  };

  const handleResetDefaults = () => {
    confirmAction({
      title: l({
        bn: 'ডেমো অ্যাকাউন্ট রিসেট করবেন?',
        en: 'Reset Demo Users?',
        obro: 'Demo Users Reset Korben?',
      }),
      message: l({
        bn: 'এটি ৪টি মূল ডিফল্ট অ্যাকাউন্ট পুনরুদ্ধার করবে (admin@stockline.io, manager@stockline.io, staff@stockline.io, customer@stockline.io)।',
        en: 'This will restore the 4 default accounts (admin@stockline.io, manager@stockline.io, staff@stockline.io, customer@stockline.io).',
        obro: 'Eti 4-ti default account restore korbe.',
      }),
      confirmText: l({
        bn: 'ডেমো অ্যাকাউন্ট রিসেট করুন',
        en: 'Reset Demo Accounts',
        obro: 'Reset Demo Accounts',
      }),
      onConfirm: () => {
        resetUsers();
      },
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setErrors({
        name: l({
          bn: 'ব্যবহারকারীর নাম আবশ্যক।',
          en: 'User name is required.',
          obro: 'User name required.',
        }),
      });
      return;
    }
    if (!formData.email.trim()) {
      setErrors({
        email: l({
          bn: 'ইমেইল ঠিকানা আবশ্যক।',
          en: 'Email address is required.',
          obro: 'Email address required.',
        }),
      });
      return;
    }

    if (editingUser) {
      const res = updateUser(editingUser.id, formData, currentUser?.id);
      if (res.success) {
        setIsModalOpen(false);
      } else {
        setErrors({ form: res.message });
      }
    } else {
      const res = addUser(formData);
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
            {l({
              bn: 'ইউজার রোল ও পারমিশন ব্যবস্থাপনা',
              en: 'User Roles & Permissions',
              obro: 'User Roles & Access Permissions',
            })}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {l({
              bn: 'সিস্টেমের প্রশাসনিক ভূমিকা, কর্মী অ্যাক্সেস এবং অধিকার কনফিগার করুন।',
              en: 'Configure simulated administrative personas and access privileges.',
              obro: 'Administrative persona ebong access privileges configure korun.',
            })}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" icon={RotateCcw} onClick={handleResetDefaults}>
            {l({
              bn: 'ডেমো অ্যাকাউন্ট রিসেট',
              en: 'Reset Demo Accounts',
              obro: 'Reset Demo Accounts',
            })}
          </Button>
          <Button variant="primary" size="sm" icon={Plus} onClick={handleOpenAdd}>
            {l({
              bn: '+ নতুন ইউজার যোগ করুন',
              en: 'Add Demo User',
              obro: '+ Add Demo User',
            })}
          </Button>
        </div>
      </div>

      {/* Filter and Search */}
      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative sm:col-span-2">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder={l({
                bn: 'ব্যবহারকারীর নাম, ইমেইল বা বিভাগ দিয়ে খুঁজুন...',
                en: 'Search by user name, email, or department...',
                obro: 'Search by user name, email, or department...',
              })}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="">
                {l({
                  bn: `সকল রোল (${users.length})`,
                  en: `All Roles (${users.length})`,
                  obro: `Shokol Roles (${users.length})`,
                })}
              </option>
              <option value="admin">{l({ bn: 'অ্যাডমিন (Admin)', en: 'Admin', obro: 'Admin' })}</option>
              <option value="manager">{l({ bn: 'ম্যানেজার (Manager)', en: 'Manager', obro: 'Manager' })}</option>
              <option value="staff">{l({ bn: 'স্টাফ (Staff)', en: 'Staff', obro: 'Staff' })}</option>
              <option value="customer">{l({ bn: 'গ্রাহক (Customer)', en: 'Customer', obro: 'Customer' })}</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Users Table */}
      <Card className="overflow-hidden">
        {filteredUsers.length === 0 ? (
          <EmptyState
            title={l({
              bn: 'কোনো ব্যবহারকারী পাওয়া যায়নি',
              en: 'No users found',
              obro: 'Kono user paowa jayni',
            })}
            description={l({
              bn: 'অনুসন্ধানের শর্ত পরিবর্তন করুন অথবা নতুন ডেমো ইউজার যোগ করুন।',
              en: 'Try modifying your search or add a new demo user.',
              obro: 'Search modify korun ba notun demo user add korun.',
            })}
            actionText={l({
              bn: 'নতুন ইউজার যোগ করুন',
              en: 'Add User',
              obro: 'Add User',
            })}
            onAction={handleOpenAdd}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase text-[10px] tracking-wider select-none">
                <tr>
                  <th className="py-3 px-4">{l({ bn: 'ব্যবহারকারী', en: 'User', obro: 'User' })}</th>
                  <th className="py-3 px-3">{l({ bn: 'রোল / ভূমিকা', en: 'Role', obro: 'Role' })}</th>
                  <th className="py-3 px-3">{l({ bn: 'বিভাগ / দায়িত্ব', en: 'Department', obro: 'Department' })}</th>
                  <th className="py-3 px-3">{l({ bn: 'নিবন্ধন তারিখ', en: 'Registered', obro: 'Registered' })}</th>
                  <th className="py-3 px-3 text-center">{l({ bn: 'অবস্থা', en: 'Status', obro: 'Status' })}</th>
                  <th className="py-3 px-4 text-right">{l({ bn: 'অ্যাকশন', en: 'Actions', obro: 'Actions' })}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredUsers.map((u) => {
                  const isCurrent = u.id === currentUser?.id;
                  return (
                    <tr key={u.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={u.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                            alt=""
                            className="h-9 w-9 rounded-full object-cover shrink-0 border border-slate-200 dark:border-slate-700"
                          />
                          <div>
                            <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                              <span>{u.name}</span>
                              {isCurrent && (
                                <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.2 rounded font-bold uppercase">
                                  {l({ bn: 'আপনি', en: 'You', obro: 'You' })}
                                </span>
                              )}
                            </div>
                            <span className="text-slate-400 text-[11px] font-mono">{u.email}</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            u.role === 'admin'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : u.role === 'manager'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                              : u.role === 'staff'
                              ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                          }`}
                        >
                          {u.role === 'admin'
                            ? l({ bn: 'অ্যাডমিন', en: 'ADMIN', obro: 'ADMIN' })
                            : u.role === 'manager'
                            ? l({ bn: 'ম্যানেজার', en: 'MANAGER', obro: 'MANAGER' })
                            : u.role === 'staff'
                            ? l({ bn: 'স্টাফ', en: 'STAFF', obro: 'STAFF' })
                            : l({ bn: 'গ্রাহক', en: 'CUSTOMER', obro: 'CUSTOMER' })}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-slate-600 dark:text-slate-400">
                        {u.department || 'Operations'}
                      </td>

                      <td className="py-3 px-3 text-slate-500 dark:text-slate-400">
                        {formatDate(u.createdAt)}
                      </td>

                      <td className="py-3 px-3 text-center">
                        <Badge variant={u.status === 'active' ? 'emerald' : 'slate'} size="sm">
                          {u.status === 'active'
                            ? l({ bn: 'সক্রিয়', en: 'ACTIVE', obro: 'ACTIVE' })
                            : l({ bn: 'নিষ্ক্রিয়', en: 'INACTIVE', obro: 'INACTIVE' })}
                        </Badge>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleToggle(u)}
                            disabled={isCurrent}
                            title={
                              u.status === 'active'
                                ? l({ bn: 'অ্যাকাউন্ট নিষ্ক্রিয় করুন', en: 'Deactivate User', obro: 'Deactivate User' })
                                : l({ bn: 'অ্যাকাউন্ট সক্রিয় করুন', en: 'Activate User', obro: 'Activate User' })
                            }
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30"
                          >
                            <Power className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(u)}
                            title={l({ bn: 'রোল ও তথ্য সম্পাদনা', en: 'Edit Role & Details', obro: 'Edit Role & Details' })}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(u)}
                            disabled={isCurrent}
                            title={l({ bn: 'ইউজার মুছে ফেলুন', en: 'Delete User', obro: 'Delete User' })}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 disabled:opacity-30"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* CREATE / EDIT USER MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={
          editingUser
            ? l({ bn: 'ইউজার তথ্য সম্পাদনা', en: 'Edit Demo User', obro: 'Edit User Info' })
            : l({ bn: 'নতুন ডেমো ইউজার তৈরি করুন', en: 'Create New Demo User', obro: 'Create New Demo User' })
        }
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {errors.form && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-600 dark:text-red-400 font-semibold">
              {errors.form}
            </div>
          )}

          <Input
            label={l({ bn: 'পূর্ণ নাম', en: 'Full Name', obro: 'Full Name' })}
            name="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            error={errors.name}
            placeholder={l({ bn: 'যেমন: তানভীর হাসান', en: 'e.g. Tanvir Hasan', obro: 'Jemon: Tanvir Hasan' })}
            required
          />

          <Input
            label={l({ bn: 'ইমেইল ঠিকানা', en: 'Email Address', obro: 'Email Address' })}
            type="email"
            name="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            error={errors.email}
            placeholder="user@stockline.io"
            required
          />

          <Select
            label={l({ bn: 'নির্ধারিত ভূমিকা (Role)', en: 'Assigned Demo Role', obro: 'Assigned Demo Role' })}
            name="role"
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            options={[
              {
                value: 'admin',
                label: l({ bn: 'অ্যাডমিন (সকল ক্ষমতা)', en: 'Admin (Full Access)', obro: 'Admin (Full Access)' }),
              },
              {
                value: 'manager',
                label: l({
                  bn: 'ম্যানেজার (অপারেশন ও রিপোর্ট)',
                  en: 'Manager (Operations & Reports)',
                  obro: 'Manager (Operations & Reports)',
                }),
              },
              {
                value: 'staff',
                label: l({
                  bn: 'স্টাফ (পিওএস ও বিক্রয় কাউন্টার)',
                  en: 'Staff (POS & Customer Sales)',
                  obro: 'Staff (POS & Customer Sales)',
                }),
              },
              {
                value: 'customer',
                label: l({
                  bn: 'গ্রাহক (অনলাইন শপ ও অর্ডার)',
                  en: 'Customer (Storefront & My Orders)',
                  obro: 'Customer (Storefront & My Orders)',
                }),
              },
            ]}
          />

          <Input
            label={l({ bn: 'বিভাগ / দায়িত্বের ক্ষেত্র', en: 'Department / Assignment', obro: 'Department / Assignment' })}
            name="department"
            value={formData.department}
            onChange={(e) => setFormData({ ...formData, department: e.target.value })}
            placeholder={l({ bn: 'যেমন: ওয়্যারহাউস ইনভেন্টরি', en: 'e.g. Warehouse Inventory', obro: 'Warehouse Inventory' })}
          />

          <Select
            label={l({ bn: 'অ্যাকাউন্ট স্ট্যাটাস', en: 'Account Status', obro: 'Account Status' })}
            name="status"
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            options={[
              { value: 'active', label: l({ bn: 'সক্রিয় (Active)', en: 'Active', obro: 'Active' }) },
              {
                value: 'inactive',
                label: l({ bn: 'স্থগিত / নিষ্ক্রিয় (Inactive)', en: 'Inactive / Suspended', obro: 'Inactive / Suspended' }),
              },
            ]}
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              {l({ bn: 'বাতিল', en: 'Cancel', obro: 'Cancel' })}
            </Button>
            <Button type="submit" variant="primary">
              {editingUser
                ? l({ bn: 'আপডেট সংরক্ষণ করুন', en: 'Save Changes', obro: 'Save Changes' })
                : l({ bn: 'ইউজার তৈরি করুন', en: 'Create User', obro: 'Create User' })}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
