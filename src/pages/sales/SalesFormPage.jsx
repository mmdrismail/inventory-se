import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link, useLocation, useParams } from 'react-router-dom';
import { useAppData } from '../../context/AppDataContext';
import { useLanguage } from '../../context/LanguageContext';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { BackLink } from '../../components/common/BackLink';
import { Input, Select } from '../../components/forms/FormControls';
import { Badge } from '../../components/common/Badge';
import { PrintableReceiptModal } from '../../components/receipt/PrintableReceiptModal';
import { DOCUMENT_TYPES } from '../../utils/printTemplateGenerator';
import { formatCurrency } from '../../utils/formatters';
import { getUnitSelectOptions, normalizeUnit } from '../../utils/units';
import { EMPTY_MACHINE_DETAILS, normalizeMachineDetails } from '../../utils/partPriceSearch';
import { MachineSpecCard } from '../../components/forms/MachineSpecCard';
import { SmartPartLookupModal } from '../../components/forms/SmartPartLookupModal';
import { calculateSaleTotals, calculatePaymentBreakdown } from '../../utils/calculations';
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
  Search,
} from 'lucide-react';
import { playBarcodeBeep, playSuccessChime, playErrorTone } from '../../utils/soundEffects';

export const SalesFormPage = () => {
  const { customers, products, sales, quotations, priceCatalog, machineModels, createSale, updateSale, settings } = useAppData();
  const { language, t } = useLanguage();

  const l = (texts) => {
    if (language === 'en') return texts.en;
    if (language === 'obro') return texts.obro || `${texts.bn} (${texts.en})`;
    return texts.bn;
  };

  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const isEditing = Boolean(id);

  // Requisition / Quotation / Price List Part prefill if routed from quotation or price catalog
  const prefill = location.state?.fromQuotation || null;
  const prefillPart = location.state?.prefillPart || null;

  const [barcodeInput, setBarcodeInput] = useState('');
  const [scanSuccessMessage, setScanSuccessMessage] = useState('');

  const [machineDetails, setMachineDetails] = useState(() =>
    prefill?.machineDetails
      ? normalizeMachineDetails(prefill.machineDetails)
      : prefillPart
      ? normalizeMachineDetails(prefillPart)
      : { ...EMPTY_MACHINE_DETAILS }
  );
  const [lookupModalState, setLookupModalState] = useState({ isOpen: false, targetRowIdx: null });

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
  const [paymentMethod, setPaymentMethod] = useState(prefill?.paymentMethod || 'cash');
  const [paidAmountInput, setPaidAmountInput] = useState('');
  const [discount, setDiscount] = useState(Number(prefill?.discount) > 0 ? String(prefill.discount) : '');
  const [tax, setTax] = useState(Number(prefill?.tax) > 0 ? String(prefill.tax) : '');
  const [notes, setNotes] = useState(prefill ? `Generated from Quotation #${prefill.quotationNumber}` : '');
  const [requisitionRef, setRequisitionRef] = useState(prefill?.requisitionRef || '');
  const [quotationId, setQuotationId] = useState(prefill?.id || prefill?._id || '');
  const [entrySource, setEntrySource] = useState(prefill?.entrySource || 'online'); // 'online' | 'khata' | 'offline'
  const [documentType, setDocumentType] = useState('cash_memo'); // 'cash_memo' | 'challan'
  const [bookNumber, setBookNumber] = useState(prefill?.bookNumber || '');
  const [manualSerialNo, setManualSerialNo] = useState(prefill?.manualSerialNo || '');
  const [deductStock, setDeductStock] = useState(prefill?.entrySource === 'khata' ? false : true);

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
      setPaymentMethod(existingSale.paymentMethod || 'cash');
      setPaidAmountInput(
        Number(existingSale.paidAmount) > 0 ? String(existingSale.paidAmount) : ''
      );
      setDiscount(Number(existingSale.discount) > 0 ? String(existingSale.discount) : '');
      setTax(Number(existingSale.tax) > 0 ? String(existingSale.tax) : '');
      setNotes(existingSale.notes || '');
      setRequisitionRef(existingSale.requisitionRef || '');
      setQuotationId(existingSale.quotationId || '');
      setEntrySource(existingSale.entrySource || 'online');
      setDocumentType(existingSale.documentType || 'cash_memo');
      setBookNumber(existingSale.bookNumber || '');
      setManualSerialNo(existingSale.manualSerialNo || '');
      setDeductStock(existingSale.deductStock !== undefined ? Boolean(existingSale.deductStock) : true);
      if (existingSale.showRate !== undefined) setShowRate(existingSale.showRate);
      if (existingSale.showLineTotal !== undefined) setShowLineTotal(existingSale.showLineTotal);
      if (existingSale.showGrandTotal !== undefined) setShowGrandTotal(existingSale.showGrandTotal);
      if (existingSale.machineDetails) {
        setMachineDetails(normalizeMachineDetails(existingSale.machineDetails));
      }
      if (existingSale.items && existingSale.items.length > 0) {
        setItems(
          existingSale.items.map((it) => {
            const rateNum = Number(it.unitPrice !== undefined ? it.unitPrice : it.price) || 0;
            return {
              productId: it.productId || 'custom',
              productName: it.productName || it.name || '',
              sku: it.sku || '',
              quantity: it.quantity || 1,
              unit: normalizeUnit(it.unit),
              unitPrice: rateNum > 0 ? rateNum : '',
            };
          })
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
        const r = Number(it.unitPrice) || 0;
        return {
          productId: prod?.id || 'custom',
          productName: it.name || prod?.name || '',
          quantity: it.quantity || 1,
          unit: normalizeUnit(it.unit || prod?.unit),
          unitPrice: r > 0 ? r : '',
        };
      });
    }
    if (prefillPart) {
      const rate = Number(prefillPart.lastPrice || prefillPart.price || 0) || 0;
      const prod = products.find((p) => p.id === prefillPart.linkedProductId || p.name === prefillPart.partName);
      return [
        {
          productId: prod?.id || 'custom',
          productName: prefillPart.partName || prod?.name || '',
          quantity: 1,
          unit: normalizeUnit(prefillPart.unit || prod?.unit || 'pc'),
          unitPrice: rate > 0 ? rate : '',
        },
      ];
    }
    const initSell = Number(availableProducts[0]?.sellingPrice) || 0;
    return [
      {
        productId: availableProducts[0]?.id || 'custom',
        productName: availableProducts[0]?.name || '',
        quantity: 1,
        unit: normalizeUnit(availableProducts[0]?.unit),
        unitPrice: initSell > 0 ? initSell : '',
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
            unit: normalizeUnit(matched.unit),
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
    const sellPrice = Number(firstAvailable?.sellingPrice) || 0;
    setItems((prev) => [
      ...prev,
      {
        productId: firstAvailable?.id || '',
        quantity: 1,
        unit: normalizeUnit(firstAvailable?.unit),
        unitPrice: sellPrice > 0 ? sellPrice : '',
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
          item.unit = item.unit || 'pc';
        } else {
          const prod = products.find((p) => p.id === value);
          if (prod) {
            const sellNum = Number(prod.sellingPrice) || 0;
            item.productId = prod.id;
            item.unitPrice = sellNum > 0 ? prod.sellingPrice : '';
            item.productName = prod.name;
            item.unit = normalizeUnit(prod.unit);
          }
        }
      }

      updated[index] = item;
      return updated;
    });
  };

  // Calculations
  const calculatedItems = items.map((item) => {
    const prod = products.find((p) => p.id === item.productId || p._id === item.productId);
    const qty = Number(item.quantity) || 0;
    const price = Number(item.unitPrice) || 0;
    const available = Number(prod?.quantity) || 0;
    return {
      productId: prod?.id || 'custom',
      productName: item.productName || prod?.name || 'Equipment Part',
      sku: prod?.sku || '',
      quantity: qty,
      unit: normalizeUnit(item.unit || prod?.unit),
      unitPrice: price,
      availableStock: prod ? available : 999,
      total: qty * price,
    };
  });

  const {
    subtotal,
    discount: discountVal,
    tax: taxVal,
    total,
  } = calculateSaleTotals(calculatedItems, discount, tax);

  const {
    paidAmount: calculatedPaid,
    dueAmount: calculatedDue,
  } = calculatePaymentBreakdown({
    total,
    paymentStatus,
    paidAmount: paidAmountInput,
  });

  const validate = (statusToSave) => {
    const errs = {};
    if (!invoiceNo.trim()) errs.invoiceNo = 'Invoice number is required.';
    if (items.length === 0) errs.items = 'Please add at least one product.';

    // Account for quantities already deducted on the invoice being edited
    const previouslyDeductedByProd = new Map();
    if (isEditing && existingSale?.status === 'completed') {
      for (const prevIt of existingSale.items || []) {
        const pid = String(prevIt.productId || '');
        if (!pid || pid === 'custom' || pid === 'custom-item') continue;
        previouslyDeductedByProd.set(pid, (previouslyDeductedByProd.get(pid) || 0) + (Number(prevIt.quantity) || 0));
      }
    }

    const requestedByProd = new Map();
    for (let i = 0; i < items.length; i++) {
      const line = items[i];
      const prod = products.find((p) => p.id === line.productId || p._id === line.productId);
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
      if (statusToSave === 'completed' && deductStock && prod) {
        const key = String(prod.id);
        const totalReq = (requestedByProd.get(key) || 0) + qty;
        requestedByProd.set(key, totalReq);
        const prevDeducted =
          existingSale?.deductStock === false
            ? 0
            : previouslyDeductedByProd.get(key) || previouslyDeductedByProd.get(String(prod._id)) || 0;
        const effectiveAvailable = (Number(prod.quantity) || 0) + prevDeducted;
        if (totalReq > effectiveAvailable) {
          errs.items = `Line ${i + 1}: Cannot sell ${totalReq} units of "${prod.name}". Only ${effectiveAvailable} available in stock!`;
          break;
        }
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
      paymentMethod,
      paymentStatus,
      paidAmount: calculatedPaid,
      dueAmount: calculatedDue,
      discount: discountVal,
      tax: taxVal,
      notes,
      requisitionRef,
      quotationId: quotationId || null,
      entrySource,
      documentType,
      bookNumber: bookNumber.trim(),
      manualSerialNo: manualSerialNo.trim(),
      deductStock,
      machineDetails: normalizeMachineDetails(machineDetails),
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
        <BackLink to="/sales">
          {l({ bn: 'বিক্রয় তালিকায় ফিরে যান', en: 'Back to Sales List', obro: 'Back to Sales List' })}
        </BackLink>

        {prefill && (
          <div className="flex items-center gap-2 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 px-3 py-1 rounded-lg text-xs text-purple-700 dark:text-purple-300 font-semibold">
            <FileSpreadsheet className="h-4 w-4" />
            <span>{l({ bn: `দরপত্র #${prefill.quotationNumber} থেকে রূপান্তরকৃত`, en: `Converted from Quotation #${prefill.quotationNumber}`, obro: `Converted from Quotation #${prefill.quotationNumber}` })}</span>
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {isEditing
              ? l({ bn: 'বিক্রয় চালান সংশোধন', en: 'Edit Sales Invoice', obro: 'Edit Sales Invoice' })
              : l({ bn: 'নতুন বিক্রয় চালান (POS)', en: 'Record Sale / POS Invoice', obro: 'Record Sale / POS Invoice' })}
          </CardTitle>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {isEditing
              ? l({
                  bn: `ইনভয়েস #${invoiceNo}-এর সকল তথ্য ও মালামাল আপডেট করুন`,
                  en: `Update all items and details for Invoice #${invoiceNo}`,
                  obro: `Invoice #${invoiceNo} update korun`,
                })
              : l({
                  bn: 'কাস্টমার প্রোফাইল, কর্পোরেট রোল এবং আধুনিক মাল্টি-টায়ার প্রাইসিংসহ বিক্রয় মেমো তৈরি করুন।',
                  en: 'Create a point-of-sale invoice with full international customer role & enterprise management.',
                  obro: 'Point-of-sale invoice create korun with customer role & pricing.',
                })}
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {errors.form && (
            <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-600 dark:text-red-400 font-semibold flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errors.form}</span>
            </div>
          )}

          {/* ENTRY SOURCE & KHATA / OFFLINE CONTROLS (Proposal 2) */}
          <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-xs font-extrabold text-amber-900 dark:text-amber-200 block">
                  {l({ bn: 'এন্ট্রির ধরন ও খাতা / অফলাইন মোড', en: 'Entry Mode (Online / Khata / Offline Paper)', obro: 'Entry Mode (Online / Khata / Offline)' })}
                </span>
                <span className="text-[11px] text-slate-600 dark:text-slate-400">
                  {l({
                    bn: 'পুরানো খাতা বা অফলাইন কাগজের ক্যাশমেমো/চালান এন্ট্রি দিতে উৎস নির্বাচন করুন',
                    en: 'Switch to Khata Archive or Offline Paper mode for hardcopy/backdated entries.',
                    obro: 'Khata Archive ba Offline mode select korun purano paper entryr jonno.',
                  })}
                </span>
              </div>

              <div className="inline-flex rounded-xl p-1 bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800/60">
                {[
                  { id: 'online', label: l({ bn: 'লাইভ POS', en: 'Live POS', obro: 'Live POS' }) },
                  { id: 'khata', label: l({ bn: 'পুরানো খাতা', en: 'Old Khata', obro: 'Purano Khata' }) },
                  { id: 'offline', label: l({ bn: 'অফলাইন কাগজ', en: 'Offline Paper', obro: 'Offline' }) },
                ].map((src) => (
                  <button
                    key={src.id}
                    type="button"
                    onClick={() => {
                      setEntrySource(src.id);
                      setDeductStock(src.id !== 'khata');
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      entrySource === src.id
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    {src.label}
                  </button>
                ))}
              </div>
            </div>

            {(entrySource !== 'online' || documentType === 'challan') && (
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2 border-t border-amber-200/70 dark:border-amber-800/40 text-xs">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">ডকুমেন্ট ধরন</label>
                  <select
                    value={documentType}
                    onChange={(e) => setDocumentType(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
                  >
                    <option value="cash_memo">Cash Memo (ক্যাশ মেমো)</option>
                    <option value="challan">Delivery Challan (ডেলিভারী চালান)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">বই / খাতা নং (Book No)</label>
                  <input
                    type="text"
                    value={bookNumber}
                    onChange={(e) => setBookNumber(e.target.value)}
                    placeholder="e.g. Book-04"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">হাতে লেখা নং (Manual Serial)</label>
                  <input
                    type="text"
                    value={manualSerialNo}
                    onChange={(e) => setManualSerialNo(e.target.value)}
                    placeholder="e.g. #267"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono"
                  />
                </div>

                <div className="flex items-end pb-1">
                  <label className="inline-flex items-center gap-2 cursor-pointer font-bold text-slate-800 dark:text-slate-200 select-none">
                    <input
                      type="checkbox"
                      checked={deductStock}
                      onChange={(e) => setDeductStock(e.target.checked)}
                      className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 h-4 w-4"
                    />
                    <span className="text-[11px] leading-tight">
                      {deductStock ? 'স্টক থেকে কমবে (Deduct Stock)' : 'আর্কাইভ: স্টক কমবে না'}
                    </span>
                  </label>
                </div>
              </div>
            )}
          </div>

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
                  label="গ্রাহকের নাম (Customer Name)"
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

          {/* SECTION 1.5: MACHINE & TECHNICAL SPEC BOX */}
          <MachineSpecCard
            value={machineDetails}
            onChange={setMachineDetails}
            quotations={quotations}
            sales={sales}
            priceCatalog={priceCatalog}
            machineModels={machineModels}
            language={language}
            accentColor="emerald"
            compact
          />

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

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Select
              label="পেমেন্ট স্ট্যাটাস (Payment Status)"
              value={paymentStatus}
              onChange={(e) => setPaymentStatus(e.target.value)}
              options={[
                { value: 'paid', label: 'সম্পূর্ণ পরিশোধ (Paid in Full)' },
                { value: 'partial', label: 'আংশিক পরিশোধ (Partial / Advance)' },
                { value: 'due', label: 'সম্পূর্ণ বকেয়া (Due / On Credit)' },
              ]}
            />

            <Select
              label="পেমেন্ট মাধ্যম (Payment Method)"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              options={[
                { value: 'cash', label: 'নগদ (Cash)' },
                { value: 'mobile_banking', label: 'মোবাইল ব্যাংকিং (bKash / Nagad)' },
                { value: 'bank_transfer', label: 'ব্যাংক ট্রান্সফার (Bank Transfer)' },
                { value: 'card', label: 'কার্ড (Card)' },
                { value: 'cheque', label: 'চেক (Cheque)' },
              ]}
            />

            <Input
              label={`বিশেষ ছাড় / ডিসকাউন্ট (${settings.currency})`}
              type="number"
              step="any"
              min="0"
              max={subtotal}
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
              placeholder="0"
              helperText={discountVal > 0 ? `নিট মূল্যে -${formatCurrency(discountVal, settings.currency)} ছাড় প্রযোজ্য` : 'সাবটোটাল থেকে সরাসরি ছাড়'}
            />

            {paymentStatus === 'partial' ? (
              <Input
                label={`জমা / প্রাপ্ত টাকা (${settings.currency})`}
                type="number"
                step="any"
                min="0"
                max={total}
                value={paidAmountInput}
                onChange={(e) => setPaidAmountInput(e.target.value)}
                placeholder="0"
                helperText={`অবশিষ্ট বকেয়া থাকবে: ${formatCurrency(calculatedDue, settings.currency)}`}
                required
              />
            ) : (
              <Select
                label="সংযুক্ত দরপত্র / কোটেশন (Linked Quotation)"
                value={quotationId || ''}
                onChange={(e) => setQuotationId(e.target.value)}
                options={[
                  { value: '', label: 'সরাসরি বিক্রয় (কোনো কোটেশন নয়)' },
                  ...(quotations || []).map((q) => ({
                    value: q.id || q._id,
                    label: `#${q.quotationNumber} — ${q.customerName || 'Client'} (${formatCurrency(q.totalAmount || 0, settings.currency)})`,
                  })),
                ]}
              />
            )}
          </div>

          <div className={`grid grid-cols-1 ${paymentStatus === 'partial' ? 'sm:grid-cols-2' : ''} gap-4`}>
            {paymentStatus === 'partial' && (
              <Select
                label="সংযুক্ত দরপত্র / কোটেশন (Linked Quotation)"
                value={quotationId || ''}
                onChange={(e) => setQuotationId(e.target.value)}
                options={[
                  { value: '', label: 'সরাসরি বিক্রয় (কোনো কোটেশন নয়)' },
                  ...(quotations || []).map((q) => ({
                    value: q.id || q._id,
                    label: `#${q.quotationNumber} — ${q.customerName || 'Client'} (${formatCurrency(q.totalAmount || 0, settings.currency)})`,
                  })),
                ]}
              />
            )}

            <Input
              label="ইনভয়েস নোট ও মন্তব্য (Notes)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="পেমেন্ট মাধ্যম, ছাড় বা ডেলিভারি সংক্রান্ত নোট"
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
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                বিক্রিত মালামালের তালিকা (Products to Bill)
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  icon={Search}
                  onClick={() => setLookupModalState({ isOpen: true, targetRowIdx: null })}
                >
                  {l({ bn: 'দাম ও মেশিন খুঁজুন', en: 'Search Parts & Prices', obro: 'Search Price List' })}
                </Button>
                <Button variant="outline" size="sm" icon={Plus} onClick={handleAddItem}>
                  আইটেম যোগ করুন (Add Line)
                </Button>
              </div>
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
                    className={`flex flex-wrap xl:flex-nowrap items-stretch xl:items-center gap-2.5 p-3 rounded-xl border transition-all ${
                      isOverStock
                        ? 'border-red-300 dark:border-red-800 bg-red-50/40 dark:bg-red-950/20'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40'
                    }`}
                  >
                    <div className="w-full xl:flex-1 xl:min-w-[260px] space-y-1.5 min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <div className="flex-1 min-w-0">
                          <Select
                            value={products.some((p) => p.id === line.productId) ? line.productId : 'custom'}
                            onChange={(e) => handleItemChange(index, 'productId', e.target.value)}
                            options={[
                              { value: 'custom', label: '➕ বিশেষ পার্টস / কাস্টম আইটেম (Custom Part / Quotation Item)' },
                              ...products.map((p) => ({
                                value: p.id,
                                label: `${p.name} (মজুদ: ${p.quantity} ${normalizeUnit(p.unit)} · ${formatCurrency(p.sellingPrice, settings.currency)})`,
                              })),
                            ]}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => setLookupModalState({ isOpen: true, targetRowIdx: index })}
                          className="p-2 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/70 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 shrink-0"
                          title="আগের কোটেশন বা বিক্রয় থেকে দাম ও পার্টস খুঁজুন"
                        >
                          <Search className="h-4 w-4" />
                        </button>
                      </div>
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

                    <div className="flex-1 min-w-[96px] sm:flex-none sm:w-28">
                      <select
                        value={normalizeUnit(line.unit)}
                        onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                        aria-label={l({ bn: 'একক (Unit)', en: 'Unit', obro: 'Unit' })}
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 px-2.5 py-2 text-xs font-semibold text-center focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      >
                        {getUnitSelectOptions(line.unit, language).map((u) => (
                          <option key={u.value} value={u.value}>
                            {u.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="w-20 sm:w-24 shrink-0">
                      <Input
                        type="number"
                        step="any"
                        min="0.01"
                        value={line.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                        placeholder="পরিমাণ"
                      />
                    </div>

                    {showRate && (
                      <div className="flex-1 min-w-[110px] sm:flex-none sm:w-32">
                        <Input
                          type="number"
                          step="any"
                          min="0"
                          value={line.unitPrice}
                          onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)}
                          placeholder="0"
                        />
                      </div>
                    )}

                    {showLineTotal && (
                      <div className="ml-auto xl:ml-0 w-auto sm:min-w-[100px] sm:w-28 text-right font-mono font-bold text-sm text-slate-800 dark:text-slate-200 tabular-nums shrink-0 self-center">
                        {formatCurrency(lineTotal, settings.currency)}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => handleRemoveItem(index)}
                      className="p-2 text-slate-400 hover:text-red-500 transition-colors self-center shrink-0"
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
            <div className="text-xs text-slate-500 space-y-1.5 flex-1">
              <p>• বিল সম্পন্ন করলে ইনভেন্টরি থেকে স্বয়ংক্রিয়ভাবে স্টক সমন্বয় হবে।</p>
              <p>• মেমো প্রিন্ট মোডালে ক্যাশ মেমো, চালান, প্যাড ও কোটেশন পাওয়া যাবে।</p>
              <p className="text-emerald-700 dark:text-emerald-400 font-semibold">
                • ছাড় (Discount), জমা ও বকেয়া পরিবর্তন করলে সাথে সাথে গ্রাহক লেজার ও MongoDB আপডেট হবে।
              </p>
              {isEditing && existingSale && Number(existingSale.paidAmount) > total && (
                <p className="text-amber-700 dark:text-amber-400 font-semibold bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 px-2.5 py-1.5 rounded-lg">
                  ℹ️ পূর্বে জমা ছিল {formatCurrency(existingSale.paidAmount, settings.currency)}; ছাড় প্রয়োগের পর নতুন নিট মূল্য {formatCurrency(total, settings.currency)} (পার্থক্য {formatCurrency(Number(existingSale.paidAmount) - total, settings.currency)})।
                </p>
              )}
              {calculatedDue > 0 && showGrandTotal && (
                <p className="text-red-600 dark:text-red-400 font-bold">
                  • অবশিষ্ট বকেয়া {formatCurrency(calculatedDue, settings.currency)} গ্রাহক লেজারে জমা হবে।
                </p>
              )}
            </div>

            {showGrandTotal ? (
              <div className="w-full sm:w-96 space-y-2.5 text-xs bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                  <span>সর্বমোট (Subtotal):</span>
                  <span className="font-mono font-semibold text-slate-900 dark:text-white">
                    {formatCurrency(subtotal, settings.currency)}
                  </span>
                </div>

                {/* Inline Editable Discount Control */}
                <div className="flex justify-between items-center gap-2 text-emerald-700 dark:text-emerald-400 font-semibold">
                  <label htmlFor="invoiceDiscountSummary" className="shrink-0">
                    বিশেষ ছাড় (Discount -):
                  </label>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-emerald-600">-</span>
                    <input
                      id="invoiceDiscountSummary"
                      type="number"
                      step="any"
                      min="0"
                      max={subtotal}
                      value={discount}
                      onChange={(e) => setDiscount(e.target.value)}
                      placeholder="0"
                      className="w-28 px-2.5 py-1 text-right font-mono font-bold text-xs rounded-lg border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                    />
                  </div>
                </div>

                {/* Inline Editable Tax / Extra Charge */}
                <div className="flex justify-between items-center gap-2 text-slate-600 dark:text-slate-400">
                  <label htmlFor="invoiceTaxSummary" className="shrink-0">
                    ভ্যাট / অতিরিক্ত চার্জ (+):
                  </label>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-slate-500">+</span>
                    <input
                      id="invoiceTaxSummary"
                      type="number"
                      step="any"
                      min="0"
                      value={tax}
                      onChange={(e) => setTax(e.target.value)}
                      placeholder="0"
                      className="w-28 px-2.5 py-1 text-right font-mono font-semibold text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center font-bold text-slate-800 dark:text-white pt-2 border-t border-slate-200 dark:border-slate-700">
                  <span>নিট মূল্য (Net Payable):</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400 text-base">
                    {formatCurrency(total, settings.currency)}
                  </span>
                </div>

                {/* Inline Payment Status Quick Toggle + Editable Paid Input */}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-600 dark:text-slate-400 font-semibold">পেমেন্ট মোড:</span>
                    <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-900">
                      {[
                        { val: 'paid', text: 'পরিশোধ' },
                        { val: 'partial', text: 'আংশিক' },
                        { val: 'due', text: 'বকেয়া' },
                      ].map((opt) => (
                        <button
                          key={opt.val}
                          type="button"
                          onClick={() => setPaymentStatus(opt.val)}
                          className={`px-2 py-0.5 text-[11px] font-bold transition-colors ${
                            paymentStatus === opt.val
                              ? 'bg-emerald-600 text-white'
                              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          {opt.text}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-slate-700 dark:text-slate-300">
                    <span>জমা / নগদ প্রাপ্তি (Paid):</span>
                    {paymentStatus === 'partial' ? (
                      <input
                        type="number"
                        step="any"
                        min="0"
                        max={total}
                        value={paidAmountInput}
                        onChange={(e) => setPaidAmountInput(e.target.value)}
                        placeholder="0"
                        className="w-28 px-2.5 py-1 text-right font-mono font-bold text-xs rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                      />
                    ) : (
                      <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                        {formatCurrency(calculatedPaid, settings.currency)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex justify-between items-center font-bold text-red-600 dark:text-red-400 pt-1.5 border-t border-slate-200 dark:border-slate-700">
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
              {l({ bn: 'বাতিল করুন', en: 'Cancel', obro: 'Cancel' })}
            </Button>

            <div className="flex items-center gap-2">
              {isEditing ? (
                <Button
                  variant="primary"
                  icon={Save}
                  data-enter-final-button="true"
                  isLoading={isSubmitting}
                  onClick={() => handleSubmit(existingSale?.status || 'completed')}
                  className="shadow-md shadow-emerald-500/20 font-bold"
                >
                  {l({ bn: 'ইনভয়েস আপডেট করুন', en: 'Update Invoice', obro: 'Update Invoice' })}
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    icon={Clock}
                    isLoading={isSubmitting}
                    onClick={() => handleSubmit('draft')}
                  >
                    {l({ bn: 'ড্রাফট সেভ করুন', en: 'Save as Draft', obro: 'Save as Draft' })}
                  </Button>
                  <Button
                    variant="primary"
                    icon={CheckCircle2}
                    data-enter-final-button="true"
                    isLoading={isSubmitting}
                    onClick={() => handleSubmit('completed')}
                    className="shadow-md shadow-emerald-500/20 font-bold"
                  >
                    {l({ bn: 'বিক্রয় সম্পন্ন ও প্রিন্ট করুন', en: 'Complete & Print', obro: 'Complete & Print' })}
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Smart Machine & Parts Price Lookup Modal */}
      <SmartPartLookupModal
        isOpen={lookupModalState.isOpen}
        onClose={() => setLookupModalState({ isOpen: false, targetRowIdx: null })}
        preferredMachine={machineDetails}
        onSelectPart={(picked) => {
          const unitVal = normalizeUnit(picked.unit || 'pc');
          const rateVal = Number(picked.unitPrice) || 0;
          if (picked.machineDetails && !machineDetails.machineName && picked.machineDetails.machineName) {
            setMachineDetails((prev) => ({
              ...prev,
              ...normalizeMachineDetails(picked.machineDetails),
              autoSaveToPriceCatalog: prev.autoSaveToPriceCatalog,
            }));
          }
          setItems((prev) => {
            const targetIdx = lookupModalState.targetRowIdx;
            if (targetIdx !== null && targetIdx >= 0 && targetIdx < prev.length) {
              const updated = [...prev];
              updated[targetIdx] = {
                ...updated[targetIdx],
                productId: picked.productId || 'custom',
                productName: picked.name,
                unit: unitVal,
                unitPrice: rateVal,
              };
              return updated;
            }
            if (prev.length === 1 && !prev[0].productName?.trim() && prev[0].productId === 'custom') {
              return [
                {
                  ...prev[0],
                  productId: picked.productId || 'custom',
                  productName: picked.name,
                  unit: unitVal,
                  unitPrice: rateVal,
                },
              ];
            }
            return [
              ...prev,
              {
                productId: picked.productId || 'custom',
                productName: picked.name,
                quantity: 1,
                unit: unitVal,
                unitPrice: rateVal,
              },
            ];
          });
        }}
      />

      {/* Immediate Receipt Modal Preview upon sale completion */}
      <PrintableReceiptModal
        isOpen={Boolean(completedSale)}
        onClose={() => {
          setCompletedSale(null);
          navigate('/sales');
        }}
        sale={completedSale}
        initialDocType={completedSale?.documentType === 'challan' ? DOCUMENT_TYPES.CHALLAN : DOCUMENT_TYPES.CASH_MEMO}
      />
    </div>
  );
};
