import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useAppData } from '../../context/AppDataContext';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input, Select, Textarea } from '../../components/forms/FormControls';
import { formatCurrency } from '../../utils/formatters';
import { PrintableReceiptModal } from '../../components/receipt/PrintableReceiptModal';
import { DOCUMENT_TYPES } from '../../utils/printTemplateGenerator';
import {
  FileSpreadsheet,
  Plus,
  Trash2,
  Building2,
  UserCheck,
  MapPin,
  Phone,
  Mail,
  ArrowLeft,
  Printer,
  Save,
  CheckCircle2,
  Calendar,
  Sparkles,
  HelpCircle,
} from 'lucide-react';

export const QuotationFormPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    products,
    customers,
    quotations,
    createQuotation,
    updateQuotation,
    settings,
  } = useAppData();

  const isEditing = !!id;
  const existingQuote = useMemo(() => {
    if (!id) return null;
    return quotations.find((q) => q.id === id || q._id === id);
  }, [id, quotations]);

  // Initial quotation number generator
  const generatedQuotationNo = useMemo(() => {
    if (existingQuote) return existingQuote.quotationNumber;
    const year = new Date().getFullYear();
    const count = quotations.length;
    return `QT-${year}-${String(count + 541).padStart(4, '0')}`;
  }, [existingQuote, quotations.length]);

  // Form State
  const [quotationNumber, setQuotationNumber] = useState('');
  const [quotationDate, setQuotationDate] = useState(new Date().toISOString().split('T')[0]);
  const [validUntil, setValidUntil] = useState(
    new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [requisitionRef, setRequisitionRef] = useState('');

  // Customer Profile State
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerCompany, setCustomerCompany] = useState('');
  const [customerRole, setCustomerRole] = useState('owner');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [autoSaveCustomer, setAutoSaveCustomer] = useState(true);

  // Line items state
  const [items, setItems] = useState([
    {
      id: 'item-1',
      productId: '',
      name: '',
      quantity: 1,
      unit: 'pc',
      unitPrice: 0,
      lineTotal: 0,
    },
  ]);

  // Column and Total visibility controls ("eta ek line e thakbe eigula")
  const [showRate, setShowRate] = useState(true);
  const [showLineTotal, setShowLineTotal] = useState(true);
  const [showGrandTotal, setShowGrandTotal] = useState(true);

  // Summary financials
  const [discount, setDiscount] = useState(0);
  const [tax, setTax] = useState(0);
  const [status, setStatus] = useState('draft');
  const [termsAndConditions, setTermsAndConditions] = useState(
    '১. সকল মালামাল প্রাপ্যতা সাপেক্ষে সরবরাহ করা হইবে।\n২. ডেলিভারি সময়: কার্যাদেশ প্রাপ্তির ৩ কার্যদিবসের মধ্যে।\n৩. এই কোটেশনের মেয়াদ জারির তারিখ হইতে ১৫ দিন পর্যন্ত বৈধ।'
  );
  const [notes, setNotes] = useState('');

  // Modal print preview
  const [printQuotationData, setPrintQuotationData] = useState(null);

  // Populate data if editing
  useEffect(() => {
    if (existingQuote) {
      setQuotationNumber(existingQuote.quotationNumber || '');
      setQuotationDate(
        existingQuote.date
          ? new Date(existingQuote.date).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0]
      );
      setValidUntil(
        existingQuote.validUntil
          ? new Date(existingQuote.validUntil).toISOString().split('T')[0]
          : ''
      );
      setRequisitionRef(existingQuote.requisitionRef || '');
      setSelectedCustomerId(existingQuote.customerId || '');
      setCustomerName(existingQuote.customerName || '');
      setCustomerCompany(existingQuote.customerCompany || '');
      setCustomerRole(existingQuote.customerRole || 'owner');
      setCustomerPhone(existingQuote.customerPhone || '');
      setCustomerEmail(existingQuote.customerEmail || '');
      setCustomerAddress(existingQuote.customerAddress || '');

      if (existingQuote.showRate !== undefined) setShowRate(existingQuote.showRate);
      if (existingQuote.showLineTotal !== undefined) setShowLineTotal(existingQuote.showLineTotal);
      if (existingQuote.showGrandTotal !== undefined) setShowGrandTotal(existingQuote.showGrandTotal);

      if (existingQuote.items && existingQuote.items.length > 0) {
        setItems(
          existingQuote.items.map((it, idx) => ({
            id: it.id || `item-${idx + 1}`,
            productId: it.productId || '',
            name: it.name || it.productName || '',
            quantity: Number(it.quantity) || 1,
            unit: it.unit || 'pc',
            unitPrice: Number(it.unitPrice) || 0,
            lineTotal: Number(it.lineTotal) || 0,
          }))
        );
      }
      setDiscount(Number(existingQuote.discount) || 0);
      setTax(Number(existingQuote.tax) || 0);
      setStatus(existingQuote.status || 'draft');
      setTermsAndConditions(existingQuote.termsAndConditions || '');
      setNotes(existingQuote.notes || '');
    } else {
      setQuotationNumber(generatedQuotationNo);
    }
  }, [existingQuote, generatedQuotationNo]);

  // When selecting an existing customer, auto fill details
  const handleSelectCustomer = (cust) => {
    if (!cust) {
      setSelectedCustomerId('');
      setCustomerName('');
      setCustomerCompany('');
      setCustomerRole('owner');
      setCustomerPhone('');
      setCustomerEmail('');
      setCustomerAddress('');
      return;
    }
    setSelectedCustomerId(cust.id);
    setCustomerName(cust.name || '');
    setCustomerCompany(cust.companyName || cust.company || '');
    setCustomerRole(cust.designationRole || cust.role || 'owner');
    setCustomerPhone(cust.phone || cust.companyPhone || '');
    setCustomerEmail(cust.email || '');
    setCustomerAddress(cust.address || cust.location || '');
  };

  // Add Item Row
  const addItemRow = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}-${prev.length + 1}`,
        productId: '',
        name: '',
        quantity: 1,
        unit: 'pc',
        unitPrice: 0,
        lineTotal: 0,
      },
    ]);
  };

  // Remove Item Row
  const removeItemRow = (idx) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  // Quick load standard sample items from handwritten photo
  const loadShantaSampleItems = () => {
    setCustomerName('মোসাদ্দেক হোসেন');
    setCustomerCompany('কর্ণফুলী কোল্ড স্টোরেজ লিমিটেড');
    setCustomerRole('purchaser');
    setCustomerPhone('01819-234567');
    setCustomerAddress('কালুরঘাট শিল্প এলাকা, চট্টগ্রাম');
    setRequisitionRef('RFQ-WHATSAPP-KCS-08');

    setItems([
      { id: 'sample-1', productId: '', name: 'Connecting Rod with Piston complete', quantity: 1, unit: 'pc', unitPrice: 10000, lineTotal: 10000 },
      { id: 'sample-2', productId: '', name: 'Bearing Bush (motor side)', quantity: 1, unit: 'pc', unitPrice: 2000, lineTotal: 2000 },
      { id: 'sample-3', productId: '', name: 'Bearing Bush (crank side)', quantity: 1, unit: 'pc', unitPrice: 2000, lineTotal: 2000 },
      { id: 'sample-4', productId: '', name: 'Thrust Washer (crank side)', quantity: 1, unit: 'pc', unitPrice: 1500, lineTotal: 1500 },
      { id: 'sample-5', productId: '', name: 'Bushing for Crankshaft', quantity: 1, unit: 'pc', unitPrice: 500, lineTotal: 500 },
      { id: 'sample-6', productId: '', name: 'Rear Bearing Flange Gasket', quantity: 1, unit: 'pc', unitPrice: 1000, lineTotal: 1000 },
      { id: 'sample-7', productId: '', name: 'Gasket for Suction Valves', quantity: 1, unit: 'pc', unitPrice: 500, lineTotal: 500 },
      { id: 'sample-8', productId: '', name: 'Oil Pump complete', quantity: 1, unit: 'pc', unitPrice: 10000, lineTotal: 10000 },
      { id: 'sample-9', productId: '', name: 'O-Ring for Oil Pump', quantity: 1, unit: 'pc', unitPrice: 500, lineTotal: 500 },
      { id: 'sample-10', productId: '', name: 'Valve Plate complete', quantity: 1, unit: 'pc', unitPrice: 7000, lineTotal: 7000 },
      { id: 'sample-11', productId: '', name: 'Lower Valve Plate Gasket', quantity: 1, unit: 'pc', unitPrice: 600, lineTotal: 600 },
      { id: 'sample-12', productId: '', name: 'Upper Valve Plate Gasket', quantity: 1, unit: 'pc', unitPrice: 600, lineTotal: 600 },
      { id: 'sample-13', productId: '', name: 'Cylinder Head, Air Cooled (Modern)', quantity: 1, unit: 'pc', unitPrice: 5000, lineTotal: 5000 },
      { id: 'sample-14', productId: '', name: 'Shaft Seal complete', quantity: 1, unit: 'pc', unitPrice: 5000, lineTotal: 5000 },
      { id: 'sample-15', productId: '', name: 'Gasket for Shaft Seal Cover', quantity: 1, unit: 'pc', unitPrice: 500, lineTotal: 500 },
      { id: 'sample-16', productId: '', name: 'Set of Gasket', quantity: 1, unit: 'set', unitPrice: 5000, lineTotal: 5000 },
      { id: 'sample-17', productId: '', name: 'Base Plate Gasket', quantity: 1, unit: 'pc', unitPrice: 1500, lineTotal: 1500 },
      { id: 'sample-18', productId: '', name: 'Gasket Disch. Valve', quantity: 1, unit: 'pc', unitPrice: 500, lineTotal: 500 },
    ]);
  };

  // Update item fields
  const handleItemChange = (idx, field, value) => {
    setItems((prev) => {
      const updated = [...prev];
      const cur = { ...updated[idx], [field]: value };

      if (field === 'productId' && value) {
        const prod = products.find((p) => p.id === value);
        if (prod) {
          cur.name = prod.name;
          cur.unitPrice = prod.price || 0;
          cur.unit = prod.unit || 'pc';
        }
      }

      const q = Number(cur.quantity) || 0;
      const rate = Number(cur.unitPrice) || 0;
      cur.lineTotal = Math.round(q * rate * 100) / 100;

      updated[idx] = cur;
      return updated;
    });
  };

  // Totals
  const subtotal = useMemo(() => {
    return items.reduce((sum, it) => sum + (Number(it.lineTotal) || 0), 0);
  }, [items]);

  const grandTotal = useMemo(() => {
    return Math.max(0, subtotal - Number(discount || 0) + Number(tax || 0));
  }, [subtotal, discount, tax]);

  // Handle Save
  const handleSave = (andPrint = false) => {
    if (!customerName.trim()) {
      alert('অনুগ্রহ করে কাস্টমার বা ক্লায়েন্টের নাম লিখুন (Customer Name is required).');
      return;
    }

    const validItems = items.filter((it) => it.name.trim() !== '');
    if (validItems.length === 0) {
      alert('কমপক্ষে একটি পণ্যের বিবরণ লিখুন (At least 1 item is required).');
      return;
    }

    const payload = {
      quotationNumber: quotationNumber.trim() || generatedQuotationNo,
      date: new Date(quotationDate).toISOString(),
      validUntil: validUntil ? new Date(validUntil).toISOString() : null,
      requisitionRef: requisitionRef.trim(),
      customerId: selectedCustomerId || null,
      customerName: customerName.trim(),
      customerCompany: customerCompany.trim(),
      customerRole,
      customerPhone: customerPhone.trim(),
      customerEmail: customerEmail.trim(),
      customerAddress: customerAddress.trim(),
      customerLocation: customerAddress.trim(),
      items: validItems,
      subtotal,
      discount: Number(discount) || 0,
      tax: Number(tax) || 0,
      totalAmount: grandTotal,
      showRate,
      showLineTotal,
      showGrandTotal,
      status,
      termsAndConditions,
      notes: notes.trim(),
    };

    let result;
    if (isEditing) {
      result = updateQuotation(id, payload);
    } else {
      result = createQuotation(payload);
    }

    if (result.success) {
      const savedQuote = result.quotation || { ...payload, id };
      if (andPrint) {
        setPrintQuotationData(savedQuote);
      } else {
        navigate(`/quotations/${savedQuote.id || id}`);
      }
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/quotations"
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <FileSpreadsheet className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              <span>{isEditing ? 'দরপত্র সংশোধন (Edit Quotation)' : 'নতুন দরপত্র তৈরি (New Quotation)'}</span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Generate quotation against client requisition or RFQ and print on M/S. Shanta Refrigeration official pad.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isEditing && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              icon={Sparkles}
              onClick={loadShantaSampleItems}
              title="শান্তর বাস্তব হ্যান্ডরিটেন কোটেশনের ২২টি যন্ত্রাংশ প্রি-লোড করুন"
            >
              Load Sample Spare Parts
            </Button>
          )}

          <Button
            type="button"
            variant="secondary"
            size="sm"
            icon={Printer}
            onClick={() => handleSave(true)}
          >
            Save & Print Pad
          </Button>

          <Button
            type="button"
            variant="primary"
            size="sm"
            icon={Save}
            onClick={() => handleSave(false)}
          >
            {isEditing ? 'Update Quotation' : 'Save Quotation'}
          </Button>
        </div>
      </div>

      {/* Meta Information Card */}
      <Card className="p-5">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Quotation Number (নং) *
            </label>
            <input
              type="text"
              value={quotationNumber}
              onChange={(e) => setQuotationNumber(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
              placeholder="e.g. QT-2026-0541"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Quotation Date (তারিখ)
            </label>
            <input
              type="date"
              value={quotationDate}
              onChange={(e) => setQuotationDate(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Valid Until (মেয়াদ)
            </label>
            <input
              type="date"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Requisition Ref / সূত্র (WhatsApp/RFQ)
            </label>
            <input
              type="text"
              value={requisitionRef}
              onChange={(e) => setRequisitionRef(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
              placeholder="e.g. RFQ-WHATSAPP-09"
            />
          </div>
        </div>
      </Card>

      {/* Customer Corporate Profile Section */}
      <Card className="p-5 border-l-4 border-l-purple-500">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Building2 className="h-4 w-4 text-purple-600" />
              <span>Customer / Corporate Client Profile (গ্রাহকের প্রাতিষ্ঠানিক তথ্য)</span>
            </h2>
            <p className="text-[11px] text-slate-400">
              Select existing client or enter new company details. Will auto-create/update customer records.
            </p>
          </div>

          {/* Quick Picker */}
          <div className="w-full sm:w-64">
            <select
              value={selectedCustomerId}
              onChange={(e) => {
                const found = customers.find((c) => c.id === e.target.value);
                handleSelectCustomer(found || null);
              }}
              className="w-full px-3 py-1.5 text-xs rounded-xl border border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/30 text-purple-900 dark:text-purple-200 font-medium focus:outline-none"
            >
              <option value="">-- Quick Pick Registered Client --</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.companyName ? `(${c.companyName})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Client Contact Person (নাম) *
            </label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="e.g. ইঞ্জিঃ কামরুল ইসলাম"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Company Name (প্রতিষ্ঠানের নাম)
            </label>
            <input
              type="text"
              value={customerCompany}
              onChange={(e) => setCustomerCompany(e.target.value)}
              placeholder="e.g. সোনারগাঁও টেক্সটাইল মিলস লিঃ"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Designation / Role (কাস্টমার স্ট্যাটাস)
            </label>
            <select
              value={customerRole}
              onChange={(e) => setCustomerRole(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
            >
              <option value="owner">কোম্পানির মালিক / স্বত্বাধিকারী (Owner)</option>
              <option value="agent">কোম্পানির এজেন্ট / প্রতিনিধি (Agent)</option>
              <option value="purchaser">ক্রয় কর্মকর্তা / প্রকিউরমেন্ট ম্যানেজার (Purchaser)</option>
              <option value="supplier_rep">সরবরাহকারী / ভেন্ডর প্রতিনিধি (Supplier Rep)</option>
              <option value="wholesale">পাইকারি ডিলার / মার্চেন্ট (Wholesale Dealer)</option>
              <option value="retail">সাধারণ খুচরা গ্রাহক (Retail Customer)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Contact Phone (মোবাইল)
            </label>
            <input
              type="text"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="01711-xxxxxx"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Email Address (ইমেইল)
            </label>
            <input
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              placeholder="client@company.com"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Location / Factory Address (ঠিকানা)
            </label>
            <input
              type="text"
              value={customerAddress}
              onChange={(e) => setCustomerAddress(e.target.value)}
              placeholder="প্লট নং ১২, নাসিরাবাদ বায়েজিদ, চট্টগ্রাম"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
            />
          </div>
        </div>
      </Card>

      {/* Line Items Table */}
      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <span>Quotation Line Items (পণ্যের বিবরণ ও দর তালিকা)</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 font-mono">
                {items.length} items
              </span>
            </CardTitle>
            <p className="text-[11px] text-slate-400">
              Type custom equipment / spare parts directly, or pick from inventory catalog.
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            icon={Plus}
            onClick={addItemRow}
          >
            Add Item Line
          </Button>
        </CardHeader>

        {/* Single Line Column & Total Visibility Controls ("eta ek line e thakbe eigula") */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-slate-100/90 dark:bg-slate-800/80 border-y border-slate-200 dark:border-slate-800 text-xs">
          <div className="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-300">
            <span className="text-[11px] uppercase tracking-wider text-purple-700 dark:text-purple-400 font-extrabold flex items-center gap-1.5">
              <span>👁️ কলাম ও মোট মূল্য নিয়ন্ত্রণ (Visibility Controls):</span>
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
              <span>দর / Rate কলাম</span>
            </label>

            <label className="inline-flex items-center gap-1.5 cursor-pointer font-bold text-slate-700 dark:text-slate-300 hover:text-purple-600 transition-colors select-none">
              <input
                type="checkbox"
                checked={showLineTotal}
                onChange={(e) => setShowLineTotal(e.target.checked)}
                className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 h-3.5 w-3.5"
              />
              <span>আইটেম মোট / Total কলাম</span>
            </label>

            <label className="inline-flex items-center gap-1.5 cursor-pointer font-bold text-slate-700 dark:text-slate-300 hover:text-purple-600 transition-colors select-none">
              <input
                type="checkbox"
                checked={showGrandTotal}
                onChange={(e) => setShowGrandTotal(e.target.checked)}
                className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 h-3.5 w-3.5"
              />
              <span>সর্বমোট মূল্য / Grand Total</span>
            </label>
          </div>
        </div>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-y border-slate-200 dark:border-slate-800 text-slate-500 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-2.5 px-3 w-10 text-center">#</th>
                  <th className="py-2.5 px-3 min-w-[260px]">Product / Spare Part Description</th>
                  <th className="py-2.5 px-2 w-24 text-center">Unit</th>
                  <th className="py-2.5 px-2 w-24 text-center">Qty</th>
                  {showRate && <th className="py-2.5 px-3 w-32 text-right">Unit Rate (BDT)</th>}
                  {showLineTotal && <th className="py-2.5 px-3 w-32 text-right">Total (BDT)</th>}
                  <th className="py-2.5 px-2 w-10 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {items.map((it, idx) => (
                  <tr key={it.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-800/20">
                    <td className="py-2.5 px-3 text-center font-mono text-slate-400 font-bold">
                      {idx + 1}
                    </td>

                    {/* Product Name / Custom input with catalog autocomplete */}
                    <td className="py-2.5 px-3 space-y-1">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={it.name}
                          onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                          placeholder="e.g. Connecting Rod with Piston complete / Piston Ring"
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-purple-500"
                        />
                        {/* Optional quick picker from stock */}
                        <select
                          value={it.productId || ''}
                          onChange={(e) => handleItemChange(idx, 'productId', e.target.value)}
                          className="w-36 shrink-0 px-2 py-1.5 text-[11px] rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                          title="Pick from existing inventory catalog"
                        >
                          <option value="">Stock Catalog...</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </td>

                    {/* Unit */}
                    <td className="py-2.5 px-2 text-center">
                      <select
                        value={it.unit}
                        onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                        className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-center"
                      >
                        <option value="pc">pc (পিস)</option>
                        <option value="set">set (সেট)</option>
                        <option value="kg">kg (কেজি)</option>
                        <option value="can">can (ক্যান)</option>
                        <option value="cylinder">cylinder (সিলিন্ডার)</option>
                        <option value="drum">drum (ড্রাম)</option>
                        <option value="box">box (বক্স)</option>
                      </select>
                    </td>

                    {/* Quantity */}
                    <td className="py-2.5 px-2 text-center">
                      <input
                        type="number"
                        min="1"
                        value={it.quantity}
                        onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                        className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-center font-mono font-bold"
                      />
                    </td>

                    {/* Unit Rate */}
                    {showRate && (
                      <td className="py-2.5 px-3 text-right">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={it.unitPrice}
                          onChange={(e) => handleItemChange(idx, 'unitPrice', e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-right font-mono"
                        />
                      </td>
                    )}

                    {/* Line Total */}
                    {showLineTotal && (
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                        {formatCurrency(it.lineTotal, settings.currency)}
                      </td>
                    )}

                    {/* Delete Row */}
                    <td className="py-2.5 px-2 text-center">
                      <button
                        type="button"
                        onClick={() => removeItemRow(idx)}
                        disabled={items.length <= 1}
                        className="p-1 rounded text-slate-400 hover:text-red-500 disabled:opacity-30 disabled:hover:text-slate-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pricing Summary */}
          <div className="p-4 bg-slate-50 dark:bg-slate-900/70 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between gap-6">
            <div className="flex-1 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Terms & Conditions (শর্তাবলী)
                </label>
                <textarea
                  rows={3}
                  value={termsAndConditions}
                  onChange={(e) => setTermsAndConditions(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  placeholder="ডেলিভারি সময়, পেমেন্ট শর্ত ইত্যাদি..."
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Internal Remarks / Notes
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                  placeholder="Special client preferences or reference info"
                />
              </div>
            </div>

            {/* Calculations Breakdown */}
            <div className="w-full sm:w-80 space-y-2 text-xs">
              {showGrandTotal ? (
                <>
                  <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-800">
                    <span className="text-slate-500">Subtotal ({items.length} items):</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                      {formatCurrency(subtotal, settings.currency)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-1 border-b border-slate-200 dark:border-slate-800">
                    <span className="text-slate-500">Discount (BDT):</span>
                    <input
                      type="number"
                      min="0"
                      value={discount}
                      onChange={(e) => setDiscount(e.target.value)}
                      className="w-28 px-2 py-1 text-xs text-right font-mono rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                  </div>

                  <div className="flex items-center justify-between py-1 border-b border-slate-200 dark:border-slate-800">
                    <span className="text-slate-500">Tax / VAT (BDT):</span>
                    <input
                      type="number"
                      min="0"
                      value={tax}
                      onChange={(e) => setTax(e.target.value)}
                      className="w-28 px-2 py-1 text-xs text-right font-mono rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                  </div>

                  <div className="flex justify-between py-2 border-b-2 border-purple-500">
                    <span className="font-bold text-slate-800 dark:text-slate-200">Grand Total Quoted:</span>
                    <span className="font-mono font-black text-lg text-purple-600 dark:text-purple-400">
                      {formatCurrency(grandTotal, settings.currency)}
                    </span>
                  </div>
                </>
              ) : (
                <div className="p-3 bg-amber-50/80 dark:bg-amber-950/30 border border-dashed border-amber-300 dark:border-amber-700/60 rounded-xl space-y-1.5 text-center">
                  <div className="text-amber-800 dark:text-amber-300 font-bold text-xs flex items-center justify-center gap-1.5">
                    <span>🚫 সর্বমোট মূল্য (Grand Total) বন্ধ রাখা হয়েছে</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                    নন-প্রাইসড স্পেসিফিকেশন মোড: ক্লায়েন্টকে পাঠানো কোটেশনে ও প্যাডে সর্বমোট মূল্য সম্পূর্ণ লুকানো থাকবে।
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowGrandTotal(true)}
                    className="text-[11px] font-bold text-purple-600 dark:text-purple-400 hover:underline pt-0.5 inline-block"
                  >
                    পুনরায় Grand Total অন করুন
                  </button>
                </div>
              )}

              {/* Status Select */}
              <div className="pt-2 flex items-center justify-between">
                <span className="text-slate-500 font-medium">Initial Status:</span>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                >
                  <option value="draft">Draft (খসড়া)</option>
                  <option value="sent">Sent to Client (প্রেরিত)</option>
                  <option value="approved">Approved (অনুমোদিত)</option>
                </select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Floating or Bottom Action Bar */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
        <Button variant="outline" onClick={() => navigate('/quotations')}>
          Cancel
        </Button>
        <Button variant="secondary" icon={Printer} onClick={() => handleSave(true)}>
          Save & Print Quotation Pad
        </Button>
        <Button variant="primary" icon={Save} onClick={() => handleSave(false)}>
          {isEditing ? 'Update Quotation' : 'Create Quotation'}
        </Button>
      </div>

      {/* Printable Receipt Modal */}
      {printQuotationData && (
        <PrintableReceiptModal
          isOpen={!!printQuotationData}
          onClose={() => {
            setPrintQuotationData(null);
            navigate(`/quotations/${printQuotationData.id || id}`);
          }}
          sale={{
            ...printQuotationData,
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
