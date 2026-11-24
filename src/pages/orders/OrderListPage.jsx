import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppData } from '../../context/AppDataContext';
import { useLanguage } from '../../context/LanguageContext';
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
  const { language, t } = useLanguage();

  const l = (texts) => {
    if (language === 'en') return texts.en;
    if (language === 'obro') return texts.obro || `${texts.bn} (${texts.en})`;
    return texts.bn;
  };

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
      title: l({
        bn: `অর্ডার ${order.orderNumber}-এর অবস্থা "${newStatus.toUpperCase()}" করবেন?`,
        en: `Update Order ${order.orderNumber} to "${newStatus.toUpperCase()}"?`,
        obro: `Order ${order.orderNumber} status update korben?`,
      }),
      message: isCancel && order.stockDeducted
        ? l({
            bn: 'এই অর্ডারটি বাতিল করলে সংরক্ষিত পণ্যের পরিমাণ স্বয়ংক্রিয়ভাবে ইনভেন্টরিতে ফেরত যুক্ত হবে।',
            en: 'Cancelling this order will automatically restore reserved product quantities back to inventory.',
            obro: 'Eti cancel korle reserved stock inventory-te ferot jabe.',
          })
        : l({
            bn: `অর্ডারের অবস্থা ${order.status.toUpperCase()} থেকে পরিবর্তন করে ${newStatus.toUpperCase()} নির্ধারণ করা হচ্ছে।`,
            en: `Change status from ${order.status.toUpperCase()} to ${newStatus.toUpperCase()}.`,
            obro: `Status ${order.status.toUpperCase()} theke ${newStatus.toUpperCase()} kora hobe.`,
          }),
      confirmText: l({
        bn: `${newStatus.toUpperCase()} সেট করুন`,
        en: `Set ${newStatus.toUpperCase()}`,
        obro: `Set ${newStatus.toUpperCase()}`,
      }),
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
            {l({
              bn: 'কাস্টমার অনলাইন অর্ডার',
              en: 'Customer Storefront Orders',
              obro: 'Customer Online Orders',
            })}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {l({
              bn: 'স্বয়ংক্রিয় একক স্টক রিজার্ভেশন এবং ট্র্যাকিং সহ অনলাইন গ্রাহকদের অর্ডার পরিচালনা করুন।',
              en: 'Fulfill online customer orders with automated single stock reservation and tracking.',
              obro: 'Automated stock reservation shoho online orders fulfill korun.',
            })}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" icon={RefreshCw} onClick={reloadState}>
            {l({ bn: 'রিফ্রেশ', en: 'Refresh', obro: 'Refresh' })}
          </Button>
          <Button variant="outline" size="sm" icon={Download} onClick={handleExportCSV}>
            {l({ bn: 'এক্সপোর্ট CSV', en: 'Export CSV', obro: 'Export CSV' })}
          </Button>
          <Link to="/shop">
            <Button variant="primary" size="sm">
              {l({ bn: 'অনলাইন শপ দেখুন', en: 'Visit Storefront', obro: 'Online Shop Dekhun' })}
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
              placeholder={l({
                bn: 'অর্ডার নম্বর, গ্রাহকের নাম বা ইমেইল দিয়ে অনুসন্ধান করুন...',
                en: 'Search by order number, customer name, or email...',
                obro: 'Order number, customer name ba email diye search korun...',
              })}
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
              <option value="">{l({ bn: 'সকল অর্ডার অবস্থা', en: 'All Order Statuses', obro: 'All Order Statuses' })}</option>
              <option value="pending">{l({ bn: 'অপেক্ষমান (Pending)', en: 'Pending', obro: 'Pending' })}</option>
              <option value="confirmed">{l({ bn: 'নিশ্চিতকৃত (Confirmed - স্টক সংরক্ষিত)', en: 'Confirmed (Stock Reserved)', obro: 'Confirmed (Stock Reserved)' })}</option>
              <option value="processing">{l({ bn: 'প্রক্রিয়াকরণ চলছে (Processing)', en: 'Processing (Warehouse Packaging)', obro: 'Processing' })}</option>
              <option value="ready">{l({ bn: 'ডেলিভারির জন্য প্রস্তুত (Ready)', en: 'Ready (Out for Delivery)', obro: 'Ready (Out for Delivery)' })}</option>
              <option value="completed">{l({ bn: 'সম্পন্ন / ডেলিভার্ড (Completed)', en: 'Completed (Delivered)', obro: 'Completed (Delivered)' })}</option>
              <option value="cancelled">{l({ bn: 'বাতিলকৃত (Cancelled - স্টক ফেরত)', en: 'Cancelled (Stock Restored)', obro: 'Cancelled (Stock Restored)' })}</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Orders Table Card */}
      <Card className="overflow-hidden">
        {filteredOrders.length === 0 ? (
          <EmptyState
            title={l({
              bn: 'কোনো অর্ডার পাওয়া যায়নি',
              en: 'No orders found',
              obro: 'Kono order paowa jayni',
            })}
            description={l({
              bn: 'আপনার বর্তমান ফিল্টারের সাথে মিলে এমন কোনো গ্রাহক অর্ডার নেই।',
              en: 'No customer storefront orders match your current filters.',
              obro: 'Current filter-er sathe kono order match koreni.',
            })}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase text-[10px] tracking-wider select-none">
                <tr>
                  <th className="py-3 px-4">{l({ bn: 'অর্ডার নং', en: 'Order #', obro: 'Order #' })}</th>
                  <th className="py-3 px-3">{l({ bn: 'গ্রাহক', en: 'Customer', obro: 'Customer' })}</th>
                  <th
                    className="py-3 px-3 cursor-pointer hover:text-slate-800 dark:hover:text-slate-200"
                    onClick={() => handleSort('date')}
                  >
                    <div className="flex items-center gap-1">
                      <span>{l({ bn: 'তারিখ', en: 'Date', obro: 'Date' })}</span>
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </th>
                  <th className="py-3 px-3 text-center">{l({ bn: 'আইটেম', en: 'Items', obro: 'Items' })}</th>
                  <th
                    className="py-3 px-3 text-right cursor-pointer hover:text-slate-800 dark:hover:text-slate-200"
                    onClick={() => handleSort('total')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>{l({ bn: 'মোট মূল্য', en: 'Total Amount', obro: 'Total Amount' })}</span>
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </th>
                  <th className="py-3 px-3 text-center">{l({ bn: 'পেমেন্ট', en: 'Payment', obro: 'Payment' })}</th>
                  <th className="py-3 px-3 text-center">{l({ bn: 'অবস্থা', en: 'Status', obro: 'Status' })}</th>
                  <th className="py-3 px-4 text-right">{l({ bn: 'অ্যাকশন', en: 'Quick Action', obro: 'Quick Action' })}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {paginatedOrders.map((ord) => (
                  <tr
                    key={ord.id}
                    id={`order-item-${ord.id}`}
                    data-item-id={ord.id}
                    data-scroll-anchor={ord.id}
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                  >
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
                        {ord.paymentStatus === 'paid'
                          ? l({ bn: 'পরিশোধিত', en: 'PAID', obro: 'PAID' })
                          : l({ bn: 'বকেয়া', en: 'PENDING', obro: 'PENDING' })}
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
                        <option value="pending">{l({ bn: 'পেন্ডিং', en: 'Pending', obro: 'Pending' })}</option>
                        <option value="confirmed">{l({ bn: 'কনফার্মড', en: 'Confirmed', obro: 'Confirmed' })}</option>
                        <option value="processing">{l({ bn: 'প্রসেসিং', en: 'Processing', obro: 'Processing' })}</option>
                        <option value="ready">{l({ bn: 'রেডি', en: 'Ready', obro: 'Ready' })}</option>
                        <option value="completed">{l({ bn: 'ডেলিভার্ড', en: 'Completed', obro: 'Completed' })}</option>
                        <option value="cancelled">{l({ bn: 'বাতিল', en: 'Cancelled', obro: 'Cancelled' })}</option>
                      </select>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <Link to={`/orders/${ord.id}`} title={l({ bn: 'অর্ডারের বিস্তারিত দেখুন', en: 'View Order Details', obro: 'View Order Details' })}>
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
