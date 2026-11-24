import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAppData } from '../../context/AppDataContext';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { EmptyState } from '../../components/common/EmptyState';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { ShoppingBag, Eye, Clock, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';

export const MyOrdersPage = () => {
  const { orders, settings } = useAppData();
  const { currentUser } = useAuth();

  // Match orders for logged in customer or fallback to all demo orders if role is customer
  const customerOrders = useMemo(() => {
    return orders.filter(
      (o) =>
        (currentUser && o.customerId === currentUser.id) ||
        (currentUser && o.email?.toLowerCase() === currentUser.email?.toLowerCase()) ||
        (!currentUser && true)
    );
  }, [orders, currentUser]);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            My Orders & Tracking
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Review status updates and item receipts for your storefront orders.
          </p>
        </div>

        <Link to="/shop">
          <Button variant="outline" size="sm">
            Continue Shopping
          </Button>
        </Link>
      </div>

      {customerOrders.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title="No orders placed yet"
          description="Browse our storefront catalog to add items to your shopping cart and place your first demo order."
          actionText="Visit Catalog"
          onAction={() => {}}
        />
      ) : (
        <div className="space-y-4">
          {customerOrders.map((ord) => (
            <Card
              key={ord.id}
              id={`order-item-${ord.id}`}
              data-item-id={ord.id}
              data-scroll-anchor={ord.id}
              className="p-5 hover:shadow-md transition-all"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-sm text-emerald-600">
                    {ord.orderNumber}
                  </span>
                  <span className="text-xs text-slate-400">
                    Placed on {formatDateTime(ord.date)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      ord.status === 'completed'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                        : ord.status === 'cancelled'
                        ? 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                    }`}
                  >
                    {ord.status === 'completed' && <CheckCircle2 className="h-3 w-3" />}
                    {ord.status === 'cancelled' && <XCircle className="h-3 w-3" />}
                    {ord.status !== 'completed' && ord.status !== 'cancelled' && <Clock className="h-3 w-3" />}
                    <span>{ord.status}</span>
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-100 ml-2">
                    {formatCurrency(ord.total, settings.currency)}
                  </span>
                </div>
              </div>

              {/* Items Summary */}
              <div className="py-3 flex flex-wrap items-center gap-4 text-xs">
                {(ord.items || []).map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/60 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[160px]">
                      {item.productName || item.name}
                    </span>
                    <span className="text-slate-400 font-mono">x{item.quantity}</span>
                  </div>
                ))}
              </div>

              {/* Bottom detail action */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-400">
                  Delivery to: <strong className="text-slate-600 dark:text-slate-300">{ord.deliveryAddress}</strong>
                </span>
                <Link
                  to={`/my-orders/${ord.id}`}
                  className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                >
                  <span>Track Order Details</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
