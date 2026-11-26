import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, Link, useLocation } from 'react-router-dom';
import { useAppData } from '../../context/AppDataContext';
import { useLanguage } from '../../context/LanguageContext';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { BackLink } from '../../components/common/BackLink';
import { formatCurrency } from '../../utils/formatters';
import { getUnitSelectOptions, normalizeUnit } from '../../utils/units';
import { EMPTY_MACHINE_DETAILS, normalizeMachineDetails } from '../../utils/partPriceSearch';
import { MachineSpecCard } from '../../components/forms/MachineSpecCard';
import { SmartPartLookupModal } from '../../components/forms/SmartPartLookupModal';
import { PrintableReceiptModal } from '../../components/receipt/PrintableReceiptModal';
import { DOCUMENT_TYPES } from '../../utils/printTemplateGenerator';
import {
  FileSpreadsheet,
  Plus,
  Trash2,
  Building2,
  ArrowLeft,
  Printer,
  Save,
  CheckCircle2,
  Calendar,
  Sparkles,
  Check,
  Search,
} from 'lucide-react';

const DEFAULT_TERMS = {
  bn: '১. সকল মালামাল প্রাপ্যতা সাপেক্ষে সরবরাহ করা হইবে।\n২. ডেলিভারি সময়: কার্যাদেশ প্রাপ্তির ৩ কার্যদিবসের মধ্যে।\n৩. এই কোটেশনের মেয়াদ জারির তারিখ হইতে ১৫ দিন পর্যন্ত বৈধ।',
  en: '1. All items are subject to stock availability.\n2. Delivery time: Within 3 working days upon work order confirmation.\n3. Quotation validity: 15 calendar days from the date of issuance.',
  obro: '1. Shokol malamal prapyota shapekkhe shorboraho kora hoibe.\n2. Delivery shomoy: Karjadesh praptir 3 karjodibosher moddhe.\n3. Ei quotation er meyadh jarir tarikh hoite 15 din porjonto boidho.',
};

