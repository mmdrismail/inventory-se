import React, { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAppData } from '../../context/AppDataContext';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { ArrowLeft, Users2, Mail, Phone, MapPin, Receipt, Plus, Eye, ShoppingBag } from 'lucide-react';

export const CustomerDetailPage = () => {
  const { id } = useParams();
  const { customers, sales, orders, settings } = useAppData();

  const customer = customers.find((c) => c.id === id);

  const customerSales = useMemo(() => {
    return sales.filter((s) => s.customerId === id);
  }, [sales, id]);

  const customerOrders = useMemo(() => {
    return orders.filter(
      (o) => o.customerId === id || (customer && o.email?.toLowerCase() === customer.email?.toLowerCase())
    );
  }, [orders, id, customer]);

  const totalSpent = useMemo(() => {
    return customerSales
      .filter((s) => s.status === 'completed')
      .reduce((sum, s) => sum + (Number(s.total) || 0), 0);
  }, [customerSales]);

  if (!customer) {
    return (
      <div className="py-12 text-center space-y-4">
        <h2 className="text-xl font-bold">Customer Not Found</h2>
        <Link to="/customers">
          <Button variant="primary">Return to Customers</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <Link
          to="/customers"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Customers</span>
        </Link>

        <Link to="/sales/new">
          <Button variant="primary" size="sm" icon={Plus}>
            Record New Sale
          </Button>
        </Link>
      </div>

      {/* Customer Profile Card */}
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 border border-purple-200/50 dark:border-purple-800/50">
              <Users2 className="h-7 w-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                  {customer.name}
                </h1>
                <Badge
                  variant={
                    customer.customerType === 'Corporate'
                      ? 'purple'
                      : customer.customerType === 'Wholesale'
                      ? 'blue'
                      : 'emerald'
                  }
                  size="sm"
                >
                  {customer.customerType || 'Retail'}
                </Badge>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Account created on {formatDate(customer.createdAt)}
              </p>
              {customer.notes && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 max-w-xl">
                  {customer.notes}
                </p>
              )}
            </div>
          </div>

          <div className="flex sm:flex-col items-end gap-2 text-right">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Revenue</span>
              <span className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                {formatCurrency(totalSpent, settings.currency)}
              </span>
            </div>
            <div className="text-xs text-slate-500">
              {customerSales.length} invoice{customerSales.length === 1 ? '' : 's'} · {customerOrders.length} online order{customerOrders.length === 1 ? '' : 's'}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 mt-6 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
            <Mail className="h-4 w-4 text-slate-400 shrink-0" />
            <span>{customer.email || 'No email registered'}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
            <Phone className="h-4 w-4 text-slate-400 shrink-0" />
            <span>{customer.phone || 'No phone registered'}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
            <MapPin className="h-4 w-4 text-slate-400 shrink-0" />
            <span className="truncate">{customer.address || 'No address specified'}</span>
          </div>
        </div>
      </Card>

      {/* Sales Invoices Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-4 w-4 text-emerald-500" />
              <span>Sales & POS Invoicing Ledger</span>
            </CardTitle>
            <p className="text-xs text-slate-400 mt-0.5">
              Completed and draft invoices for {customer.name}
            </p>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-y border-slate-200 dark:border-slate-800 text-slate-500 uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-4">Invoice #</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3 text-center">Items</th>
                  <th className="py-2.5 px-3 text-right">Total Amount</th>
                  <th className="py-2.5 px-3 text-center">Payment</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-4 text-right">View</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {customerSales.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-6 text-center text-slate-400">
                      No invoices recorded for this customer yet.
                    </td>
                  </tr>
                ) : (
                  customerSales.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="py-2.5 px-4 font-mono font-semibold text-emerald-600">
                        <Link to={`/sales/${s.id}`} className="hover:underline">
                          {s.invoiceNo}
                        </Link>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
                        {formatDate(s.date)}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono">
                        {(s.items || []).length}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                        {formatCurrency(s.total, settings.currency)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
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
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            s.status === 'completed'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : s.status === 'cancelled'
                              ? 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300'
                              : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                          }`}
                        >
                          {s.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <Link to={`/sales/${s.id}`}>
                          <button className="p-1 rounded-lg text-slate-400 hover:text-emerald-600">
                            <Eye className="h-4 w-4" />
                          </button>
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
