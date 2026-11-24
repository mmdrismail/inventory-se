import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAppData } from '../../context/AppDataContext';
import { useLanguage } from '../../context/LanguageContext';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { BackLink } from '../../components/common/BackLink';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { ArrowLeft, ShoppingCart, CheckCircle2, XCircle, Clock, Truck, Barcode, Printer } from 'lucide-react';
import { LotBarcodePrintModal } from '../../components/products/LotBarcodePrintModal';

export const PurchaseDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { purchases, suppliers, products, receivePurchase, cancelPurchase, confirmAction, settings } = useAppData();
  const { t } = useLanguage();
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  const purchase = purchases.find((p) => p.id === id);
  const supplier = suppliers.find((s) => s.id === purchase?.supplierId);

  // Prepare lot-compatible items for thermal sticker printing
  const lotForPrint = React.useMemo(() => {
    if (!purchase) return null;
    const printItems = (purchase.items || []).map((line, idx) => {
      const prod = products?.find((p) => p.id === line.productId || p.name === line.productName);
      const loc = prod?.warehouseLocation || {};
      const locCode = loc.code || (loc.rack ? `${loc.zone || 'A'}-${loc.rack}` : 'A-01-01-1-A');
      const cost = Number(line.unitCost) || Number(prod?.costPrice) || 0;
      const staff = Number(prod?.staffPrice) || Math.round(cost * 1.3);
      const mgr = Number(prod?.managerPrice) || Math.round(cost * 1.5);
      const cust = Number(prod?.sellingPrice) || Math.round(cost * 1.8);
      return {
        partName: line.productName || prod?.name || `Item #${idx + 1}`,
        brand: prod?.brand || 'Industrial',
        modelNumber: prod?.modelNumber || '',
        condition: prod?.condition || 'new',
        quantity: Number(line.quantity) || 1,
        unit: prod?.unit || 'pc',
        allocatedCost: cost,
        staffPrice: staff,
        managerPrice: mgr,
        targetSellingPrice: cust,
        customerPrice: cust,
        warehouseLocation: {
          code: locCode,
        },
      };
    });

    return {
      id: purchase.id,
      lotNumber: purchase.referenceNo || 'PO-2026',
      lotName: `Purchase Order #${purchase.referenceNo}`,
      sourceShip: supplier?.name || 'Direct Supplier',
      items: printItems,
    };
  }, [purchase, supplier, products]);

  if (!purchase) {
    return (
      <div className="py-12 text-center space-y-4">
        <h2 className="text-xl font-bold">Purchase Order Not Found</h2>
        <Link to="/purchases">
          <Button variant="primary">Return to Purchases</Button>
        </Link>
      </div>
    );
  }

  const handleReceive = () => {
    confirmAction({
      title: `Receive Purchase Order ${purchase.referenceNo}?`,
      message: 'This will immediately increase available quantities in catalog and record inventory movements.',
      confirmText: 'Confirm Stock Intake',
      onConfirm: () => {
        receivePurchase(purchase.id, 'Purchasing Staff');
      },
    });
  };

  const handleCancel = () => {
    confirmAction({
      title: `Cancel Purchase Order ${purchase.referenceNo}?`,
      message: purchase.status === 'received'
        ? 'Warning: This purchase has already been received. Cancelling it will safely subtract the received quantities from stock.'
        : 'Are you sure you want to cancel this draft purchase order?',
      confirmText: 'Confirm Cancellation',
      isDestructive: true,
      onConfirm: () => {
        cancelPurchase(purchase.id, 'Admin');
      },
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <BackLink to="/purchases">
          Back to Purchase List
        </BackLink>

        <div className="flex items-center gap-2">
          {/* Print Barcode Stickers Button */}
          <Button
            variant="outline"
            size="sm"
            icon={Barcode}
            onClick={() => setIsPrintModalOpen(true)}
            className="text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
          >
            {t('action_print_barcodes', 'বারকোড স্টিকার প্রিন্ট')}
          </Button>

          {purchase.status === 'draft' && (
            <Button variant="primary" size="sm" icon={CheckCircle2} onClick={handleReceive}>
              {t('receive_order_now', 'Receive Order Now')}
            </Button>
          )}
          {purchase.status !== 'cancelled' && (
            <Button variant="outline" size="sm" icon={XCircle} onClick={handleCancel}>
              {t('cancel_order', 'Cancel Order')}
            </Button>
          )}
        </div>
      </div>

      <Card className="p-6">
        <div className="flex flex-col sm:flex-row items-start justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white font-mono">
                {purchase.referenceNo}
              </h1>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  purchase.status === 'received'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                    : purchase.status === 'cancelled'
                    ? 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                }`}
              >
                {purchase.status === 'received' && <CheckCircle2 className="h-3 w-3" />}
                {purchase.status === 'draft' && <Clock className="h-3 w-3" />}
                {purchase.status === 'cancelled' && <XCircle className="h-3 w-3" />}
                <span>{purchase.status}</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Issued on {formatDateTime(purchase.date)}
            </p>
          </div>

          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Spend</span>
            <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
              {formatCurrency(purchase.total, settings.currency)}
            </div>
            <span
              className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase mt-1 ${
                purchase.paymentStatus === 'paid'
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                  : 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300'
              }`}
            >
              {purchase.paymentStatus}
            </span>
          </div>
        </div>

        {/* Supplier details block */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4 text-xs">
          <div>
            <span className="text-slate-400 font-semibold block uppercase text-[10px] mb-1">
              Supplier / Vendor
            </span>
            <Link
              to={`/suppliers/${purchase.supplierId}`}
              className="text-sm font-bold text-slate-800 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400"
            >
              {supplier?.name || 'Direct Supplier'}
            </Link>
            <p className="text-slate-500 mt-0.5">{supplier?.companyName}</p>
            <p className="text-slate-400 mt-0.5">{supplier?.phone || supplier?.email}</p>
          </div>
          <div>
            <span className="text-slate-400 font-semibold block uppercase text-[10px] mb-1">
              Notes & Reference
            </span>
            <p className="text-slate-700 dark:text-slate-300">
              {purchase.notes || 'No notes specified.'}
            </p>
            {purchase.receivedAt && (
              <p className="text-emerald-600 dark:text-emerald-400 mt-1 text-[11px]">
                Intake verified & received on {formatDateTime(purchase.receivedAt)}
              </p>
            )}
          </div>
        </div>

        {/* Items Table */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
            Itemized Order Breakdown
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-y border-slate-200 dark:border-slate-800 text-slate-500 uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-4">Product Name</th>
                  <th className="py-2.5 px-3 text-center">Quantity</th>
                  <th className="py-2.5 px-3 text-right">Unit Cost</th>
                  <th className="py-2.5 px-4 text-right">Line Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {(purchase.items || []).map((item, i) => (
                  <tr key={i}>
                    <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">
                      {item.productName || item.productId}
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-bold text-slate-700 dark:text-slate-300">
                      {item.quantity}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-600 dark:text-slate-400">
                      {formatCurrency(item.unitCost, settings.currency)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                      {formatCurrency(item.total, settings.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totals Summary */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col items-end gap-1 text-xs">
          <div className="flex justify-between w-64 text-slate-500">
            <span>{t('col_subtotal', 'Subtotal')}:</span>
            <span className="font-mono">{formatCurrency(purchase.subtotal, settings.currency)}</span>
          </div>
          <div className="flex justify-between w-64 text-base font-bold text-slate-900 dark:text-white pt-2 border-t border-slate-100 dark:border-slate-800">
            <span>{t('col_grand_total', 'Grand Total')}:</span>
            <span className="font-mono text-emerald-600 dark:text-emerald-400">
              {formatCurrency(purchase.total, settings.currency)}
            </span>
          </div>
        </div>
      </Card>

      {/* Thermal Barcode Sticker Print Modal */}
      {isPrintModalOpen && lotForPrint && (
        <LotBarcodePrintModal
          isOpen={isPrintModalOpen}
          onClose={() => setIsPrintModalOpen(false)}
          lot={lotForPrint}
        />
      )}
    </div>
  );
};
