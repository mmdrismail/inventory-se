import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link, useLocation, useParams } from 'react-router-dom';
import { useAppData } from '../../context/AppDataContext';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input, Select } from '../../components/forms/FormControls';
import { Badge } from '../../components/common/Badge';
import { PrintableReceiptModal } from '../../components/receipt/PrintableReceiptModal';
import { formatCurrency } from '../../utils/formatters';
import {
  ArrowLeft,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  Printer,
  Building2,
  UserCheck,
  AlertCircle,
  FileSpreadsheet,
  Barcode,
  Edit2,
  Save,
} from 'lucide-react';
import { playBarcodeBeep, playSuccessChime, playErrorTone } from '../../utils/soundEffects';

export const SalesFormPage = () => {
  const { customers, products, sales, quotations, createSale, updateSale, settings } = useAppData();
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const isEditing = Boolean(id);

  // Requisition / Quotation prefill if routed from quotation
  const prefill = location.state?.fromQuotation || null;

  const [barcodeInput, setBarcodeInput] = useState('');
  const [scanSuccessMessage, setScanSuccessMessage] = useState('');

  const [customerId, setCustomerId] = useState(prefill?.customerId || '');
  const [customerName, setCustomerName] = useState(prefill?.customerName || '');
  const [customerCompany, setCustomerCompany] = useState(prefill?.customerCompany || '');
  const [customerRole, setCustomerRole] = useState(prefill?.customerRole || 'owner');
  const [customerPhone, setCustomerPhone] = useState(prefill?.customerPhone || '');
  const [customerEmail, setCustomerEmail] = useState(prefill?.customerEmail || '');
  const [customerAddress, setCustomerAddress] = useState(prefill?.customerAddress || '');
  const [customerLocation, setCustomerLocation] = useState(prefill?.customerLocation || '');
  const [autoSaveCustomer, setAutoSaveCustomer] = useState(true);

  const [invoiceNo, setInvoiceNo] = useState(
    `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`
  );
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentStatus, setPaymentStatus] = useState('paid'); // 'paid', 'partial', 'due'
  const [paidAmountInput, setPaidAmountInput] = useState('');
  const [discount, setDiscount] = useState(prefill?.discount ? String(prefill.discount) : '0');
  const [notes, setNotes] = useState(prefill ? `Generated from Quotation #${prefill.quotationNumber}` : '');
  const [requisitionRef, setRequisitionRef] = useState(prefill?.requisitionRef || '');
  const [quotationId, setQuotationId] = useState(prefill?.id || null);

  // Single-line column & total visibility controls ("eta ek line e thakbe eigula")
  const [showRate, setShowRate] = useState(prefill?.showRate !== undefined ? prefill.showRate : true);
  const [showLineTotal, setShowLineTotal] = useState(prefill?.showLineTotal !== undefined ? prefill.showLineTotal : true);
  const [showGrandTotal, setShowGrandTotal] = useState(prefill?.showGrandTotal !== undefined ? prefill.showGrandTotal : true);

  // Completed sale for immediate receipt modal preview
  const [completedSale, setCompletedSale] = useState(null);

  // Load existing sale if in edit mode
  const existingSale = useMemo(() => {
    if (!isEditing || !sales) return null;
    return sales.find((s) => s.id === id || s._id === id) || null;
  }, [isEditing, id, sales]);

  useEffect(() => {
    if (existingSale) {
      setInvoiceNo(existingSale.invoiceNo || existingSale.invoiceNumber || '');
      setDate(
        existingSale.date
          ? new Date(existingSale.date).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0]
      );
      setCustomerId(existingSale.customerId || '');
      setCustomerName(existingSale.customerName || '');
      setCustomerCompany(existingSale.customerCompany || '');
      setCustomerRole(existingSale.customerRole || 'owner');
      setCustomerPhone(existingSale.customerPhone || '');
      setCustomerEmail(existingSale.customerEmail || '');
      setCustomerAddress(existingSale.customerAddress || '');
      setCustomerLocation(existingSale.customerLocation || '');
      setPaymentStatus(existingSale.paymentStatus || 'paid');
      setPaidAmountInput(
        existingSale.paidAmount !== undefined ? String(existingSale.paidAmount) : ''
      );
      setDiscount(existingSale.discount !== undefined ? String(existingSale.discount) : '0');
      setNotes(existingSale.notes || '');
      setRequisitionRef(existingSale.requisitionRef || '');
      setQuotationId(existingSale.quotationId || null);
      if (existingSale.showRate !== undefined) setShowRate(existingSale.showRate);
      if (existingSale.showLineTotal !== undefined) setShowLineTotal(existingSale.showLineTotal);
      if (existingSale.showGrandTotal !== undefined) setShowGrandTotal(existingSale.showGrandTotal);
      if (existingSale.items && existingSale.items.length > 0) {
        setItems(
          existingSale.items.map((it) => ({
            productId: it.productId || 'custom',
            productName: it.productName || it.name || '',
            sku: it.sku || '',
            quantity: it.quantity || 1,
            unitPrice: it.unitPrice !== undefined ? it.unitPrice : it.price || 0,
          }))
        );
      }
    }
  }, [existingSale]);

  // Available in-stock products
  const availableProducts = products.filter((p) => (Number(p.quantity) || 0) > 0);

  // Initial line
  const [items, setItems] = useState(() => {
    if (prefill?.items && prefill.items.length > 0) {
      return prefill.items.map((it) => {
        const prod = products.find((p) => p.name === it.name || p.id === it.productId);
        return {
          productId: prod?.id || 'custom',
          productName: it.name || prod?.name || '',
          quantity: it.quantity || 1,
          unitPrice: it.unitPrice || 0,
        };
      });
    }
    return [
      {
        productId: availableProducts[0]?.id || 'custom',
        productName: availableProducts[0]?.name || '',
        quantity: 1,
        unitPrice: availableProducts[0]?.sellingPrice || 0,
      },
    ];
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // When customer is selected from dropdown, auto-fill all profile data
  const handleCustomerSelect = (selectedId) => {
    setCustomerId(selectedId);
    if (!selectedId) {
      setCustomerName('');
      setCustomerCompany('');
      setCustomerRole('owner');
      setCustomerPhone('');
      setCustomerEmail('');
      setCustomerAddress('');
      setCustomerLocation('');
      return;
    }

    const found = customers.find((c) => c.id === selectedId || c._id === selectedId);
    if (found) {
      const cPhone = (found.phone || found.companyPhone || '').trim();
      const cName = (found.name || '').toLowerCase().trim();

      const matchQuote = (quotations || []).find((q) =>
        (q.customerId && (q.customerId === found.id || q.customerId === found._id)) ||
        (q.customerPhone && cPhone && q.customerPhone.trim() === cPhone) ||
        (q.customerName && cName && q.customerName.toLowerCase().trim() === cName)
      );
      const matchSale = (sales || []).find((s) =>
        (s.customerId && (s.customerId === found.id || s.customerId === found._id)) ||
        (s.customerPhone && cPhone && s.customerPhone.trim() === cPhone) ||
        (s.customerName && cName && s.customerName.toLowerCase().trim() === cName)
      );

      const resolvedName = found.name || matchQuote?.customerName || matchSale?.customerName || '';
      const resolvedCompany = found.companyName || found.company || matchQuote?.customerCompany || matchSale?.customerCompany || '';
      const resolvedRole = (found.designationRole && found.designationRole !== 'owner')
        ? found.designationRole
        : (matchQuote?.customerRole || matchSale?.customerRole || found.designationRole || 'owner');
      const resolvedPhone = found.phone || found.companyPhone || matchQuote?.customerPhone || matchSale?.customerPhone || '';
      const resolvedEmail = found.email || matchQuote?.customerEmail || matchSale?.customerEmail || '';
      const resolvedAddress = found.address || matchQuote?.customerAddress || matchSale?.customerAddress || '';
      const resolvedLocation = found.location || matchQuote?.customerLocation || matchSale?.customerLocation || resolvedAddress || '';

      setCustomerName(resolvedName);
      setCustomerCompany(resolvedCompany);
      setCustomerRole(resolvedRole);
      setCustomerPhone(resolvedPhone);
      setCustomerEmail(resolvedEmail);
      setCustomerAddress(resolvedAddress);
      setCustomerLocation(resolvedLocation);
    }
  };

  const selectedCustomerObj = customers.find((c) => c.id === customerId || c._id === customerId);

  const handleBarcodeSearchAndAdd = (code) => {
    const trimmed = (code || '').trim().toLowerCase();
    if (!trimmed) return;

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
            productName: matched.name,
            quantity: 1,
            unitPrice: matched.sellingPrice || 0,
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
        if (value === 'custom') {
          item.productId = 'custom';
        } else {
          const prod = products.find((p) => p.id === value);
          if (prod) {
            item.productId = prod.id;
            item.unitPrice = prod.sellingPrice;
            item.productName = prod.name;
          }
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
      productId: prod?.id || 'custom',
      productName: item.productName || prod?.name || 'Equipment Part',
      sku: prod?.sku || '',
      quantity: qty,
      unitPrice: price,
      availableStock: prod ? available : 999,
      total: qty * price,
    };
  });

  const subtotal = calculatedItems.reduce((sum, item) => sum + item.total, 0);
  const discountVal = Math.min(subtotal, Math.max(0, Number(discount) || 0));
  const total = Math.max(0, subtotal - discountVal);

  // Paid and due amount calculations
  let calculatedPaid = total;
  if (paymentStatus === 'due') {
    calculatedPaid = 0;
  } else if (paymentStatus === 'partial') {
    calculatedPaid = Math.min(total, Math.max(0, Number(paidAmountInput) || 0));
  }
  const calculatedDue = Math.max(0, total - calculatedPaid);

  const validate = (statusToSave) => {
    const errs = {};
    if (!invoiceNo.trim()) errs.invoiceNo = 'Invoice number is required.';
    if (items.length === 0) errs.items = 'Please add at least one product.';

    for (let i = 0; i < items.length; i++) {
      const line = items[i];
      const prod = products.find((p) => p.id === line.productId);
      const isCustom = line.productId === 'custom' || !prod;

      if (isCustom && (!line.productName || !line.productName.trim())) {
        errs.items = `Line ${i + 1}: পণ্যের বিবরণ বা নাম লিখুন (Item Name is required).`;
        break;
      }
      if (!isCustom && !line.productId) {
        errs.items = `Line ${i + 1}: Select a product.`;
        break;
      }
      const qty = Number(line.quantity);
      if (qty <= 0) {
        errs.items = `Line ${i + 1}: Quantity must be at least 1.`;
        break;
      }
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

    const finalCustomerName = customerName.trim() || selectedCustomerObj?.name || 'Walk-in Retail Customer';

    const payload = {
      customerId: customerId || null,
      customerName: finalCustomerName,
      customerCompany: customerCompany.trim(),
      customerRole,
      customerPhone: customerPhone.trim(),
      customerEmail: customerEmail.trim(),
      customerAddress: customerAddress.trim(),
      customerLocation: customerLocation.trim() || customerAddress.trim(),
      autoSaveCustomer,
      invoiceNo,
      date: new Date(date).toISOString(),
      status: statusToSave,
      paymentStatus,
      paidAmount: calculatedPaid,
      dueAmount: calculatedDue,
      discount: discountVal,
      notes,
      requisitionRef,
      quotationId,
      items: calculatedItems,
      subtotal,
      total,
      showRate,
      showLineTotal,
      showGrandTotal,
    };

    setTimeout(() => {
      try {
        let res;
        if (isEditing) {
          res = updateSale(id, payload, 'Sales Executive');
        } else {
          res = createSale(payload, 'Sales Executive');
        }
        setIsSubmitting(false);

        if (res && res.success) {
          playSuccessChime();
          if (isEditing) {
            navigate(`/sales/${id}`);
          } else if (statusToSave === 'completed') {
            setCompletedSale({
              ...res.sale,
              showRate,
              showLineTotal,
              showGrandTotal,
            });
          } else {
            navigate('/sales');
          }
        } else {
          playErrorTone();
          setErrors({ form: res?.message || 'Error saving invoice.' });
        }
      } catch (err) {
        console.error('Error saving sale:', err);
        setIsSubmitting(false);
        playErrorTone();
        setErrors({ form: err?.message || 'An unexpected error occurred while saving invoice.' });
      }
    }, 150);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top back & quick links */}
      <div className="flex items-center justify-between">
        <Link
          to="/sales"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Sales List</span>
        </Link>

        {prefill && (
          <div className="flex items-center gap-2 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 px-3 py-1 rounded-lg text-xs text-purple-700 dark:text-purple-300 font-semibold">
            <FileSpreadsheet className="h-4 w-4" />
            <span>Converted from Quotation #{prefill.quotationNumber}</span>
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {isEditing ? 'বিক্রয় চালান সংশোধন (Edit Sales Invoice)' : 'Record Sale / POS Invoice'}
          </CardTitle>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {isEditing
              ? `ইনভয়েস #${invoiceNo}-এর সকল তথ্য ও মালামাল আপডেট করুন`
              : 'Create a point-of-sale invoice with full international customer role & enterprise management.'}
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {errors.form && (
            <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-600 dark:text-red-400 font-semibold flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errors.form}</span>
            </div>
          )}

          {/* SECTION 1: INTERNATIONAL CUSTOMER PROFILE & ENTERPRISE INFO */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  গ্রাহক ও কোম্পানির পূর্ণ বিবরণ (Customer & Corporate Profile)
                </span>
              </div>

              {selectedCustomerObj && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-500">পূর্বের বকেয়া:</span>
                  <Badge variant={selectedCustomerObj.totalDue > 0 ? 'red' : 'emerald'} size="sm">
                    {formatCurrency(selectedCustomerObj.totalDue || 0, settings.currency)} পাওনা
                  </Badge>
                </div>
              )}
            </div>

            {/* Quick Customer Select & Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <Select
                  label="বিদ্যমান গ্রাহক নির্বাচন করুন"
                  value={customerId}
                  onChange={(e) => handleCustomerSelect(e.target.value)}
                  options={[
                    { value: '', label: '➕ নতুন গ্রাহক টাইপ করুন / Walk-in' },
                    ...customers.map((c) => {
                      const cPhone = (c.phone || c.companyPhone || '').trim();
                      const cName = (c.name || '').toLowerCase().trim();
                      const matchQ = (quotations || []).find((q) =>
                        (q.customerId && (q.customerId === c.id || q.customerId === c._id)) ||
                        (q.customerPhone && cPhone && q.customerPhone.trim() === cPhone) ||
                        (q.customerName && cName && q.customerName.toLowerCase().trim() === cName)
                      );
                      const matchS = (sales || []).find((s) =>
                        (s.customerId && (s.customerId === c.id || s.customerId === c._id)) ||
                        (s.customerPhone && cPhone && s.customerPhone.trim() === cPhone) ||
                        (s.customerName && cName && s.customerName.toLowerCase().trim() === cName)
                      );
                      const comp = c.companyName || c.company || matchQ?.customerCompany || matchS?.customerCompany || '';
                      return {
                        value: c.id || c._id,
                        label: `${c.name} ${comp ? `(${comp})` : ''}`,
                      };
                    }),
                  ]}
                  helperText="বাটন থেকে সিলেক্ট করলে বাকি তথ্য স্বয়ংক্রিয় পূরণ হবে"
                />
              </div>

              <div>
                <Input
                  label="গ্রাহকের নাম (Customer Name) *"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="যেমন: আলহাজ্ব নাসির উদ্দিন"
                  required
                />
              </div>

              <div>
                <Select
                  label="প্রতিষ্ঠানে গ্রাহকের ভূমিকা (Designation / Role)"
                  value={customerRole}
                  onChange={(e) => setCustomerRole(e.target.value)}
                  options={[
                    { value: 'owner', label: 'কোম্পানির মালিক / স্বত্বাধিকারী (Company Owner)' },
                    { value: 'agent', label: 'কোম্পানির প্রতিনিধি / এজেন্ট (Company Agent)' },
                    { value: 'purchaser', label: 'ক্রয় কর্মকর্তা / প্রকিউরমেন্ট ম্যানেজার (Purchasing Manager)' },
                    { value: 'supplier_rep', label: 'সরবরাহকারী / ভেন্ডর প্রতিনিধি (Supplier Rep)' },
                    { value: 'wholesale', label: 'পাইকারি ডিলার / রিসেলার (Wholesale Dealer)' },
                    { value: 'retail', label: 'সাধারণ খুচরা গ্রাহক (Retail Consumer)' },
                    { value: 'manager', label: 'ম্যানেজার / ফ্যাক্টরি ইনচার্জ (Factory Manager)' },
                  ]}
                  helperText="আন্তর্জাতিক গ্রেডের ভূমিকা নির্ধারণ"
                />
              </div>
            </div>

            {/* Company, Phone, Location Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div className="md:col-span-2">
                <Input
                  label="কোম্পানি / প্রতিষ্ঠানের নাম (Company Name)"
                  value={customerCompany}
                  onChange={(e) => setCustomerCompany(e.target.value)}
                  placeholder="যেমন: কর্ণফুলী কোল্ড স্টোরেজ লিমিটেড"
                />
              </div>

              <div>
                <Input
                  label="মোবাইল / যোগাযোগ নম্বর (Phone)"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="01819-234567"
                />
              </div>

              <div>
                <Input
                  label="অফিসিয়াল ইমেইল (Email)"
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="client@company.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="ডেলিভারি ঠিকানা ও সাইট লোকেশন (Location / Site Address)"
                value={customerLocation}
                onChange={(e) => setCustomerLocation(e.target.value)}
                placeholder="যেমন: মোজাম্মেল হক রোড, ফিরিঙ্গিবাজার, চট্টগ্রাম"
              />
              <Input
                label="স্থায়ী প্রাতিষ্ঠানিক ঠিকানা (Permanent Corporate Address)"
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
                placeholder="যেমন: হেড অফিস, আগ্রাবাদ বা কারখানা"
              />
            </div>

            <div className="flex items-center gap-2 pt-1 text-xs text-slate-600 dark:text-slate-400">
              <input
                type="checkbox"
                id="autoSaveCustomer"
                checked={autoSaveCustomer}
                onChange={(e) => setAutoSaveCustomer(e.target.checked)}
                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
              />
              <label htmlFor="autoSaveCustomer" className="cursor-pointer select-none">
                গ্রাহক ও কোম্পানির এই তথ্য স্বয়ংক্রিয়ভাবে কাস্টমার ডেটাবেজে নতুন সংরক্ষণ / আপডেট করুন
              </label>
            </div>
          </div>

          {/* SECTION 2: INVOICE META & PAYMENT BREAKDOWN */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="ইনভয়েস / মেমো নম্বর (Invoice Number)"
              value={invoiceNo}
              onChange={(e) => setInvoiceNo(e.target.value)}
              error={errors.invoiceNo}
              required
            />

            <Input
              label="বিক্রয়ের তারিখ (Sale Date)"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />

            <Input
              label="রিকুইজিশন / সূত্র নম্বর (Requisition Ref)"
              value={requisitionRef}
              onChange={(e) => setRequisitionRef(e.target.value)}
              placeholder="যেমন: REQ-982 বা পো নম্বর"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Select
              label="পেমেন্ট স্ট্যাটাস (Payment Status)"
              value={paymentStatus}
              onChange={(e) => setPaymentStatus(e.target.value)}
              options={[
                { value: 'paid', label: 'সম্পূর্ণ পরিশোধ (Paid in Full)' },
                { value: 'partial', label: 'আংশিক পরিশোধ (Partial Advance / Deposit)' },
                { value: 'due', label: 'সম্পূর্ণ বকেয়া (Due / On Credit)' },
              ]}
            />

            {paymentStatus === 'partial' ? (
              <Input
                label={`জমা / প্রাপ্ত টাকা (${settings.currency}) *`}
                type="number"
                step="any"
                min="0"
                value={paidAmountInput}
                onChange={(e) => setPaidAmountInput(e.target.value)}
                placeholder="0.00"
                helperText={`অবশিষ্ট বকেয়া থাকবে: ${formatCurrency(calculatedDue, settings.currency)}`}
                required
              />
            ) : (
              <Input
                label={`বিশেষ ছাড় / ডিসকাউন্ট (${settings.currency})`}
                type="number"
                step="any"
                min="0"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                placeholder="0.00"
              />
            )}

            <Input
              label="ইনভয়েস নোট ও মন্তব্য (Notes)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="পেমেন্ট মাধ্যম বা ডেলিভারি নোট"
            />
          </div>

          {/* BARCODE SCANNER BAR FOR FAST POS BILLING */}
          <div className="p-3.5 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Barcode className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  বারকোড ও পার্টস স্ক্যানার (Live Barcode Scan)
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">
                  ইউএসবি স্ক্যানার দিয়ে স্ক্যান করুন অথবা SKU / বারকোড লিখে Enter চাপুন
                </span>
              </div>
              {scanSuccessMessage && (
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 animate-pulse">
                  {scanSuccessMessage}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Barcode className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  onKeyDown={handleBarcodeKeyDown}
                  placeholder="বারকোড স্ক্যান করুন বা SKU টাইপ করে Enter চাপুন..."
                  className="w-full pl-9 pr-3 py-2 text-xs font-mono font-semibold rounded-xl border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 shadow-xs"
                />
                {barcodeInput && (
                  <button
                    type="button"
                    onClick={() => setBarcodeInput('')}
                    className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold"
                  >
                    ✕
                  </button>
                )}
              </div>
              <Button
                type="button"
                variant="primary"
                size="sm"
                icon={Plus}
                onClick={() => handleBarcodeSearchAndAdd(barcodeInput)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold shrink-0"
              >
                স্ক্যান যোগ
              </Button>
            </div>
          </div>

          {/* SECTION 3: MULTI-ITEM PRODUCT BILLING TABLE */}
          <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                বিক্রিত মালামালের তালিকা (Products to Bill)
              </span>
              <Button variant="outline" size="sm" icon={Plus} onClick={handleAddItem}>
                আইটেম যোগ করুন (Add Line)
              </Button>
            </div>

            {/* Single Line Column & Total Visibility Controls ("eta ek line e thakbe eigula") */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-3.5 py-2 bg-slate-100/90 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
              <span className="text-[11px] uppercase tracking-wider text-emerald-700 dark:text-emerald-400 font-extrabold flex items-center gap-1.5">
                <span>👁️ কলাম ও মোট মূল্য নিয়ন্ত্রণ (Visibility Controls):</span>
              </span>
              <div className="inline-flex items-center gap-4 flex-wrap">
                <label className="inline-flex items-center gap-1.5 cursor-pointer font-bold text-slate-700 dark:text-slate-300 hover:text-emerald-600 transition-colors select-none">
                  <input
                    type="checkbox"
                    checked={showRate}
                    onChange={(e) => setShowRate(e.target.checked)}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5"
                  />
                  <span>দর / Rate কলাম</span>
                </label>
                <label className="inline-flex items-center gap-1.5 cursor-pointer font-bold text-slate-700 dark:text-slate-300 hover:text-emerald-600 transition-colors select-none">
                  <input
                    type="checkbox"
                    checked={showLineTotal}
                    onChange={(e) => setShowLineTotal(e.target.checked)}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5"
                  />
                  <span>আইটেম মোট / Total কলাম</span>
                </label>
                <label className="inline-flex items-center gap-1.5 cursor-pointer font-bold text-slate-700 dark:text-slate-300 hover:text-emerald-600 transition-colors select-none">
                  <input
                    type="checkbox"
                    checked={showGrandTotal}
                    onChange={(e) => setShowGrandTotal(e.target.checked)}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5"
                  />
                  <span>সর্বমোট মূল্য / Grand Total</span>
                </label>
              </div>
            </div>

            {errors.items && (
              <p className="text-xs text-red-500 font-semibold">{errors.items}</p>
            )}

            <div className="space-y-2">
              {items.map((line, index) => {
                const prod = products.find((p) => p.id === line.productId);
                const lineTotal = (Number(line.quantity) || 0) * (Number(line.unitPrice) || 0);
                const isOverStock = prod && Number(line.quantity) > (Number(prod.quantity) || 0);

                return (
                  <div
                    key={index}
                    className={`flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-3 rounded-xl border transition-all ${
                      isOverStock
                        ? 'border-red-300 dark:border-red-800 bg-red-50/40 dark:bg-red-950/20'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40'
                    }`}
                  >
                    <div className="flex-1 space-y-1.5">
                      <Select
                        value={products.some((p) => p.id === line.productId) ? line.productId : 'custom'}
                        onChange={(e) => handleItemChange(index, 'productId', e.target.value)}
                        options={[
                          { value: 'custom', label: '➕ বিশেষ পার্টস / কাস্টম আইটেম (Custom Part / Quotation Item)' },
                          ...products.map((p) => ({
                            value: p.id,
                            label: `${p.name} (মজুদ: ${p.quantity} ${p.unit || 'pcs'} · ৳${p.sellingPrice})`,
                          })),
                        ]}
                      />
                      {(line.productId === 'custom' || !products.some((p) => p.id === line.productId)) && (
                        <input
                          type="text"
                          value={line.productName || ''}
                          onChange={(e) => handleItemChange(index, 'productName', e.target.value)}
                          placeholder="যন্ত্রাংশ বা পণ্যের বিবরণ লিখুন (e.g. Connecting Rod with Piston)"
                          className="w-full px-3 py-1.5 text-xs rounded-lg border border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/20 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-purple-500"
                          required
                        />
                      )}
                    </div>

                    <div className="w-full sm:w-28">
                      <Input
                        type="number"
                        min="1"
                        value={line.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                        placeholder="পরিমাণ"
                      />
                    </div>

                    {showRate && (
                      <div className="w-full sm:w-36">
                        <Input
                          type="number"
                          step="any"
                          min="0"
                          value={line.unitPrice}
                          onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)}
                          placeholder="বিক্রয় দর"
                        />
                      </div>
                    )}

                    {showLineTotal && (
                      <div className="w-full sm:w-32 text-right font-mono font-bold text-sm text-slate-800 dark:text-slate-200 shrink-0">
                        {formatCurrency(lineTotal, settings.currency)}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => handleRemoveItem(index)}
                      className="p-2 text-slate-400 hover:text-red-500 transition-colors self-end sm:self-center"
                      title="আইটেম মুছুন"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SECTION 4: FINANCIAL TOTALS BREAKDOWN */}
          <div className="flex flex-col sm:flex-row justify-between items-start pt-4 border-t border-slate-100 dark:border-slate-800 gap-4">
            <div className="text-xs text-slate-500 space-y-1">
              <p>• বিল সম্পন্ন করলে ইনভেন্টরি থেকে স্বয়ংক্রিয়ভাবে স্টক হ্রাস পাবে।</p>
              <p>• মেমো প্রিন্ট মোডালে ক্যাশ মেমো, চালান, প্যাড ও কোটেশন পাওয়া যাবে।</p>
              {calculatedDue > 0 && showGrandTotal && (
                <p className="text-red-600 dark:text-red-400 font-bold">
                  • অবশিষ্ট বকেয়া {formatCurrency(calculatedDue, settings.currency)} গ্রাহক লেজারে জমা হবে।
                </p>
              )}
            </div>

            {showGrandTotal ? (
              <div className="w-full sm:w-72 space-y-2 text-xs bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>সর্বমোট (Subtotal):</span>
                  <span className="font-mono font-semibold">{formatCurrency(subtotal, settings.currency)}</span>
                </div>

                {discountVal > 0 && (
                  <div className="flex justify-between text-emerald-600 font-semibold">
                    <span>বিশেষ ছাড় (Discount):</span>
                    <span className="font-mono">-{formatCurrency(discountVal, settings.currency)}</span>
                  </div>
                )}

                <div className="flex justify-between font-bold text-slate-800 dark:text-white pt-1 border-t border-slate-200 dark:border-slate-700">
                  <span>নিট মূল্য (Net Payable):</span>
                  <span className="font-mono text-emerald-600 text-sm">{formatCurrency(total, settings.currency)}</span>
                </div>

                <div className="flex justify-between text-slate-700 dark:text-slate-300 pt-1">
                  <span>জমা / নগদ প্রাপ্তি (Paid):</span>
                  <span className="font-mono font-bold text-emerald-700">{formatCurrency(calculatedPaid, settings.currency)}</span>
                </div>

                <div className="flex justify-between font-bold text-red-600 pt-1 border-t border-slate-200 dark:border-slate-700">
                  <span>বাকী / বকেয়া (Balance Due):</span>
                  <span className="font-mono text-sm">{formatCurrency(calculatedDue, settings.currency)}</span>
                </div>
              </div>
            ) : (
              <div className="w-full sm:w-72 p-3 bg-amber-50/80 dark:bg-amber-950/30 border border-dashed border-amber-300 dark:border-amber-700/60 rounded-xl space-y-1 text-center">
                <span className="text-amber-800 dark:text-amber-300 font-bold text-xs block">
                  🚫 সর্বমোট মূল্য (Grand Total) বন্ধ
                </span>
                <p className="text-[10.5px] text-slate-500">
                  ডেলিভারি চালান বা নন-প্রাইসড ভাউচার প্রস্তুত করতে ব্যবহৃত হবে।
                </p>
                <button
                  type="button"
                  onClick={() => setShowGrandTotal(true)}
                  className="text-[11px] font-bold text-emerald-600 hover:underline pt-0.5 inline-block"
                >
                  Grand Total অন করুন
                </button>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button variant="secondary" onClick={() => navigate('/sales')}>
              বাতিল করুন (Cancel)
            </Button>

            <div className="flex items-center gap-2">
              {isEditing ? (
                <Button
                  variant="primary"
                  icon={Save}
                  isLoading={isSubmitting}
                  onClick={() => handleSubmit(existingSale?.status || 'completed')}
                  className="shadow-md shadow-emerald-500/20 font-bold"
                >
                  ইনভয়েস আপডেট করুন (Update Invoice)
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    icon={Clock}
                    isLoading={isSubmitting}
                    onClick={() => handleSubmit('draft')}
                  >
                    খসড়া সেভ (Save as Draft)
                  </Button>
                  <Button
                    variant="primary"
                    icon={CheckCircle2}
                    isLoading={isSubmitting}
                    onClick={() => handleSubmit('completed')}
                    className="shadow-md shadow-emerald-500/20 font-bold"
                  >
                    বিক্রি সম্পন্ন ও প্রিন্ট করুন (Complete & Print)
                  </Button>
                </>
              )}
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
