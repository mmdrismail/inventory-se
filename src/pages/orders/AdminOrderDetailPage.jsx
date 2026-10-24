import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAppData } from '../../context/AppDataContext';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import {
  ArrowLeft,
  ClipboardList,
  MapPin,
  CheckCircle2,
  Package,
  Truck,
  XCircle,
  Clock,
  ShieldAlert,
} from 'lucide-react';

export const AdminOrderDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { orders, updateOrderStatus, confirmAction, settings } = useAppData();

  const order = orders.find((o) => o.id === id);

  if (!order) {
    return (
      <div className="py-12 text-center space-y-4">
        <h2 className="text-xl font-bold">Order Not Found</h2>
        <Link to="/orders">
          <Button variant="primary">Return to Order List</Button>
        </Link>
      </div>
    );
  }

  const handleStatusChange = (newStatus) => {
    const isCancel = newStatus === 'cancelled';
    confirmAction({
      title: `Update Order to "${newStatus.toUpperCase()}"?`,
      message: isCancel && order.stockDeducted
        ? 'Cancelling this order will automatically restore reserved product quantities back to stock.'
        : `Advance order lifecycle to ${newStatus.toUpperCase()}.`,
      confirmText: `Set ${newStatus.toUpperCase()}`,
      isDestructive: isCancel,
      onConfirm: () => {
        updateOrderStatus(order.id, newStatus, 'Operations Staff');
      },
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          to="/orders"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Order List</span>
        </Link>

        {/* Status Actions Bar */}
        <div className="flex flex-wrap items-center gap-2">
          {order.status === 'pending' && (
            <Button
              variant="primary"
              size="sm"
              icon={CheckCircle2}
              onClick={() => handleStatusChange('confirmed')}
            >
              Confirm & Reserve Stock
            </Button>
          )}

          {order.status === 'confirmed' && (
            <Button
              variant="primary"
              size="sm"
              icon={Package}
              onClick={() => handleStatusChange('processing')}
            >
              Start Warehouse Packing
            </Button>
          )}

          {order.status === 'processing' && (
            <Button
              variant="primary"
              size="sm"
              icon={Truck}
              onClick={() => handleStatusChange('ready')}
            >
              Ready for Dispatch
            </Button>
          )}

          {order.status === 'ready' && (
            <Button
              variant="primary"
              size="sm"
              icon={CheckCircle2}
              onClick={() => handleStatusChange('completed')}
            >
              Mark Delivered & Completed
            </Button>
          )}

          {order.status !== 'cancelled' && order.status !== 'completed' && (
            <Button
              variant="outline"
              size="sm"
              icon={XCircle}
              onClick={() => handleStatusChange('cancelled')}
            >
              Cancel Order
            </Button>
          )}
        </div>
      </div>

      <Card className="p-6 space-y-6">
        {/* Order Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
                {order.orderNumber}
              </h1>
              <span
                className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                  order.status === 'completed'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                    : order.status === 'cancelled'
                    ? 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                }`}
              >
                {order.status}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Received on {formatDateTime(order.date)} · Stock Policy Status:{' '}
              <strong className={order.stockDeducted ? 'text-emerald-600' : 'text-amber-500'}>
                {order.stockDeducted ? 'Deducted from Inventory' : 'Awaiting Confirmation'}
              </strong>
            </p>
          </div>

          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Billed</span>
            <span className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
              {formatCurrency(order.total, settings.currency)}
            </span>
            <span
              className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase mt-1 ${
                order.paymentStatus === 'paid'
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                  : 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300'
              }`}
            >
              {order.paymentStatus}
            </span>
          </div>
        </div>

        {/* Customer & Address Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2 text-xs">
          <div>
            <span className="text-slate-400 font-semibold block uppercase text-[10px] mb-1">
              Customer Details
            </span>
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              {order.customerName}
            </h4>
            <p className="text-slate-500 mt-0.5">Email: {order.email}</p>
            <p className="text-slate-500">Phone: {order.phone}</p>
          </div>

          <div>
            <span className="text-slate-400 font-semibold block uppercase text-[10px] mb-1">
              Shipping & Delivery
            </span>
            <p className="text-slate-700 dark:text-slate-300 font-medium">{order.deliveryAddress}</p>
            <p className="text-slate-500 mt-0.5">Method: {order.paymentMethod}</p>
            {order.notes && <p className="text-slate-400 mt-1 italic">Note: "{order.notes}"</p>}
          </div>
        </div>

        {/* Items Table */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Order Items
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-y border-slate-200 dark:border-slate-800 text-slate-500 uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-4">Item Name</th>
                  <th className="py-2.5 px-3 text-center">Quantity</th>
                  <th className="py-2.5 px-3 text-right">Unit Price</th>
                  <th className="py-2.5 px-4 text-right">Line Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {(order.items || []).map((item, idx) => (
                  <tr key={idx}>
                    <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">
                      {item.productName || item.name}
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-bold text-slate-700 dark:text-slate-300">
                      {item.quantity}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-500">
                      {formatCurrency(item.price, settings.currency)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                      {formatCurrency(item.price * item.quantity, settings.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col items-end gap-1 text-xs">
            <div className="flex justify-between w-64 text-slate-500">
              <span>Subtotal:</span>
              <span className="font-mono">{formatCurrency(order.subtotal, settings.currency)}</span>
            </div>
            <div className="flex justify-between w-64 text-slate-500">
              <span>Courier Delivery Fee:</span>
              <span className="font-mono">{formatCurrency(order.shippingFee || 60, settings.currency)}</span>
            </div>
            <div className="flex justify-between w-64 text-base font-bold text-slate-900 dark:text-white pt-2 border-t border-slate-100 dark:border-slate-800">
              <span>Grand Total:</span>
              <span className="font-mono text-emerald-600 dark:text-emerald-400">
                {formatCurrency(order.total, settings.currency)}
              </span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