export const QuotationFormPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { language } = useLanguage();
  const {
    products,
    customers,
    quotations,
    sales,
    priceCatalog,
    createQuotation,
    updateQuotation,
    settings,
  } = useAppData();

  const prefillPart = location.state?.prefillPart || null;

  // Multi-Language content selector:
  // - 'en'   -> Pure English
  // - 'bn'   -> Pure Bangla
  // - 'obro' -> Avro / Banglish (Bangla + English bilingual format)
  const l = (texts) => {
    if (language === 'en') return texts.en;
    if (language === 'obro') return texts.obro || `${texts.bn} (${texts.en})`;
    return texts.bn;
  };

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
  const [entrySource, setEntrySource] = useState('online');
  const [bookNumber, setBookNumber] = useState('');
  const [manualSerialNo, setManualSerialNo] = useState('');

  // Customer Profile State
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerCompany, setCustomerCompany] = useState('');
  const [customerRole, setCustomerRole] = useState('owner');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');

  // Auto-save Customer Option (ALWAYS ON BY DEFAULT as requested)
  const [autoSaveCustomer, setAutoSaveCustomer] = useState(true);

  // Machine & Technical Profile Spec Box State
  const [machineDetails, setMachineDetails] = useState(() =>
    prefillPart ? normalizeMachineDetails(prefillPart) : { ...EMPTY_MACHINE_DETAILS }
  );

  // Smart Price List Lookup Modal state (targetRowIdx: null = append new row, number = fill row)
  const [lookupModalState, setLookupModalState] = useState({ isOpen: false, targetRowIdx: null });

  // Line items state
  const [items, setItems] = useState(() => {
    if (prefillPart) {
      const rate = Number(prefillPart.lastPrice || prefillPart.price || 0) || 0;
      return [
        {
          id: `item-${Date.now()}`,
          productId: prefillPart.linkedProductId || '',
          name: prefillPart.partName || '',
          quantity: 1,
          unit: normalizeUnit(prefillPart.unit || 'pc'),
          unitPrice: rate,
          lineTotal: rate,
        },
      ];
    }
    return [
      {
        id: 'item-1',
        productId: '',
        name: '',
        quantity: 1,
        unit: 'pc',
        unitPrice: '',
        lineTotal: 0,
      },
    ];
  });

  // Column and Total visibility controls
  const [showRate, setShowRate] = useState(true);
  const [showLineTotal, setShowLineTotal] = useState(true);
  const [showGrandTotal, setShowGrandTotal] = useState(true);

  // Summary financials
  const [discount, setDiscount] = useState('');
  const [tax, setTax] = useState('');
  const [status, setStatus] = useState('draft');
  const [termsAndConditions, setTermsAndConditions] = useState(
    DEFAULT_TERMS[language] || DEFAULT_TERMS.bn
  );
  const [notes, setNotes] = useState('');

  // Modal print preview
  const [printQuotationData, setPrintQuotationData] = useState(null);

  // Dynamically update default terms if language changes and terms haven't been customized
  useEffect(() => {
    if (!existingQuote) {
      const cur = termsAndConditions?.trim();
      const isAnyDefault = !cur || Object.values(DEFAULT_TERMS).some((d) => d.trim() === cur);
      if (isAnyDefault && DEFAULT_TERMS[language]) {
        setTermsAndConditions(DEFAULT_TERMS[language]);
      }
    }
  }, [language, existingQuote]);

  // Load existing quote if editing
  useEffect(() => {
    if (existingQuote) {
      setQuotationNumber(existingQuote.quotationNumber || '');
      setQuotationDate(
        existingQuote.date ? new Date(existingQuote.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
      );
      setValidUntil(
        existingQuote.validUntil
          ? new Date(existingQuote.validUntil).toISOString().split('T')[0]
          : ''
      );
      setRequisitionRef(existingQuote.requisitionRef || '');
      setEntrySource(existingQuote.entrySource || 'online');
      setBookNumber(existingQuote.bookNumber || '');
      setManualSerialNo(existingQuote.manualSerialNo || '');
      setSelectedCustomerId(existingQuote.customerId || '');
      setCustomerName(existingQuote.customerName || '');
      setCustomerCompany(existingQuote.customerCompany || '');
      setCustomerRole(existingQuote.customerRole || 'owner');
      setCustomerPhone(existingQuote.customerPhone || '');
      setCustomerEmail(existingQuote.customerEmail || '');
      setCustomerAddress(existingQuote.customerAddress || existingQuote.customerLocation || '');
      if (existingQuote.autoSaveCustomer !== undefined) {
        setAutoSaveCustomer(existingQuote.autoSaveCustomer);
      }
      if (existingQuote.machineDetails) {
        setMachineDetails(normalizeMachineDetails(existingQuote.machineDetails));
      }

      if (existingQuote.items && existingQuote.items.length > 0) {
        setItems(
          existingQuote.items.map((it, idx) => {
            const rateNum = Number(it.unitPrice || it.rate || it.price) || 0;
            return {
              id: it.id || `item-${idx + 1}`,
              productId: it.productId || '',
              name: it.name || it.productName || '',
              quantity: Number(it.quantity) || 1,
              unit: normalizeUnit(it.unit),
              unitPrice: rateNum > 0 ? rateNum : '',
              lineTotal: Number(it.lineTotal || it.amount || 0),
            };
          })
        );
      }

      if (existingQuote.showRate !== undefined) setShowRate(existingQuote.showRate);
      if (existingQuote.showLineTotal !== undefined) setShowLineTotal(existingQuote.showLineTotal);
      if (existingQuote.showGrandTotal !== undefined) setShowGrandTotal(existingQuote.showGrandTotal);

      setDiscount(Number(existingQuote.discount) > 0 ? Number(existingQuote.discount) : '');
      setTax(Number(existingQuote.tax) > 0 ? Number(existingQuote.tax) : '');
      setStatus(existingQuote.status || 'draft');
      setTermsAndConditions(existingQuote.termsAndConditions || DEFAULT_TERMS[language] || DEFAULT_TERMS.bn);
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

    const cPhone = (cust.phone || cust.companyPhone || '').trim();
    const cName = (cust.name || '').toLowerCase().trim();

    const matchQuote = (quotations || []).find((q) =>
      (q.customerId && (q.customerId === cust.id || q.customerId === cust._id)) ||
      (q.customerPhone && cPhone && q.customerPhone.trim() === cPhone) ||
      (q.customerName && cName && q.customerName.toLowerCase().trim() === cName)
    );
    const matchSale = (sales || []).find((s) =>
      (s.customerId && (s.customerId === cust.id || s.customerId === cust._id)) ||
      (s.customerPhone && cPhone && s.customerPhone.trim() === cPhone) ||
      (s.customerName && cName && s.customerName.toLowerCase().trim() === cName)
    );

    const resolvedName = cust.name || matchQuote?.customerName || matchSale?.customerName || '';
    const resolvedCompany = cust.companyName || cust.company || matchQuote?.customerCompany || matchSale?.customerCompany || '';
    const resolvedRole = (cust.designationRole && cust.designationRole !== 'owner')
      ? cust.designationRole
      : (matchQuote?.customerRole || matchSale?.customerRole || cust.designationRole || 'owner');
    const resolvedPhone = cust.phone || cust.companyPhone || matchQuote?.customerPhone || matchSale?.customerPhone || '';
    const resolvedEmail = cust.email || matchQuote?.customerEmail || matchSale?.customerEmail || '';
    const resolvedAddress = cust.address || cust.location || matchQuote?.customerAddress || matchSale?.customerAddress || '';

    setSelectedCustomerId(cust.id || cust._id);
    setCustomerName(resolvedName);
    setCustomerCompany(resolvedCompany);
    setCustomerRole(resolvedRole);
    setCustomerPhone(resolvedPhone);
    setCustomerEmail(resolvedEmail);
    setCustomerAddress(resolvedAddress);
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
        unitPrice: '',
        lineTotal: 0,
      },
    ]);
  };

  // Remove Item Row
  const removeItemRow = (idx) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  // Quick load standard sample items
  const loadShantaSampleItems = () => {
    setCustomerName(l({ bn: 'মোসাদ্দেক হোসেন', en: 'Mosaddek Hossain', obro: 'Mosaddek Hossain' }));
    setCustomerCompany(l({ bn: 'কর্ণফুলী কোল্ড স্টোরেজ লিমিটেড', en: 'Karnafuli Cold Storage Ltd.', obro: 'Karnafuli Cold Storage Ltd.' }));
    setCustomerRole('purchaser');
    setCustomerPhone('01819-234567');
    setCustomerAddress(l({ bn: 'কালুরঘাট শিল্প এলাকা, চট্টগ্রাম', en: 'Kalurghat Industrial Area, Chattogram', obro: 'Kalurghat Heavy Area, Chattogram' }));
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
          const pRate = Number(prod.sellingPrice || prod.price) || 0;
          cur.name = prod.name;
          cur.unitPrice = pRate > 0 ? pRate : '';
          cur.unit = normalizeUnit(prod.unit);
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
    // Customer Name is now OPTIONAL! If omitted, provide friendly default.
    const trimmedCustomerName = customerName.trim();
    const finalCustomerName = trimmedCustomerName || l({
      bn: 'সাধারণ ক্লায়েন্ট',
      en: 'Direct Client',
      obro: 'Direct Client (সাধারণ গ্রাহক)',
    });

    const validItems = items.filter((it) => it.name.trim() !== '');
    if (validItems.length === 0) {
      alert(l({
        bn: 'কমপক্ষে একটি পণ্যের বিবরণ লিখুন (At least 1 item is required).',
        en: 'Please enter at least 1 line item description.',
        obro: 'Kompekkhe 1-ti item er biboron likhun (At least 1 item is required).',
      }));
      return;
    }

    const payload = {
      quotationNumber: quotationNumber.trim() || generatedQuotationNo,
      date: new Date(quotationDate).toISOString(),
      validUntil: validUntil ? new Date(validUntil).toISOString() : null,
      requisitionRef: requisitionRef.trim(),
      entrySource,
      bookNumber: bookNumber.trim(),
      manualSerialNo: manualSerialNo.trim(),
      customerId: selectedCustomerId || null,
      customerName: finalCustomerName,
      customerCompany: customerCompany.trim(),
      customerRole,
      customerPhone: customerPhone.trim(),
      customerEmail: customerEmail.trim(),
      customerAddress: customerAddress.trim(),
      customerLocation: customerAddress.trim(),
      autoSaveCustomer,
      machineDetails: normalizeMachineDetails(machineDetails),
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
          <BackLink
            to="/quotations"
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          />
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <FileSpreadsheet className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              <span>
                {isEditing
                  ? l({ bn: 'দরপত্র সংশোধন', en: 'Edit Quotation', obro: 'দরপত্র সংশোধন (Edit Quotation)' })
                  : l({ bn: 'নতুন দরপত্র তৈরি', en: 'New Quotation', obro: 'নতুন দরপত্র তৈরি (New Quotation)' })}
              </span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {l({
                bn: 'ক্লায়েন্টের রিক্যুইজিশন বা আরএফকিউ অনুযায়ী দরপত্র তৈরি করুন এবং মেসার্স শান্তা রেফ্রিজারেশন অফিশিয়াল প্যাডে প্রিন্ট করুন।',
                en: 'Generate quotation against client requisition or RFQ and print on M/S. Shanta Refrigeration official pad.',
                obro: 'Client requisition ba RFQ onujayi quotation toiri korun ebong M/S. Shanta Refrigeration official pad e print korun.',
              })}
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
              title={l({
                bn: 'শান্তার বাস্তব হ্যান্ডরিটেন কোটেশনের যন্ত্রাংশ প্রি-লোড করুন',
                en: 'Pre-load authentic spare parts sample items',
                obro: 'Shantar sample items load korun',
              })}
            >
              {l({ bn: 'নমুনা যন্ত্রাংশ লোড করুন', en: 'Load Sample Spare Parts', obro: 'Load Sample Spare Parts' })}
            </Button>
          )}

          <Button
            type="button"
            variant="secondary"
            size="sm"
            icon={Printer}
            onClick={() => handleSave(true)}
          >
            {l({ bn: 'সংরক্ষণ ও প্রিন্ট প্যাড', en: 'Save & Print Pad', obro: 'Save & Print Pad' })}
          </Button>

          <Button
            type="button"
            variant="primary"
            size="sm"
            icon={Save}
            onClick={() => handleSave(false)}
          >
            {isEditing
              ? l({ bn: 'কোটেশন আপডেট করুন', en: 'Update Quotation', obro: 'Update Quotation' })
              : l({ bn: 'কোটেশন সংরক্ষণ করুন', en: 'Save Quotation', obro: 'Save Quotation' })}
          </Button>
        </div>
      </div>

      {/* Meta Information Card */}
      <Card className="p-5">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              {l({ bn: 'কোটেশন নম্বর *', en: 'Quotation Number *', obro: 'Quotation Number (নং) *' })}
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
              {l({ bn: 'কোটেশনের তারিখ', en: 'Quotation Date', obro: 'Quotation Date (তারিখ)' })}
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
              {l({ bn: 'মেয়াদ উত্তীর্ণের তারিখ', en: 'Valid Until', obro: 'Valid Until (মেয়াদ)' })}
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
              {l({
                bn: 'রিক্যুইজিশন সূত্র (হোয়াটসঅ্যাপ/আরএফকিউ)',
                en: 'Requisition Ref (WhatsApp/RFQ)',
                obro: 'Requisition Ref / সূত্র (WhatsApp/RFQ)',
              })}
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

        {/* Khata / Offline Metadata Row (Proposal 2) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
              {l({ bn: 'কাগজ / এন্ট্রির উৎস', en: 'Entry Source', obro: 'Entry Source' })}
            </label>
            <select
              value={entrySource}
              onChange={(e) => setEntrySource(e.target.value)}
              className="w-full px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
            >
              <option value="online">{l({ bn: 'লাইভ ওয়েবঅ্যাপ (Online)', en: 'Live Web App', obro: 'Online' })}</option>
              <option value="khata">{l({ bn: 'পুরানো খাতা / হার্ডকপি (Khata Archive)', en: 'Old Khata / Hardcopy', obro: 'Purano Khata' })}</option>
              <option value="offline">{l({ bn: 'অফলাইন / হাতে লেখা (Offline)', en: 'Offline / Handwritten', obro: 'Offline' })}</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
              {l({ bn: 'বই / খাতা নং (ঐচ্ছিক)', en: 'Book No. (Optional)', obro: 'Book No.' })}
            </label>
            <input
              type="text"
              value={bookNumber}
              onChange={(e) => setBookNumber(e.target.value)}
              placeholder="e.g. Book-02"
              className="w-full px-3 py-1.5 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
              {l({ bn: 'হাতে লেখা ক্রমিক নং (ঐচ্ছিক)', en: 'Manual Serial No.', obro: 'Manual Serial No.' })}
            </label>
            <input
              type="text"
              value={manualSerialNo}
              onChange={(e) => setManualSerialNo(e.target.value)}
              placeholder="e.g. Sl-109"
              className="w-full px-3 py-1.5 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
            />
          </div>
        </div>
      </Card>

      {/* Customer Corporate Profile Section */}
      <Card className="p-5 border-l-4 border-l-purple-500">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Building2 className="h-4 w-4 text-purple-600" />
              <span>
                {l({
                  bn: 'গ্রাহক ও করপোরেট ক্লায়েন্ট প্রোফাইল',
                  en: 'Customer / Corporate Client Profile',
                  obro: 'Customer / Corporate Client Profile (গ্রাহকের প্রাতিষ্ঠানিক তথ্য)',
                })}
              </span>
            </h2>
            <p className="text-[11px] text-slate-400">
              {l({
                bn: 'বিদ্যমান ক্লায়েন্ট নির্বাচন করুন বা নতুন তথ্য দিন।',
                en: 'Select existing client or enter new company details.',
                obro: 'Select existing client or enter new company details.',
              })}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {/* Auto-Save Customer Toggle Button (Always ON by default) */}
            <button
              type="button"
              onClick={() => setAutoSaveCustomer(!autoSaveCustomer)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all select-none ${
                autoSaveCustomer
                  ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300 shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400'
              }`}
              title={l({
                bn: 'ক্লিক করে গ্রাহকের তথ্য ডাটাবেজে সংরক্ষণ চালু/বন্ধ করুন (ডিফল্ট: চালু)',
                en: 'Toggle auto-saving client information to customer directory (Default: ON)',
                obro: 'Customer info directory te auto-save kora on/off korun',
              })}
            >
              <span
                className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-black transition-colors ${
                  autoSaveCustomer ? 'bg-purple-600 text-white' : 'bg-slate-300 dark:bg-slate-600 text-transparent'
                }`}
              >
                ✓
              </span>
              <span>
                {autoSaveCustomer
                  ? l({ bn: 'গ্রাহক সংরক্ষণ: চালু', en: 'Save Customer: ON', obro: 'Save Customer: ON' })
                  : l({ bn: 'গ্রাহক সংরক্ষণ: বন্ধ', en: 'Save Customer: OFF', obro: 'Save Customer: OFF' })}
              </span>
            </button>

            {/* Quick Picker */}
            <div className="w-full sm:w-64">
              <select
                value={selectedCustomerId}
                onChange={(e) => {
                  const found = customers.find((c) => c.id === e.target.value || c._id === e.target.value);
                  handleSelectCustomer(found || null);
                }}
                className="w-full px-3 py-1.5 text-xs rounded-xl border border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/30 text-purple-900 dark:text-purple-200 font-medium focus:outline-none"
              >
                <option value="">
                  {l({
                    bn: '-- নিবন্ধিত ক্লায়েন্ট দ্রুত নির্বাচন করুন --',
                    en: '-- Quick Pick Registered Client --',
                    obro: '-- Quick Pick Registered Client --',
                  })}
                </option>
                {customers.map((c) => {
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
                  return (
                    <option key={c.id || c._id} value={c.id || c._id}>
                      {c.name} {comp ? `(${comp})` : ''}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              {l({
                bn: 'ক্লায়েন্ট যোগাযোগকারীর নাম (ঐচ্ছিক)',
                en: 'Client Contact Person (Optional)',
                obro: 'Client Contact Person (নাম - ঐচ্ছিক)',
              })}
            </label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder={l({
                bn: 'যেমনঃ ইঞ্জিঃ কামরুল ইসলাম (খালি থাকলে সাধারণ ক্লায়েন্ট)',
                en: 'e.g. Engr. Kamrul Islam (Optional)',
                obro: 'e.g. Engr. Kamrul Islam',
              })}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              {l({
                bn: 'প্রতিষ্ঠানের নাম',
                en: 'Company Name',
                obro: 'Company Name (প্রতিষ্ঠানের নাম)',
              })}
            </label>
            <input
              type="text"
              value={customerCompany}
              onChange={(e) => setCustomerCompany(e.target.value)}
              placeholder={l({
                bn: 'যেমনঃ সোনারগাঁও টেক্সটাইল মিলস লিঃ',
                en: 'e.g. Sonargaon Textile Mills Ltd.',
                obro: 'e.g. Sonargaon Textile Mills Ltd.',
              })}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              {l({
                bn: 'কাস্টমার পদবি / স্ট্যাটাস',
                en: 'Designation / Role',
                obro: 'Designation / Role (কাস্টমার স্ট্যাটাস)',
              })}
            </label>
            <select
              value={customerRole}
              onChange={(e) => setCustomerRole(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
            >
              <option value="owner">
                {l({
                  bn: 'কোম্পানির মালিক / স্বত্বাধিকারী',
                  en: 'Company Owner / Proprietor',
                  obro: 'কোম্পানির মালিক / স্বত্বাধিকারী (Owner)',
                })}
              </option>
              <option value="agent">
                {l({
                  bn: 'কোম্পানির এজেন্ট / প্রতিনিধি',
                  en: 'Company Agent / Representative',
                  obro: 'কোম্পানির এজেন্ট / প্রতিনিধি (Agent)',
                })}
              </option>
              <option value="purchaser">
                {l({
                  bn: 'ক্রয় কর্মকর্তা / প্রকিউরমেন্ট ম্যানেজার',
                  en: 'Procurement / Purchase Officer',
                  obro: 'ক্রয় কর্মকর্তা / প্রকিউরমেন্ট ম্যানেজার (Purchaser)',
                })}
              </option>
              <option value="supplier_rep">
                {l({
                  bn: 'সরবরাহকারী / ভেন্ডর প্রতিনিধি',
                  en: 'Supplier / Vendor Representative',
                  obro: 'সরবরাহকারী / ভেন্ডর প্রতিনিধি (Supplier Rep)',
                })}
              </option>
              <option value="wholesale">
                {l({
                  bn: 'পাইকারি ডিলার / মার্চেন্ট',
                  en: 'Wholesale Dealer / Merchant',
                  obro: 'পাইকারি ডিলার / মার্চেন্ট (Wholesale Dealer)',
                })}
              </option>
              <option value="retail">
                {l({
                  bn: 'সাধারণ খুচরা গ্রাহক',
                  en: 'Retail Customer',
                  obro: 'সাধারণ খুচরা গ্রাহক (Retail Customer)',
                })}
              </option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              {l({
                bn: 'মোবাইল নম্বর',
                en: 'Contact Phone',
                obro: 'Contact Phone (মোবাইল)',
              })}
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
              {l({
                bn: 'ইমেইল ঠিকানা',
                en: 'Email Address',
                obro: 'Email Address (ইমেইল)',
              })}
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
              {l({
                bn: 'ঠিকানা / অবস্থান',
                en: 'Location / Factory Address',
                obro: 'Location / Factory Address (ঠিকানা)',
              })}
            </label>
            <input
              type="text"
              value={customerAddress}
              onChange={(e) => setCustomerAddress(e.target.value)}
              placeholder={l({
                bn: 'প্লট নং ১২, নাসিরাবাদ বায়েজিদ, চট্টগ্রাম',
                en: 'Plot 12, Nasirabad Bayezid, Chattogram',
                obro: 'Plot 12, Nasirabad Bayezid, Chattogram',
              })}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
            />
          </div>
        </div>
      </Card>

      {/* Machine & Technical Spec Profile Box */}
      <MachineSpecCard
        value={machineDetails}
        onChange={setMachineDetails}
        quotations={quotations}
        sales={sales}
        priceCatalog={priceCatalog}
        language={language}
        accentColor="purple"
      />

      {/* Line Items Table */}
      <Card className="overflow-hidden">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3">
          <div>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <span>
                {l({
                  bn: 'পণ্যের বিবরণ ও দর তালিকা',
                  en: 'Quotation Line Items',
                  obro: 'Quotation Line Items (পণ্যের বিবরণ ও দর তালিকা)',
                })}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 font-mono">
                {items.length} {l({ bn: 'টি আইটেম', en: 'items', obro: 'items' })}
              </span>
            </CardTitle>
            <p className="text-[11px] text-slate-400">
              {l({
                bn: 'কাস্টম যন্ত্রাংশের বিবরণ সরাসরি লিখুন অথবা আগের কোটেশন/বিক্রয় থেকে দাম খুঁজে বসান।',
                en: 'Type custom spare parts directly, pick from inventory catalog, or lookup rates from past quotes/sales.',
                obro: 'Type custom equipment / spare parts directly, or lookup from price list.',
              })}
            </p>
          </div>

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

            <Button
              type="button"
              variant="outline"
              size="sm"
              icon={Plus}
              onClick={addItemRow}
            >
              {l({ bn: 'নতুন আইটেম যোগ করুন', en: 'Add Item Line', obro: 'Add Item Line' })}
            </Button>
          </div>
        </CardHeader>

        {/* Single Line Column & Total Visibility Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-slate-100/90 dark:bg-slate-800/80 border-y border-slate-200 dark:border-slate-800 text-xs">
          <div className="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-300">
            <span className="text-[11px] uppercase tracking-wider text-purple-700 dark:text-purple-400 font-extrabold flex items-center gap-1.5">
              <span>
                {l({
                  bn: '👁️ কলাম ও মোট মূল্য নিয়ন্ত্রণ:',
                  en: '👁️ Visibility Controls:',
                  obro: '👁️ কলাম ও মোট মূল্য নিয়ন্ত্রণ (VISIBILITY CONTROLS):',
                })}
              </span>
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
              <span>{l({ bn: 'দর কলাম', en: 'Rate Column', obro: 'দর / Rate কলাম' })}</span>
            </label>

            <label className="inline-flex items-center gap-1.5 cursor-pointer font-bold text-slate-700 dark:text-slate-300 hover:text-purple-600 transition-colors select-none">
              <input
                type="checkbox"
                checked={showLineTotal}
                onChange={(e) => setShowLineTotal(e.target.checked)}
                className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 h-3.5 w-3.5"
              />
              <span>{l({ bn: 'আইটেম মোট কলাম', en: 'Total Column', obro: 'আইটেম মোট / Total কলাম' })}</span>
            </label>

            <label className="inline-flex items-center gap-1.5 cursor-pointer font-bold text-slate-700 dark:text-slate-300 hover:text-purple-600 transition-colors select-none">
              <input
                type="checkbox"
                checked={showGrandTotal}
                onChange={(e) => setShowGrandTotal(e.target.checked)}
                className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 h-3.5 w-3.5"
              />
              <span>{l({ bn: 'সর্বমোট মূল্য', en: 'Grand Total', obro: 'সর্বমোট মূল্য / Grand Total' })}</span>
            </label>
          </div>
        </div>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-y border-slate-200 dark:border-slate-800 text-slate-500 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-2.5 px-3 w-10 text-center">#</th>
                  <th className="py-2.5 px-3 min-w-[260px]">
                    {l({
                      bn: 'পণ্য বা যন্ত্রাংশের বিবরণ',
                      en: 'Product / Spare Part Description',
                      obro: 'Product / Spare Part Description',
                    })}
                  </th>
                  <th className="py-2.5 px-2 w-24 text-center">
                    {l({ bn: 'একক', en: 'Unit', obro: 'একক (Unit)' })}
                  </th>
                  <th className="py-2.5 px-2 w-24 text-center">
                    {l({ bn: 'পরিমাণ', en: 'Qty', obro: 'পরিমাণ (Qty)' })}
                  </th>
                  {showRate && (
                    <th className="py-2.5 px-3 w-32 text-right">
                      {l({ bn: 'একক দর (টাকা)', en: 'Unit Rate (BDT)', obro: 'Unit Rate (BDT)' })}
                    </th>
                  )}
                  {showLineTotal && (
                    <th className="py-2.5 px-3 w-32 text-right">
                      {l({ bn: 'মোট টাকা', en: 'Total (BDT)', obro: 'Total (BDT)' })}
                    </th>
                  )}
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
                          title={l({
                            bn: 'ইনভেন্টরি ক্যাটালগ থেকে বাছাই করুন',
                            en: 'Pick from existing inventory catalog',
                            obro: 'Catalog theke select korun',
                          })}
                        >
                          <option value="">
                            {l({ bn: 'ক্যাটালগ...', en: 'Stock Catalog...', obro: 'Stock Catalog...' })}
                          </option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id} data-transliterate="true">
                              {p.name}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => setLookupModalState({ isOpen: true, targetRowIdx: idx })}
                          className="p-1.5 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50/70 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 shrink-0"
                          title={l({ bn: 'এই সারির জন্য প্রাইস লিস্ট খুঁজুন', en: 'Lookup price from history' })}
                        >
                          <Search className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>

                    {/* Unit */}
                    <td className="py-2.5 px-2 text-center">
                      <select
                        value={normalizeUnit(it.unit)}
                        onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                        className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-center"
                      >
                        {getUnitSelectOptions(it.unit, language).map((u) => (
                          <option key={u.value} value={u.value}>
                            {u.label}
                          </option>
                        ))}
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
                          placeholder="0"
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
                  {l({
                    bn: 'শর্তাবলী',
                    en: 'Terms & Conditions',
                    obro: 'Terms & Conditions (শর্তাবলী)',
                  })}
                </label>
                <textarea
                  rows={3}
                  value={termsAndConditions}
                  onChange={(e) => setTermsAndConditions(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  placeholder={l({
                    bn: 'ডেলিভারি সময়, পেমেন্ট শর্ত ইত্যাদি...',
                    en: 'Delivery terms, payment milestones, validity period...',
                    obro: 'Delivery shomoy, payment terms ityadi...',
                  })}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {l({
                    bn: 'অভ্যন্তরীণ নোট / মন্তব্য',
                    en: 'Internal Remarks / Notes',
                    obro: 'Internal Remarks / Notes',
                  })}
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                  placeholder={l({
                    bn: 'বিশেষ ক্লায়েন্ট তথ্য বা রেফারেন্স',
                    en: 'Special client preferences or reference info',
                    obro: 'Special client preferences or reference info',
                  })}
                />
              </div>
            </div>

            {/* Calculations Breakdown */}
            <div className="w-full sm:w-80 space-y-2 text-xs">
              {showGrandTotal ? (
                <>
                  <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-800">
                    <span className="text-slate-500">
                      {l({ bn: 'উপ-মোট', en: 'Subtotal', obro: 'Subtotal' })} ({items.length}{' '}
                      {l({ bn: 'টি আইটেম', en: 'items', obro: 'items' })}):
                    </span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                      {formatCurrency(subtotal, settings.currency)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-1 border-b border-slate-200 dark:border-slate-800">
                    <span className="text-slate-500">
                      {l({ bn: 'বিশেষ ছাড় (টাকা):', en: 'Discount (BDT):', obro: 'Discount (BDT):' })}
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={discount}
                      onChange={(e) => setDiscount(e.target.value)}
                      placeholder="0"
                      className="w-28 px-2 py-1 text-xs text-right font-mono rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                  </div>

                  <div className="flex items-center justify-between py-1 border-b border-slate-200 dark:border-slate-800">
                    <span className="text-slate-500">
                      {l({ bn: 'ভ্যাট / ট্যাক্স (টাকা):', en: 'Tax / VAT (BDT):', obro: 'Tax / VAT (BDT):' })}
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={tax}
                      onChange={(e) => setTax(e.target.value)}
                      placeholder="0"
                      className="w-28 px-2 py-1 text-xs text-right font-mono rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                  </div>

                  <div className="flex justify-between py-2 border-b-2 border-purple-500">
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {l({ bn: 'সর্বমোট প্রস্তাবিত মূল্য:', en: 'Grand Total Quoted:', obro: 'Grand Total Quoted:' })}
                    </span>
                    <span className="font-mono font-black text-lg text-purple-600 dark:text-purple-400">
                      {formatCurrency(grandTotal, settings.currency)}
                    </span>
                  </div>
                </>
              ) : (
                <div className="p-3 bg-amber-50/80 dark:bg-amber-950/30 border border-dashed border-amber-300 dark:border-amber-700/60 rounded-xl space-y-1.5 text-center">
                  <div className="text-amber-800 dark:text-amber-300 font-bold text-xs flex items-center justify-center gap-1.5">
                    <span>
                      {l({
                        bn: '🚫 সর্বমোট মূল্য বন্ধ রাখা হয়েছে',
                        en: '🚫 Grand Total Hidden',
                        obro: '🚫 সর্বমোট মূল্য (Grand Total) বন্ধ রাখা হয়েছে',
                      })}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                    {l({
                      bn: 'নন-প্রাইসড স্পেসিফিকেশন মোড: ক্লায়েন্টকে পাঠানো কোটেশনে ও প্যাডে সর্বমোট মূল্য লুকানো থাকবে।',
                      en: 'Non-priced specification mode: Grand total will remain hidden on the printed quotation pad.',
                      obro: 'Non-priced specification mode: Grand total pad e lukano thakbe.',
                    })}
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowGrandTotal(true)}
                    className="text-[11px] font-bold text-purple-600 dark:text-purple-400 hover:underline pt-0.5 inline-block"
                  >
                    {l({
                      bn: 'পুনরায় সর্বমোট মূল্য চালু করুন',
                      en: 'Turn Grand Total Back On',
                      obro: 'পুনরায় Grand Total অন করুন',
                    })}
                  </button>
                </div>
              )}

              {/* Status Select */}
              <div className="pt-2 flex items-center justify-between">
                <span className="text-slate-500 font-medium">
                  {l({ bn: 'কোটেশন স্ট্যাটাস:', en: 'Initial Status:', obro: 'Initial Status:' })}
                </span>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                >
                  <option value="draft">{l({ bn: 'খসড়া', en: 'Draft', obro: 'Draft (খসড়া)' })}</option>
                  <option value="sent">{l({ bn: 'ক্লায়েন্টকে প্রেরিত', en: 'Sent to Client', obro: 'Sent to Client (প্রেরিত)' })}</option>
                  <option value="approved">{l({ bn: 'অনুমোদিত', en: 'Approved', obro: 'Approved (অনুমোদিত)' })}</option>
                </select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Floating or Bottom Action Bar */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
        <Button variant="outline" onClick={() => navigate('/quotations')}>
          {l({ bn: 'বাতিল', en: 'Cancel', obro: 'Cancel' })}
        </Button>
        <Button variant="secondary" icon={Printer} onClick={() => handleSave(true)}>
          {l({ bn: 'সংরক্ষণ ও প্রিন্ট প্যাড', en: 'Save & Print Quotation Pad', obro: 'Save & Print Quotation Pad' })}
        </Button>
        <Button variant="primary" icon={Save} data-enter-final-button="true" onClick={() => handleSave(false)}>
          {isEditing
            ? l({ bn: 'কোটেশন আপডেট করুন', en: 'Update Quotation', obro: 'Update Quotation' })
            : l({ bn: 'কোটেশন তৈরি করুন', en: 'Create Quotation', obro: 'Create Quotation' })}
        </Button>
      </div>

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
              const q = Number(updated[targetIdx].quantity) || 1;
              updated[targetIdx] = {
                ...updated[targetIdx],
                productId: picked.productId === 'custom' ? '' : picked.productId,
                name: picked.name,
                unit: unitVal,
                unitPrice: rateVal > 0 ? rateVal : '',
                lineTotal: Math.round(q * rateVal * 100) / 100,
              };
              return updated;
            }
            const firstEmptyIdx = prev.findIndex((r) => !(r.name || '').trim());
            if (firstEmptyIdx !== -1 && prev.length === 1) {
              const q = Number(prev[firstEmptyIdx].quantity) || 1;
              return [
                {
                  ...prev[firstEmptyIdx],
                  productId: picked.productId === 'custom' ? '' : picked.productId,
                  name: picked.name,
                  unit: unitVal,
                  unitPrice: rateVal,
                  lineTotal: Math.round(q * rateVal * 100) / 100,
                },
              ];
            }
            return [
              ...prev,
              {
                id: `item-${Date.now()}-${prev.length + 1}`,
                productId: picked.productId === 'custom' ? '' : picked.productId,
                name: picked.name,
                quantity: 1,
                unit: unitVal,
                unitPrice: rateVal,
                lineTotal: rateVal,
              },
            ];
          });
        }}
      />

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
