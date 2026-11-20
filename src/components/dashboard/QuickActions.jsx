import React from 'react';
import { Link } from 'react-router-dom';
import { PlusCircle, ShoppingCart, Receipt, UserPlus, BarChart3, SlidersHorizontal } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export const QuickActions = () => {
  const { t } = useLanguage();

  const actions = [
    { label: t('qa_add_product', 'Add Product'), to: '/products/new', icon: PlusCircle, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200/50 dark:border-emerald-800/50' },
    { label: t('qa_record_purchase', 'Record Purchase'), to: '/purchases/new', icon: ShoppingCart, color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/40 border-blue-200/50 dark:border-blue-800/50' },
    { label: t('qa_record_sale', 'Record Sale'), to: '/sales/new', icon: Receipt, color: 'text-teal-600 bg-teal-50 dark:bg-teal-950/40 border-teal-200/50 dark:border-teal-800/50' },
    { label: t('qa_add_customer', 'Add Customer'), to: '/customers', icon: UserPlus, color: 'text-purple-600 bg-purple-50 dark:bg-purple-950/40 border-purple-200/50 dark:border-purple-800/50' },
    { label: t('qa_stock_adjust', 'Stock Adjustment'), to: '/inventory', icon: SlidersHorizontal, color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/40 border-amber-200/50 dark:border-amber-800/50' },
    { label: t('qa_view_reports', 'View Reports'), to: '/reports', icon: BarChart3, color: 'text-slate-600 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {actions.map((act) => {
        const Icon = act.icon;
        return (
          <Link
            key={act.label}
            to={act.to}
            className="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-emerald-500/50 dark:hover:border-emerald-500/50 shadow-sm hover:shadow transition-all group text-center"
          >
            <div className={`p-2.5 rounded-xl border mb-2 transition-transform group-hover:scale-110 ${act.color}`}>
              <Icon className="h-5 w-5" />
            </div>
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
              {act.label}
            </span>
          </Link>
        );
      })}
    </div>
  );
};
