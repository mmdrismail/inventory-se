import React, { useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAppData } from '../../context/AppDataContext';
import { useLanguage } from '../../context/LanguageContext';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { BackLink } from '../../components/common/BackLink';
import { PrintableReceiptModal } from '../../components/receipt/PrintableReceiptModal';
import { DOCUMENT_TYPES } from '../../utils/printTemplateGenerator';
import { formatCurrency, formatDate } from '../../utils/formatters';
import {
  ArrowLeft,
  Users2,
  Mail,
  Phone,
  MapPin,
  Receipt,
  Plus,
  Eye,
  ShoppingBag,
  Building2,
  UserCheck,
  FileSpreadsheet,
  Printer,
  ArrowRightLeft,
  DollarSign,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Edit2,
} from 'lucide-react';

export const CustomerDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { customers, sales, orders, quotations, settings } = useAppData();
  const { language, t } = useLanguage();

  const l = (texts) => {
    if (language === 'en') return texts.en;
    if (language === 'obro') return texts.obro || `${texts.bn} (${texts.en})`;
    return texts.bn;
  };

  const [activeTab, setActiveTab] = useState('invoices'); // 'invoices' | 'quotations' | 'orders'
  const [activePrintQuotation, setActivePrintQuotation] = useState(null);

  const customer = customers.find((c) => c.id === id || c._id === id);

  const customerSales = useMemo(() => {
    return sales.filter((s) => s.customerId === id || (customer && s.customerName?.toLowerCase() === customer.name?.toLowerCase()));
  }, [sales, id, customer]);

  const customerQuotations = useMemo(() => {
    return (quotations || []).filter(
      (q) => q.customerId === id || (customer && q.customerName?.toLowerCase() === customer.name?.toLowerCase())
    );
  }, [quotations, id, customer]);

  const customerOrders = useMemo(() => {
    return orders.filter(
      (o) => o.customerId === id || (customer && o.email?.toLowerCase() === customer.email?.toLowerCase())
    );
  }, [orders, id, customer]);

  // Financial calculations (matches active sales ledger on backend)
  const financials = useMemo(() => {
    let salesTotal = 0;
    let paidTotal = 0;
    let dueTotal = 0;

    customerSales.forEach((s) => {
      if (s.status === 'cancelled') return;
      const invTotal = Number(s.total !== undefined ? s.total : s.totalAmount) || 0;
      salesTotal += invTotal;

      const pStatus = s.paymentStatus || 'paid';
      const paidAmt =
        pStatus === 'paid'
          ? invTotal
          : pStatus === 'due'
          ? 0
          : Math.min(invTotal, Math.max(0, Number(s.paidAmount) || 0));
      const dueAmt = Math.max(0, invTotal - paidAmt);

      paidTotal += paidAmt;
      dueTotal += dueAmt;
    });

    return {
      totalSales: customerSales.length > 0 ? salesTotal : (customer?.totalSales || 0),
      totalPaid: customerSales.length > 0 ? paidTotal : (customer?.totalPaid || 0),
      totalDue: customerSales.length > 0 ? dueTotal : (customer?.totalDue || 0),
    };
  }, [customerSales, customer]);

  if (!customer) {
    return (
      <div className="py-12 text-center space-y-4">
        <h2 className="text-xl font-bold">{l({ bn: 'গ্রাহক পাওয়া যায়নি', en: 'Customer Not Found', obro: 'Customer Not Found' })}</h2>
        <Link to="/customers">
          <Button variant="primary">{l({ bn: 'গ্রাহক তালিকায় ফিরে যান', en: 'Return to Customers', obro: 'Return to Customers' })}</Button>
        </Link>
      </div>
    );
  }

  const getRoleLabel = (role) => {
    switch (role) {
      case 'owner':
        return l({ bn: 'কোম্পানির মালিক / স্বত্বাধিকারী', en: 'Company Owner', obro: 'Company Owner' });
      case 'agent':
        return l({ bn: 'কোম্পানির প্রতিনিধি / এজেন্ট', en: 'Company Agent', obro: 'Company Agent' });
      case 'purchaser':
        return l({ bn: 'ক্রয় কর্মকর্তা / প্রকিউরমেন্ট ম্যানেজার', en: 'Purchasing Manager', obro: 'Purchasing Manager' });
      case 'supplier_rep':
        return l({ bn: 'সরবরাহকারী / ভেন্ডর প্রতিনিধি', en: 'Supplier / Vendor Rep', obro: 'Supplier Rep' });
      case 'wholesale':
        return l({ bn: 'পাইকারি ডিলার / মার্চেন্ট', en: 'Wholesale Dealer / Merchant', obro: 'Wholesale Dealer' });
      default:
        return l({ bn: 'সাধারণ খুচরা গ্রাহক', en: 'Retail Consumer', obro: 'Retail Customer' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <BackLink to="/customers">
          {l({ bn: 'গ্রাহক তালিকায় ফিরে যান', en: 'Back to Customers List', obro: 'Back to Customers List' })}
        </BackLink>

        <div className="flex items-center gap-2">
          <Link to="/quotations/new">
            <Button variant="secondary" size="sm" icon={FileSpreadsheet}>
              {l({ bn: 'নতুন দরপত্র (Quotation)', en: 'Create Quotation', obro: 'Create Quotation' })}
            </Button>
          </Link>
          <Link to="/sales/new">
            <Button variant="primary" size="sm" icon={Plus}>
              {l({ bn: 'নতুন বিক্রয় (Record Sale)', en: 'Record New Sale', obro: 'Record New Sale' })}
            </Button>
          </Link>
        </div>
      </div>

      {/* Customer Profile Card */}
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 border border-purple-200/50 dark:border-purple-800/50">
              <Users2 className="h-7 w-7" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                  {customer.name}
                </h1>
                <Badge
                  variant={
                    customer.customerType === 'Corporate'
                      ? 'purple'
                      : customer.customerType === 'Wholesale'
                      ? 'blue'
                      : 'emerald'
                  }
                  size="sm"
                >
                  {customer.customerType || 'Retail'}
                </Badge>
              </div>

              {customer.companyName && (
                <div className="text-sm font-semibold text-purple-600 dark:text-purple-400 flex items-center gap-1.5 mt-1">
                  <Building2 className="h-4 w-4 shrink-0" />
                  <span>{customer.companyName}</span>
                </div>
              )}

              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                স্ট্যাটাস / পদবী: <span className="font-semibold text-slate-700 dark:text-slate-300">{getRoleLabel(customer.designationRole)}</span>
              </p>

              <p className="text-[11px] text-slate-400 mt-0.5">
                Account registered on {formatDate(customer.createdAt)}
              </p>

              {customer.notes && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 max-w-xl">
                  {customer.notes}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 mt-6 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
            <Phone className="h-4 w-4 text-slate-400 shrink-0" />
            <span>{customer.phone || 'No phone registered'}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
            <Mail className="h-4 w-4 text-slate-400 shrink-0" />
            <span className="truncate">{customer.email || 'No email registered'}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
            <MapPin className="h-4 w-4 text-slate-400 shrink-0" />
            <span className="truncate">{customer.address || customer.location || 'No address specified'}</span>
          </div>
        </div>
      </Card>

      {/* 3 KPI Financial Summary Cards (কাস্টমার হিসাব ও বকেয়া খতিয়ান) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Lifetime Sales */}
        <Card className="p-4 bg-gradient-to-br from-blue-500/5 to-slate-500/5 border-l-4 border-l-blue-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              মোট বিক্রয় (Total Sales)
            </span>
            <Receipt className="h-4 w-4 text-blue-500" />
          </div>
          <p className="text-2xl font-black font-mono text-slate-900 dark:text-white mt-1">
            {formatCurrency(financials.totalSales, settings.currency)}
          </p>
          <span className="text-[11px] text-slate-500">
            {customerSales.length} invoice{customerSales.length === 1 ? '' : 's'} registered
          </span>
        </Card>

        {/* Total Collected / Paid */}
        <Card className="p-4 bg-gradient-to-br from-emerald-500/5 to-slate-500/5 border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              মোট আদায় (Total Paid)
            </span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-1">
            {formatCurrency(financials.totalPaid, settings.currency)}
          </p>
          <span className="text-[11px] text-slate-500">
            Received in cash / bank
          </span>
        </Card>

        {/* Total Due / Receivables ("কাস্টমার থেকে কত পাব") */}
        <Card
          className={`p-4 border-l-4 ${
            financials.totalDue > 0
              ? 'bg-amber-500/10 border-l-amber-500'
              : 'bg-emerald-500/5 border-l-emerald-500'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              কাস্টমার থেকে মোট পাওনা (Due)
            </span>
            <AlertCircle
              className={`h-4 w-4 ${
                financials.totalDue > 0 ? 'text-amber-500' : 'text-emerald-500'
              }`}
            />
          </div>
          <p
            className={`text-2xl font-black font-mono mt-1 ${
              financials.totalDue > 0
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-emerald-600 dark:text-emerald-400'
            }`}
          >
            {formatCurrency(financials.totalDue, settings.currency)}
          </p>
          <span className="text-[11px] text-slate-500">
            {financials.totalDue > 0 ? 'Current outstanding receivables' : 'No overdue balance'}
          </span>
        </Card>
      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('invoices')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'invoices'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Receipt className="h-4 w-4" />
          <span>Sales Invoices ({customerSales.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('quotations')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'quotations'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <FileSpreadsheet className="h-4 w-4" />
          <span>Quotations / দরপত্র ({customerQuotations.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('orders')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'orders'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <ShoppingBag className="h-4 w-4" />
          <span>Online Orders ({customerOrders.length})</span>
        </button>
      </div>

      {/* TAB 1: SALES INVOICES */}
      {activeTab === 'invoices' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-4 w-4 text-emerald-500" />
                <span>Sales & POS Invoicing Ledger</span>
              </CardTitle>
              <p className="text-xs text-slate-400 mt-0.5">
                Completed and draft invoices for {customer.name}
              </p>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-y border-slate-200 dark:border-slate-800 text-slate-500 uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-4">Invoice #</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3 text-center">Items</th>
                    <th className="py-2.5 px-3 text-right">Total Amount</th>
                    <th className="py-2.5 px-3 text-right">Paid</th>
                    <th className="py-2.5 px-3 text-right">Due</th>
                    <th className="py-2.5 px-3 text-center">Payment</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-4 text-right">View</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {customerSales.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="py-8 text-center text-slate-400">
                        No invoices recorded for this customer yet.
                      </td>
                    </tr>
                  ) : (
                    customerSales.map((s) => {
                      const totalAmt = Number(s.total) || 0;
                      const paidAmt =
                        s.paidAmount !== undefined
                          ? Number(s.paidAmount)
                          : s.paymentStatus === 'paid'
                          ? totalAmt
                          : 0;
                      const dueAmt =
                        s.dueAmount !== undefined
                          ? Number(s.dueAmount)
                          : s.paymentStatus === 'due'
                          ? totalAmt
                          : Math.max(0, totalAmt - paidAmt);

                      return (
                        <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                          <td className="py-2.5 px-4 font-mono font-semibold text-emerald-600">
                            <Link to={`/sales/${s.id}`} className="hover:underline">
                              {s.invoiceNo}
                            </Link>
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
                            {formatDate(s.date)}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono">
                            {(s.items || []).length}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                            {formatCurrency(totalAmt, settings.currency)}
                            {Number(s.discount) > 0 && (
                              <span className="block text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                                ছাড়: -{formatCurrency(s.discount, settings.currency)}
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(paidAmt, settings.currency)}
                          </td>
                          <td
                            className={`py-2.5 px-3 text-right font-mono font-bold ${
                              dueAmt > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'
                            }`}
                          >
                            {formatCurrency(dueAmt, settings.currency)}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                s.paymentStatus === 'paid'
                                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                                  : s.paymentStatus === 'partial'
                                  ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300'
                                  : 'bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300'
                              }`}
                            >
                              {s.paymentStatus}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                s.status === 'completed'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                  : s.status === 'cancelled'
                                  ? 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300'
                                  : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                              }`}
                            >
                              {s.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-right">
                            <div className="inline-flex items-center justify-end gap-1">
                              <Link to={`/sales/${s._id || s.id}/edit`} title="Edit Invoice / Discount">
                                <button className="p-1 rounded-lg text-slate-400 hover:text-purple-600">
                                  <Edit2 className="h-4 w-4" />
                                </button>
                              </Link>
                              <Link to={`/sales/${s._id || s.id}`} title="View Invoice">
                                <button className="p-1 rounded-lg text-slate-400 hover:text-emerald-600">
                                  <Eye className="h-4 w-4" />
                                </button>
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* TAB 2: QUOTATIONS */}
      {activeTab === 'quotations' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-purple-600" />
                <span>Customer Quotations & RFQs (দরপত্র সমূহ)</span>
              </CardTitle>
              <p className="text-xs text-slate-400 mt-0.5">
                Official pad quotations issued for {customer.name}
              </p>
            </div>
            <Link to="/quotations/new">
              <Button variant="primary" size="sm" icon={Plus}>
                New Quotation
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-y border-slate-200 dark:border-slate-800 text-slate-500 uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-4">Quotation #</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Requisition Ref</th>
                    <th className="py-2.5 px-3 text-center">Items</th>
                    <th className="py-2.5 px-3 text-right">Total Quoted</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {customerQuotations.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="py-8 text-center text-slate-400">
                        No quotations created for this customer yet.
                      </td>
                    </tr>
                  ) : (
                    customerQuotations.map((q) => (
                      <tr key={q.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="py-2.5 px-4 font-mono font-semibold text-purple-600">
                          <Link to={`/quotations/${q.id}`} className="hover:underline">
                            {q.quotationNumber}
                          </Link>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
                          {formatDate(q.date)}
                        </td>
                        <td className="py-2.5 px-3">
                          {q.requisitionRef ? (
                            <span className="font-mono text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                              {q.requisitionRef}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">Direct</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono">
                          {(q.items || []).length}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                          {formatCurrency(q.totalAmount, settings.currency)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              q.status === 'converted'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                : q.status === 'approved'
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                            }`}
                          >
                            {q.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Link to={`/quotations/${q.id}`} title="View Details">
                              <button className="p-1 rounded-lg text-slate-400 hover:text-purple-600">
                                <Eye className="h-4 w-4" />
                              </button>
                            </Link>
                            <button
                              type="button"
                              onClick={() => setActivePrintQuotation(q)}
                              title="Print Quotation Pad"
                              className="p-1 rounded-lg text-slate-400 hover:text-emerald-600"
                            >
                              <Printer className="h-4 w-4" />
                            </button>
                            {q.status !== 'converted' && (
                              <button
                                type="button"
                                onClick={() => navigate('/sales/new', { state: { fromQuotation: q } })}
                                title="Convert to Sale"
                                className="p-1 rounded-lg text-slate-400 hover:text-blue-600"
                              >
                                <ArrowRightLeft className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* TAB 3: ONLINE ORDERS */}
      {activeTab === 'orders' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingBag className="h-4 w-4 text-blue-500" />
              <span>Online Storefront Orders</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-y border-slate-200 dark:border-slate-800 text-slate-500 uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-4">Order ID</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3 text-center">Items</th>
                    <th className="py-2.5 px-3 text-right">Total</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-4 text-right">View</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {customerOrders.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-8 text-center text-slate-400">
                        No online storefront orders recorded for this customer.
                      </td>
                    </tr>
                  ) : (
                    customerOrders.map((o) => (
                      <tr key={o.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="py-2.5 px-4 font-mono font-semibold text-blue-600">
                          <Link to={`/orders/${o.id}`} className="hover:underline">
                            {o.orderNumber || o.id}
                          </Link>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
                          {formatDate(o.createdAt || o.date)}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono">
                          {(o.items || []).length}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                          {formatCurrency(o.totalAmount || o.total, settings.currency)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                            {o.status || 'pending'}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <Link to={`/orders/${o.id}`}>
                            <button className="p-1 rounded-lg text-slate-400 hover:text-blue-600">
                              <Eye className="h-4 w-4" />
                            </button>
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Printable Receipt Modal */}
      {activePrintQuotation && (
        <PrintableReceiptModal
          isOpen={!!activePrintQuotation}
          onClose={() => setActivePrintQuotation(null)}
          sale={activePrintQuotation}
          initialDocType={DOCUMENT_TYPES.QUOTATION}
        />
      )}
    </div>
  );
};
