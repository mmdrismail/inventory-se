import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppData } from '../../context/AppDataContext';
import { useLanguage } from '../../context/LanguageContext';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { EmptyState, Pagination } from '../../components/common/EmptyState';
import { PrintableReceiptModal } from '../../components/receipt/PrintableReceiptModal';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { exportToCSV } from '../../utils/csv';
import {
  Plus,
  Download,
  RefreshCw,
  Search,
  Receipt,
  Eye,
  Edit2,
  Printer,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowUpDown,
} from 'lucide-react';

export const SalesListPage = () => {
  const { sales, customers, completeSale, cancelSale, reloadState, confirmAction, settings } = useAppData();
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [sortField, setSortField] = useState('date');
  const [sortDirection, setSortDirection] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // Printable receipt modal state
  const [selectedSaleForReceipt, setSelectedSaleForReceipt] = useState(null);

  const navigate = useNavigate();

  // Filter & Sort
  const filteredSales = useMemo(() => {
    return sales
      .filter((s) => {
        const q = searchTerm.toLowerCase();
        const inv = (s.invoiceNo || s.invoiceNumber || '').toLowerCase();
        const cust = (s.customerName || '').toLowerCase();
        const matchesSearch = !searchTerm || inv.includes(q) || cust.includes(q);

        const matchesCustomer = !selectedCustomer || s.customerId === selectedCustomer;
        const matchesStatus = !selectedStatus || s.status === selectedStatus;

        return matchesSearch && matchesCustomer && matchesStatus;
      })
      .sort((a, b) => {
        let valA = a[sortField];
        let valB = b[sortField];

        if (sortField === 'date') {
          valA = new Date(a.date || a.createdAt || 0).getTime();
          valB = new Date(b.date || b.createdAt || 0).getTime();
        } else if (sortField === 'total') {
          valA = Number(a.total !== undefined ? a.total : (a.totalAmount || 0));
          valB = Number(b.total !== undefined ? b.total : (b.totalAmount || 0));
        }

        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
  }, [sales, searchTerm, selectedCustomer, selectedStatus, sortField, sortDirection]);

  // Pagination
  const paginatedSales = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredSales.slice(start, start + pageSize);
  }, [filteredSales, currentPage]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleComplete = (sale) => {
    const inv = sale.invoiceNo || sale.invoiceNumber || 'Invoice';
    confirmAction({
      title: `Complete Sale Invoice ${inv}?`,
      message: 'Completing this sale will deduct the item quantities from stock and record inventory movements.',
      confirmText: 'Complete Sale',
      onConfirm: () => {
        completeSale(sale.id, 'Sales Staff');
      },
    });
  };

  const handleCancel = (sale) => {
    const inv = sale.invoiceNo || sale.invoiceNumber || 'Invoice';
    confirmAction({
      title: `Cancel Sale Invoice ${inv}?`,
      message: sale.status === 'completed'
        ? 'Cancelling this completed sale will safely restore the sold quantities back to available inventory.'
        : 'Are you sure you want to cancel this draft sale invoice?',
      confirmText: 'Cancel Sale',
      isDestructive: true,
      onConfirm: () => {
        cancelSale(sale.id, 'Admin');
      },
    });
  };

  const handleExportCSV = () => {
    const dataToExport = filteredSales.map((s) => ({
      'Invoice No': s.invoiceNo || s.invoiceNumber,
      'Customer': s.customerName || 'Walk-in Customer',
      'Date': s.date || s.createdAt,
      'Items Count': (s.items || []).length,
      'Subtotal': s.subtotal !== undefined ? s.subtotal : (s.totalAmount || s.total),
      'Discount': s.discount || 0,
      'Grand Total': s.total !== undefined ? s.total : s.totalAmount,
      'Payment Status': s.paymentStatus,
      'Status': s.status,
    }));
    exportToCSV(dataToExport, `stockline_sales_${new Date().toISOString().split('T')[0]}.csv`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {t('sales_title', 'Sales & POS Invoicing')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t('sales_subtitle', 'Record retail and wholesale sales, enforce stock limits, and print receipts.')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" icon={RefreshCw} onClick={reloadState}>
            {t('action_refresh', 'Refresh')}
          </Button>
          <Button variant="outline" size="sm" icon={Download} onClick={handleExportCSV}>
            {t('action_export_csv', 'Export CSV')}
          </Button>
          <Link to="/sales/new">
            <Button variant="primary" size="sm" icon={Plus}>
              {t('action_record_sale', 'Record Sale')}
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
              placeholder={t('placeholder_search_sales', 'Search by invoice number or customer name...')}
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
              value={selectedCustomer}
              onChange={(e) => {
                setSelectedCustomer(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="">{t('all_customers', 'All Customers')}</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
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
              <option value="">{t('all_statuses', 'All Invoice Statuses')}</option>
              <option value="completed">Completed (Stock Deducted)</option>
              <option value="draft">Draft (Stock Not Deducted)</option>
              <option value="cancelled">Cancelled (Stock Restored)</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Sales Invoices Table */}
      <Card className="overflow-hidden">
        {filteredSales.length === 0 ? (
          <EmptyState
            title="No sales invoices found"
            description="Try modifying your filters or record a new sale."
            actionText={t('action_record_sale', 'Record Sale')}
            onAction={() => navigate('/sales/new')}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase text-[10px] tracking-wider select-none">
                <tr>
                  <th className="py-3 px-4">{t('col_invoice_no', 'Invoice #')}</th>
                  <th className="py-3 px-3">{t('col_customer', 'Customer')}</th>
                  <th
                    className="py-3 px-3 cursor-pointer hover:text-slate-800 dark:hover:text-slate-200"
                    onClick={() => handleSort('date')}
                  >
                    <div className="flex items-center gap-1">
                      <span>{t('col_date', 'Date')}</span>
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </th>
                  <th className="py-3 px-3 text-center">{t('col_items', 'Items')}</th>
                  <th className="py-3 px-3 text-right">{t('col_subtotal', 'Subtotal')}</th>
                  <th className="py-3 px-3 text-right">{t('col_discount', 'Discount')}</th>
                  <th
                    className="py-3 px-3 text-right cursor-pointer hover:text-slate-800 dark:hover:text-slate-200"
                    onClick={() => handleSort('total')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>{t('col_grand_total', 'Grand Total')}</span>
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </th>
                  <th className="py-3 px-3 text-center">{t('col_payment', 'Payment')}</th>
                  <th className="py-3 px-3 text-center">{t('col_status', 'Status')}</th>
                  <th className="py-3 px-4 text-right">{t('col_actions', 'Actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {paginatedSales.map((s) => {
                  const invNo = s.invoiceNo || s.invoiceNumber || (s.id ? `INV-${s.id.slice(-4)}` : 'INV-2026');
                  const grandTotal = Number(s.total !== undefined ? s.total : (s.totalAmount !== undefined ? s.totalAmount : 0));
                  const discountNum = Number(s.discount) || 0;
                  const subtotal = Number(s.subtotal !== undefined ? s.subtotal : (grandTotal + discountNum));
                  const dateStr = formatDate(s.date || s.createdAt);

                  return (
                    <tr
                      key={s.id}
                      id={`sale-item-${s.id}`}
                      data-item-id={s.id}
                      data-scroll-anchor={s.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-slate-100">
                        <Link to={`/sales/${s.id}`} className="hover:text-emerald-600 transition-colors">
                          {invNo}
                        </Link>
                      </td>

                      <td className="py-3 px-3 text-slate-800 dark:text-slate-200 font-medium">
                        {s.customerName || 'Walk-in Customer'}
                        {s.customerCompany && (
                          <span className="block text-[11px] text-purple-600 dark:text-purple-400 font-normal">
                            {s.customerCompany}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {dateStr}
                      </td>

                      <td className="py-3 px-3 text-center font-mono font-semibold text-slate-700 dark:text-slate-300">
                        {(s.items || []).length}
                      </td>

                      <td className="py-3 px-3 text-right font-mono text-slate-500">
                        {formatCurrency(subtotal, settings.currency)}
                      </td>

                      <td className="py-3 px-3 text-right font-mono text-emerald-600">
                        {discountNum > 0 ? `-${formatCurrency(discountNum, settings.currency)}` : '—'}
                      </td>

                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                        {formatCurrency(grandTotal, settings.currency)}
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            s.paymentStatus === 'paid'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                              : 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300'
                          }`}
                        >
                          {s.paymentStatus}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            s.status === 'completed'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : s.status === 'cancelled'
                              ? 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300'
                              : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                          }`}
                        >
                          {s.status === 'completed' && <CheckCircle2 className="h-3 w-3" />}
                          {s.status === 'draft' && <Clock className="h-3 w-3" />}
                          {s.status === 'cancelled' && <XCircle className="h-3 w-3" />}
                          <span>{s.status}</span>
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setSelectedSaleForReceipt(s)}
                            title="Print Invoice / Cash Memo / Challan"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            <Printer className="h-4 w-4" />
                          </button>
                          <Link to={`/sales/${s.id}/edit`} title="Edit Invoice">
                            <button className="p-1.5 rounded-lg text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                              <Edit2 className="h-4 w-4" />
                            </button>
                          </Link>
                          <Link to={`/sales/${s.id}`} title="View Details">
                            <button className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800">
                              <Eye className="h-4 w-4" />
                            </button>
                          </Link>
                          {s.status === 'draft' && (
                            <button
                              onClick={() => handleComplete(s)}
                              title="Complete Sale & Deduct Stock"
                              className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </button>
                          )}
                          {s.status !== 'cancelled' && (
                            <button
                              onClick={() => handleCancel(s)}
                              title="Cancel Sale & Restore Stock"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          currentPage={currentPage}
          totalItems={filteredSales.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
        />
      </Card>

      {/* Printable Receipt Modal */}
      <PrintableReceiptModal
        isOpen={Boolean(selectedSaleForReceipt)}
        onClose={() => setSelectedSaleForReceipt(null)}
        sale={selectedSaleForReceipt}
      />
    </div>
  );
};
