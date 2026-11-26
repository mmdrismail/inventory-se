import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppData } from '../../context/AppDataContext';
import { useLanguage } from '../../context/LanguageContext';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { EmptyState } from '../../components/common/EmptyState';
import { PrintableReceiptModal } from '../../components/receipt/PrintableReceiptModal';
import { DOCUMENT_TYPES } from '../../utils/printTemplateGenerator';
import { formatCurrency, formatDate } from '../../utils/formatters';
import {
  FileSpreadsheet,
  Plus,
  Search,
  Eye,
  Printer,
  ArrowRightLeft,
  Trash2,
  Building2,
  FileText,
  CheckCircle2,
  Clock,
} from 'lucide-react';

export const QuotationListPage = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { quotations, deleteQuotation, confirmAction, settings } = useAppData();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [activePrintQuotation, setActivePrintQuotation] = useState(null);

  const l = (texts) => {
    if (language === 'en') return texts.en;
    if (language === 'obro') return texts.obro || `${texts.bn} (${texts.en})`;
    return texts.bn;
  };

  // Statistics
  const stats = useMemo(() => {
    const total = quotations.length;
    const drafts = quotations.filter((q) => q.status === 'draft').length;
    const sent = quotations.filter((q) => q.status === 'sent').length;
    const approved = quotations.filter((q) => q.status === 'approved').length;
    const converted = quotations.filter((q) => q.status === 'converted').length;
    const totalValue = quotations.reduce((sum, q) => sum + (Number(q.totalAmount) || 0), 0);
    return { total, drafts, sent, approved, converted, totalValue };
  }, [quotations]);

  // Filtered List
  const filteredQuotations = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    return quotations.filter((item) => {
      const matchesSearch =
        !q ||
        item.quotationNumber?.toLowerCase().includes(q) ||
        item.customerName?.toLowerCase().includes(q) ||
        item.customerCompany?.toLowerCase().includes(q) ||
        item.requisitionRef?.toLowerCase().includes(q) ||
        item.bookNumber?.toLowerCase().includes(q) ||
        item.manualSerialNo?.toLowerCase().includes(q) ||
        item.customerPhone?.includes(q);

      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
      const src = item.entrySource || 'online';
      const matchesSource =
        sourceFilter === 'all' ||
        (sourceFilter === 'khata_offline' && (src === 'khata' || src === 'offline')) ||
        src === sourceFilter;
      return matchesSearch && matchesStatus && matchesSource;
    });
  }, [quotations, searchTerm, statusFilter, sourceFilter]);

  const handleDelete = (quote) => {
    confirmAction({
      title: `${l({ bn: 'কোটেশন মুছবেন', en: 'Delete Quotation', obro: 'Delete Quotation' })} "${quote.quotationNumber}"?`,
      message: l({
        bn: 'আপনি কি নিশ্চিত যে এই কোটেশনটি স্থায়ীভাবে মুছে ফেলতে চান?',
        en: 'Are you sure you want to permanently remove this quotation document?',
        obro: 'Ei quotation permanent bhabe delete korte chan?',
      }),
      confirmText: l({ bn: 'মুছে ফেলুন', en: 'Delete Quotation', obro: 'Delete Quotation' }),
      isDestructive: true,
      onConfirm: () => {
        deleteQuotation(quote.id);
      },
    });
  };

  const handleConvert = (quote) => {
    confirmAction({
      title: `${l({ bn: 'সেলস ইনভয়েসে রূপান্তর করবেন', en: 'Convert Quotation', obro: 'Convert Quotation' })} "${quote.quotationNumber}"?`,
      message: l({
        bn: `এটি ${quote.items?.length || 0}টি আইটেম নিয়ে পিওএস টার্মিনাল ওপেন করবে এবং ইনভেন্টরি স্টক সমন্বয় করবে।`,
        en: `This will auto-populate the POS billing terminal with ${quote.items?.length || 0} items for ${quote.customerName || 'the client'} and deduct inventory.`,
        obro: `POS billing terminal e ${quote.items?.length || 0}-ti item convert hobe.`,
      }),
      confirmText: l({ bn: 'রূপান্তর ও পিওএস ওপেন', en: 'Convert & Open POS', obro: 'Convert & Open POS' }),
      onConfirm: () => {
        navigate('/sales/new', { state: { fromQuotation: quote } });
      },
    });
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'converted':
        return (
          <Badge variant="emerald" size="sm">
            {l({ bn: 'ইনভয়েস সম্পন্ন', en: 'Converted to Sale', obro: 'ইনভয়েস সম্পন্ন (Converted)' })}
          </Badge>
        );
      case 'approved':
        return (
          <Badge variant="blue" size="sm">
            {l({ bn: 'অনুমোদিত', en: 'Approved', obro: 'অনুমোদিত (Approved)' })}
          </Badge>
        );
      case 'sent':
        return (
          <Badge variant="purple" size="sm">
            {l({ bn: 'প্রেরিত', en: 'Sent to Client', obro: 'প্রেরিত (Sent)' })}
          </Badge>
        );
      default:
        return (
          <Badge variant="slate" size="sm">
            {l({ bn: 'খসড়া', en: 'Draft', obro: 'খসড়া (Draft)' })}
          </Badge>
        );
    }
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case 'owner':
        return l({ bn: 'মালিক', en: 'Owner', obro: 'Owner' });
      case 'agent':
        return l({ bn: 'এজেন্ট', en: 'Agent', obro: 'Agent' });
      case 'purchaser':
        return l({ bn: 'ক্রয় কর্মকর্তা', en: 'Purchaser', obro: 'Purchaser' });
      case 'supplier_rep':
        return l({ bn: 'ভেন্ডর প্রতিনিধি', en: 'Supplier Rep', obro: 'Supplier Rep' });
      case 'wholesale':
        return l({ bn: 'পাইকারি ডিলার', en: 'Wholesale', obro: 'Wholesale' });
      default:
        return l({ bn: 'সাধারণ গ্রাহক', en: 'Direct Client', obro: 'Direct Client' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {l({
                bn: 'দরপত্র ও কোটেশন রেজিস্ট্রি',
                en: 'Quotation Registry',
                obro: 'Quotation Registry (দরপত্র ও কোটেশন)',
              })}
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {l({
              bn: 'অফিশিয়াল প্যাডে দরপত্র তৈরি, ট্র্যাক ও প্রিন্ট করুন এবং ক্লায়েন্ট আরএফকিউ সরাসরি সেলস ইনভয়েসে রূপান্তর করুন।',
              en: 'Create, track, print official company pad quotations, and convert client RFQs directly to sales invoices.',
              obro: 'Create, track, print official pad quotations, and convert client RFQs to sales invoices.',
            })}
          </p>
        </div>

        <Link to="/quotations/new">
          <Button variant="primary" size="sm" icon={Plus}>
            {l({
              bn: 'নতুন কোটেশন তৈরি',
              en: 'New Quotation',
              obro: 'New Quotation (নতুন দরপত্র)',
            })}
          </Button>
        </Link>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-4 bg-gradient-to-br from-purple-500/5 to-slate-500/5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {l({ bn: 'মোট কোটেশন', en: 'Total Quotations', obro: 'Total Quotations' })}
            </span>
            <FileText className="h-4 w-4 text-purple-500" />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {stats.total}
          </p>
          <span className="text-[11px] text-slate-500">
            {stats.converted} {l({ bn: 'টি বিক্রয়ে রূপান্তরিত', en: 'converted to POS sales', obro: 'converted to sales' })}
          </span>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-blue-500/5 to-slate-500/5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {l({ bn: 'সক্রিয় / অনুমোদিত', en: 'Active / Approved', obro: 'Active / Approved' })}
            </span>
            <CheckCircle2 className="h-4 w-4 text-blue-500" />
          </div>
          <p className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">
            {stats.sent + stats.approved}
          </p>
          <span className="text-[11px] text-slate-500">
            {l({ bn: 'কার্যাদেশের অপেক্ষায়', en: 'Awaiting client purchase order', obro: 'Awaiting PO' })}
          </span>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-emerald-500/5 to-slate-500/5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {l({ bn: 'সম্পন্ন বিক্রয়', en: 'Converted Sales', obro: 'Converted Sales' })}
            </span>
            <ArrowRightLeft className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {stats.converted}
          </p>
          <span className="text-[11px] text-slate-500">
            {l({ bn: 'চূড়ান্ত চালানে রূপান্তরিত', en: 'Converted to final invoices', obro: 'Final invoices' })}
          </span>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-amber-500/5 to-slate-500/5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {l({ bn: 'মোট প্রস্তাবিত মূল্য', en: 'Total Quoted Value', obro: 'Total Quoted Value' })}
            </span>
            <span className="text-xs font-mono font-bold text-amber-500">BDT</span>
          </div>
          <p className="text-xl sm:text-2xl font-black font-mono text-slate-900 dark:text-white mt-1 truncate">
            {formatCurrency(stats.totalValue, settings.currency)}
          </p>
          <span className="text-[11px] text-slate-500">
            {l({ bn: 'সর্বমোট দরপত্রের মূল্য', en: 'Cumulative quotes value', obro: 'Cumulative value' })}
          </span>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder={l({
                bn: 'কোটেশন নম্বর, ক্লায়েন্টের নাম, প্রতিষ্ঠান, সূত্র বা ফোন দিয়ে খুঁজুন...',
                en: 'Search by quote number, client name, company, requisition ref, phone...',
                obro: 'Quote #, client name, company, phone diye search korun...',
              })}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: 'all', label: l({ bn: 'সকল', en: 'All', obro: 'All (সকল)' }) },
              { id: 'draft', label: l({ bn: 'খসড়া', en: 'Draft', obro: 'Draft (খসড়া)' }) },
              { id: 'sent', label: l({ bn: 'প্রেরিত', en: 'Sent', obro: 'Sent (প্রেরিত)' }) },
              { id: 'approved', label: l({ bn: 'অনুমোদিত', en: 'Approved', obro: 'Approved (অনুমোদিত)' }) },
              { id: 'converted', label: l({ bn: 'ইনভয়েস সম্পন্ন', en: 'Converted', obro: 'Converted (ইনভয়েস)' }) },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  statusFilter === tab.id
                    ? 'bg-purple-600 text-white font-semibold shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-700 dark:text-slate-300"
          >
            <option value="all">{l({ bn: 'সব উৎস (অনলাইন + খাতা)', en: 'All Sources' })}</option>
            <option value="khata_offline">{l({ bn: 'খাতা ও অফলাইন', en: 'Khata & Offline' })}</option>
            <option value="khata">{l({ bn: 'শুধু পুরনো খাতা', en: 'Khata Only' })}</option>
            <option value="offline">{l({ bn: 'শুধু অফলাইন', en: 'Offline Only' })}</option>
            <option value="online">{l({ bn: 'শুধু অনলাইন', en: 'Online Only' })}</option>
          </select>
        </div>
      </Card>

      {/* Quotations Table */}
      <Card className="overflow-hidden">
        {filteredQuotations.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title={l({ bn: 'কোনো কোটেশন পাওয়া যায়নি', en: 'No quotations found', obro: 'Kono quotation pawa jayni' })}
              description={l({
                bn: 'নির্বাচিত ফিল্টারের সাথে কোনো কোটেশন মিলছে না। ক্লায়েন্ট রিক্যুইজিশন থেকে নতুন কোটেশন তৈরি করুন।',
                en: 'No quotation records match the selected filter. Create a quotation from a client RFQ or WhatsApp request.',
                obro: 'No quotation records match filter. Notun quotation toiri korun.',
              })}
              actionText={l({ bn: 'নতুন কোটেশন তৈরি করুন', en: 'Create New Quotation', obro: 'Create New Quotation' })}
              onAction={() => navigate('/quotations/new')}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">{l({ bn: 'কোটেশন নং', en: 'Quotation #', obro: 'Quotation #' })}</th>
                  <th className="py-3 px-3">{l({ bn: 'তারিখ ও মেয়াদ', en: 'Date & Validity', obro: 'Date & Validity' })}</th>
                  <th className="py-3 px-4">{l({ bn: 'ক্লায়েন্ট ও প্রতিষ্ঠান', en: 'Client / Company Profile', obro: 'Client / Company Profile' })}</th>
                  <th className="py-3 px-3">{l({ bn: 'সূত্র', en: 'Requisition Ref', obro: 'Requisition Ref (সূত্র)' })}</th>
                  <th className="py-3 px-3 text-center">{l({ bn: 'আইটেম', en: 'Items', obro: 'Items' })}</th>
                  <th className="py-3 px-4 text-right">{l({ bn: 'প্রস্তাবিত মূল্য', en: 'Quoted Amount', obro: 'Quoted Amount' })}</th>
                  <th className="py-3 px-3 text-center">{l({ bn: 'স্ট্যাটাস', en: 'Status', obro: 'Status' })}</th>
                  <th className="py-3 px-4 text-right">{l({ bn: 'পদক্ষেপ', en: 'Actions', obro: 'Actions' })}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredQuotations.map((quote) => (
                  <tr
                    key={quote.id}
                    id={`quotation-item-${quote.id}`}
                    data-item-id={quote.id}
                    data-scroll-anchor={quote.id}
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    {/* Quotation Number */}
                    <td className="py-3 px-4">
                      <Link
                        to={`/quotations/${quote.id}`}
                        className="font-mono font-bold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1.5"
                      >
                        <FileText className="h-3.5 w-3.5 shrink-0" />
                        <span>{quote.quotationNumber}</span>
                      </Link>
                      {(quote.entrySource === 'khata' || quote.entrySource === 'offline' || quote.bookNumber || quote.manualSerialNo) && (
                        <div className="flex flex-wrap items-center gap-1 mt-1">
                          {quote.entrySource === 'khata' && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800">
                              খাতা
                            </span>
                          )}
                          {quote.entrySource === 'offline' && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
                              অফলাইন
                            </span>
                          )}
                          {(quote.bookNumber || quote.manualSerialNo) && (
                            <span className="text-[10px] font-mono text-slate-500">
                              {quote.bookNumber ? `B:${quote.bookNumber}` : ''}
                              {quote.bookNumber && quote.manualSerialNo ? '/' : ''}
                              {quote.manualSerialNo ? `#${quote.manualSerialNo}` : ''}
                            </span>
                          )}
                        </div>
                      )}
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        {l({ bn: 'তৈরি করেছেন: ', en: 'By: ', obro: 'By: ' })} {quote.preparedBy || 'Sales Exec'}
                      </span>
                    </td>

                    {/* Date & Validity */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <div className="text-slate-800 dark:text-slate-200 font-medium">
                        {formatDate(quote.date || quote.createdAt)}
                      </div>
                      {quote.validUntil && (
                        <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Clock className="h-3 w-3 shrink-0" />
                          <span>
                            {l({ bn: 'মেয়াদ: ', en: 'Valid till: ', obro: 'Valid till: ' })}
                            {formatDate(quote.validUntil)}
                          </span>
                        </div>
                      )}
                    </td>

                    {/* Customer & Company Details */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        <span data-transliterate={quote.customerName ? 'true' : undefined}>
                          {quote.customerName ||
                            l({ bn: 'সাধারণ ক্লায়েন্ট', en: 'Direct Client', obro: 'Direct Client' })}
                        </span>
                        <span className="text-[10px] font-normal px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {getRoleLabel(quote.customerRole)}
                        </span>
                      </div>
                      {quote.customerCompany ? (
                        <div className="text-xs text-purple-600 dark:text-purple-400 flex items-center gap-1 mt-0.5 font-medium">
                          <Building2 className="h-3 w-3 shrink-0" />
                          <span data-transliterate="true">{quote.customerCompany}</span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400">
                          {l({ bn: 'সরাসরি ক্লায়েন্ট', en: 'Direct client', obro: 'Direct client' })}
                        </span>
                      )}
                      {quote.customerPhone && (
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          {quote.customerPhone}
                        </span>
                      )}
                    </td>

                    {/* Requisition Reference */}
                    <td className="py-3 px-3">
                      {quote.requisitionRef ? (
                        <span className="inline-block px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-mono text-[11px] font-semibold">
                          {quote.requisitionRef}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">
                          {l({ bn: 'সরাসরি অনুসন্ধান', en: 'Direct inquiry', obro: 'Direct inquiry' })}
                        </span>
                      )}
                    </td>

                    {/* Items Count */}
                    <td className="py-3 px-3 text-center">
                      <span className="inline-block px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 font-mono font-bold text-slate-700 dark:text-slate-300">
                        {quote.items?.length || 0}
                      </span>
                    </td>

                    {/* Quoted Amount */}
                    <td className="py-3 px-4 text-right">
                      <span className="font-mono font-extrabold text-sm text-slate-900 dark:text-slate-100">
                        {formatCurrency(quote.totalAmount, settings.currency)}
                      </span>
                    </td>

                    {/* Status Badge */}
                    <td className="py-3 px-3 text-center">
                      {getStatusBadge(quote.status)}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* View Details */}
                        <Link
                          to={`/quotations/${quote.id}`}
                          title={l({ bn: 'কোটেশন বিস্তারিত দেখুন', en: 'View Quotation', obro: 'View Quotation' })}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/40 transition-colors"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>

                        {/* Print on Official Pad */}
                        <button
                          type="button"
                          onClick={() => setActivePrintQuotation(quote)}
                          title={l({
                            bn: 'অফিসিয়াল প্যাডে প্রিন্ট করুন',
                            en: 'Print Quotation Pad',
                            obro: 'Print Quotation Pad (প্যাডে প্রিন্ট)',
                          })}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
                        >
                          <Printer className="h-4 w-4" />
                        </button>

                        {/* Convert to Sale */}
                        {quote.status !== 'converted' ? (
                          <button
                            type="button"
                            onClick={() => handleConvert(quote)}
                            title={l({
                              bn: 'সেলস ইনভয়েস তৈরি করুন',
                              en: 'Convert to Sales Invoice',
                              obro: 'Convert to Sales Invoice (ইনভয়েস করুন)',
                            })}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
                          >
                            <ArrowRightLeft className="h-4 w-4" />
                          </button>
                        ) : (
                          <Link
                            to={`/sales/${quote.convertedSaleId || ''}`}
                            title={l({
                              bn: 'রূপান্তরিত সেলস ইনভয়েস দেখুন',
                              en: 'View Converted Sale Invoice',
                              obro: 'View Converted Sale Invoice',
                            })}
                            className="p-1.5 rounded-lg text-emerald-500 hover:text-emerald-700 transition-colors"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </Link>
                        )}

                        {/* Delete */}
                        <button
                          type="button"
                          onClick={() => handleDelete(quote)}
                          title={l({ bn: 'কোটেশন মুছুন', en: 'Delete Quotation', obro: 'Delete Quotation' })}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Printable Receipt Modal configured for Quotations */}
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
