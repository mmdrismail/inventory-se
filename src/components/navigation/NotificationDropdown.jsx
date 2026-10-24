import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAppData } from '../../context/AppDataContext';
import { Bell, AlertTriangle, XCircle, ShoppingBag, CheckCircle, ArrowRight } from 'lucide-react';

export const NotificationDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const { products, orders, sales } = useAppData();

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Compute notifications dynamically from live application data
  const notifications = [];

  // Out of stock & low stock
  products.forEach((p) => {
    const qty = Number(p.quantity) || 0;
    const reorder = Number(p.reorderLevel) || 10;
    if (qty === 0) {
      notifications.push({
        id: `oos-${p.id}`,
        title: 'Out of Stock Alert',
        message: `"${p.name}" (SKU: ${p.sku}) is at 0 units. Immediate reorder recommended.`,
        type: 'danger',
        link: `/inventory`,
        time: 'Critical',
      });
    } else if (qty <= reorder) {
      notifications.push({
        id: `low-${p.id}`,
        title: 'Low Stock Threshold Warning',
        message: `"${p.name}" has ${qty} units remaining (Threshold: ${reorder}).`,
        type: 'warning',
        link: `/inventory`,
        time: 'Warning',
      });
    }
  });

  // Recent pending storefront orders
  orders
    .filter((o) => o.status === 'pending')
    .slice(0, 3)
    .forEach((ord) => {
      notifications.push({
        id: `ord-${ord.id}`,
        title: 'New Customer Order',
        message: `Order #${ord.orderNumber} placed by ${ord.customerName} awaits confirmation.`,
        type: 'info',
        link: `/orders/${ord.id}`,
        time: 'Pending',
      });
    });

  const totalUnread = notifications.length;

  const iconMap = {
    danger: <XCircle className="h-4 w-4 text-red-500 shrink-0" />,
    warning: <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />,
    info: <ShoppingBag className="h-4 w-4 text-blue-500 shrink-0" />,
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        title="Notifications"
      >
        <Bell className="h-5 w-5" />
        {totalUnread > 0 && (
          <span className="absolute top-1 right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white px-1 shadow-sm animate-pulse">
            {totalUnread}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 z-50 overflow-hidden transform transition-all">
          <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Notifications
              </h4>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
                {totalUnread} New
              </span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              Close
            </button>
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                No active inventory warnings or pending orders at this moment.
              </div>
            ) : (
              notifications.map((n) => (
                <Link
                  key={n.id}
                  to={n.link}
                  onClick={() => setIsOpen(false)}
                  className="flex items-start gap-3 p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                >
                  <div className="mt-0.5">{iconMap[n.type]}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {n.title}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono shrink-0">{n.time}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">
                      {n.message}
                    </p>
                  </div>
                </Link>
              ))
            )}
          </div>

          <div className="p-2.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-center">
            <Link
              to="/inventory"
              onClick={() => setIsOpen(false)}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              <span>View Inventory Reorder Status</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};
