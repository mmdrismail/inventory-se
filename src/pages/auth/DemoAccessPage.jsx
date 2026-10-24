import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { useAuth } from '../../context/AuthContext';
import { useAppData } from '../../context/AppDataContext';
import { ShieldCheck, UserCheck, Briefcase, ShoppingBag, ArrowRight, Check, X } from 'lucide-react';

export const DemoAccessPage = () => {
  const { demoLogin } = useAuth();
  const { addToast } = useAppData();
  const navigate = useNavigate();

  const roles = [
    {
      role: 'admin',
      title: 'Administrator',
      email: 'admin@stockline.io',
      icon: ShieldCheck,
      color: 'emerald',
      badge: 'Unrestricted Access',
      description: 'Ideal for system administrators and business owners.',
      permissions: [
        'Dashboard & KPI analytics',
        'Products & Categories CRUD',
        'Suppliers & Customers management',
        'Purchases & Sales transaction processing',
        'Full inventory audit & adjustments',
        'Financial & stock reports with CSV export',
        'User management (roles & activation)',
        'Global system settings & preferences',
      ],
      restricted: [],
    },
    {
      role: 'manager',
      title: 'Operations Manager',
      email: 'manager@stockline.io',
      icon: Briefcase,
      color: 'blue',
      badge: 'Operations Access',
      description: 'Supervises warehouse inventory, purchase orders, sales, and analytics.',
      permissions: [
        'Dashboard & live operational metrics',
        'Catalog & category configuration',
        'Supplier procurement & orders',
        'Customer records & order handling',
        'Sales and inventory adjustments',
        'Comprehensive analytical reports',
      ],
      restricted: [
        'User account management & roles',
        'Core business & currency settings',
      ],
    },
    {
      role: 'staff',
      title: 'Sales & Warehouse Staff',
      email: 'staff@stockline.io',
      icon: UserCheck,
      color: 'purple',
      badge: 'Floor Operations',
      description: 'Focuses on day-to-day sales, POS invoicing, and order handling.',
      permissions: [
        'Dashboard overview',
        'View products & stock availability',
        'Customer directory lookups',
        'Record POS sales & print receipts',
        'Process customer storefront orders',
      ],
      restricted: [
        'Create/edit suppliers & purchase orders',
        'Manual stock adjustments & reports',
        'System settings & user management',
      ],
    },
    {
      role: 'customer',
      title: 'Storefront Customer',
      email: 'customer@stockline.io',
      icon: ShoppingBag,
      color: 'amber',
      badge: 'Client Portal',
      description: 'Browse the public catalog, manage your shopping cart, and track orders.',
      permissions: [
        'Public e-commerce storefront catalog',
        'Add items to cart & quantity selection',
        'Simulated checkout & address entry',
        'Track personal order status (My Orders)',
      ],
      restricted: [
        'All internal administrative dashboard routes',
        'Supplier costs, margins, and purchase ledgers',
      ],
    },
  ];

  const handleLaunch = (roleKey) => {
    const res = demoLogin(roleKey);
    if (res.success) {
      addToast({
        title: 'Demo Session Activated',
        message: `Switched into ${res.user.name} (${roleKey.toUpperCase()}) role.`,
      });
      if (roleKey === 'customer') {
        navigate('/shop');
      } else {
        navigate('/dashboard');
      }
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16 space-y-12">
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
          University Lab Evaluator Hub
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Explore StockLine by Demo Role
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
          Select any persona to immediately explore their authorized routes, layout adjustments, and permissions.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {roles.map((r) => {
          const Icon = r.icon;
          return (
            <Card key={r.role} className="p-6 flex flex-col justify-between hover:shadow-lg transition-all duration-200">
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <Icon className="h-6 w-6" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    {r.badge}
                  </span>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{r.title}</h3>
                  <p className="text-xs font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">{r.email}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                    {r.description}
                  </p>
                </div>

                {/* Permissions checklist */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5 text-xs">
                  <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                    Permitted Features
                  </span>
                  {r.permissions.map((p, i) => (
                    <div key={i} className="flex items-start gap-1.5 text-slate-700 dark:text-slate-300">
                      <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                      <span className="text-[11px] leading-tight">{p}</span>
                    </div>
                  ))}

                  {r.restricted.length > 0 && (
                    <>
                      <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block pt-2">
                        Restricted
                      </span>
                      {r.restricted.map((res, i) => (
                        <div key={i} className="flex items-start gap-1.5 text-slate-400 dark:text-slate-500">
                          <X className="h-3.5 w-3.5 text-red-400 shrink-0 mt-0.5" />
                          <span className="text-[11px] leading-tight">{res}</span>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>

              <div className="pt-6">
                <Button
                  variant="primary"
                  className="w-full"
                  icon={ArrowRight}
                  iconPosition="right"
                  onClick={() => handleLaunch(r.role)}
                >
                  Enter as {r.title}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
