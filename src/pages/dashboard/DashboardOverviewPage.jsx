import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAppData } from '../../context/AppDataContext';
import { useLanguage } from '../../context/LanguageContext';
import { KPICard } from '../../components/dashboard/KPICard';
import { QuickActions } from '../../components/dashboard/QuickActions';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { StockBadge } from '../../components/common/Badge';
import {
  SalesOverviewChart,
  PurchaseOverviewChart,
  CategoryStockChart,
} from '../../components/charts/DashboardCharts';
import {
  formatCurrency,
  formatNumber,
} from '../../utils/formatters';
import {
  calculateInventoryMetrics,
  aggregateSalesByDate,
  aggregatePurchasesByDate,
  aggregateStockByCategory,
} from '../../utils/calculations';
import {
  Package,
  CircleDollarSign,
  AlertTriangle,
  Receipt,
  Users2,
  ClipboardList,
  Calendar,
  ArrowRight,
} from 'lucide-react';

export const DashboardOverviewPage = () => {
  const [dateRangeDays, setDateRangeDays] = useState(7);
  const { products, categories, sales, purchases, customers, orders, inventoryMovements, settings } = useAppData();
  const { t } = useLanguage();

  // Dynamic calculations from actual local demo records
  const inventoryMetrics = useMemo(() => calculateInventoryMetrics(products), [products]);

  // Today's Sales
  const todaySalesTotal = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return sales
      .filter((s) => s.status === 'completed' && s.date && s.date.startsWith(todayStr))
      .reduce((sum, s) => sum + (Number(s.total) || 0), 0);
  }, [sales]);

  // Pending Orders Count
  const pendingOrdersCount = useMemo(() => {
    return orders.filter((o) => o.status === 'pending').length;
  }, [orders]);

  // Low stock products
  const lowStockProducts = useMemo(() => {
    return products
      .filter((p) => (Number(p.quantity) || 0) <= (Number(p.reorderLevel) || 10))
      .slice(0, 5);
  }, [products]);

  // Chart aggregations
  const salesChartData = useMemo(() => aggregateSalesByDate(sales, dateRangeDays), [sales, dateRangeDays]);
  const purchasesChartData = useMemo(() => aggregatePurchasesByDate(purchases, dateRangeDays), [purchases, dateRangeDays]);
  const categoryChartData = useMemo(() => aggregateStockByCategory(products, categories), [products, categories]);

  // Recent 5 Inventory movements
  const recentMovements = useMemo(() => {
    return (inventoryMovements || []).slice(0, 5);
  }, [inventoryMovements]);

  // Recent 4 Customer Orders
  const recentOrders = useMemo(() => {
    return (orders || []).slice(0, 4);
  }, [orders]);

  return (
    <div className="space-y-8">
      {/* Top Banner / Filter Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {t('dashboard_title', 'Inventory & Sales Dashboard')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t('dashboard_subtitle', 'Real-time performance metrics computed from current local records.')}
          </p>
        </div>

        {/* Date Filter selector */}
        <div className="flex items-center gap-1.5 p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm self-start sm:self-auto text-xs">
          <Calendar className="h-4 w-4 text-slate-400 ml-2" />
          <span className="text-slate-400 font-medium px-1">{t('dashboard_range', 'Range:')}</span>
          {[7, 14, 30].map((days) => (
            <button
              key={days}
              onClick={() => setDateRangeDays(days)}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                dateRangeDays === days
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {days} {t('days_count', 'Days')}
            </button>
          ))}
        </div>
      </div>

      {/* QUICK ACTIONS BAR */}
      <div>
        <QuickActions />
      </div>

      {/* 6 KPI CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <KPICard
          title={t('kpi_total_products', 'Total Products')}
          value={formatNumber(inventoryMetrics.totalItemsCount)}
          subtext={`${inventoryMetrics.totalStockQuantity} ${t('kpi_total_products_sub', 'units in stock')}`}
          icon={Package}
          variant="emerald"
        />
        <KPICard
          title={t('kpi_stock_valuation', 'Stock Valuation')}
          value={formatCurrency(inventoryMetrics.totalCostValue, settings.currency)}
          subtext={t('kpi_stock_valuation_sub', 'Total cost value')}
          icon={CircleDollarSign}
          variant="blue"
        />
        <KPICard
          title={t('kpi_low_stock', 'Low Stock Items')}
          value={formatNumber(inventoryMetrics.lowStockCount + inventoryMetrics.outOfStockCount)}
          subtext={`${inventoryMetrics.outOfStockCount} ${t('kpi_low_stock_sub', 'out of stock')}`}
          icon={AlertTriangle}
          variant={inventoryMetrics.lowStockCount > 0 ? 'amber' : 'emerald'}
        />
        <KPICard
          title={t('kpi_today_sales', "Today's Sales")}
          value={formatCurrency(todaySalesTotal, settings.currency)}
          subtext={t('kpi_today_sales_sub', 'Completed invoices')}
          icon={Receipt}
          variant="purple"
        />
        <KPICard
          title={t('kpi_customers', 'Customers')}
          value={formatNumber(customers.length)}
          subtext={t('kpi_customers_sub', 'Retail & corporate')}
          icon={Users2}
          variant="emerald"
        />
        <KPICard
          title={t('kpi_pending_orders', 'Pending Orders')}
          value={formatNumber(pendingOrdersCount)}
          subtext={t('kpi_pending_orders_sub', 'Storefront checkout')}
          icon={ClipboardList}
          variant={pendingOrdersCount > 0 ? 'red' : 'emerald'}
        />
      </div>

      {/* CHARTS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Overview Chart (2 Columns on large) */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle>{t('chart_sales_velocity', 'Sales Revenue Velocity')}</CardTitle>
              <p className="text-xs text-slate-400 mt-0.5">
                {t('chart_sales_velocity_sub', 'Daily completed sales total')} ({dateRangeDays} {t('days_count', 'Days')})
              </p>
            </div>
            <Link to="/sales">
              <Button variant="ghost" size="sm" icon={ArrowRight} iconPosition="right">
                {t('btn_view_all', 'View All')}
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="pt-2">
            <SalesOverviewChart data={salesChartData} currency={settings.currency} />
          </CardContent>
        </Card>

        {/* Category Stock Distribution (1 Column) */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>{t('chart_category_dist', 'Category Distribution')}</CardTitle>
            <p className="text-xs text-slate-400 mt-0.5">
              {t('chart_category_dist_sub', 'Stock count by product category')}
            </p>
          </CardHeader>
          <CardContent className="pt-2">
            <CategoryStockChart data={categoryChartData} />
          </CardContent>
        </Card>
      </div>

      {/* SECOND CHART & LOW STOCK ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Purchase Orders Chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle>{t('chart_procurement', 'Procurement Expenditures')}</CardTitle>
              <p className="text-xs text-slate-400 mt-0.5">
                {t('chart_procurement_sub', 'Purchases received over the last')} ({dateRangeDays} {t('days_count', 'Days')})
              </p>
            </div>
            <Link to="/purchases">
              <Button variant="ghost" size="sm" icon={ArrowRight} iconPosition="right">
                {t('btn_view_all', 'View All')}
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="pt-2">
            <PurchaseOverviewChart data={purchasesChartData} currency={settings.currency} />
          </CardContent>
        </Card>

        {/* Low Stock Watchlist */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle>{t('alert_low_stock_title', 'Low Stock Alerts')}</CardTitle>
              <p className="text-xs text-slate-400 mt-0.5">
                {t('alert_low_stock_sub', 'Items requiring replenishment')}
              </p>
            </div>
            <Link to="/inventory">
              <Button variant="ghost" size="sm">
                {t('tab_rep_inventory', 'Inventory')} →
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="pt-2">
            {lowStockProducts.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                All catalog products are stocked safely above reorder levels.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {lowStockProducts.map((p) => (
                  <div key={p.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img src={p.imageUrl} alt="" className="h-8 w-8 rounded-lg object-cover shrink-0" />
                      <div className="truncate">
                        <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                          {p.name}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">SKU: {p.sku}</div>
                      </div>
                    </div>
                    <StockBadge quantity={p.quantity} reorderLevel={p.reorderLevel} showIcon={false} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* RECENT TRANSACTIONS & RECENT STOREFRONT ORDERS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Audit Movements */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Inventory Movements</CardTitle>
              <p className="text-xs text-slate-400 mt-0.5">
                Automated stock intake, sales deductions, and adjustments
              </p>
            </div>
            <Link to="/inventory">
              <Button variant="ghost" size="sm">
                Audit Trail
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/50 border-y border-slate-200 dark:border-slate-800 text-slate-500 uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-4">Product / SKU</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3 text-center">Change</th>
                    <th className="py-2.5 px-4 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {recentMovements.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="py-6 text-center text-slate-400">
                        No movement records yet.
                      </td>
                    </tr>
                  ) : (
                    recentMovements.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="py-2.5 px-4">
                          <div className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[180px]">
                            {m.productName}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">{m.sku}</div>
                        </td>
                        <td className="py-2.5 px-3 capitalize text-slate-600 dark:text-slate-400">
                          {m.type.replace('_', ' ')}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold">
                          <span
                            className={
                              m.quantityChange > 0
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-red-600 dark:text-red-400'
                            }
                          >
                            {m.quantityChange > 0 ? `+${m.quantityChange}` : m.quantityChange}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono text-slate-700 dark:text-slate-300">
                          {m.balanceAfter}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Recent Customer Orders */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Customer Storefront Orders</CardTitle>
              <p className="text-xs text-slate-400 mt-0.5">
                Incoming online orders awaiting handling
              </p>
            </div>
            <Link to="/orders">
              <Button variant="ghost" size="sm">
                All Orders
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/50 border-y border-slate-200 dark:border-slate-800 text-slate-500 uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-4">Order #</th>
                    <th className="py-2.5 px-3">Customer</th>
                    <th className="py-2.5 px-3 text-right">Amount</th>
                    <th className="py-2.5 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {recentOrders.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="py-6 text-center text-slate-400">
                        No orders recorded.
                      </td>
                    </tr>
                  ) : (
                    recentOrders.map((o) => (
                      <tr key={o.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="py-2.5 px-4 font-mono font-semibold text-emerald-600">
                          <Link to={`/orders/${o.id}`} className="hover:underline">
                            {o.orderNumber}
                          </Link>
                        </td>
                        <td className="py-2.5 px-3 text-slate-800 dark:text-slate-200 font-medium">
                          {o.customerName}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-700 dark:text-slate-300">
                          {formatCurrency(o.total, settings.currency)}
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              o.status === 'completed'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                : o.status === 'cancelled'
                                ? 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                            }`}
                          >
                            {o.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
