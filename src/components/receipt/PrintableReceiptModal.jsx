import React from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Printer, CheckCircle2, Download } from 'lucide-react';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { useAppData } from '../../context/AppDataContext';

export const PrintableReceiptModal = ({ isOpen, onClose, sale }) => {
  const { settings } = useAppData();

  if (!sale) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Sales Receipt / Invoice"
      maxWidth="max-w-xl"
    >
      <div className="space-y-6">
        {/* Printable Container */}
        <div
          id="printable-receipt"
          className="p-6 bg-white text-slate-900 rounded-xl border border-slate-200 shadow-sm print:border-none print:shadow-none"
        >
          {/* Header */}
          <div className="flex items-start justify-between border-b border-slate-200 pb-4 mb-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                {settings.businessName || 'StockLine Technologies Ltd.'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">{settings.address}</p>
              <p className="text-xs text-slate-500">
                Phone: {settings.businessPhone} · Email: {settings.businessEmail}
              </p>
            </div>
            <div className="text-right">
              <span className="inline-block px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800">
                {sale.paymentStatus === 'paid' ? 'PAID INVOICE' : sale.paymentStatus?.toUpperCase()}
              </span>
              <p className="text-xs font-mono font-semibold text-slate-700 mt-1">
                {sale.invoiceNo}
              </p>
            </div>
          </div>

          {/* Invoice Meta */}
          <div className="grid grid-cols-2 gap-4 text-xs mb-6">
            <div>
              <span className="font-semibold text-slate-500 block uppercase tracking-wider text-[10px]">
                Billed To:
              </span>
              <p className="font-bold text-slate-800 mt-0.5">
                {sale.customerName || 'Walk-in Retail Customer'}
              </p>
              {sale.customerPhone && <p className="text-slate-500">{sale.customerPhone}</p>}
            </div>
            <div className="text-right">
              <span className="font-semibold text-slate-500 block uppercase tracking-wider text-[10px]">
                Date & Time:
              </span>
              <p className="text-slate-700 mt-0.5">{formatDateTime(sale.date)}</p>
              <p className="text-slate-500 text-[11px] mt-0.5">
                Status: <span className="capitalize font-semibold">{sale.status}</span>
              </p>
            </div>
          </div>

          {/* Itemized Table */}
          <table className="w-full text-left text-xs mb-6">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 uppercase text-[10px] tracking-wider">
                <th className="py-2">Item Description</th>
                <th className="py-2 text-center">Qty</th>
                <th className="py-2 text-right">Unit Price</th>
                <th className="py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(sale.items || []).map((item, idx) => (
                <tr key={idx}>
                  <td className="py-2.5 font-medium text-slate-800">
                    {item.productName || item.productId}
                  </td>
                  <td className="py-2.5 text-center text-slate-600 font-mono">{item.quantity}</td>
                  <td className="py-2.5 text-right text-slate-600 font-mono">
                    {formatCurrency(item.unitPrice, settings.currency)}
                  </td>
                  <td className="py-2.5 text-right font-semibold text-slate-800 font-mono">
                    {formatCurrency(item.quantity * item.unitPrice, settings.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals Breakdown */}
          <div className="border-t border-slate-200 pt-3 space-y-1 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal:</span>
              <span className="font-mono">{formatCurrency(sale.subtotal, settings.currency)}</span>
            </div>
            {Number(sale.discount) > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>Discount Applied:</span>
                <span className="font-mono">-{formatCurrency(sale.discount, settings.currency)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold text-slate-900 border-t border-slate-200 pt-2 mt-2">
              <span>Grand Total:</span>
              <span className="font-mono text-emerald-600">
                {formatCurrency(sale.total, settings.currency)}
              </span>
            </div>
          </div>

          {/* Footer note */}
          <div className="mt-8 pt-4 border-t border-dashed border-slate-200 text-center text-[11px] text-slate-400">
            <p>Thank you for doing business with StockLine!</p>
            <p className="mt-0.5">Please retain this receipt for warranty and returns within 7 business days.</p>
          </div>
        </div>

        {/* Action Buttons (Hidden on Print) */}
        <div className="flex items-center justify-between no-print pt-2">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button variant="primary" icon={Printer} onClick={handlePrint}>
            Print Receipt
          </Button>
        </div>
      </div>
    </Modal>
  );
};
