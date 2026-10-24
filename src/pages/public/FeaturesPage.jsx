import React from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import {
  Package,
  Boxes,
  Truck,
  Users2,
  ShoppingCart,
  Receipt,
  BellRing,
  BarChart3,
  ShieldCheck,
  ShoppingBag,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';

export const FeaturesPage = () => {
  const featureSections = [
    {
      category: 'Catalog & Inventory Control',
      items: [
        {
          title: 'Product Catalog & Unique SKU Management',
          desc: 'Configure cost prices, retail prices, category groupings, supplier mapping, and low-stock thresholds with strict SKU uniqueness enforcement.',
          icon: Package,
        },
        {
          title: 'Continuous Stock Audits & Adjustments',
          desc: 'Perform manual stock increases, write-offs, or count reconciliations with an immutable audit trail and reasons for every modification.',
          icon: Boxes,
        },
        {
          title: 'Intelligent Low Stock Triggers',
          desc: 'Instant visual alerts and badges on top bars and dashboards whenever on-hand items drop below safety thresholds.',
          icon: BellRing,
        },
      ],
    },
    {
      category: 'Procurement & Sales Operations',
      items: [
        {
          title: 'Supplier Relationship Hub',
          desc: 'Maintain supplier company profiles, contact emails, direct phone lines, and complete purchase histories.',
          icon: Truck,
        },
        {
          title: 'Multi-Line Purchase Orders',
          desc: 'Draft quotes or process received orders that automatically credit quantities to your inventory balance.',
          icon: ShoppingCart,
        },
        {
          title: 'Point of Sale (POS) Invoicing',
          desc: 'Quickly bill walk-in customers or wholesale clients, enforce stock availability limits, apply discounts, and print branded receipts.',
          icon: Receipt,
        },
      ],
    },
    {
      category: 'Customer Storefront & Business Intelligence',
      items: [
        {
          title: 'Public E-Commerce Catalog',
          desc: 'Allow end-customers to browse available items, filter by department, manage shopping cart quantities, and place demo orders.',
          icon: ShoppingBag,
        },
        {
          title: 'CRM Customer Profiles',
          desc: 'Track retail and wholesale customer purchase trends, order frequencies, and delivery addresses.',
          icon: Users2,
        },
        {
          title: 'Recharts Visual Reports',
          desc: 'Analyze 7-day sales trends, purchase expense distributions, stock valuation by department, and export all datasets to CSV.',
          icon: BarChart3,
        },
      ],
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16 space-y-16">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Everything You Need to Run Modern Inventory
        </h1>
        <p className="text-base text-slate-600 dark:text-slate-300">
          A breakdown of every module, validation guard, and automated workflow built into StockLine.
        </p>
      </div>

      {/* Feature Groups */}
      <div className="space-y-12">
        {featureSections.map((group) => (
          <div key={group.category} className="space-y-6">
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-3 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              {group.category}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <Card key={item.title} className="p-6 flex flex-col justify-between">
                    <div>
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4">
                        <Icon className="h-5 w-5" />
                      </div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-2">
                        {item.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                        {item.desc}
                      </p>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Call to Action */}
      <div className="p-8 sm:p-12 bg-slate-900 text-white rounded-3xl text-center max-w-3xl mx-auto space-y-5">
        <h3 className="text-2xl font-bold">Ready to see StockLine in action?</h3>
        <p className="text-xs sm:text-sm text-slate-400">
          Jump right in with preloaded demo accounts for Admin, Operations Manager, Staff, or Customer.
        </p>
        <Link to="/demo-access">
          <Button size="md" icon={ArrowRight} iconPosition="right">
            Launch Demo Sandbox
          </Button>
        </Link>
      </div>
    </div>
  );
};
