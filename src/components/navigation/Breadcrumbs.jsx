import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export const Breadcrumbs = () => {
  const location = useLocation();
  const { t } = useLanguage();
  const pathnames = location.pathname.split('/').filter((x) => x);

  const routeNameMap = {
    dashboard: t('nav_overview', 'Dashboard'),
    products: t('nav_products', 'Products'),
    'price-list': t('nav_price_list', 'Machine & Price List'),
    new: t('Create', 'Create'),
    edit: t('Edit', 'Edit'),
    categories: t('nav_categories', 'Categories'),
    suppliers: t('nav_suppliers', 'Suppliers'),
    customers: t('nav_customers', 'Customers'),
    purchases: t('nav_purchases', 'Purchases'),
    sales: t('nav_sales', 'Sales & POS'),
    quotations: t('nav_quotations', 'Quotations'),
    'offline-entries': t('nav_offline_entries', 'Offline Ledger (OCR)'),
    inventory: t('nav_inventory', 'Inventory Tracking'),
    orders: t('nav_orders', 'Customer Orders'),
    reports: t('nav_reports', 'Reports'),
    users: t('nav_users', 'User Roles'),
    settings: t('nav_settings', 'Settings'),
    profile: t('Profile', 'Profile'),
    shop: t('Storefront', 'Storefront'),
    cart: t('Cart', 'Cart'),
    checkout: t('Checkout', 'Checkout'),
    'my-orders': t('My Orders', 'My Orders'),
  };

  return (
    <nav className="hidden sm:flex items-center text-xs text-slate-500 dark:text-slate-400 space-x-1.5 min-w-0 flex-1 overflow-hidden whitespace-nowrap py-1">
      <Link
        to="/dashboard"
        className="hover:text-emerald-600 dark:hover:text-emerald-400 flex items-center gap-1 transition-colors shrink-0"
      >
        <Home className="h-3.5 w-3.5 shrink-0" />
        <span className="hidden xl:inline">StockLine</span>
      </Link>
      {pathnames.map((segment, index) => {
        const routeTo = `/${pathnames.slice(0, index + 1).join('/')}`;
        const isLast = index === pathnames.length - 1;
        const displayName = routeNameMap[segment] || (segment.length > 12 ? `${segment.slice(0, 10)}...` : segment);

        return (
          <React.Fragment key={routeTo}>
            <ChevronRight className="h-3 w-3 text-slate-400 shrink-0" />
            {isLast ? (
              <span className="font-semibold text-slate-800 dark:text-slate-200 truncate min-w-0" title={displayName}>
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
