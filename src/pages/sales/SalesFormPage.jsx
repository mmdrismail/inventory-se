import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAppData } from '../../context/AppDataContext';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input, Select } from '../../components/forms/FormControls';
import { PrintableReceiptModal } from '../../components/receipt/PrintableReceiptModal';
import { formatCurrency } from '../../utils/formatters';
import { ArrowLeft, Plus, Trash2, CheckCircle2, Clock, Printer } from 'lucide-react';

export const SalesFormPage = () => {
  const { customers, products, createSale, settings } = useAppData();
  const navigate = useNavigate();

  const [customerId, setCustomerId] = useState('');
  const [invoiceNo, setInvoiceNo] = useState(`INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentStatus, setPaymentStatus] = useState('paid');
  const [discount, setDiscount] = useState('0');
  const [notes, setNotes] = useState('');

  // Completed sale for immediate receipt modal preview
  const [completedSale, setCompletedSale] = useState(null);

  // Available in-stock products
  const availableProducts = products.filter((p) => (Number(p.quantity) || 0) > 0);

  // Initial line
  const [items, setItems] = useState([
    {
      productId: availableProducts[0]?.id || '',
      quantity: 1,
      unitPrice: availableProducts[0]?.sellingPrice || 0,
    },
  ]);

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddItem = () => {
    const firstAvailable = availableProducts[0];
    setItems((prev) => [
      ...prev,
      {
        productId: firstAvailable?.id || '',
        quantity: 1,
        unitPrice: firstAvailable?.sellingPrice || 0,
      },
    ]);
  };

  const handleRemoveItem = (index) => {
    if (items.length <= 1) {
      alert('A sale invoice must contain at least one item line.');
      return;
    }
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index, field, value) => {
    setItems((prev) => {
      const updated = [...prev];
      const item = { ...updated[index], [field]: value };

      if (field === 'productId') {
        const prod = products.find((p) => p.id === value);
        if (prod) {
          item.unitPrice = prod.sellingPrice;
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
    const price = Number(item.unitPrice) || 0;
    const available = Number(prod?.quantity) || 0;
    return {
      productId: item.productId,
      productName: prod?.name || 'Item',
      sku: prod?.sku || '',
      quantity: qty,
      unitPrice: price,
      availableStock: available,
      total: qty * price,
    };
  });

  const subtotal = calculatedItems.reduce((sum, item) => sum + item.total, 0);
  const discountVal = Math.min(subtotal, Math.max(0, Number(discount) || 0));
  const total = Math.max(0, subtotal - discountVal);

  const validate = (statusToSave) => {
    const errs = {};
    if (!invoiceNo.trim()) errs.invoiceNo = 'Invoice number is required.';
    if (items.length === 0) errs.items = 'Please add at least one product.';

    for (let i = 0; i < items.length; i++) {
      const line = items[i];
      const prod = products.find((p) => p.id === line.productId);
      if (!line.productId) {
        errs.items = `Line ${i + 1}: Select a product.`;
        break;
      }
      const qty = Number(line.quantity);
      if (qty <= 0) {
        errs.items = `Line ${i + 1}: Quantity must be at least 1.`;
        break;
      }
      // If completing sale, check stock limit
      if (statusToSave === 'completed' && prod && qty > (Number(prod.quantity) || 0)) {
        errs.items = `Line ${i + 1}: Cannot sell ${qty} units of "${prod.name}". Only ${prod.quantity} available in stock!`;
        break;
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (statusToSave) => {
    if (!validate(statusToSave)) return;

    setIsSubmitting(true);

    const customer = customers.find((c) => c.id === customerId);

    const payload = {
      customerId: customerId || null,
      customerName: customer?.name || 'Walk-in Retail Customer',
      customerPhone: customer?.phone || '',
      invoiceNo,
      date: new Date(date).toISOString(),
      status: statusToSave, // 'completed' or 'draft'
      paymentStatus,
      discount: discountVal,
      notes,
      items: calculatedItems,
      subtotal,
      total,
    };

    setTimeout(() => {
      const res = createSale(payload, 'Sales Executive');
      setIsSubmitting(false);

      if (res.success) {
        if (statusToSave === 'completed') {
          setCompletedSale(res.sale);
        } else {
          navigate('/sales');
        }
      } else {
        setErrors({ form: res.message });
      }
    }, 250);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top back */}
      <div className="flex items-center justify-between">
        <Link
          to="/sales"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Sales List</span>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Record Sale / POS Invoice</CardTitle>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Create a point-of-sale invoice. Completing the sale checks live stock limits, deducts inventory, and generates a printable receipt.
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {errors.form && (
            <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-600 dark:text-red-400 font-semibold">
              {errors.form}
            </div>
          )}

          {/* Customer & Invoice details */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Select
              label="Customer (or Walk-in)"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              placeholder="Select existing customer"
              options={[
                { value: '', label: 'Walk-in Retail Customer' },
                ...customers.map((c) => ({ value: c.id, label: `${c.name} (${c.customerType})` })),
              ]}
              helperText="Optional: leave blank for walk-in cash customer"
            />

            <Input
              label="Invoice Number"
              value={invoiceNo}
              onChange={(e) => setInvoiceNo(e.target.value)}
              error={errors.invoiceNo}
              required
            />

            <Input
              label="Sale Date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Select
              label="Payment Status"
              value={paymentStatus}
              onChange={(e) => setPaymentStatus(e.target.value)}
              options={[
                { value: 'paid', label: 'Paid in Full' },
                { value: 'pending', label: 'Payment Pending / Credit' },
              ]}
            />

            <Input
              label={`Discount Amount (${settings.currency})`}
              type="number"
              step="any"
              min="0"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
              placeholder="0.00"
            />

            <Input
              label="Invoice Notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Payment method or delivery remarks"
            />
          </div>

          {/* Multi-item rows */}
          <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Products to Bill
              </span>
              <Button variant="outline" size="sm" icon={Plus} onClick={handleAddItem}>
                Add Item Line
              </Button>
            </div>

            {errors.items && <span className="text-xs text-red-500 font-semibold">{errors.items}</span>}

            <div className="space-y-3">
              {items.map((line, idx) => {
                const prod = products.find((p) => p.id === line.productId);
                const lineTotal = (Number(line.quantity) || 0) * (Number(line.unitPrice) || 0);
                const isOverStock = prod && Number(line.quantity) > (Number(prod.quantity) || 0);

                return (
                  <div
                    key={idx}
                    className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row items-center gap-3 ${
                      isOverStock
                        ? 'border-red-400 bg-red-50/30 dark:bg-red-950/20'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50'
                    }`}
                  >
                    {/* Product Select */}
                    <div className="flex-1 w-full">
                      <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                        Product
                      </label>
                      <select
                        value={line.productId}
                        onChange={(e) => handleItemChange(idx, 'productId', e.target.value)}
                        className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-slate-800 dark:text-slate-200"
                      >
                        {products.map((p) => (
                          <option key={p.id} value={p.id} disabled={p.quantity <= 0}>
                            {p.name} ({p.sku}) — Available: {p.quantity} {p.quantity <= 0 ? '(Out of stock)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Quantity */}
                    <div className="w-full sm:w-28">
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] uppercase font-bold text-slate-400">
                          Qty
                        </label>
                        <span className="text-[10px] text-slate-400 font-mono">
                          Max: {prod?.quantity || 0}
                        </span>
                      </div>
                      <input
                        type="number"
                        min="1"
                        max={prod?.quantity || 999}
                        value={line.quantity}
                        onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                        className={`w-full text-xs rounded-lg border px-3 py-2 font-mono font-bold text-center ${
                          isOverStock
                            ? 'border-red-500 bg-red-50 text-red-700'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200'
                        }`}
                      />
                    </div>

                    {/* Unit Selling Price */}
                    <div className="w-full sm:w-36">
                      <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                        Unit Price ({settings.currency})
                      </label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={line.unitPrice}
                        onChange={(e) => handleItemChange(idx, 'unitPrice', e.target.value)}
                        className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 font-mono text-slate-800 dark:text-slate-200 text-right"
                      />
                    </div>

                    {/* Line Total */}
                    <div className="w-full sm:w-32 text-right">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                        Total
                      </span>
                      <span className="font-mono text-xs font-bold text-slate-900 dark:text-slate-100">
                        {formatCurrency(lineTotal, settings.currency)}
                      </span>
                    </div>

                    {/* Remove Line */}
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
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col items-end gap-1.5 text-xs">
            <div className="flex justify-between w-64 text-slate-500">
              <span>Subtotal:</span>
              <span className="font-mono font-semibold">{formatCurrency(subtotal, settings.currency)}</span>
            </div>
            {discountVal > 0 && (
              <div className="flex justify-between w-64 text-emerald-600 font-semibold">
                <span>Discount:</span>
                <span className="font-mono">-{formatCurrency(discountVal, settings.currency)}</span>
              </div>
            )}
            <div className="flex justify-between w-64 text-base font-bold text-slate-900 dark:text-white pt-2 border-t border-slate-100 dark:border-slate-800">
              <span>Grand Total:</span>
              <span className="font-mono text-emerald-600 dark:text-emerald-400">
                {formatCurrency(total, settings.currency)}
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-6 border-t border-slate-100 dark:border-slate-800">
            <Button variant="secondary" onClick={() => navigate('/sales')}>
              Cancel
            </Button>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                icon={Clock}
                isLoading={isSubmitting}
                onClick={() => handleSubmit('draft')}
              >
                Save as Draft
              </Button>
              <Button
                variant="primary"
                icon={CheckCircle2}
                isLoading={isSubmitting}
                onClick={() => handleSubmit('completed')}
              >
                Complete Sale & Deduct Stock
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Immediate Receipt Modal Preview upon sale completion */}
      <PrintableReceiptModal
        isOpen={Boolean(completedSale)}
        onClose={() => {
          setCompletedSale(null);
          navigate('/sales');
        }}
        sale={completedSale}
      />
    </div>
  );
};
