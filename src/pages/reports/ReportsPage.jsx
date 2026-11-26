import React, { useState, useMemo } from 'react';
import { useAppData } from '../../context/AppDataContext';
import { useLanguage } from '../../context/LanguageContext';
import { reportService } from '../../services/reportService';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { StockBadge } from '../../components/common/Badge';
import { formatCurrency, formatNumber, formatDate } from '../../utils/formatters';
import { exportToCSV } from '../../utils/csv';
import {
  BarChart3,
  Download,
  Calendar,
  Package,
  CircleDollarSign,
  AlertTriangle,
  Receipt,
  ShoppingCart,
  Users2,
  TrendingUp,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

export const ReportsPage = () => {
  const [activeTab, setActiveTab] = useState('inventory'); // 'inventory', 'sales', 'purchases', 'low_stock'
  const [dateRange, setDateRange] = useState('all'); // '7d', '30d', 'all'
  const { products, categories, suppliers, sales, purchases, settings } = useAppData();
  const { t } = useLanguage();

  // Compute date filter boundary
  const dateFilter = useMemo(() => {
    if (dateRange === 'all') return {};
    const days = dateRange === '7d' ? 7 : 30;
    const d = new Date();
    d.setDate(d.getDate() - days);
    return { startDate: d.toISOString() };
  }, [dateRange]);

  // Report datasets
  const inventoryReport = useMemo(() => reportService.getInventoryReport(), [products, categories]);
  const salesReport = useMemo(() => reportService.getSalesReport(dateFilter), [sales, dateFilter]);
  const purchaseReport = useMemo(() => reportService.getPurchaseReport(dateFilter), [purchases, suppliers, dateFilter]);
  const lowStockReport = useMemo(() => reportService.getLowStockReport(), [products, categories, suppliers]);

  // CSV Exporters for each report tab
  const handleExportCSV = () => {
    if (activeTab === 'inventory') {
      const data = inventoryReport.productBreakdown.map((p) => ({
        'Product Name': p.name,
        'SKU': p.sku,
        'Category': p.category,
        'Quantity': p.quantity,
        'Reorder Level': p.reorderLevel,
        'Cost Price': p.costPrice,
        'Selling Price': p.sellingPrice,
        'Total Cost Valuation': p.totalCostValue,
        'Status': p.status,
      }));
      exportToCSV(data, `stockline_inventory_report_${new Date().toISOString().split('T')[0]}.csv`);
    } else if (activeTab === 'sales') {
      const data = salesReport.salesList.map((s) => ({
        'Invoice No': s.invoiceNo,
        'Customer': s.customerName || 'Walk-in',
        'Date': s.date,
        'Items Count': (s.items || []).length,
        'Subtotal': s.subtotal,
        'Discount': s.discount || 0,
        'Grand Total': s.total,
        'Payment Status': s.paymentStatus,
      }));
      exportToCSV(data, `stockline_sales_report_${new Date().toISOString().split('T')[0]}.csv`);
    } else if (activeTab === 'purchases') {
      const data = purchaseReport.purchaseList.map((p) => ({
        'Reference No': p.referenceNo,
        'Supplier': p.supplier,
        'Date': p.date,
        'Items Count': p.itemCount,
        'Order Total': p.total,
        'Payment Status': p.paymentStatus,
      }));
      exportToCSV(data, `stockline_purchases_report_${new Date().toISOString().split('T')[0]}.csv`);
    } else if (activeTab === 'low_stock') {
      const data = lowStockReport.map((p) => ({
        'Product Name': p.name,
        'SKU': p.sku,
        'Category': p.category,
        'Supplier': p.supplier,
        'Current Quantity': p.quantity,
        'Reorder Threshold': p.reorderLevel,
        'Units Deficit': p.deficit,
        'Status': p.status,
      }));
      exportToCSV(data, `stockline_low_stock_report_${new Date().toISOString().split('T')[0]}.csv`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {t('reports_title', 'Business Reports & Analytics')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t('reports_subtitle', 'Data visualizations and exports for stock valuation, sales margins, and supplier expenditures.')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Date range picker for sales & purchases */}
          {(activeTab === 'sales' || activeTab === 'purchases') && (
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none"
            >
              <option value="all">All-Time Historical</option>
              <option value="30d">Last 30 Days</option>
              <option value="7d">Last 7 Days</option>
            </select>
          )}

          <Button variant="outline" size="sm" icon={Download} onClick={handleExportCSV}>
            {t('btn_export_csv', 'Export CSV')}
          </Button>
        </div>
      </div>

      {/* Report Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto whitespace-nowrap">
        {[
          { key: 'inventory', label: t('tab_rep_inventory', 'Inventory Valuation Report'), icon: Package },
          { key: 'sales', label: t('tab_rep_sales', 'Sales & Revenue Report'), icon: Receipt },
          { key: 'purchases', label: t('tab_rep_purchases', 'Procurement & Purchase Report'), icon: ShoppingCart },
          { key: 'low_stock', label: t('tab_rep_low_stock', 'Low Stock Replenishment Report'), icon: AlertTriangle },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${
                activeTab === tab.key
                  ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 1. INVENTORY VALUATION REPORT */}
      {activeTab === 'inventory' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4">
              <span className="text-xs uppercase font-bold text-slate-400">Total Stock Value</span>
              <div className="text-xl font-bold font-mono text-slate-900 dark:text-white mt-1">
                {formatCurrency(inventoryReport.metrics.totalCostValue, settings.currency)}
              </div>
              <span className="text-[10px] text-slate-400">Cost basis calculation</span>
            </Card>

            <Card className="p-4">
              <span className="text-xs uppercase font-bold text-slate-400">Retail Potential</span>
              <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                {formatCurrency(inventoryReport.metrics.totalRetailValue, settings.currency)}
              </div>
              <span className="text-[10px] text-slate-400">Potential retail turnover</span>
            </Card>

            <Card className="p-4">
              <span className="text-xs uppercase font-bold text-slate-400">Estimated Profit</span>
              <div className="text-xl font-bold font-mono text-purple-600 dark:text-purple-400 mt-1">
                {formatCurrency(inventoryReport.metrics.potentialProfit, settings.currency)}
              </div>
              <span className="text-[10px] text-slate-400">Gross profit if cleared</span>
            </Card>

            <Card className="p-4">
              <span className="text-xs uppercase font-bold text-slate-400">Deficit Items</span>
              <div className="text-xl font-bold font-mono text-amber-500 mt-1">
                {inventoryReport.metrics.lowStockCount + inventoryReport.metrics.outOfStockCount}
              </div>
              <span className="text-[10px] text-slate-400">
                {inventoryReport.metrics.outOfStockCount} completely out of stock
              </span>
            </Card>
          </div>

          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle>Catalog Inventory Breakdown</CardTitle>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-y border-slate-200 dark:border-slate-800 text-slate-500 uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-4">Product Name</th>
                    <th className="py-2.5 px-3">SKU</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3 text-center">Qty</th>
                    <th className="py-2.5 px-3 text-right">Cost Price</th>
                    <th className="py-2.5 px-3 text-right">Selling Price</th>
                    <th className="py-2.5 px-3 text-right">Total Cost Value</th>
                    <th className="py-2.5 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {inventoryReport.productBreakdown.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="py-2.5 px-4 font-semibold text-slate-900 dark:text-slate-100" data-transliterate="true">
                        {p.name}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-700 dark:text-slate-300">
                        {p.sku}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500">{p.category}</td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-800 dark:text-slate-200">
                        {p.quantity}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-500">
                        {formatCurrency(p.costPrice, settings.currency)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-emerald-600 font-semibold">
                        {formatCurrency(p.sellingPrice, settings.currency)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                        {formatCurrency(p.totalCostValue, settings.currency)}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <StockBadge quantity={p.quantity} reorderLevel={p.reorderLevel} showIcon={false} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* 2. SALES REVENUE REPORT */}
      {activeTab === 'sales' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="p-4">
              <span className="text-xs uppercase font-bold text-slate-400">Total Completed Sales</span>
              <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                {formatCurrency(salesReport.totalSales, settings.currency)}
              </div>
              <span className="text-[10px] text-slate-400">{salesReport.completedCount} invoices completed</span>
            </Card>

            <Card className="p-4">
              <span className="text-xs uppercase font-bold text-slate-400">Average Order Value</span>
              <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-1">
                {formatCurrency(salesReport.avgOrderValue, settings.currency)}
              </div>
              <span className="text-[10px] text-slate-400">Per transaction</span>
            </Card>

            <Card className="p-4">
              <span className="text-xs uppercase font-bold text-slate-400">Top Sold Product</span>
              <div className="text-lg font-bold text-slate-800 dark:text-slate-200 truncate mt-1">
                {salesReport.productBreakdown[0]?.name || 'No sales'}
              </div>
              <span className="text-[10px] text-slate-400">
                {salesReport.productBreakdown[0]?.unitsSold || 0} units sold
              </span>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sales by Product */}
            <Card>
              <CardHeader>
                <CardTitle>Sales Revenue by Product</CardTitle>
              </CardHeader>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 border-y border-slate-200 dark:border-slate-800 text-slate-500 uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5 px-4">Product Name</th>
                      <th className="py-2.5 px-3 text-center">Units Sold</th>
                      <th className="py-2.5 px-4 text-right">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {salesReport.productBreakdown.map((p) => (
                      <tr key={p.productId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="py-2.5 px-4 font-semibold text-slate-800 dark:text-slate-200" data-transliterate="true">
                          {p.name}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-700 dark:text-slate-300">
                          {p.unitsSold}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(p.revenue, settings.currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Sales by Customer */}
            <Card>
              <CardHeader>
                <CardTitle>Sales Revenue by Customer</CardTitle>
              </CardHeader>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 border-y border-slate-200 dark:border-slate-800 text-slate-500 uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5 px-4">Customer Name</th>
                      <th className="py-2.5 px-3 text-center">Invoices</th>
                      <th className="py-2.5 px-4 text-right">Total Spent</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {salesReport.customerBreakdown.map((c, i) => (
                      <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="py-2.5 px-4 font-semibold text-slate-800 dark:text-slate-200">
                          {c.customer}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-700 dark:text-slate-300">
                          {c.invoiceCount}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(c.totalAmount, settings.currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* 3. PROCUREMENT & PURCHASES REPORT */}
      {activeTab === 'purchases' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="p-4">
              <span className="text-xs uppercase font-bold text-slate-400">Total Purchase Spend</span>
              <div className="text-2xl font-bold font-mono text-blue-600 dark:text-blue-400 mt-1">
                {formatCurrency(purchaseReport.totalPurchases, settings.currency)}
              </div>
              <span className="text-[10px] text-slate-400">{purchaseReport.purchaseCount} POs received</span>
            </Card>

            <Card className="p-4">
              <span className="text-xs uppercase font-bold text-slate-400">Top Supplier Volume</span>
              <div className="text-lg font-bold text-slate-800 dark:text-slate-200 truncate mt-1">
                {purchaseReport.supplierBreakdown[0]?.supplier || 'No purchases'}
              </div>
              <span className="text-[10px] text-slate-400">
                {formatCurrency(purchaseReport.supplierBreakdown[0]?.totalAmount || 0, settings.currency)} procurement volume
              </span>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Procurement Expenditure by Supplier</CardTitle>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-y border-slate-200 dark:border-slate-800 text-slate-500 uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-4">Supplier Name</th>
                    <th className="py-2.5 px-3 text-center">Orders Received</th>
                    <th className="py-2.5 px-4 text-right">Total Expenditure</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {purchaseReport.supplierBreakdown.map((s, i) => (
                    <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="py-2.5 px-4 font-semibold text-slate-800 dark:text-slate-200">
                        {s.supplier}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-700 dark:text-slate-300">
                        {s.orderCount}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-blue-600 dark:text-blue-400">
                        {formatCurrency(s.totalAmount, settings.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* 4. LOW STOCK REPORT */}
      {activeTab === 'low_stock' && (
        <div className="space-y-6">
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle className="text-red-600 dark:text-red-400 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                <span>Low Stock & Stockout Replenishment Watchlist</span>
              </CardTitle>
              <p className="text-xs text-slate-400">
                Products currently at or below minimum configured safety reorder thresholds
              </p>
            </CardHeader>

            {lowStockReport.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                All catalog inventory items are stocked above their reorder thresholds.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 border-y border-slate-200 dark:border-slate-800 text-slate-500 uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5 px-4">Product Name</th>
                      <th className="py-2.5 px-3">SKU</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3">Primary Supplier</th>
                      <th className="py-2.5 px-3 text-center">On-Hand</th>
                      <th className="py-2.5 px-3 text-center">Threshold</th>
                      <th className="py-2.5 px-3 text-center">Replenish Deficit</th>
                      <th className="py-2.5 px-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {lowStockReport.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="py-2.5 px-4 font-semibold text-slate-900 dark:text-slate-100" data-transliterate="true">
                          {p.name}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-700 dark:text-slate-300">
                          {p.sku}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500" data-transliterate="true">{p.category}</td>
                        <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400" data-transliterate="true">{p.supplier}</td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-800 dark:text-slate-200">
                          {p.quantity}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono text-slate-400">
                          {p.reorderLevel}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-red-600">
                          {p.deficit} units
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <StockBadge quantity={p.quantity} reorderLevel={p.reorderLevel} showIcon={false} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
};
