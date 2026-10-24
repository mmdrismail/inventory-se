import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAppData } from '../../context/AppDataContext';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Package,
  Truck,
  MapPin,
  ShoppingBag,
  XCircle,
} from 'lucide-react';

export const OrderDetailPage = () => {
  const { id } = useParams();
  const { orders, settings } = useAppData();

  const order = orders.find((o) => o.id === id);

  if (!order) {
    return (
      <div className="py-16 text-center space-y-4">
        <h2 className="text-xl font-bold">Order Not Found</h2>
        <Link to="/my-orders">
          <Button variant="primary">Return to My Orders</Button>
        </Link>
      </div>
    );
  }

  const steps = [
    { key: 'pending', label: 'Order Placed', icon: Clock },
    { key: 'confirmed', label: 'Confirmed & Stock Reserved', icon: CheckCircle2 },
    { key: 'processing', label: 'Packaging in Warehouse', icon: Package },
    { key: 'ready', label: 'Out for Delivery', icon: Truck },
    { key: 'completed', label: 'Delivered', icon: CheckCircle2 },
  ];

  const statusOrder = ['pending', 'confirmed', 'processing', 'ready', 'completed'];
  const currentStepIndex = statusOrder.indexOf(order.status);
  const isCancelled = order.status === 'cancelled';

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top navigation */}
      <Link
        to="/my-orders"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back to Order History</span>
      </Link>

      <Card className="p-6 space-y-8">
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
              Placed on {formatDateTime(order.date)} · Payment: {order.paymentMethod}
            </p>
          </div>

          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Billed</span>
            <span className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
              {formatCurrency(order.total, settings.currency)}
            </span>
          </div>
        </div>

        {/* Visual Progress Timeline */}
        {isCancelled ? (
          <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300 flex items-center gap-3">
            <XCircle className="h-6 w-6 text-red-500 shrink-0" />
            <div>
              <span className="font-bold">This order has been cancelled.</span>
              <p className="text-[11px] text-red-600 dark:text-red-400 mt-0.5">
                Any reserved stock has been safely restored to available warehouse inventory.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Order Fulfillment Progress
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {steps.map((st, idx) => {
                const Icon = st.icon;
                const isPassed = currentStepIndex >= idx;
                const isCurrent = currentStepIndex === idx;

                return (
                  <div
                    key={st.key}
                    className={`p-3 rounded-2xl border text-center transition-all ${
                      isCurrent
                        ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 shadow-sm'
                        : isPassed
                        ? 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300'
                        : 'border-slate-100 dark:border-slate-800/50 text-slate-400 dark:text-slate-600 opacity-60'
                    }`}
                  >
                    <Icon className="h-5 w-5 mx-auto mb-1.5" />
                    <span className="text-[11px] font-bold block leading-tight">{st.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Delivery Destination */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 flex items-start gap-3 text-xs">
          <MapPin className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-slate-800 dark:text-slate-200">
              Courier Delivery Destination
            </span>
            <p className="text-slate-600 dark:text-slate-300 mt-0.5">
              Recipient: <strong>{order.customerName}</strong> ({order.phone})
            </p>
            <p className="text-slate-500 mt-0.5">{order.deliveryAddress}</p>
            {order.notes && <p className="text-slate-400 mt-1 italic">Note: "{order.notes}"</p>}
          </div>
        </div>

        {/* Itemized Table */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Order Items
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-y border-slate-200 dark:border-slate-800 text-slate-500 uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-4">Item</th>
                  <th className="py-2.5 px-3 text-center">Qty</th>
                  <th className="py-2.5 px-3 text-right">Price</th>
                  <th className="py-2.5 px-4 text-right">Total</th>
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
              <span>Delivery Fee:</span>
              <span className="font-mono">{formatCurrency(order.shippingFee || 60, settings.currency)}</span>
            </div>
            <div className="flex justify-between w-64 text-base font-bold text-slate-900 dark:text-white pt-2 border-t border-slate-100 dark:border-slate-800">
              <span>Total:</span>
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
