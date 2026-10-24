import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

export const Breadcrumbs = () => {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x);

  const routeNameMap = {
    dashboard: 'Dashboard',
    products: 'Products',
    new: 'Create',
    edit: 'Edit',
    categories: 'Categories',
    suppliers: 'Suppliers',
    customers: 'Customers',
    purchases: 'Purchases',
    sales: 'Sales & POS',
    inventory: 'Inventory Tracking',
    orders: 'Customer Orders',
    reports: 'Reports',
    users: 'User Roles',
    settings: 'Settings',
    profile: 'Profile',
    shop: 'Storefront',
    cart: 'Cart',
    checkout: 'Checkout',
    'my-orders': 'My Orders',
  };

  return (
    <nav className="hidden sm:flex items-center text-xs text-slate-500 dark:text-slate-400 space-x-1.5 overflow-x-auto whitespace-nowrap py-1">
      <Link
        to="/dashboard"
        className="hover:text-emerald-600 dark:hover:text-emerald-400 flex items-center gap-1 transition-colors"
      >
        <Home className="h-3.5 w-3.5" />
        <span className="hidden md:inline">StockLine</span>
      </Link>
      {pathnames.map((segment, index) => {
        const routeTo = `/${pathnames.slice(0, index + 1).join('/')}`;
        const isLast = index === pathnames.length - 1;
        const displayName = routeNameMap[segment] || (segment.length > 12 ? `${segment.slice(0, 10)}...` : segment);

        return (
          <React.Fragment key={routeTo}>
            <ChevronRight className="h-3 w-3 text-slate-400 shrink-0" />
            {isLast ? (
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {displayName}
              </span>
            ) : (
              <Link
                to={routeTo}
                className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
              >
                {displayName}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};
