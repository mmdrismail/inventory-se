import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppData } from '../../context/AppDataContext';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { EmptyState } from '../../components/common/EmptyState';
import { formatCurrency } from '../../utils/formatters';
import { ShoppingBag, Trash2, ArrowRight, ArrowLeft } from 'lucide-react';

export const CartPage = () => {
  const { cart, updateCartQty, removeFromCart, clearCart, settings } = useAppData();
  const navigate = useNavigate();

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shippingFee = cart.length > 0 ? 60 : 0;
  const total = subtotal + shippingFee;

  if (cart.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16">
        <EmptyState
          icon={ShoppingBag}
          title="Your Shopping Cart is Empty"
          description="You haven't added any products to your cart yet. Explore our live catalog to place a simulated order."
          actionText="Browse Storefront Catalog"
          onAction={() => navigate('/shop')}
        />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Shopping Cart ({cart.length} item{cart.length === 1 ? '' : 's'})
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Review your selected products before proceeding to simulated checkout.
          </p>
        </div>

        <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600" onClick={clearCart}>
          Clear Cart
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Cart Item List */}
        <div className="lg:col-span-2 space-y-3">
          {cart.map((item) => (
            <Card key={item.productId} className="p-4 flex items-center gap-4">
              <img
                src={item.imageUrl}
                alt={item.name}
                className="w-16 h-16 rounded-xl object-cover shrink-0 border border-slate-200 dark:border-slate-700"
              />

              <div className="flex-1 min-w-0">
                <Link
                  to={`/shop/products/${item.productId}`}
                  className="text-sm font-bold text-slate-900 dark:text-slate-100 hover:text-emerald-600 truncate block"
                >
                  {item.name}
                </Link>
                <div className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
                  {`${formatCurrency(item.price, settings.currency)} each`}
                </div>
              </div>

              {/* Quantity Stepper */}
              <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800">
                <button
                  type="button"
                  onClick={() => updateCartQty(item.productId, item.quantity - 1)}
                  className="px-2.5 py-1 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                >
                  -
                </button>
                <span className="w-8 text-center text-xs font-bold font-mono text-slate-800 dark:text-slate-200">
                  {item.quantity}
                </span>
                <button
                  type="button"
                  onClick={() => updateCartQty(item.productId, item.quantity + 1)}
                  className="px-2.5 py-1 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                >
                  +
                </button>
              </div>

              {/* Line Total */}
              <div className="w-24 text-right">
                <span className="font-mono text-sm font-bold text-slate-900 dark:text-white">
                  {formatCurrency(item.price * item.quantity, settings.currency)}
                </span>
              </div>

              {/* Remove button */}
              <button
                onClick={() => removeFromCart(item.productId)}
                className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg"
                title="Remove item"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </Card>
          ))}

          <div className="pt-2">
            <Link
              to="/shop"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:underline"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Continue Shopping</span>
            </Link>
          </div>
        </div>

        {/* Order Summary Card */}
        <Card className="p-6 space-y-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3">
            Order Summary
          </h2>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>Items Subtotal:</span>
              <span className="font-mono font-semibold">{formatCurrency(subtotal, settings.currency)}</span>
            </div>
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>Estimated Shipping:</span>
              <span className="font-mono">{formatCurrency(shippingFee, settings.currency)}</span>
            </div>
            <div className="flex justify-between text-base font-bold text-slate-900 dark:text-white pt-3 border-t border-slate-100 dark:border-slate-800">
              <span>Grand Total:</span>
              <span className="font-mono text-emerald-600 dark:text-emerald-400">
                {formatCurrency(total, settings.currency)}
              </span>
            </div>
          </div>

          <Link to="/checkout" className="block pt-2">
            <Button variant="primary" size="lg" className="w-full" icon={ArrowRight} iconPosition="right">
              Proceed to Checkout
            </Button>
          </Link>
        </Card>
      </div>
    </div>
  );
};
