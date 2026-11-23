import React, { useState, useMemo, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAppData } from '../../context/AppDataContext';
import { useLanguage } from '../../context/LanguageContext';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { PrintableReceiptModal } from '../../components/receipt/PrintableReceiptModal';
import { DOCUMENT_TYPES, cleanItemName } from '../../utils/printTemplateGenerator';
import { formatCurrency, formatDate } from '../../utils/formatters';
import {
  FileSpreadsheet,
  ArrowLeft,
  Printer,
  ArrowRightLeft,
  Edit2,
  Trash2,
  Building2,
  Clock,
  Phone,
  MapPin,
  CheckCircle2,
  Send,
  FileCheck,
  Receipt,
} from 'lucide-react';

export const QuotationDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const {
    quotations,
    updateQuotation,
    deleteQuotation,
    confirmAction,
    settings,
  } = useAppData();

  const l = (texts) => {
    if (language === 'en') return texts.en;
    if (language === 'obro') return texts.obro || `${texts.bn} (${texts.en})`;
    return texts.bn;
  };

  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Single-line column & total visibility controls
  const [showRate, setShowRate] = useState(true);
  const [showLineTotal, setShowLineTotal] = useState(true);
  const [showGrandTotal, setShowGrandTotal] = useState(true);

  const quotation = useMemo(() => {
    return quotations.find((q) => q.id === id || q._id === id || q.quotationNumber === id);
  }, [id, quotations]);

  // Sync with quotation document
  useEffect(() => {
    if (quotation) {
      if (quotation.showRate !== undefined) setShowRate(quotation.showRate);
      if (quotation.showLineTotal !== undefined) setShowLineTotal(quotation.showLineTotal);
      if (quotation.showGrandTotal !== undefined) setShowGrandTotal(quotation.showGrandTotal);
    }
  }, [quotation]);

  if (!quotation) {
    return (
      <div className="text-center py-16 space-y-4">
        <FileSpreadsheet className="h-12 w-12 text-slate-300 mx-auto" />
        <h2 className="text-lg font-bold text-slate-700 dark:text-slate-300">
          {l({ bn: 'কোটেশন পাওয়া যায়নি', en: 'Quotation Not Found', obro: 'Quotation pawa jayni' })}
        </h2>
        <Button variant="outline" size="sm" onClick={() => navigate('/quotations')}>
          {l({ bn: 'কোটেশন তালিকায় ফিরে যান', en: 'Back to Quotations List', obro: 'Back to Quotations' })}
        </Button>
      </div>
    );
  }

  const handleDelete = () => {
    confirmAction({
      title: `${l({ bn: 'কোটেশন মুছবেন', en: 'Delete Quotation', obro: 'Delete Quotation' })} "${quotation.quotationNumber}"?`,
      message: l({
        bn: 'আপনি কি নিশ্চিত যে এই কোটেশনটি স্থায়ীভাবে মুছে ফেলতে চান?',
        en: 'Are you sure you want to permanently delete this quotation?',
        obro: 'Ei quotation permanent bhabe delete korte chan?',
      }),
      confirmText: l({ bn: 'মুছে ফেলুন', en: 'Delete Quotation', obro: 'Delete Quotation' }),
      isDestructive: true,
      onConfirm: () => {
        deleteQuotation(quotation.id);
        navigate('/quotations');
      },
    });
  };

  const handleConvert = () => {
    confirmAction({
      title: `${l({ bn: 'সেলস ইনভয়েসে রূপান্তর করবেন', en: 'Convert to POS Invoice', obro: 'Convert to POS Invoice' })} #${quotation.quotationNumber}?`,
      message: l({
        bn: `সকল ${quotation.items?.length || 0}টি আইটেম সেলস টার্মিনালে লোড হবে এবং ইনভয়েস সম্পন্ন হলে স্টক সমন্বয় হবে।`,
        en: `All ${quotation.items?.length || 0} line items will be populated in the sales terminal, deducting stock upon invoice completion.`,
        obro: `Shokol ${quotation.items?.length || 0}-ti item POS terminal e load hobe.`,
      }),
      confirmText: l({ bn: 'রূপান্তর ও টার্মিনাল ওপেন', en: 'Convert & Open POS Terminal', obro: 'Convert & Open POS' }),
      onConfirm: () => {
        navigate('/sales/new', { state: { fromQuotation: quotation } });
      },
    });
  };

  const handleStatusChange = (newStatus) => {
    updateQuotation(quotation.id, { status: newStatus });
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case 'owner':
        return l({ bn: 'কোম্পানির মালিক / স্বত্বাধিকারী', en: 'Owner / Proprietor', obro: 'Owner' });
      case 'agent':
        return l({ bn: 'কোম্পানির প্রতিনিধি / এজেন্ট', en: 'Agent / Representative', obro: 'Agent' });
      case 'purchaser':
        return l({ bn: 'ক্রয় কর্মকর্তা / প্রকিউরমেন্ট ম্যানেজার', en: 'Procurement / Purchase Officer', obro: 'Purchaser' });
      case 'supplier_rep':
        return l({ bn: 'সরবরাহকারী / ভেন্ডর প্রতিনিধি', en: 'Supplier / Vendor Rep', obro: 'Supplier Rep' });
      case 'wholesale':
        return l({ bn: 'পাইকারি ডিলার / মার্চেন্ট', en: 'Wholesale Dealer / Merchant', obro: 'Wholesale' });
      default:
        return l({ bn: 'সাধারণ গ্রাহক', en: 'Direct Client', obro: 'Direct Client' });
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'converted':
        return (
          <Badge variant="emerald">
            {l({ bn: 'ইনভয়েসে রূপান্তর সম্পন্ন', en: 'Converted to Invoice', obro: 'ইনভয়েসে রূপান্তর সম্পন্ন (Converted)' })}
          </Badge>
        );
      case 'approved':
        return (
          <Badge variant="blue">
            {l({ bn: 'গ্রাহক অনুমোদিত', en: 'Customer Approved', obro: 'গ্রাহক অনুমোদিত (Approved)' })}
          </Badge>
        );
      case 'sent':
        return (
          <Badge variant="purple">
            {l({ bn: 'গ্রাহককে প্রেরিত', en: 'Sent to Customer', obro: 'গ্রাহককে প্রেরিত (Sent)' })}
          </Badge>
        );
      default:
        return (
          <Badge variant="slate">
            {l({ bn: 'খসড়া দরপত্র', en: 'Draft Quotation', obro: 'খসড়া দরপত্র (Draft)' })}
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Top Navigation & Status Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          to="/quotations"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>{l({ bn: 'কোটেশন তালিকায় ফিরে যান', en: 'Back to Quotations List', obro: 'Back to Quotations List' })}</span>
        </Link>

        {/* Quick Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status buttons */}
          {quotation.status === 'draft' && (
            <Button
              variant="outline"
              size="sm"
              icon={Send}
              onClick={() => handleStatusChange('sent')}
            >
              {l({ bn: 'প্রেরিত হিসেবে চিহ্নিত করুন', en: 'Mark as Sent', obro: 'Mark as Sent' })}
            </Button>
          )}

          {quotation.status === 'sent' && (
            <Button
              variant="outline"
              size="sm"
              icon={CheckCircle2}
              onClick={() => handleStatusChange('approved')}
            >
              {l({ bn: 'অনুমোদিত হিসেবে চিহ্নিত করুন', en: 'Mark as Approved', obro: 'Mark as Approved' })}
            </Button>
          )}

          {/* Edit */}
          {quotation.status !== 'converted' && (
            <Link to={`/quotations/${quotation.id}/edit`}>
              <Button variant="secondary" size="sm" icon={Edit2}>
                {l({ bn: 'সংশোধন করুন', en: 'Edit', obro: 'Edit' })}
              </Button>
            </Link>
          )}

          {/* Print on Official Pad */}
          <Button
            variant="primary"
            size="sm"
            icon={Printer}
            onClick={() => setIsPrintModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {l({ bn: 'প্যাডে প্রিন্ট করুন', en: 'Print Quotation Pad', obro: 'Print Quotation Pad (প্রিন্ট)' })}
          </Button>

          {/* Convert to Sale */}
          {quotation.status !== 'converted' ? (
            <Button
              variant="primary"
              size="sm"
              icon={ArrowRightLeft}
              onClick={handleConvert}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {l({ bn: 'সেলস ইনভয়েস তৈরি করুন', en: 'Convert to Sale Invoice', obro: 'Convert to Sale Invoice' })}
            </Button>
          ) : (
            <Link to={`/sales/${quotation.convertedSaleId || ''}`}>
              <Button variant="outline" size="sm" icon={Receipt}>
                {l({ bn: 'জেনারেটকৃত ইনভয়েস দেখুন', en: 'View Generated Invoice', obro: 'View Generated Invoice' })}
              </Button>
            </Link>
          )}

          {/* Delete */}
          <Button
            variant="ghost"
            size="sm"
            icon={Trash2}
            onClick={handleDelete}
            className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40"
          >
            {l({ bn: 'মুছে ফেলুন', en: 'Delete', obro: 'Delete' })}
          </Button>
        </div>
      </div>

      {/* Conversion Banner if converted */}
      {quotation.status === 'converted' && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-300 flex items-center justify-center shrink-0">
              <FileCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                {l({
                  bn: 'এই কোটেশনটি সফলভাবে সেলস ইনভয়েসে রূপান্তরিত হয়েছে!',
                  en: 'This quotation has been successfully converted to a sales invoice!',
                  obro: 'Ei quotation-ti sales invoice e convert hoyeche!',
                })}
              </p>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                {l({
                  bn: 'গ্রাহকের একাউন্টে বিল এন্ট্রি এবং ইনভেন্টরি স্টক সমন্বয় সম্পন্ন।',
                  en: 'Customer billing record and inventory deductions completed.',
                  obro: 'Customer account bill entry o stock deductions somponno.',
                })}
              </p>
            </div>
          </div>
          {quotation.convertedSaleId && (
            <Link to={`/sales/${quotation.convertedSaleId}`}>
              <Button variant="primary" size="sm" icon={Receipt}>
                {l({ bn: 'ইনভয়েস দেখুন', en: 'View Invoice', obro: 'View Invoice' })}
              </Button>
            </Link>
          )}
        </div>
      )}

      {/* Main Quotation Sheet Preview */}
      <Card className="p-6 sm:p-8 shadow-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        {/* Pad Header */}
        <div className="border-b-2 border-emerald-600/40 pb-5 mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              {language !== 'en' && (
                <span className="text-[11px] text-slate-500 font-semibold block">
                  বিসমিল্লাহির রাহমানির রাহিম
                </span>
              )}
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                {language === 'en' ? 'M/S. SHANTA REFRIGERATION' : 'মেসার্স শান্তা রেফ্রিজারেশন'}
              </h2>
              {language !== 'en' && (
                <h3 className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 tracking-wider">
                  M/S. SHANTA REFRIGERATION
                </h3>
              )}
              <p className="text-[11px] text-slate-500 max-w-xl mt-1 leading-relaxed">
                {language === 'en'
                  ? 'Wholesaler and retailer of refrigeration cold store, ice plant, air conditioning, chiller plants, Freon & Ammonia compressor spare parts & gases.'
                  : 'রেফ্রিজারেশন কোল্ড স্টোর, আইস প্ল্যান্ট, এয়ার কন্ডিশন, চিলার প্ল্যান্ট, ফ্রিয়ন ও এ্যামোনিয়া কম্প্রেসারের খুচরা যন্ত্রাংশ ও গ্যাস বিক্রেতা।'}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {language === 'en'
                  ? '406, C.D.A Market (Opposite to Mosque), Pahartali, Chattogram. Phone: 01711-169875'
                  : '৪০৬, সি.ডি.এ মার্কেট (মসজিদের বিপরীতে), পাহাড়তলী, চট্টগ্রাম। ফোন: 01711-169875'}
              </p>
            </div>

            <div className="text-right sm:border-l sm:border-slate-200 dark:sm:border-slate-800 sm:pl-6 space-y-1">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  {l({ bn: 'কোটেশন নং', en: 'Quotation #', obro: 'Quotation #' })}
                </span>
                <span className="text-base font-black font-mono text-purple-600 dark:text-purple-400">
                  {quotation.quotationNumber}
                </span>
              </div>
              <div className="text-xs text-slate-500">
                {l({ bn: 'তারিখ: ', en: 'Date: ', obro: 'Date: ' })}
                <span className="font-semibold text-slate-700 dark:text-slate-300">{formatDate(quotation.date)}</span>
              </div>
              {quotation.validUntil && (
                <div className="text-[11px] text-slate-400">
                  {l({ bn: 'মেয়াদ: ', en: 'Valid till: ', obro: 'Valid till: ' })}
                  {formatDate(quotation.validUntil)}
                </div>
              )}
              <div className="pt-1">
                {getStatusBadge(quotation.status)}
              </div>
            </div>
          </div>
        </div>

        {/* Customer & Requisition Info Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 mb-6 text-xs">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
              {l({
                bn: 'গ্রাহকের তথ্য',
                en: 'Client Profile',
                obro: 'গ্রাহকের তথ্য (Client Information)',
              })}
            </span>
            <p className="font-bold text-sm text-slate-900 dark:text-slate-100">
              {quotation.customerName || l({ bn: 'সাধারণ ক্লায়েন্ট', en: 'Direct Client', obro: 'Direct Client' })}
            </p>
            {quotation.customerCompany && (
              <p className="text-xs font-semibold text-purple-600 dark:text-purple-400 flex items-center gap-1 mt-0.5">
                <Building2 className="h-3.5 w-3.5 shrink-0" />
                <span>{quotation.customerCompany}</span>
              </p>
            )}
            <p className="text-[11px] text-slate-500 mt-1">
              {l({ bn: 'পদবি: ', en: 'Role: ', obro: 'Role: ' })}
              <span className="font-medium text-slate-700 dark:text-slate-300">{getRoleLabel(quotation.customerRole)}</span>
            </p>
            {quotation.customerPhone && (
              <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                <Phone className="h-3 w-3 shrink-0" />
                <span>{quotation.customerPhone}</span>
              </p>
            )}
            {quotation.customerAddress ? (
              <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                <MapPin className="h-3 w-3 shrink-0" />
                <span>{quotation.customerAddress}</span>
              </p>
            ) : (
              <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                <MapPin className="h-3 w-3 shrink-0" />
                <span>{l({ bn: 'ঠিকানা: N/A', en: 'Address: N/A', obro: 'Address: N/A' })}</span>
              </p>
            )}
          </div>

          <div className="sm:text-right space-y-1.5">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                {l({
                  bn: 'চাহিদা পত্র সূত্র',
                  en: 'Requisition Reference',
                  obro: 'চাহিদা পত্র সূত্র / Requisition Ref',
                })}
              </span>
              <span className="inline-block px-2.5 py-1 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-mono font-bold text-xs">
                {quotation.requisitionRef || l({ bn: 'সরাসরি চাহিদা', en: 'Direct Inquiry', obro: 'Direct Inquiry' })}
              </span>
            </div>
            <div className="text-[11px] text-slate-500">
              {l({ bn: 'প্রস্তুতকারক: ', en: 'Prepared By: ', obro: 'Prepared By: ' })}
              <span className="font-medium text-slate-700 dark:text-slate-300">{quotation.preparedBy || 'Sales Executive'}</span>
            </div>
          </div>
        </div>

        {/* Quotation Heading */}
        <div className="text-center my-4">
          <span className="inline-block px-4 py-1 rounded-md bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 text-sm font-extrabold tracking-widest uppercase border border-purple-200 dark:border-purple-800">
            {l({ bn: 'দরপত্র', en: 'QUOTATION', obro: 'Quotation (দরপত্র)' })}
          </span>
        </div>

        {/* Single Line Column & Total Visibility Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-slate-100/90 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 mb-4 text-xs">
          <div className="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-300">
            <span className="text-[11px] uppercase tracking-wider text-purple-700 dark:text-purple-400 font-extrabold flex items-center gap-1.5">
              <span>
                {l({
                  bn: '👁️ কলাম ও মোট মূল্য প্রদর্শন নিয়ন্ত্রণ:',
                  en: '👁️ Visibility Controls:',
                  obro: '👁️ কলাম ও মোট মূল্য নিয়ন্ত্রণ (VISIBILITY CONTROLS):',
                })}
              </span>
            </span>
          </div>

          <div className="inline-flex items-center gap-4 flex-wrap">
            <label className="inline-flex items-center gap-1.5 cursor-pointer font-bold text-slate-700 dark:text-slate-300 hover:text-purple-600 transition-colors select-none">
              <input
                type="checkbox"
                checked={showRate}
                onChange={(e) => setShowRate(e.target.checked)}
                className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 h-3.5 w-3.5"
              />
              <span>{l({ bn: 'দর কলাম', en: 'Rate Column', obro: 'দর / Rate কলাম' })}</span>
            </label>

            <label className="inline-flex items-center gap-1.5 cursor-pointer font-bold text-slate-700 dark:text-slate-300 hover:text-purple-600 transition-colors select-none">
              <input
                type="checkbox"
                checked={showLineTotal}
                onChange={(e) => setShowLineTotal(e.target.checked)}
                className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 h-3.5 w-3.5"
              />
              <span>{l({ bn: 'আইটেম মোট কলাম', en: 'Total Column', obro: 'আইটেম মোট / Total কলাম' })}</span>
            </label>

            <label className="inline-flex items-center gap-1.5 cursor-pointer font-bold text-slate-700 dark:text-slate-300 hover:text-purple-600 transition-colors select-none">
              <input
                type="checkbox"
                checked={showGrandTotal}
                onChange={(e) => setShowGrandTotal(e.target.checked)}
                className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 h-3.5 w-3.5"
              />
              <span>{l({ bn: 'সর্বমোট মূল্য', en: 'Grand Total', obro: 'সর্বমোট মূল্য / Grand Total' })}</span>
            </label>
          </div>
        </div>

        {/* Items Table */}
        <div className="overflow-x-auto mb-6">
          <table className="w-full text-left text-xs border border-slate-200 dark:border-slate-800">
            <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-2.5 px-3 w-12 text-center border-r border-slate-200 dark:border-slate-800">
                  {l({ bn: 'ক্রম', en: 'SL', obro: 'সংখ্যা' })}
                </th>
                <th className="py-2.5 px-4 border-r border-slate-200 dark:border-slate-800">
                  {l({
                    bn: 'মালের বিবরণ ও স্পেক্স',
                    en: 'Item Description & Specs',
                    obro: 'মালের বিবরণ (Description of Spare Parts)',
                  })}
                </th>
                <th className="py-2.5 px-3 text-center border-r border-slate-200 dark:border-slate-800">
                  {l({ bn: 'একক', en: 'Unit', obro: 'একক' })}
                </th>
                <th className="py-2.5 px-3 text-center border-r border-slate-200 dark:border-slate-800">
                  {l({ bn: 'পরিমাণ', en: 'Qty', obro: 'পরিমাণ' })}
                </th>
                {showRate && (
                  <th className="py-2.5 px-3 text-right border-r border-slate-200 dark:border-slate-800">
                    {l({ bn: 'দর', en: 'Rate (BDT)', obro: 'দর (Unit Price)' })}
                  </th>
                )}
                {showLineTotal && (
                  <th className="py-2.5 px-4 text-right">
                    {l({ bn: 'মোট টাকা', en: 'Total (BDT)', obro: 'টাকা (Total BDT)' })}
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-medium">
              {(quotation.items || []).map((it, idx) => (
                <tr key={it.id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="py-2.5 px-3 text-center font-mono text-slate-500 border-r border-slate-200 dark:border-slate-800">
                    {idx + 1}.
                  </td>
                  <td className="py-2.5 px-4 font-semibold text-slate-800 dark:text-slate-200 border-r border-slate-200 dark:border-slate-800">
                    {cleanItemName(it.name || it.productName)}
                    {it.description && (
                      <span className="block text-[11px] text-slate-400 font-normal">
                        {it.description}
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-center text-slate-600 dark:text-slate-400 border-r border-slate-200 dark:border-slate-800">
                    {it.unit || 'pc'}
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono font-bold border-r border-slate-200 dark:border-slate-800">
                    {it.quantity}
                  </td>
                  {showRate && (
                    <td className="py-2.5 px-3 text-right font-mono border-r border-slate-200 dark:border-slate-800">
                      {formatCurrency(it.unitPrice, settings.currency)}
                    </td>
                  )}
                  {showLineTotal && (
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                      {formatCurrency(it.lineTotal, settings.currency)}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Financial Summary & Terms */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-slate-200 dark:border-slate-800 text-xs">
          <div className="space-y-3">
            {quotation.termsAndConditions && (
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                <span className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                  {l({ bn: 'শর্তাবলী:', en: 'Terms & Conditions:', obro: 'শর্তাবলী (Terms & Conditions):' })}
                </span>
                <p className="whitespace-pre-line text-slate-600 dark:text-slate-400 leading-relaxed text-[11px]">
                  {quotation.termsAndConditions}
                </p>
              </div>
            )}

            {quotation.notes && (
              <p className="text-[11px] text-slate-500 italic">
                {l({ bn: 'নোট: ', en: 'Note: ', obro: 'নোট: ' })}
                {quotation.notes}
              </p>
            )}
          </div>

          {showGrandTotal ? (
            <div className="space-y-2">
              <div className="flex justify-between py-1.5 border-b border-slate-200 dark:border-slate-800">
                <span className="text-slate-500">
                  {l({ bn: 'উপ-মোট:', en: 'Subtotal:', obro: 'মোট মূল্য (Subtotal):' })}
                </span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  {formatCurrency(quotation.subtotal, settings.currency)}
                </span>
              </div>

              {Number(quotation.discount) > 0 && (
                <div className="flex justify-between py-1.5 border-b border-slate-200 dark:border-slate-800 text-emerald-600 dark:text-emerald-400">
                  <span>
                    {l({ bn: 'বিশেষ ছাড়:', en: 'Discount:', obro: 'বিশেষ ছাড় (Discount):' })}
                  </span>
                  <span className="font-mono font-bold">
                    - {formatCurrency(quotation.discount, settings.currency)}
                  </span>
                </div>
              )}

              {Number(quotation.tax) > 0 && (
                <div className="flex justify-between py-1.5 border-b border-slate-200 dark:border-slate-800">
                  <span className="text-slate-500">
                    {l({ bn: 'ভ্যাট / কর:', en: 'Tax / VAT:', obro: 'ভ্যাট / কর (Tax):' })}
                  </span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                    + {formatCurrency(quotation.tax, settings.currency)}
                  </span>
                </div>
              )}

              <div className="flex justify-between py-2 border-b-2 border-purple-600 text-sm">
                <span className="font-black text-slate-900 dark:text-white">
                  {l({ bn: 'সর্বমোট প্রস্তাবিত মূল্য:', en: 'Grand Total Quoted:', obro: 'সর্বমোট দরপত্র মূল্য:' })}
                </span>
                <span className="font-black font-mono text-purple-600 dark:text-purple-400 text-base">
                  {formatCurrency(quotation.totalAmount, settings.currency)}
                </span>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-amber-50/80 dark:bg-amber-950/30 border border-dashed border-amber-300 dark:border-amber-700/60 rounded-xl space-y-1.5 text-center flex flex-col justify-center">
              <div className="text-amber-800 dark:text-amber-300 font-bold text-xs flex items-center justify-center gap-1.5">
                <span>
                  {l({
                    bn: '🚫 সর্বমোট মূল্য লুকানো হয়েছে',
                    en: '🚫 Grand Total Hidden',
                    obro: '🚫 সর্বমোট মূল্য (Grand Total) লুকানো হয়েছে',
                  })}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                {l({
                  bn: 'নন-প্রাইসড স্পেসিফিকেশন কোটেশন মোড: কোটেশন প্যাড ও প্রিন্ট ভাউচারে কোনো মূল্য প্রদর্শিত হবে না।',
                  en: 'Non-priced specification quotation mode: No monetary amounts are displayed on the print pad.',
                  obro: 'Non-priced specification quotation mode: Konoi mullo prokolpito hobe na.',
                })}
              </p>
              <button
                type="button"
                onClick={() => setShowGrandTotal(true)}
                className="text-[11px] font-bold text-purple-600 dark:text-purple-400 hover:underline pt-0.5 inline-block"
              >
                {l({
                  bn: 'সর্বমোট মূল্য পুনরায় দেখান',
                  en: 'Show Grand Total Again',
                  obro: 'সর্বমোট মূল্য পুনরায় দেখান',
                })}
              </button>
            </div>
          )}
        </div>

        {/* Pad Signature Footer */}
        <div className="pt-12 mt-8 flex items-end justify-between text-xs text-slate-500">
          <div className="border-t border-slate-400 w-48 text-center pt-1">
            <span>
              {l({ bn: 'ক্রেতার স্বাক্ষর', en: "Client's Signature", obro: 'ক্রেতার স্বাক্ষর' })}
            </span>
          </div>
          <div className="border-t border-slate-400 w-48 text-center pt-1">
            <span>
              {language === 'en' ? 'For M/S. Shanta Refrigeration' : 'পক্ষে- মেসার্স শান্তা রেফ্রিজারেশন'}
            </span>
          </div>
        </div>
      </Card>

      {/* Printable Receipt Modal */}
      {isPrintModalOpen && (
        <PrintableReceiptModal
          isOpen={isPrintModalOpen}
          onClose={() => setIsPrintModalOpen(false)}
          sale={{
            ...quotation,
            showRate,
            showLineTotal,
            showGrandTotal,
          }}
          initialDocType={DOCUMENT_TYPES.QUOTATION}
        />
      )}
    </div>
  );
};
