import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAppData } from '../../context/AppDataContext';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { PrintableReceiptModal } from '../../components/receipt/PrintableReceiptModal';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { ArrowLeft, Printer, CheckCircle2, XCircle, Clock, Users2 } from 'lucide-react';

export const SaleDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { sales, customers, completeSale, cancelSale, confirmAction, settings } = useAppData();
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  const sale = sales.find((s) => s.id === id);
  const customer = customers.find((c) => c.id === sale?.customerId);

  if (!sale) {
    return (
      <div className="py-12 text-center space-y-4">
        <h2 className="text-xl font-bold">Sale Invoice Not Found</h2>
        <Link to="/sales">
          <Button variant="primary">Return to Sales List</Button>
        </Link>
      </div>
    );
  }

  const handleComplete = () => {
    confirmAction({
      title: `Complete Invoice ${sale.invoiceNo}?`,
      message: 'This will decrease on-hand inventory quantities for all sold items and record movements.',
      confirmText: 'Complete Sale',
      onConfirm: () => {
        completeSale(sale.id, 'Sales Executive');
      },
    });
  };

  const handleCancel = () => {
    confirmAction({
      title: `Cancel Sale Invoice ${sale.invoiceNo}?`,
      message: sale.status === 'completed'
        ? 'Warning: This sale has already deducted items from stock. Cancelling it will safely restore those quantities.'
        : 'Are you sure you want to cancel this draft sale invoice?',
      confirmText: 'Confirm Cancellation',
      isDestructive: true,
      onConfirm: () => {
        cancelSale(sale.id, 'Admin');
      },
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top back & actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          to="/sales"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Sales List</span>
        </Link>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" icon={Printer} onClick={() => setIsReceiptOpen(true)}>
            Print Receipt
          </Button>

          {sale.status === 'draft' && (
            <Button variant="primary" size="sm" icon={CheckCircle2} onClick={handleComplete}>
              Complete Sale Now
            </Button>
          )}

          {sale.status !== 'cancelled' && (
            <Button variant="outline" size="sm" icon={XCircle} onClick={handleCancel}>
              Cancel Invoice
            </Button>
          )}
        </div>
      </div>

      <Card className="p-6">
        <div className="flex flex-col sm:flex-row items-start justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white font-mono">
                {sale.invoiceNo}
              </h1>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  sale.status === 'completed'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                    : sale.status === 'cancelled'
                    ? 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                }`}
              >
                {sale.status === 'completed' && <CheckCircle2 className="h-3 w-3" />}
                {sale.status === 'draft' && <Clock className="h-3 w-3" />}
                {sale.status === 'cancelled' && <XCircle className="h-3 w-3" />}
                <span>{sale.status}</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Issued on {formatDateTime(sale.date)}
            </p>
          </div>

          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Grand Total</span>
            <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
              {formatCurrency(sale.total, settings.currency)}
            </div>
            <span
              className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase mt-1 ${
                sale.paymentStatus === 'paid'
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                  : 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300'
              }`}
            >
              {sale.paymentStatus}
            </span>
          </div>
        </div>

        {/* Customer details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4 text-xs">
          <div>
            <span className="text-slate-400 font-semibold block uppercase text-[10px] mb-1">
              Billed Customer
            </span>
            {sale.customerId ? (
              <Link
                to={`/customers/${sale.customerId}`}
                className="text-sm font-bold text-slate-800 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400"
              >
                {sale.customerName}
              </Link>
            ) : (
              <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                {sale.customerName || 'Walk-in Retail Customer'}
              </span>
            )}
            <p className="text-slate-500 mt-0.5">{customer?.phone || sale.customerPhone || 'Direct counter sale'}</p>
          </div>
          <div>
            <span className="text-slate-400 font-semibold block uppercase text-[10px] mb-1">
              Invoice Remarks
            </span>
            <p className="text-slate-700 dark:text-slate-300">
              {sale.notes || 'Standard retail transaction.'}
            </p>
          </div>
        </div>

        {/* Itemized Table */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
            Billed Items
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-y border-slate-200 dark:border-slate-800 text-slate-500 uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-4">Product Name</th>
                  <th className="py-2.5 px-3 text-center">Quantity</th>
                  <th className="py-2.5 px-3 text-right">Unit Price</th>
                  <th className="py-2.5 px-4 text-right">Line Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {(sale.items || []).map((item, i) => (
                  <tr key={i}>
                    <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">
                      {item.productName || item.productId}
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-bold text-slate-700 dark:text-slate-300">
                      {item.quantity}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-600 dark:text-slate-400">
                      {formatCurrency(item.unitPrice, settings.currency)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                      {formatCurrency(item.total, settings.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totals Breakdown */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col items-end gap-1.5 text-xs">
          <div className="flex justify-between w-64 text-slate-500">
            <span>Subtotal:</span>
            <span className="font-mono">{formatCurrency(sale.subtotal, settings.currency)}</span>
          </div>
          {Number(sale.discount) > 0 && (
            <div className="flex justify-between w-64 text-emerald-600 font-semibold">
              <span>Discount Applied:</span>
              <span className="font-mono">-{formatCurrency(sale.discount, settings.currency)}</span>
            </div>
          )}
          <div className="flex justify-between w-64 text-base font-bold text-slate-900 dark:text-white pt-2 border-t border-slate-100 dark:border-slate-800">
            <span>Grand Total:</span>
            <span className="font-mono text-emerald-600 dark:text-emerald-400">
              {formatCurrency(sale.total, settings.currency)}
            </span>
          </div>
        </div>
      </Card>

      {/* Receipt Modal */}
      <PrintableReceiptModal
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
        sale={sale}
      />
    </div>
  );
};
