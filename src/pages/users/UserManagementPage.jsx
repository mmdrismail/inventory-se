import React, { useState, useMemo } from 'react';
import { useAppData } from '../../context/AppDataContext';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input, Select } from '../../components/forms/FormControls';
import { Modal } from '../../components/common/Modal';
import { Badge } from '../../components/common/Badge';
import { EmptyState } from '../../components/common/EmptyState';
import { formatDate } from '../../utils/formatters';
import {
  UserCog,
  Plus,
  Search,
  Edit2,
  Trash2,
  Shield,
  ShieldAlert,
  Power,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

export const UserManagementPage = () => {
  const { users, addUser, updateUser, toggleUserStatus, deleteUser, resetUsers, confirmAction } = useAppData();
  const { currentUser } = useAuth();

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
      alert('You cannot deactivate your own active session account.');
      return;
    }
    toggleUserStatus(user.id, currentUser?.id);
  };

  const handleDelete = (user) => {
    if (user.id === currentUser?.id) {
      alert('You cannot delete your own active administrator account.');
      return;
    }

    confirmAction({
      title: `Delete User "${user.name}"?`,
      message: 'Are you sure you want to remove this demo user from the system?',
      confirmText: 'Delete User',
      isDestructive: true,
      onConfirm: () => {
        deleteUser(user.id, currentUser?.id);
      },
    });
  };

  const handleResetDefaults = () => {
    confirmAction({
      title: 'Reset Demo Users?',
      message: 'This will restore the 4 default accounts (admin@stockline.io, manager@stockline.io, staff@stockline.io, customer@stockline.io).',
      confirmText: 'Reset Demo Accounts',
      onConfirm: () => {
        resetUsers();
      },
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setErrors({ name: 'User name is required.' });
      return;
    }
    if (!formData.email.trim()) {
      setErrors({ email: 'Email address is required.' });
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
            User Roles & Permissions
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Configure simulated administrative personas and access privileges.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" icon={RotateCcw} onClick={handleResetDefaults}>
            Reset Demo Accounts
          </Button>
          <Button variant="primary" size="sm" icon={Plus} onClick={handleOpenAdd}>
            Add Demo User
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
              placeholder="Search by user name, email, or department..."
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
              <option value="">All Roles ({users.length})</option>
              <option value="admin">Admin</option>
              <option value="manager">Manager</option>
              <option value="staff">Staff</option>
              <option value="customer">Customer</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Users Table */}
      <Card className="overflow-hidden">
        {filteredUsers.length === 0 ? (
          <EmptyState
            title="No users found"
            description="Try modifying your search or add a new demo user."
            actionText="Add User"
            onAction={handleOpenAdd}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase text-[10px] tracking-wider select-none">
                <tr>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-3">Role</th>
                  <th className="py-3 px-3">Department</th>
                  <th className="py-3 px-3">Registered</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
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
                                  You
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
                          {u.role}
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
                          {u.status}
                        </Badge>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleToggle(u)}
                            disabled={isCurrent}
                            title={u.status === 'active' ? 'Deactivate User' : 'Activate User'}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30"
                          >
                            <Power className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(u)}
                            title="Edit Role & Details"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(u)}
                            disabled={isCurrent}
                            title="Delete User"
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
        title={editingUser ? 'Edit Demo User' : 'Create New Demo User'}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {errors.form && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-600 dark:text-red-400 font-semibold">
              {errors.form}
            </div>
          )}

          <Input
            label="Full Name"
            name="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            error={errors.name}
            placeholder="e.g. Tanvir Hasan"
            required
          />

          <Input
            label="Email Address"
            type="email"
            name="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            error={errors.email}
            placeholder="user@stockline.io"
            required
          />

          <Select
            label="Assigned Demo Role"
            name="role"
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            options={[
              { value: 'admin', label: 'Admin (Full Access)' },
              { value: 'manager', label: 'Manager (Operations & Reports)' },
              { value: 'staff', label: 'Staff (POS & Customer Sales)' },
              { value: 'customer', label: 'Customer (Storefront & My Orders)' },
            ]}
          />

          <Input
            label="Department / Assignment"
            name="department"
            value={formData.department}
            onChange={(e) => setFormData({ ...formData, department: e.target.value })}
            placeholder="e.g. Warehouse Inventory"
          />

          <Select
            label="Account Status"
            name="status"
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            options={[
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive / Suspended' },
            ]}
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              {editingUser ? 'Save Changes' : 'Create User'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
