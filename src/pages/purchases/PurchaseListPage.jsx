import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppData } from '../../context/AppDataContext';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { EmptyState, Pagination } from '../../components/common/EmptyState';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { exportToCSV } from '../../utils/csv';
import {
  Plus,
  Download,
  RefreshCw,
  Search,
  ShoppingCart,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowUpDown,
} from 'lucide-react';

export const PurchaseListPage = () => {
  const { purchases, suppliers, receivePurchase, cancelPurchase, reloadState, confirmAction, settings } = useAppData();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [sortField, setSortField] = useState('date');
  const [sortDirection, setSortDirection] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;
  const navigate = useNavigate();

  // Map suppliers
  const supMap = useMemo(() => {
    const map = {};
    suppliers.forEach((s) => (map[s.id] = s.name));
    return map;
  }, [suppliers]);

  // Filtering & Sorting
  const filteredPurchases = useMemo(() => {
    return purchases
      .filter((p) => {
        const matchesSearch =
          !searchTerm ||
          p.referenceNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (supMap[p.supplierId] && supMap[p.supplierId].toLowerCase().includes(searchTerm.toLowerCase()));

        const matchesSupplier = !selectedSupplier || p.supplierId === selectedSupplier;
        const matchesStatus = !selectedStatus || p.status === selectedStatus;

        return matchesSearch && matchesSupplier && matchesStatus;
      })
      .sort((a, b) => {
        let valA = a[sortField];
        let valB = b[sortField];

        if (sortField === 'date') {
          valA = new Date(valA).getTime();
          valB = new Date(valB).getTime();
        }

        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
  }, [purchases, searchTerm, selectedSupplier, selectedStatus, sortField, sortDirection, supMap]);

  // Pagination
  const paginatedPurchases = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredPurchases.slice(start, start + pageSize);
  }, [filteredPurchases, currentPage]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleReceive = (purchase) => {
    confirmAction({
      title: `Receive Purchase Order ${purchase.referenceNo}?`,
      message: `Receiving this order will automatically increase stock quantities for ${(purchase.items || []).length} item(s) and create inventory movement records.`,
      confirmText: 'Confirm Receipt & Update Stock',
      onConfirm: () => {
        receivePurchase(purchase.id, 'Purchasing Staff');
      },
    });
  };

  const handleCancel = (purchase) => {
    confirmAction({
      title: `Cancel Purchase Order ${purchase.referenceNo}?`,
      message: purchase.status === 'received'
        ? 'Warning: This purchase has already been received into stock. Cancelling it will safely reverse the added inventory quantities.'
        : 'Are you sure you want to cancel this draft purchase order?',
      confirmText: 'Cancel Purchase',
      isDestructive: true,
      onConfirm: () => {
        cancelPurchase(purchase.id, 'Admin');
      },
    });
  };

  const handleExportCSV = () => {
    const dataToExport = filteredPurchases.map((p) => ({
      'Reference No': p.referenceNo,
      'Supplier': supMap[p.supplierId] || 'Direct',
      'Date': p.date,
      'Items Count': (p.items || []).length,
      'Subtotal': p.subtotal,
      'Total Amount': p.total,
      'Payment Status': p.paymentStatus,
      'Status': p.status,
    }));
    exportToCSV(dataToExport, `stockline_purchases_${new Date().toISOString().split('T')[0]}.csv`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Purchase Orders
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Track procurement orders, intake status, and automated inventory increases.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" icon={RefreshCw} onClick={reloadState}>
            Refresh
          </Button>
          <Button variant="outline" size="sm" icon={Download} onClick={handleExportCSV}>
            Export CSV
          </Button>
          <Link to="/purchases/new">
            <Button variant="primary" size="sm" icon={Plus}>
              Create Purchase
            </Button>
          </Link>
        </div>
      </div>

      {/* Filter and Search */}
      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <div className="relative sm:col-span-2">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by reference PO number or supplier name..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <div>
            <select
              value={selectedSupplier}
              onChange={(e) => {
                setSelectedSupplier(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="">All Suppliers</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="">All Order Statuses</option>
              <option value="draft">Draft (Stock Not Added)</option>
              <option value="received">Received (Stock Added)</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Table Card */}
      <Card className="overflow-hidden">
        {filteredPurchases.length === 0 ? (
          <EmptyState
            title="No purchase orders found"
            description="Try modifying your filters or create a new purchase order."
            actionText="Create Purchase Order"
            onAction={() => navigate('/purchases/new')}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase text-[10px] tracking-wider select-none">
                <tr>
                  <th className="py-3 px-4">PO Reference</th>
                  <th className="py-3 px-3">Supplier</th>
                  <th
                    className="py-3 px-3 cursor-pointer hover:text-slate-800 dark:hover:text-slate-200"
                    onClick={() => handleSort('date')}
                  >
                    <div className="flex items-center gap-1">
                      <span>Date</span>
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </th>
                  <th className="py-3 px-3 text-center">Items</th>
                  <th
                    className="py-3 px-3 text-right cursor-pointer hover:text-slate-800 dark:hover:text-slate-200"
                    onClick={() => handleSort('total')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Total Amount</span>
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </th>
                  <th className="py-3 px-3 text-center">Payment</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {paginatedPurchases.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-slate-100">
                      <Link to={`/purchases/${p.id}`} className="hover:text-emerald-600 transition-colors">
                        {p.referenceNo}
                      </Link>
                    </td>

                    <td className="py-3 px-3 text-slate-700 dark:text-slate-300 font-medium">
                      {supMap[p.supplierId] || 'Direct Supplier'}
                    </td>

                    <td className="py-3 px-3 text-slate-500 dark:text-slate-400">
                      {formatDate(p.date)}
                    </td>

                    <td className="py-3 px-3 text-center font-mono font-semibold text-slate-700 dark:text-slate-300">
                      {(p.items || []).length}
                    </td>

                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                      {formatCurrency(p.total, settings.currency)}
                    </td>

                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          p.paymentStatus === 'paid'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                            : 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300'
                        }`}
                      >
                        {p.paymentStatus}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          p.status === 'received'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : p.status === 'cancelled'
                            ? 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300'
                            : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        {p.status === 'received' && <CheckCircle2 className="h-3 w-3" />}
                        {p.status === 'draft' && <Clock className="h-3 w-3" />}
                        {p.status === 'cancelled' && <XCircle className="h-3 w-3" />}
                        <span>{p.status}</span>
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link to={`/purchases/${p.id}`} title="View Details">
                          <button className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800">
                            <Eye className="h-4 w-4" />
                          </button>
                        </Link>
                        {p.status === 'draft' && (
                          <button
                            onClick={() => handleReceive(p)}
                            title="Receive Stock"
                            className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </button>
                        )}
                        {p.status !== 'cancelled' && (
                          <button
                            onClick={() => handleCancel(p)}
                            title="Cancel Purchase"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          currentPage={currentPage}
          totalItems={filteredPurchases.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
        />
      </Card>
    </div>
  );
};
