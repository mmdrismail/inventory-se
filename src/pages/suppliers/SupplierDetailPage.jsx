import React, { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAppData } from '../../context/AppDataContext';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { ArrowLeft, Truck, Mail, Phone, MapPin, ShoppingCart, Eye, Plus } from 'lucide-react';

export const SupplierDetailPage = () => {
  const { id } = useParams();
  const { suppliers, purchases, settings } = useAppData();

  const supplier = suppliers.find((s) => s.id === id);

  const supplierPurchases = useMemo(() => {
    return purchases.filter((p) => p.supplierId === id);
  }, [purchases, id]);

  const totalSpent = useMemo(() => {
    return supplierPurchases
      .filter((p) => p.status === 'received')
      .reduce((sum, p) => sum + (Number(p.total) || 0), 0);
  }, [supplierPurchases]);

  if (!supplier) {
    return (
      <div className="py-12 text-center space-y-4">
        <h2 className="text-xl font-bold">Supplier Not Found</h2>
        <Link to="/suppliers">
          <Button variant="primary">Return to Supplier Directory</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div className="flex items-center justify-between">
        <Link
          to="/suppliers"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Suppliers</span>
        </Link>

        <Link to="/purchases/new">
          <Button variant="primary" size="sm" icon={Plus}>
            Create Purchase Order
          </Button>
        </Link>
      </div>

      {/* Supplier Profile Card */}
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-200/50 dark:border-blue-800/50">
              <Truck className="h-7 w-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                  {supplier.name}
                </h1>
                <Badge variant={supplier.status === 'active' ? 'emerald' : 'slate'} size="sm">
                  {supplier.status}
                </Badge>
              </div>
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                {supplier.companyName}
              </p>
              {supplier.notes && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 max-w-xl">
                  {supplier.notes}
                </p>
              )}
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="flex sm:flex-col items-end gap-2 text-right">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Spend</span>
              <span className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                {formatCurrency(totalSpent, settings.currency)}
              </span>
            </div>
            <div className="text-xs text-slate-500">
              {supplierPurchases.length} purchase order{supplierPurchases.length === 1 ? '' : 's'}
            </div>
          </div>
        </div>

        {/* Contact details row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 mt-6 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
            <Mail className="h-4 w-4 text-slate-400 shrink-0" />
            <span>{supplier.email || 'No email registered'}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
            <Phone className="h-4 w-4 text-slate-400 shrink-0" />
            <span>{supplier.phone || 'No phone registered'}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
            <MapPin className="h-4 w-4 text-slate-400 shrink-0" />
            <span className="truncate">{supplier.address || 'No address registered'}</span>
          </div>
        </div>
      </Card>

      {/* Associated Purchase Orders Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-emerald-500" />
              <span>Purchase Orders & Intake History</span>
            </CardTitle>
            <p className="text-xs text-slate-400 mt-0.5">
              Historical purchase orders issued to {supplier.name}
            </p>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-y border-slate-200 dark:border-slate-800 text-slate-500 uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-4">PO Reference</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3 text-center">Items</th>
                  <th className="py-2.5 px-3 text-right">Order Total</th>
                  <th className="py-2.5 px-3 text-center">Payment</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {supplierPurchases.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-8 text-center text-slate-400">
                      No purchase orders recorded for this supplier yet.
                    </td>
                  </tr>
                ) : (
                  supplierPurchases.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="py-2.5 px-4 font-mono font-semibold text-emerald-600">
                        <Link to={`/purchases/${p.id}`} className="hover:underline">
                          {p.referenceNo}
                        </Link>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
                        {formatDate(p.date)}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono">
                        {(p.items || []).length}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                        {formatCurrency(p.total, settings.currency)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
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
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            p.status === 'received'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : p.status === 'cancelled'
                              ? 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300'
                              : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <Link to={`/purchases/${p.id}`}>
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
