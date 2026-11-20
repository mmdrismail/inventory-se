import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppData } from '../../context/AppDataContext';
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
  UserCheck,
  FileText,
  CheckCircle2,
  Clock,
  Send,
  AlertCircle,
  Filter,
} from 'lucide-react';

export const QuotationListPage = () => {
  const navigate = useNavigate();
  const { quotations, deleteQuotation, convertQuotationToSale, confirmAction, settings } = useAppData();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [activePrintQuotation, setActivePrintQuotation] = useState(null);

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
        item.customerPhone?.includes(q);

      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [quotations, searchTerm, statusFilter]);

  const handleDelete = (quote) => {
    confirmAction({
      title: `Delete Quotation "${quote.quotationNumber}"?`,
      message: 'Are you sure you want to permanently remove this quotation document?',
      confirmText: 'Delete Quotation',
      isDestructive: true,
      onConfirm: () => {
        deleteQuotation(quote.id);
      },
    });
  };

  const handleConvert = (quote) => {
    confirmAction({
      title: `Convert Quotation "${quote.quotationNumber}" to POS Sale?`,
      message: `This will auto-populate the POS billing terminal with ${quote.items?.length || 0} items for ${quote.customerName || 'the customer'} and deduct inventory.`,
      confirmText: 'Convert & Open POS',
      onConfirm: () => {
        navigate('/sales/new', { state: { fromQuotation: quote } });
      },
    });
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'converted':
        return <Badge variant="emerald" size="sm">ইনভয়েস সম্পন্ন (Converted)</Badge>;
      case 'approved':
        return <Badge variant="blue" size="sm">অনুমোদিত (Approved)</Badge>;
      case 'sent':
        return <Badge variant="purple" size="sm">প্রেরিত (Sent)</Badge>;
      default:
        return <Badge variant="slate" size="sm">খসড়া (Draft)</Badge>;
    }
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case 'owner':
        return 'কোম্পানির মালিক';
      case 'agent':
        return 'কোম্পানির এজেন্ট';
      case 'purchaser':
        return 'ক্রয় কর্মকর্তা';
      case 'supplier_rep':
        return 'ভেন্ডর প্রতিনিধি';
      case 'wholesale':
        return 'পাইকারি ডিলার';
      default:
        return 'সাধারণ গ্রাহক';
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
              Quotation Registry (দরপত্র ও কোটেশন)
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Create, track, print official company pad quotations, and convert client RFQs directly to sales invoices.
          </p>
        </div>

        <Link to="/quotations/new">
          <Button variant="primary" size="sm" icon={Plus}>
            New Quotation (নতুন দরপত্র)
          </Button>
        </Link>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-4 bg-gradient-to-br from-purple-500/5 to-slate-500/5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Quotations</span>
            <FileText className="h-4 w-4 text-purple-500" />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {stats.total}
          </p>
          <span className="text-[11px] text-slate-500">
            {stats.converted} converted to POS sales
          </span>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-blue-500/5 to-slate-500/5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active / Approved</span>
            <CheckCircle2 className="h-4 w-4 text-blue-500" />
          </div>
          <p className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">
            {stats.sent + stats.approved}
          </p>
          <span className="text-[11px] text-slate-500">
            Awaiting client purchase order
          </span>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-emerald-500/5 to-slate-500/5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Converted Sales</span>
            <ArrowRightLeft className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {stats.converted}
          </p>
          <span className="text-[11px] text-slate-500">
            Converted to final invoices
          </span>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-amber-500/5 to-slate-500/5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Quoted Value</span>
            <span className="text-xs font-mono font-bold text-amber-500">BDT</span>
          </div>
          <p className="text-xl sm:text-2xl font-black font-mono text-slate-900 dark:text-white mt-1 truncate">
            {formatCurrency(stats.totalValue, settings.currency)}
          </p>
          <span className="text-[11px] text-slate-500">
            Cumulative quotes value
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
              placeholder="Search by quote number, client name, company, requisition ref, phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: 'all', label: 'All (সকল)' },
              { id: 'draft', label: 'Draft (খসড়া)' },
              { id: 'sent', label: 'Sent (প্রেরিত)' },
              { id: 'approved', label: 'Approved (অনুমোদিত)' },
              { id: 'converted', label: 'Converted (ইনভয়েস)' },
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
        </div>
      </Card>

      {/* Quotations Table */}
      <Card className="overflow-hidden">
        {filteredQuotations.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="No quotations found"
              description="No quotation records match the selected filter. Create a quotation from a client RFQ or WhatsApp request."
              actionText="Create New Quotation"
              onAction={() => navigate('/quotations/new')}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Quotation #</th>
                  <th className="py-3 px-3">Date & Validity</th>
                  <th className="py-3 px-4">Client / Company Profile</th>
                  <th className="py-3 px-3">Requisition Ref (সূত্র)</th>
                  <th className="py-3 px-3 text-center">Items</th>
                  <th className="py-3 px-4 text-right">Quoted Amount</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredQuotations.map((quote) => (
                  <tr
                    key={quote.id}
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
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        By: {quote.preparedBy || 'Sales Exec'}
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
                          <span>Valid till: {formatDate(quote.validUntil)}</span>
                        </div>
                      )}
                    </td>

                    {/* Customer & Company Details */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        <span>{quote.customerName || 'General Client'}</span>
                        <span className="text-[10px] font-normal px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {getRoleLabel(quote.customerRole)}
                        </span>
                      </div>
                      {quote.customerCompany ? (
                        <div className="text-xs text-purple-600 dark:text-purple-400 flex items-center gap-1 mt-0.5 font-medium">
                          <Building2 className="h-3 w-3 shrink-0" />
                          <span>{quote.customerCompany}</span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400">Direct client</span>
                      )}
                      {quote.customerPhone && (
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          Phone: {quote.customerPhone}
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
                        <span className="text-slate-400 italic text-[11px]">Direct inquiry</span>
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
                          title="View Quotation"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/40 transition-colors"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>

                        {/* Print on Shanta Refrigeration Official Pad */}
                        <button
                          type="button"
                          onClick={() => setActivePrintQuotation(quote)}
                          title="Print Quotation Pad (অফিসিয়াল প্যাডে প্রিন্ট)"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
                        >
                          <Printer className="h-4 w-4" />
                        </button>

                        {/* Convert to Sale */}
                        {quote.status !== 'converted' ? (
                          <button
                            type="button"
                            onClick={() => handleConvert(quote)}
                            title="Convert to Sales Invoice (সেলস ইনভয়েস তৈরি করুন)"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
                          >
                            <ArrowRightLeft className="h-4 w-4" />
                          </button>
                        ) : (
                          <Link
                            to={`/sales/${quote.convertedSaleId || ''}`}
                            title="View Converted Sale Invoice"
                            className="p-1.5 rounded-lg text-emerald-500 hover:text-emerald-700 transition-colors"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </Link>
                        )}

                        {/* Delete */}
                        <button
                          type="button"
                          onClick={() => handleDelete(quote)}
                          title="Delete Quotation"
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
