import React, { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAppData } from '../../context/AppDataContext';
import { useLanguage } from '../../context/LanguageContext';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input, Select, Textarea } from '../../components/forms/FormControls';
import { formatCurrency } from '../../utils/formatters';
import { ArrowLeft, Plus, Trash2, CheckCircle2, Clock, Barcode, Eye, Printer, Check } from 'lucide-react';
import { QuickAddSupplierModal } from '../../components/suppliers/QuickAddSupplierModal';
import { LotBarcodePrintModal } from '../../components/products/LotBarcodePrintModal';
import { playBarcodeBeep, playErrorTone, playSuccessChime } from '../../utils/soundEffects';

export const PurchaseFormPage = () => {
  const { suppliers, products, createPurchase, settings } = useAppData();
  const { t, language } = useLanguage();
  const navigate = useNavigate();

  const uniqueSuppliers = useMemo(() => {
    const seen = new Set();
    return (suppliers || []).filter((s) => {
      const key = (s.name || '').trim().toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [suppliers]);

  const [supplierId, setSupplierId] = useState(suppliers[0]?.id || '');
  const [isAddSupplierOpen, setIsAddSupplierOpen] = useState(false);
  const [referenceNo, setReferenceNo] = useState(`PO-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentStatus, setPaymentStatus] = useState('paid');
  const [notes, setNotes] = useState('');

  // Barcode scanner & print modal state
  const [barcodeInput, setBarcodeInput] = useState('');
  const [scanSuccessMessage, setScanSuccessMessage] = useState('');
  const [openLabelPrintAfterSave, setOpenLabelPrintAfterSave] = useState(true);
  const [selectedPurchaseForPrint, setSelectedPurchaseForPrint] = useState(null);

  // Multi-item lines
  const [items, setItems] = useState([
    {
      productId: products[0]?.id || '',
      quantity: 10,
      unitCost: products[0]?.costPrice || 0,
    },
  ]);

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Line item modifiers
  const handleAddItem = () => {
    const firstProd = products[0];
    setItems((prev) => [
      ...prev,
      {
        productId: firstProd?.id || '',
        quantity: 5,
        unitCost: firstProd?.costPrice || 0,
      },
    ]);
  };

  const handleBarcodeSearchAndAdd = (code) => {
    const trimmed = (code || '').trim().toLowerCase();
    if (!trimmed) return;

    // Search by barcode, SKU, IMPA code, or product name
    const matched = products.find(
      (p) =>
        p.barcode?.toLowerCase() === trimmed ||
        p.sku?.toLowerCase() === trimmed ||
        p.impaCode?.toLowerCase() === trimmed ||
        p.name?.toLowerCase().includes(trimmed)
    );

    if (matched) {
      playBarcodeBeep();
      const existingIdx = items.findIndex((it) => it.productId === matched.id);
      if (existingIdx !== -1) {
        setItems((prev) => {
          const copy = [...prev];
          copy[existingIdx] = {
            ...copy[existingIdx],
            quantity: Number(copy[existingIdx].quantity || 0) + 1,
          };
          return copy;
        });
      } else {
        setItems((prev) => [
          ...prev,
          {
            productId: matched.id,
            quantity: 1,
            unitCost: matched.costPrice || 0,
          },
        ]);
      }
      setScanSuccessMessage(`✓ ${matched.name} (${matched.sku}) যোগ করা হয়েছে!`);
      setTimeout(() => setScanSuccessMessage(''), 3500);
      setBarcodeInput('');
    } else {
      playErrorTone();
      alert(`বারকোড বা SKU "${code}" দিয়ে কোনো প্রোডাক্ট পাওয়া যায়নি।`);
    }
  };

  const handleBarcodeKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleBarcodeSearchAndAdd(barcodeInput);
    }
  };

  const handleOpenPurchaseLabelPreview = () => {
    const printItems = items.map((line, idx) => {
      const prod = products.find((p) => p.id === line.productId);
      const loc = prod?.warehouseLocation || {};
      const locCode = loc.code || (loc.rack ? `${loc.zone || 'A'}-${loc.rack}` : 'A-01-01-1-A');
      const cost = Number(line.unitCost) || Number(prod?.costPrice) || 0;
      const staff = Number(prod?.staffPrice) || Math.round(cost * 1.3);
      const mgr = Number(prod?.managerPrice) || Math.round(cost * 1.5);
      const cust = Number(prod?.sellingPrice) || Math.round(cost * 1.8);
      return {
        partName: prod?.name || `Item #${idx + 1}`,
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

    const lotForPrint = {
      id: 'po_preview_temp',
      lotNumber: referenceNo || 'PO-2026',
      lotName: `Purchase Order #${referenceNo}`,
      sourceShip: uniqueSuppliers.find((s) => s.id === supplierId)?.name || 'Direct Supplier',
      items: printItems,
    };

    setSelectedPurchaseForPrint(lotForPrint);
  };

  const handleRemoveItem = (index) => {
    if (items.length <= 1) {
      alert('A purchase order must contain at least one item line.');
      return;
    }
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index, field, value) => {
    setItems((prev) => {
      const updated = [...prev];
      const item = { ...updated[index], [field]: value };

      // If product changed, update default unit cost
      if (field === 'productId') {
        const prod = products.find((p) => p.id === value);
        if (prod) {
          item.unitCost = prod.costPrice;
        }
      }

      updated[index] = item;
      return updated;
    });
  };

  // Calculations
  const calculatedItems = items.map((item) => {
    const prod = products.find((p) => p.id === item.productId);
    const qty = Number(item.quantity) || 0;
    const cost = Number(item.unitCost) || 0;
    return {
      productId: item.productId,
      productName: prod?.name || 'Item',
      sku: prod?.sku || '',
      quantity: qty,
      unitCost: cost,
      total: qty * cost,
    };
  });

  const subtotal = calculatedItems.reduce((sum, item) => sum + item.total, 0);
  const total = subtotal;

  const validate = () => {
    const errs = {};
    if (!supplierId) errs.supplierId = 'Please select a supplier.';
    if (!referenceNo.trim()) errs.referenceNo = 'Reference PO number is required.';
    if (items.length === 0) errs.items = 'Please add at least one product.';

    for (let i = 0; i < items.length; i++) {
      if (!items[i].productId) {
        errs.items = `Line ${i + 1}: Please select a product.`;
        break;
      }
      if (Number(items[i].quantity) <= 0) {
        errs.items = `Line ${i + 1}: Quantity must be greater than zero.`;
        break;
      }
      if (Number(items[i].unitCost) < 0) {
        errs.items = `Line ${i + 1}: Unit cost cannot be negative.`;
        break;
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (statusToSave) => {
    if (!validate()) return;

    setIsSubmitting(true);

    const payload = {
      supplierId,
      referenceNo,
      date: new Date(date).toISOString(),
      status: statusToSave, // 'draft' or 'received'
      paymentStatus,
      notes,
      items: calculatedItems,
      subtotal,
      total,
    };

    setTimeout(() => {
      const res = createPurchase(payload, 'Purchasing Staff');
      setIsSubmitting(false);

      if (res.success) {
        playSuccessChime();
        if (statusToSave === 'received' && openLabelPrintAfterSave) {
          handleOpenPurchaseLabelPreview();
        } else {
          navigate('/purchases');
        }
      } else {
        playErrorTone();
        setErrors({ form: res.message });
      }
    }, 250);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top back */}
      <div className="flex items-center justify-between">
        <Link
          to="/purchases"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>{t('back_to_purchases', 'Back to Purchases')}</span>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('create_purchase_title', 'Create Purchase Order (Procurement Intake)')}</CardTitle>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t('create_purchase_subtitle', 'Issue a supplier purchase order. Saving as "Received" immediately adds inventory and creates audit movements.')}
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {errors.form && (
            <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-600 dark:text-red-400 font-semibold">
              {errors.form}
            </div>
          )}

          {/* Supplier & Header Details */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {t('supplier_label', 'Supplier / Vendor')} <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setIsAddSupplierOpen(true)}
                  className="inline-flex items-center gap-0.5 text-[11px] font-bold text-emerald-600 hover:text-emerald-700 hover:underline"
                >
                  <Plus className="h-3 w-3" />
                  <span>{t('new_supplier_btn', 'New Supplier')}</span>
                </button>
              </div>
              <div className="flex items-center gap-1.5">
                <select
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="">{t('all_suppliers', 'Select Supplier')}</option>
                  {uniqueSuppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.companyName && s.companyName !== s.name ? `(${s.companyName})` : ''}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setIsAddSupplierOpen(true)}
                  className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shrink-0 shadow-xs transition-colors"
                  title={t('new_supplier_btn', 'Add new supplier / vendor')}
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              {errors.supplierId && (
                <p className="text-[11px] text-red-500 mt-1 font-semibold">{errors.supplierId}</p>
              )}
            </div>

            <Input
              label={t('po_reference_label', 'PO Reference Number')}
              value={referenceNo}
              onChange={(e) => setReferenceNo(e.target.value)}
              error={errors.referenceNo}
              placeholder="e.g. PO-2026-001"
              required
            />

            <Input
              label={t('purchase_date_label', 'Purchase Date')}
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label={t('payment_status_label', 'Payment Status')}
              value={paymentStatus}
              onChange={(e) => setPaymentStatus(e.target.value)}
              options={[
                { value: 'paid', label: t('payment_paid', 'Paid in Full') },
                { value: 'pending', label: t('payment_pending', 'Payment Pending / Credit') },
              ]}
            />

            <Input
              label={t('invoice_notes_label', 'Reference / Invoice Note')}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Supplier challan #8491, truck consignment"
            />
          </div>

          {/* USB / Camera Barcode Scanner Input */}
          <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                <Barcode className="h-5 w-5" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                  {t('barcode_scanner_title', 'বারকোড ও পার্টস স্ক্যানার (Live Barcode Scan)')}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  {t('scan_barcode_input_placeholder', 'ইউএসবি স্ক্যানার দিয়ে স্ক্যান করুন অথবা SKU / বারকোড লিখে Enter চাপুন')}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-1 sm:max-w-md">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  onKeyDown={handleBarcodeKeyDown}
                  placeholder={t('scan_barcode_input_placeholder', 'বারকোড স্ক্যান করুন বা SKU টাইপ করুন...')}
                  className="w-full pl-3 pr-8 py-2 text-xs rounded-xl border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-900 font-mono font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
                {barcodeInput && (
                  <button
                    type="button"
                    onClick={() => setBarcodeInput('')}
                    className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                  >
                    ×
                  </button>
                )}
              </div>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => handleBarcodeSearchAndAdd(barcodeInput)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
              >
                {t('btn_scan_add', 'যোগ করুন')}
              </Button>
            </div>
          </div>

          {scanSuccessMessage && (
            <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 border border-emerald-300 dark:border-emerald-700 text-xs font-bold text-emerald-800 dark:text-emerald-200 animate-in fade-in duration-150 flex items-center gap-2">
              <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{scanSuccessMessage}</span>
            </div>
          )}

          {/* Itemized lines */}
          <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                {t('purchased_products_heading', 'Purchased Products & Quantities')}
              </span>
              <Button variant="outline" size="sm" icon={Plus} onClick={handleAddItem}>
                {t('add_item_line_btn', 'Add Item Line')}
              </Button>
            </div>

            {errors.items && <span className="text-xs text-red-500 font-semibold">{errors.items}</span>}

            <div className="space-y-3">
              {items.map((line, idx) => {
                const lineTotal = (Number(line.quantity) || 0) * (Number(line.unitCost) || 0);
                return (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col sm:flex-row items-center gap-3"
                  >
                    {/* Product Select */}
                    <div className="flex-1 w-full">
                      <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                        {t('product_col_label', 'Product')}
                      </label>
                      <select
                        value={line.productId}
                        onChange={(e) => handleItemChange(idx, 'productId', e.target.value)}
                        className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-slate-800 dark:text-slate-200"
                      >
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.sku}) · On Hand: {p.quantity}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Quantity */}
                    <div className="w-full sm:w-28">
                      <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                        {t('quantity_col_label', 'Quantity')}
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={line.quantity}
                        onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                        className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 font-mono font-bold text-slate-800 dark:text-slate-200 text-center"
                      />
                    </div>

                    {/* Unit Cost */}
                    <div className="w-full sm:w-36">
                      <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                        {t('unit_cost_col_label', 'Unit Cost')} ({settings.currency})
                      </label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={line.unitCost}
                        onChange={(e) => handleItemChange(idx, 'unitCost', e.target.value)}
                        className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 font-mono text-slate-800 dark:text-slate-200 text-right"
                      />
                    </div>

                    {/* Line Total */}
                    <div className="w-full sm:w-32 text-right">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                        {t('line_total_col_label', 'Total')}
                      </span>
                      <span className="font-mono text-xs font-bold text-slate-900 dark:text-slate-100">
                        {formatCurrency(lineTotal, settings.currency)}
                      </span>
                    </div>

                    {/* Remove */}
                    <div className="pt-4 sm:pt-3">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg transition-colors"
                        title="Remove line"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Grand Totals Summary */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col items-end gap-1">
            <div className="flex justify-between w-64 text-xs text-slate-500">
              <span>{t('col_subtotal', 'Subtotal')}:</span>
              <span className="font-mono font-semibold">{formatCurrency(subtotal, settings.currency)}</span>
            </div>
            <div className="flex justify-between w-64 text-base font-bold text-slate-900 dark:text-white pt-2 border-t border-slate-100 dark:border-slate-800">
              <span>{t('col_grand_total', 'Grand Total')}:</span>
              <span className="font-mono text-emerald-600 dark:text-emerald-400">
                {formatCurrency(total, settings.currency)}
              </span>
            </div>
          </div>

          {/* Barcode Sticker Print Option */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <label className="inline-flex items-center gap-2 cursor-pointer font-bold text-slate-700 dark:text-slate-300 select-none">
              <input
                type="checkbox"
                checked={openLabelPrintAfterSave}
                onChange={(e) => setOpenLabelPrintAfterSave(e.target.checked)}
                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
              />
              <span>{t('chk_print_labels_on_receive', 'পণ্য রিসিভ করার সাথে সাথে বারকোড ও র‍্যাক স্টিকার প্রিন্ট করুন (Open Barcode & Rack Sticker Labels Print Preview)')}</span>
            </label>

            <Button
              type="button"
              variant="outline"
              size="sm"
              icon={Printer}
              onClick={handleOpenPurchaseLabelPreview}
              className="text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
            >
              {t('preview_barcode_stickers_btn', '👁️ বারকোড স্টিকার প্রিভিউ ও প্রিন্ট')}
            </Button>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-6 border-t border-slate-100 dark:border-slate-800">
            <Button variant="secondary" onClick={() => navigate('/purchases')}>
              {t('btn_cancel', 'Cancel')}
            </Button>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                icon={Clock}
                isLoading={isSubmitting}
                onClick={() => handleSubmit('draft')}
              >
                {t('save_as_draft_btn', 'Save as Draft')}
              </Button>
              <Button
                variant="primary"
                icon={CheckCircle2}
                isLoading={isSubmitting}
                onClick={() => handleSubmit('received')}
              >
                {t('receive_purchase_btn', 'Receive Purchase & Add Stock')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Add Supplier Modal */}
      <QuickAddSupplierModal
        isOpen={isAddSupplierOpen}
        onClose={() => setIsAddSupplierOpen(false)}
        onSuccess={(newSup) => {
          setSupplierId(newSup.id);
        }}
      />

      {/* Thermal Barcode Sticker Print Modal */}
      {selectedPurchaseForPrint && (
        <LotBarcodePrintModal
          isOpen={!!selectedPurchaseForPrint}
          onClose={() => {
            setSelectedPurchaseForPrint(null);
            if (!isSubmitting) {
              navigate('/purchases');
            }
          }}
          lot={selectedPurchaseForPrint}
        />
      )}
    </div>
  );
};
