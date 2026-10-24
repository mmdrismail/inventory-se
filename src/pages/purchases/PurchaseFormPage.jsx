import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAppData } from '../../context/AppDataContext';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input, Select, Textarea } from '../../components/forms/FormControls';
import { formatCurrency } from '../../utils/formatters';
import { ArrowLeft, Plus, Trash2, CheckCircle2, Clock } from 'lucide-react';

export const PurchaseFormPage = () => {
  const { suppliers, products, createPurchase, settings } = useAppData();
  const navigate = useNavigate();

  const [supplierId, setSupplierId] = useState(suppliers[0]?.id || '');
  const [referenceNo, setReferenceNo] = useState(`PO-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentStatus, setPaymentStatus] = useState('paid');
  const [notes, setNotes] = useState('');

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
        navigate('/purchases');
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
          to="/purchases"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Purchases</span>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create Purchase Order (Procurement Intake)</CardTitle>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Issue a supplier purchase order. Saving as "Received" immediately adds inventory and creates audit movements.
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
            <Select
              label="Supplier / Vendor"
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              error={errors.supplierId}
              required
              options={suppliers.map((s) => ({ value: s.id, label: `${s.name} (${s.companyName})` }))}
            />

            <Input
              label="PO Reference Number"
              value={referenceNo}
              onChange={(e) => setReferenceNo(e.target.value)}
              error={errors.referenceNo}
              placeholder="e.g. PO-2026-001"
              required
            />

            <Input
              label="Purchase Date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              label="Reference / Invoice Note"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Supplier challan #8491, truck consignment"
            />
          </div>

          {/* Itemized lines */}
          <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Purchased Products & Quantities
              </span>
              <Button variant="outline" size="sm" icon={Plus} onClick={handleAddItem}>
                Add Item Line
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
                        Product
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
                        Quantity
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
                        Unit Cost ({settings.currency})
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
                        Total
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
              <span>Subtotal:</span>
              <span className="font-mono font-semibold">{formatCurrency(subtotal, settings.currency)}</span>
            </div>
            <div className="flex justify-between w-64 text-base font-bold text-slate-900 dark:text-white pt-2 border-t border-slate-100 dark:border-slate-800">
              <span>Grand Total:</span>
              <span className="font-mono text-emerald-600 dark:text-emerald-400">
                {formatCurrency(total, settings.currency)}
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-6 border-t border-slate-100 dark:border-slate-800">
            <Button variant="secondary" onClick={() => navigate('/purchases')}>
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
                onClick={() => handleSubmit('received')}
              >
                Receive Purchase & Add Stock
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
