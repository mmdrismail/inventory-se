import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
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
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Layers,
  Store,
  Building2,
  Warehouse,
  Flame,
} from 'lucide-react';

export const LandingPage = () => {
  const features = [
    {
      title: 'Product Management',
      desc: 'Catalog comprehensive product data, SKUs, cost vs selling prices, barcode tags, and automated reorder points.',
      icon: Package,
      color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50',
      link: '/products',
    },
    {
      title: 'Inventory Tracking',
      desc: 'Real-time stock balance recalculation across purchases, POS sales, storefront orders, and audit corrections.',
      icon: Boxes,
      color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/50',
      link: '/inventory',
    },
    {
      title: 'Supplier Management',
      desc: 'Centralize contact profiles, track purchase histories, and evaluate total procurement volume per partner.',
      icon: Truck,
      color: 'text-purple-600 bg-purple-50 dark:bg-purple-950/50',
      link: '/suppliers',
    },
    {
      title: 'Customer Management',
      desc: 'Segment retail, wholesale, and corporate accounts with complete ledger histories and order summaries.',
      icon: Users2,
      color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/50',
      link: '/customers',
    },
    {
      title: 'Purchase Management',
      desc: 'Issue purchase orders, track drafts, receive inventory with automatic stock increases and cost updates.',
      icon: ShoppingCart,
      color: 'text-teal-600 bg-teal-50 dark:bg-teal-950/50',
      link: '/purchases',
    },
    {
      title: 'Sales & Invoicing',
      desc: 'Record point-of-sale transactions, apply custom discounts, check live stock limits, and print receipts.',
      icon: Receipt,
      color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/50',
      link: '/sales',
    },
    {
      title: 'Low Stock Alerts',
      desc: 'Automated warnings triggered whenever item quantities hit or dip below configured safety levels.',
      icon: BellRing,
      color: 'text-red-600 bg-red-50 dark:bg-red-950/50',
      link: '/inventory',
    },
    {
      title: 'Reports & Analytics',
      desc: 'Interactive Recharts analytics covering sales velocity, profit margins, stock valuation, and supplier spend.',
      icon: BarChart3,
      color: 'text-cyan-600 bg-cyan-50 dark:bg-cyan-950/50',
      link: '/reports',
    },
    {
      title: 'Role-Based Access',
      desc: 'Configurable role matrices for Admin, Operations Manager, Sales Staff, and Storefront Customers.',
      icon: ShieldCheck,
      color: 'text-emerald-700 bg-emerald-100 dark:bg-emerald-900/40',
      link: '/demo-access',
    },
    {
      title: 'Customer Storefront',
      desc: 'Integrated e-commerce catalog with live cart persistence, simulated checkout, and order tracking.',
      icon: ShoppingBag,
      color: 'text-rose-600 bg-rose-50 dark:bg-rose-950/50',
      link: '/shop',
    },
  ];

  const howItWorks = [
    {
      step: '01',
      title: 'Add Products & Suppliers',
      desc: 'Setup your product catalog with SKUs, category tags, cost and retail pricing, and supplier records.',
    },
    {
      step: '02',
      title: 'Record Purchases & Sales',
      desc: 'Receive stock from verified suppliers, process counter sales with instant receipt generation, or fulfill online customer orders.',
    },
    {
      step: '03',
      title: 'Monitor Inventory & Reports',
      desc: 'Keep an eye on real-time KPIs, audit stock adjustment movements, and export data in one click.',
    },
  ];

  const solutions = [
    {
      icon: Store,
      title: 'Retail Shops & Outlets',
      desc: 'Instant POS receipt generation, walk-in customer ticketing, and barcode/SKU based checkout.',
    },
    {
      icon: Building2,
      title: 'Small & Growing Businesses',
      desc: 'Simple bookkeeping with automated stock deduction, supplier tracking, and customer credit management.',
    },
    {
      icon: Warehouse,
      title: 'Wholesale & B2B Distributors',
      desc: 'Multi-line bulk purchase orders, tiered volume sales, and delivery address routing.',
    },
    {
      icon: Layers,
      title: 'Warehouse & Inventory Teams',
      desc: 'Audit trails for every stock movement, safety threshold alarms, and batch CSV imports.',
    },
  ];

  return (
    <div className="space-y-24 py-8 lg:py-16">
      {/* 1. HERO SECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-semibold shadow-sm">
            <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
            <span>Complete MERN Inventory Architecture Demo</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.15]">
            Manage Your Inventory. <br />
            <span className="bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
              Grow Your Business.
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl mx-auto">
            Track products, manage suppliers, record purchases and sales, and monitor stock levels from one simple platform.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link to="/demo-access">
              <Button size="lg" icon={ArrowRight} iconPosition="right" className="shadow-lg shadow-emerald-600/25">
                Start Free Demo
              </Button>
            </Link>
            <a href="#features">
              <Button size="lg" variant="outline">
                Explore Features
              </Button>
            </a>
          </div>
        </div>

        {/* HERO INTERACTIVE MOCKUP PREVIEW */}
        <div className="mt-12 sm:mt-16 max-w-5xl mx-auto relative group">
          <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-emerald-500 to-teal-600 opacity-20 blur-xl group-hover:opacity-30 transition duration-500"></div>
          <div className="relative rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
            {/* Top Bar of Mockup */}
            <div className="bg-slate-100 dark:bg-slate-800/80 px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-400"></div>
                <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
                <span className="text-xs font-mono text-slate-400 ml-2">stockline.app/dashboard</span>
              </div>
              <Badge variant="emerald" size="sm">Live Application Simulation</Badge>
            </div>

            {/* Mockup Dashboard Content */}
            <div className="p-6 bg-slate-50/50 dark:bg-slate-950/40 space-y-6">
              {/* Mini KPI row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800">
                  <span className="text-[11px] text-slate-400 font-semibold uppercase">Total Products</span>
                  <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">14 SKUs</div>
                  <span className="text-[10px] text-emerald-600 font-semibold mt-1 inline-flex items-center gap-0.5">
                    <TrendingUp className="h-3 w-3" /> Active catalog
                  </span>
                </div>
                <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800">
                  <span className="text-[11px] text-slate-400 font-semibold uppercase">Stock Valuation</span>
                  <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">৳184,500</div>
                  <span className="text-[10px] text-slate-400 mt-1 inline-block">Cost basis</span>
                </div>
                <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800">
                  <span className="text-[11px] text-slate-400 font-semibold uppercase">Low Stock Alerts</span>
                  <div className="text-xl font-bold text-amber-500 mt-1">3 Items</div>
                  <span className="text-[10px] text-amber-600 font-semibold mt-1 inline-flex items-center gap-0.5">
                    <AlertTriangle className="h-3 w-3" /> Needs reorder
                  </span>
                </div>
                <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800">
                  <span className="text-[11px] text-slate-400 font-semibold uppercase">Storefront Orders</span>
                  <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">3 Pending</div>
                  <span className="text-[10px] text-blue-600 font-semibold mt-1 inline-block">Auto-synced</span>
                </div>
              </div>

              {/* Sample table preview */}
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    Recent Stock Movements (Audit Trail)
                  </span>
                  <Link to="/inventory" className="text-xs font-semibold text-emerald-600 hover:underline">
                    View Live Table →
                  </Link>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">PO-2026-001 Received</span>
                      <span className="text-slate-400">(Apex Global Distributors)</span>
                    </div>
                    <span className="text-emerald-600 font-mono font-bold">+50 Units</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">INV-2026-001 Sale Complete</span>
                      <span className="text-slate-400">(Delta Engineering Works)</span>
                    </div>
                    <span className="text-blue-600 font-mono font-bold">-5 Units</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. DEMO BENCHMARKS & STATS */}
      <section className="bg-emerald-900/5 dark:bg-slate-900 border-y border-slate-200/80 dark:border-slate-800 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              Illustrative Demo Benchmarks
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <div className="text-3xl font-extrabold text-slate-900 dark:text-white">100%</div>
              <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 mt-1">Inventory Visibility</div>
              <p className="text-[11px] text-slate-400 mt-0.5">Real-time LocalStorage state engine</p>
            </div>
            <div>
              <div className="text-3xl font-extrabold text-slate-900 dark:text-white">&lt; 1s</div>
              <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 mt-1">Automated Stock Tracking</div>
              <p className="text-[11px] text-slate-400 mt-0.5">Single source of truth movement ledger</p>
            </div>
            <div>
              <div className="text-3xl font-extrabold text-slate-900 dark:text-white">4 Roles</div>
              <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 mt-1">Role-Based Access</div>
              <p className="text-[11px] text-slate-400 mt-0.5">Admin, Manager, Staff, Customer</p>
            </div>
            <div>
              <div className="text-3xl font-extrabold text-slate-900 dark:text-white">0s</div>
              <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 mt-1">Setup Time</div>
              <p className="text-[11px] text-slate-400 mt-0.5">Ready-to-test preloaded seed data</p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. FEATURES GRID (10 CARDS) */}
      <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-24">
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
          <h2 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
            Comprehensive Platform Features
          </h2>
          <h3 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            Built for Real-World Inventory Operations
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Explore 10 powerful interconnected modules designed according to professional SaaS architecture.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feat) => {
            const Icon = feat.icon;
            return (
              <Card
                key={feat.title}
                className="p-6 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg flex flex-col justify-between"
              >
                <div>
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-5 ${feat.color}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <h4 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-2">
                    {feat.title}
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
                    {feat.desc}
                  </p>
                </div>
                <Link
                  to={feat.link}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 transition-colors"
                >
                  <span>Explore Module</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Card>
            );
          })}
        </div>
      </section>

      {/* 4. HOW IT WORKS */}
      <section id="how-it-works" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-24">
        <div className="bg-slate-900 text-white rounded-3xl p-8 sm:p-12 lg:p-16 relative overflow-hidden">
          <div className="max-w-2xl mb-12">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
              Seamless Workflow
            </span>
            <h3 className="text-3xl font-bold mt-2 tracking-tight">
              How StockLine Powers Your Daily Business
            </h3>
            <p className="text-sm text-slate-400 mt-2">
              A 3-step continuous inventory feedback cycle that eliminates discrepancies.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {howItWorks.map((step) => (
              <div key={step.step} className="space-y-3 relative">
                <div className="text-4xl font-extrabold text-emerald-500/30 font-mono">
                  {step.step}
                </div>
                <h4 className="text-lg font-bold text-white">{step.title}</h4>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. SOLUTIONS SECTION */}
      <section id="solutions" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-24">
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
          <h2 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
            Tailored Industry Solutions
          </h2>
          <h3 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            Designed for Varied Commerce Workflows
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Whether you operate an offline store or manage bulk wholesale orders, StockLine adapts to your team.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {solutions.map((sol) => {
            const Icon = sol.icon;
            return (
              <div
                key={sol.title}
                className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm"
              >
                <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-4">
                  <Icon className="h-5 w-5" />
                </div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-2">
                  {sol.title}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {sol.desc}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* 6. CALL TO ACTION SECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center bg-gradient-to-br from-emerald-600 to-teal-700 rounded-3xl p-10 sm:p-16 text-white shadow-xl shadow-emerald-700/20 space-y-6">
          <h3 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Take Control of Your Inventory Today.
          </h3>
          <p className="text-sm sm:text-base text-emerald-100 max-w-xl mx-auto">
            Experience the complete frontend workflow with full CRUD capabilities, printable sales receipts, and interactive analytics.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <Link to="/demo-access">
              <Button size="lg" className="bg-white text-emerald-700 hover:bg-emerald-50 border-transparent shadow-lg">
                Explore Demo Roles
              </Button>
            </Link>
            <Link to="/register">
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                Create Account
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};
