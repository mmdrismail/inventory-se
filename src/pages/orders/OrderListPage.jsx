import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppData } from '../../context/AppDataContext';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { EmptyState, Pagination } from '../../components/common/EmptyState';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { exportToCSV } from '../../utils/csv';
import {
  ClipboardList,
  Search,
  Filter,
  Download,
  Eye,
  CheckCircle2,
  Clock,
  XCircle,
  Truck,
  PackageCheck,
  RefreshCw,
  ArrowUpDown,
} from 'lucide-react';

export const OrderListPage = () => {
  const { orders, updateOrderStatus, reloadState, confirmAction, settings } = useAppData();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [sortField, setSortField] = useState('date');
  const [sortDirection, setSortDirection] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;
  const navigate = useNavigate();

  const filteredOrders = useMemo(() => {
    return orders
      .filter((o) => {
        const q = searchTerm.toLowerCase();
        const matchesSearch =
          !searchTerm ||
          o.orderNumber.toLowerCase().includes(q) ||
          o.customerName.toLowerCase().includes(q) ||
          (o.email && o.email.toLowerCase().includes(q));

        const matchesStatus = !selectedStatus || o.status === selectedStatus;
        return matchesSearch && matchesStatus;
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
  }, [orders, searchTerm, selectedStatus, sortField, sortDirection]);

  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredOrders.slice(start, start + pageSize);
  }, [filteredOrders, currentPage]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleStatusChange = (order, newStatus) => {
    const isCancel = newStatus === 'cancelled';
    confirmAction({
      title: `Update Order ${order.orderNumber} to "${newStatus.toUpperCase()}"?`,
      message: isCancel && order.stockDeducted
        ? 'Cancelling this order will automatically restore reserved product quantities back to inventory.'
        : `Change status from ${order.status.toUpperCase()} to ${newStatus.toUpperCase()}.`,
      confirmText: `Set ${newStatus.toUpperCase()}`,
      isDestructive: isCancel,
      onConfirm: () => {
        updateOrderStatus(order.id, newStatus, 'Operations Staff');
      },
    });
  };

  const handleExportCSV = () => {
    const dataToExport = filteredOrders.map((o) => ({
      'Order Number': o.orderNumber,
      'Customer Name': o.customerName,
      'Email': o.email,
      'Phone': o.phone,
      'Date': o.date,
      'Items Count': (o.items || []).length,
      'Subtotal': o.subtotal,
      'Shipping Fee': o.shippingFee,
      'Total Amount': o.total,
      'Payment Status': o.paymentStatus,
      'Order Status': o.status,
      'Stock Deducted': o.stockDeducted ? 'Yes' : 'No',
    }));
    exportToCSV(dataToExport, `stockline_orders_${new Date().toISOString().split('T')[0]}.csv`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Customer Storefront Orders
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Fulfill online customer orders with automated single stock reservation and tracking.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" icon={RefreshCw} onClick={reloadState}>
            Refresh
          </Button>
          <Button variant="outline" size="sm" icon={Download} onClick={handleExportCSV}>
            Export CSV
          </Button>
          <Link to="/shop">
            <Button variant="primary" size="sm">
              Visit Storefront
            </Button>
          </Link>
        </div>
      </div>

      {/* Filter and Search */}
      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative sm:col-span-2">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by order number, customer name, or email..."
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
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="">All Order Statuses</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed (Stock Reserved)</option>
              <option value="processing">Processing (Warehouse Packaging)</option>
              <option value="ready">Ready (Out for Delivery)</option>
              <option value="completed">Completed (Delivered)</option>
              <option value="cancelled">Cancelled (Stock Restored)</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Orders Table Card */}
      <Card className="overflow-hidden">
        {filteredOrders.length === 0 ? (
          <EmptyState
            title="No orders found"
            description="No customer storefront orders match your current filters."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase text-[10px] tracking-wider select-none">
                <tr>
                  <th className="py-3 px-4">Order #</th>
                  <th className="py-3 px-3">Customer</th>
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
                  <th className="py-3 px-4 text-right">Quick Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {paginatedOrders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-slate-100">
                      <Link to={`/orders/${ord.id}`} className="hover:text-emerald-600 transition-colors">
                        {ord.orderNumber}
                      </Link>
                    </td>

                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">
                        {ord.customerName}
                      </div>
                      <div className="text-[10px] text-slate-400">{ord.phone}</div>
                    </td>

                    <td className="py-3 px-3 text-slate-500 dark:text-slate-400">
                      {formatDateTime(ord.date)}
                    </td>

                    <td className="py-3 px-3 text-center font-mono font-semibold text-slate-700 dark:text-slate-300">
                      {(ord.items || []).length}
                    </td>

                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                      {formatCurrency(ord.total, settings.currency)}
                    </td>

                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          ord.paymentStatus === 'paid'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                            : 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300'
                        }`}
                      >
                        {ord.paymentStatus}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-center">
                      <select
                        value={ord.status}
                        onChange={(e) => handleStatusChange(ord, e.target.value)}
                        className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full border cursor-pointer focus:outline-none ${
                          ord.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700'
                            : ord.status === 'cancelled'
                            ? 'bg-red-100 text-red-800 border-red-300 dark:bg-red-950/60 dark:text-red-300 dark:border-red-700'
                            : 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700'
                        }`}
                      >
                        <option value="pending">Pending</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="processing">Processing</option>
                        <option value="ready">Ready</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <Link to={`/orders/${ord.id}`} title="View Order Details">
                        <button className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800">
                          <Eye className="h-4 w-4" />
                        </button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          currentPage={currentPage}
          totalItems={filteredOrders.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
        />
      </Card>
    </div>
  );
};
