import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAppData } from '../../context/AppDataContext';
import { useLanguage } from '../../context/LanguageContext';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { BackLink } from '../../components/common/BackLink';
import { PrintableReceiptModal } from '../../components/receipt/PrintableReceiptModal';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { calculatePaymentBreakdown } from '../../utils/calculations';
import { cleanItemName } from '../../utils/printTemplateGenerator';
import { hasAnyMachineDetails } from '../../utils/partPriceSearch';
import { ArrowLeft, Printer, CheckCircle2, XCircle, Clock, Users2, Edit2, FileSpreadsheet, Cpu } from 'lucide-react';

export const SaleDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { sales, customers, quotations, completeSale, cancelSale, confirmAction, settings } = useAppData();
  const { language, t } = useLanguage();

  const l = (texts) => {
    if (language === 'en') return texts.en;
    if (language === 'obro') return texts.obro || `${texts.bn} (${texts.en})`;
    return texts.bn;
  };

  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  // Single-line column & total visibility controls ("eta ek line e thakbe eigula")
  const [showRate, setShowRate] = useState(true);
  const [showLineTotal, setShowLineTotal] = useState(true);
  const [showGrandTotal, setShowGrandTotal] = useState(true);

  const sale = sales.find((s) => s.id === id || s._id === id);
  const customer = customers.find((c) => c.id === sale?.customerId || c._id === sale?.customerId);
  const linkedQuotation = sale?.quotationId
    ? (quotations || []).find((q) => q.id === sale.quotationId || q._id === sale.quotationId)
    : null;

  React.useEffect(() => {
    if (sale) {
      if (sale.showRate !== undefined) setShowRate(sale.showRate);
      if (sale.showLineTotal !== undefined) setShowLineTotal(sale.showLineTotal);
      if (sale.showGrandTotal !== undefined) setShowGrandTotal(sale.showGrandTotal);
    }
  }, [sale]);

  if (!sale) {
    return (
      <div className="py-12 text-center space-y-4">
        <h2 className="text-xl font-bold">{l({ bn: 'বিক্রয় ইনভয়েসটি পাওয়া যায়নি', en: 'Sale Invoice Not Found', obro: 'Sale Invoice Not Found' })}</h2>
        <Link to="/sales">
          <Button variant="primary">{l({ bn: 'বিক্রয় তালিকায় ফিরে যান', en: 'Return to Sales List', obro: 'Sales List-e Ferot Jan' })}</Button>
        </Link>
      </div>
    );
  }

  const invoiceNumber = sale.invoiceNo || sale.invoiceNumber || (sale.id ? `INV-${sale.id.slice(-4)}` : 'INV-2026');
  const discountVal = Number(sale.discount) || 0;
  const taxVal = Number(sale.tax) || 0;
  const totalAmount = Number(sale.total !== undefined ? sale.total : (sale.totalAmount !== undefined ? sale.totalAmount : 0));
  const subtotalVal = Number(sale.subtotal !== undefined ? sale.subtotal : Math.max(0, totalAmount + discountVal - taxVal));
  const {
    paymentStatus: resolvedPayStatus,
    paidAmount: paidAmt,
    dueAmount: dueAmt,
  } = calculatePaymentBreakdown({
    total: totalAmount,
    paymentStatus: sale.paymentStatus || 'paid',
    paidAmount: sale.paidAmount,
  });
  const saleDate = sale.date || sale.createdAt || new Date();

  const handleComplete = () => {
    confirmAction({
      title: l({
        bn: `ইনভয়েস ${invoiceNumber} সম্পন্ন করবেন?`,
        en: `Complete Invoice ${invoiceNumber}?`,
        obro: `Invoice ${invoiceNumber} complete korben?`,
      }),
      message: l({
        bn: 'এটি বিক্রিত সকল আইটেমের স্টক ইনভেন্টরি থেকে হ্রাস করবে এবং মুভমেন্ট রেকর্ড সংরক্ষণ করবে।',
        en: 'This will decrease on-hand inventory quantities for all sold items and record movements.',
        obro: 'Eti sold item-er stock komiye movement record korbe.',
      }),
      confirmText: l({ bn: 'বিক্রয় সম্পন্ন করুন', en: 'Complete Sale', obro: 'Complete Sale' }),
      onConfirm: () => {
        completeSale(sale.id, 'Sales Executive');
      },
    });
  };

  const handleCancel = () => {
    confirmAction({
      title: l({
        bn: `বিক্রয় ইনভয়েস ${invoiceNumber} বাতিল করবেন?`,
        en: `Cancel Sale Invoice ${invoiceNumber}?`,
        obro: `Invoice ${invoiceNumber} cancel korben?`,
      }),
      message: sale.status === 'completed'
        ? l({
            bn: 'সতর্কতা: এই বিক্রয় থেকে ইতিমধ্যে স্টক কর্তন হয়েছে। এটি বাতিল করলে সেই পরিমাণ স্টক স্বয়ংক্রিয়ভাবে ইনভেন্টরিতে ফিরিয়ে দেওয়া হবে।',
            en: 'Warning: This sale has already deducted items from stock. Cancelling it will safely restore those quantities.',
            obro: 'Warning: Stock already deducted. Cancel korle stock inventory-te restore hobe.',
          })
        : l({
            bn: 'আপনি কি নিশ্চিত যে এই ড্রাফট ইনভয়েসটি বাতিল করতে চান?',
            en: 'Are you sure you want to cancel this draft sale invoice?',
            obro: 'Ei draft invoice cancel korte chan?',
          }),
      confirmText: l({ bn: 'বাতিল নিশ্চিত করুন', en: 'Confirm Cancellation', obro: 'Confirm Cancellation' }),
      isDestructive: true,
      onConfirm: () => {
        cancelSale(sale.id, 'Admin');
      },
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top back & actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <BackLink to="/sales">
          {l({ bn: 'বিক্রয় তালিকায় ফিরে যান', en: 'Back to Sales List', obro: 'Sales List-e Ferot Jan' })}
        </BackLink>

        <div className="flex items-center gap-2">
          <Link to={`/sales/${sale.id}/edit`}>
            <Button variant="outline" size="sm" icon={Edit2}>
              {l({ bn: 'ইনভয়েস এডিট করুন', en: 'Edit Invoice', obro: 'Edit Invoice' })}
            </Button>
          </Link>

          <Button variant="outline" size="sm" icon={Printer} onClick={() => setIsReceiptOpen(true)}>
            {l({ bn: 'প্রিন্ট মেমো / চালান', en: 'Print Invoice / Challan', obro: 'Print Invoice / Challan' })}
          </Button>

          {sale.status === 'draft' && (
            <Button variant="primary" size="sm" icon={CheckCircle2} onClick={handleComplete}>
              {l({ bn: 'এখনই সম্পন্ন করুন', en: 'Complete Sale Now', obro: 'Complete Sale Now' })}
            </Button>
          )}

          {sale.status !== 'cancelled' && (
            <Button variant="outline" size="sm" icon={XCircle} onClick={handleCancel}>
              {l({ bn: 'ইনভয়েস বাতিল করুন', en: 'Cancel Invoice', obro: 'Cancel Invoice' })}
            </Button>
          )}
        </div>
      </div>

      <Card className="p-6">
        <div className="flex flex-col sm:flex-row items-start justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white font-mono">
                {invoiceNumber}
              </h1>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  sale.status === 'completed'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                    : sale.status === 'cancelled'
                    ? 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                }`}
              >
                {sale.status === 'completed' && <CheckCircle2 className="h-3 w-3" />}
                {sale.status === 'draft' && <Clock className="h-3 w-3" />}
                {sale.status === 'cancelled' && <XCircle className="h-3 w-3" />}
                <span>
                  {sale.status === 'completed'
                    ? l({ bn: 'সম্পন্ন', en: 'COMPLETED', obro: 'COMPLETED' })
                    : sale.status === 'cancelled'
                    ? l({ bn: 'বাতিল', en: 'CANCELLED', obro: 'CANCELLED' })
                    : l({ bn: 'ড্রাফট', en: 'DRAFT', obro: 'DRAFT' })}
                </span>
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {l({ bn: 'ইস্যুর তারিখ: ', en: 'Issued on ', obro: 'Issued on ' })}
              {formatDateTime(saleDate)}
            </p>
          </div>

          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              {l({ bn: 'সর্বমোট মূল্য', en: 'Grand Total', obro: 'Grand Total' })}
            </span>
            <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
              {formatCurrency(totalAmount, settings.currency)}
            </div>
            <span
              className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase mt-1 ${
                resolvedPayStatus === 'paid'
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                  : resolvedPayStatus === 'partial'
                  ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300'
                  : 'bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300'
              }`}
            >
              {resolvedPayStatus === 'paid'
                ? l({ bn: 'পরিশোধিত', en: 'PAID', obro: 'PAID' })
                : resolvedPayStatus === 'partial'
                ? l({ bn: 'আংশিক জমা', en: 'PARTIAL', obro: 'PARTIAL' })
                : l({ bn: 'বকেয়া', en: 'DUE', obro: 'DUE' })}
            </span>
          </div>
        </div>

        {/* Customer details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4 text-xs">
          <div>
            <span className="text-slate-400 font-semibold block uppercase text-[10px] mb-1">
              {l({ bn: 'গ্রাহকের বিবরণ', en: 'Billed Customer', obro: 'Billed Customer' })}
            </span>
            {sale.customerId ? (
              <Link
                to={`/customers/${sale.customerId}`}
                data-no-translate="true"
                className="text-sm font-bold text-slate-800 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400"
              >
                {sale.customerName}
              </Link>
            ) : (
              <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                {sale.customerName || l({ bn: 'খুচরা নগদ ক্রেতা', en: 'Walk-in Retail Customer', obro: 'Walk-in Customer' })}
              </span>
            )}
            {(customer?.companyName || sale.customerCompany) && (
              <p className="text-purple-600 dark:text-purple-400 font-semibold mt-0.5" data-no-translate="true">
                {customer?.companyName || sale.customerCompany}
              </p>
            )}
            <p className="text-slate-500 mt-0.5">{customer?.phone || sale.customerPhone || l({ bn: 'কাউন্টার সরাসরি বিক্রয়', en: 'Direct counter sale', obro: 'Direct counter sale' })}</p>
            {(customer?.address || sale.customerAddress) && (
              <p className="text-slate-400 mt-0.5" data-no-translate="true">{customer?.address || sale.customerAddress}</p>
            )}
          </div>
          <div className="space-y-2">
            <div>
              <span className="text-slate-400 font-semibold block uppercase text-[10px] mb-1">
                {l({ bn: 'ইনভয়েস মন্তব্য ও বিবরণ', en: 'Invoice Remarks', obro: 'Invoice Remarks' })}
              </span>
              <p className="text-slate-700 dark:text-slate-300">
                {sale.notes || l({ bn: 'সাধারণ নিয়মিত লেনদেন।', en: 'Standard retail transaction.', obro: 'Standard retail transaction.' })}
              </p>
            </div>
            {linkedQuotation && (
              <div>
                <Link
                  to={`/quotations/${linkedQuotation.id || linkedQuotation._id}`}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 font-semibold hover:bg-purple-100 dark:hover:bg-purple-950/60"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  <span>
                    {l({ bn: 'দরপত্র', en: 'Quotation', obro: 'Quotation' })} #{linkedQuotation.quotationNumber}
                  </span>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Machine & Technical Spec Summary */}
        {hasAnyMachineDetails(sale.machineDetails) && (
          <div className="p-3.5 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/50 mb-4 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-indigo-800 dark:text-indigo-300 mb-2">
              <Cpu className="h-4 w-4" />
              <span>{l({ bn: 'মেশিন ও টেকনিক্যাল বিবরণ (Machine Specs)', en: 'Machine & Equipment Specs' })}</span>
            </div>
            <div className="flex flex-wrap gap-2 text-[11px] text-slate-700 dark:text-slate-200">
              {sale.machineDetails.machineName && <span><strong>Machine:</strong> {sale.machineDetails.machineName}</span>}
              {sale.machineDetails.model && <span>• <strong>Model:</strong> {sale.machineDetails.model}</span>}
              {sale.machineDetails.type && <span>• <strong>Type:</strong> {sale.machineDetails.type}</span>}
              {sale.machineDetails.hp && <span>• <strong>HP:</strong> {sale.machineDetails.hp}</span>}
              {sale.machineDetails.ton && <span>• <strong>Ton:</strong> {sale.machineDetails.ton}</span>}
              {sale.machineDetails.cylinder && <span>• <strong>Cyl:</strong> {sale.machineDetails.cylinder}</span>}
              {sale.machineDetails.others && <span>• <strong>Others:</strong> {sale.machineDetails.others}</span>}
              {sale.machineDetails.description && <span className="w-full text-slate-500">{sale.machineDetails.description}</span>}
            </div>
          </div>
        )}

        {/* Single Line Column & Total Visibility Controls ("eta ek line e thakbe eigula") */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-3.5 py-2 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700/60 my-4 text-xs">
          <div className="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-300">
            <span className="text-[11px] uppercase tracking-wider text-emerald-700 dark:text-emerald-400 font-extrabold flex items-center gap-1.5">
              <span>{l({ bn: '👁️ কলাম ও মোট মূল্য নিয়ন্ত্রণ:', en: '👁️ Print Columns & Totals:', obro: '👁️ Column & Totals Toggle:' })}</span>
            </span>
          </div>

          <div className="inline-flex items-center gap-4 flex-wrap">
            <label className="inline-flex items-center gap-1.5 cursor-pointer font-bold text-slate-700 dark:text-slate-300 hover:text-emerald-600 transition-colors select-none">
              <input
                type="checkbox"
                checked={showRate}
                onChange={(e) => setShowRate(e.target.checked)}
                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5"
              />
              <span>{l({ bn: 'দর / Rate কলাম', en: 'Rate / Unit Price', obro: 'Rate / Unit Price' })}</span>
            </label>

            <label className="inline-flex items-center gap-1.5 cursor-pointer font-bold text-slate-700 dark:text-slate-300 hover:text-emerald-600 transition-colors select-none">
              <input
                type="checkbox"
                checked={showLineTotal}
                onChange={(e) => setShowLineTotal(e.target.checked)}
                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5"
              />
              <span>{l({ bn: 'মোট টাকা / Amount কলাম', en: 'Line Total Amount', obro: 'Line Total Amount' })}</span>
            </label>

            <label className="inline-flex items-center gap-1.5 cursor-pointer font-bold text-slate-700 dark:text-slate-300 hover:text-emerald-600 transition-colors select-none">
              <input
                type="checkbox"
                checked={showGrandTotal}
                onChange={(e) => setShowGrandTotal(e.target.checked)}
                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5"
              />
              <span>{l({ bn: 'সর্বমোট মূল্য / Grand Total', en: 'Grand Total Footer', obro: 'Grand Total Footer' })}</span>
            </label>
          </div>
        </div>

        {/* Itemized Table */}
        <div className="pt-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
            {l({ bn: 'বিক্রিত পণ্যের বিবরণ', en: 'Billed Items', obro: 'Billed Items' })}
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-y border-slate-200 dark:border-slate-800 text-slate-500 uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-4">{l({ bn: 'পণ্যের নাম ও স্পেকস', en: 'Product Name', obro: 'Product Name' })}</th>
                  <th className="py-2.5 px-3 text-center">{l({ bn: 'পরিমাণ (Qty)', en: 'Quantity', obro: 'Qty' })}</th>
                  {showRate && <th className="py-2.5 px-3 text-right">{l({ bn: 'দর / একক মূল্য', en: 'Unit Price', obro: 'Unit Price' })}</th>}
                  {showLineTotal && <th className="py-2.5 px-4 text-right">{l({ bn: 'মোট টাকা', en: 'Line Total', obro: 'Line Total' })}</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {(sale.items || []).map((item, i) => (
                  <tr key={i}>
                    <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">
                      {cleanItemName(item.productName || item.productId)}
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      {item.quantity} {item.unit || 'pc'}
                    </td>
                    {showRate && (
                      <td className="py-3 px-3 text-right font-mono text-slate-600 dark:text-slate-400">
                        {formatCurrency(item.unitPrice !== undefined ? item.unitPrice : item.price, settings.currency)}
                      </td>
                    )}
                    {showLineTotal && (
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                        {formatCurrency(item.total !== undefined ? item.total : (item.lineTotal || (item.quantity * (item.unitPrice || 0))), settings.currency)}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totals Breakdown */}
        {showGrandTotal ? (
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col items-end gap-1.5 text-xs">
            <div className="flex justify-between w-72 text-slate-500">
              <span>{l({ bn: 'উপমোট (Subtotal):', en: 'Subtotal:', obro: 'Subtotal:' })}</span>
              <span className="font-mono">{formatCurrency(subtotalVal, settings.currency)}</span>
            </div>
            {discountVal > 0 && (
              <div className="flex justify-between w-72 text-emerald-600 font-semibold">
                <span>{l({ bn: 'বিশেষ ছাড় / ডিসকাউন্ট:', en: 'Discount Applied:', obro: 'Discount Applied:' })}</span>
                <span className="font-mono whitespace-nowrap">-{formatCurrency(discountVal, settings.currency)}</span>
              </div>
            )}
            {taxVal > 0 && (
              <div className="flex justify-between w-72 text-slate-600 dark:text-slate-400 font-semibold">
                <span>{l({ bn: 'ভ্যাট / অতিরিক্ত চার্জ:', en: 'Tax / Extra:', obro: 'Tax / Extra:' })}</span>
                <span className="font-mono">+{formatCurrency(taxVal, settings.currency)}</span>
              </div>
            )}
            <div className="flex justify-between w-72 text-base font-bold text-slate-900 dark:text-white pt-2 border-t border-slate-100 dark:border-slate-800">
              <span>{l({ bn: 'নিট প্রদেয় মূল্য:', en: 'Net Payable:', obro: 'Net Payable:' })}</span>
              <span className="font-mono text-emerald-600 dark:text-emerald-400">
                {formatCurrency(totalAmount, settings.currency)}
              </span>
            </div>
            <div className="flex justify-between w-72 text-slate-700 dark:text-slate-300 pt-1">
              <span>{l({ bn: 'জমা / আদায় (Paid):', en: 'Paid Amount:', obro: 'Paid Amount:' })}</span>
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                {formatCurrency(paidAmt, settings.currency)}
              </span>
            </div>
            <div className="flex justify-between w-72 font-bold text-red-600 dark:text-red-400 pt-1 border-t border-slate-100 dark:border-slate-800">
              <span>{l({ bn: 'বাকী / বকেয়া (Balance Due):', en: 'Balance Due:', obro: 'Balance Due:' })}</span>
              <span className="font-mono">{formatCurrency(dueAmt, settings.currency)}</span>
            </div>
          </div>
        ) : (
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
            <button
              type="button"
              onClick={() => setShowGrandTotal(true)}
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              {l({ bn: '+ সর্বমোট মূল্য দেখুন (Show Grand Total)', en: '+ Show Grand Total', obro: '+ Show Grand Total' })}
            </button>
          </div>
        )}
      </Card>

      {/* Receipt Modal */}
      <PrintableReceiptModal
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
        sale={{
          ...sale,
          showRate,
          showLineTotal,
          showGrandTotal,
        }}
      />
    </div>
  );
};
