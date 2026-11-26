import React, { useState, useMemo, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import {
  Printer,
  FileText,
  Receipt,
  Truck,
  Check,
  ExternalLink,
  Edit3,
  Globe,
  Save,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  Plus,
  Trash2,
  Users2,
  Package,
  Building2,
  Download,
  Wallet,
} from 'lucide-react';
import { formatCurrency, formatDateTime, numberToWords } from '../../utils/formatters';
import { getUnitSelectOptions, normalizeUnit } from '../../utils/units';
import { useAppData } from '../../context/AppDataContext';
import { useLanguage } from '../../context/LanguageContext';
import {
  DOCUMENT_TYPES,
  DOCUMENT_LANGUAGES,
  printDocumentViaIframe,
  generatePrintFileName,
  generateCashMemoHtml,
  generateChallanHtml,
  generateOfficialPadHtml,
  generateThermalReceiptHtml,
  generateQuotationHtml,
  generateMoneyReceiptHtml,
  resolveStationeryProfile,
  isStandardDefaultTerms,
  cleanItemName,
  cleanItemSku,
} from '../../utils/printTemplateGenerator';

export const PrintableReceiptModal = ({ isOpen, onClose, sale, initialDocType }) => {
  const { settings, updateSettings, updateSale, updateQuotation, updateMoneyReceipt, addToast } = useAppData();
  const { language: currentGlobalLang } = useLanguage();

  // Document format tab
  const [docType, setDocType] = useState(initialDocType || DOCUMENT_TYPES.CASH_MEMO);

  useEffect(() => {
    if (isOpen && initialDocType) {
      setDocType(initialDocType);
    } else if (isOpen && sale?.receiptNumber) {
      setDocType(DOCUMENT_TYPES.MONEY_RECEIPT);
    } else if (isOpen && sale?.documentType === 'challan' && !initialDocType) {
      setDocType(DOCUMENT_TYPES.CHALLAN);
    }
  }, [isOpen, initialDocType, sale?.receiptNumber, sale?.documentType]);

  // Column and Total visibility toggles (Single-line controls)
  const [showRate, setShowRate] = useState(sale?.showRate !== undefined ? sale.showRate : true);
  const [showLineTotal, setShowLineTotal] = useState(sale?.showLineTotal !== undefined ? sale.showLineTotal : true);
  const [showGrandTotal, setShowGrandTotal] = useState(sale?.showGrandTotal !== undefined ? sale.showGrandTotal : true);

  // Language switcher: 'bn' (Bangla) | 'en' (English) | 'obro' (Avro) | 'bilingual' (Both)
  const [docLanguage, setDocLanguage] = useState(currentGlobalLang || settings.docLanguage || DOCUMENT_LANGUAGES.BANGLA);

  // Keep in sync with global language if changed from top navbar or sale prop changes
  useEffect(() => {
    if (isOpen && currentGlobalLang) {
      setDocLanguage(currentGlobalLang);
    }
  }, [isOpen, currentGlobalLang]);

  useEffect(() => {
    if (sale) {
      if (sale.showRate !== undefined) setShowRate(sale.showRate);
      if (sale.showLineTotal !== undefined) setShowLineTotal(sale.showLineTotal);
      if (sale.showGrandTotal !== undefined) setShowGrandTotal(sale.showGrandTotal);
    }
  }, [sale]);

  // Customization drawer open state & active drawer subtab
  const [isEditing, setIsEditing] = useState(false);
  const [activeEditorTab, setActiveEditorTab] = useState('customer'); // 'customer' | 'items' | 'company'

  // Editable customer data
  const [customerData, setCustomerData] = useState({
    name: '',
    company: '',
    role: 'owner',
    phone: '',
    email: '',
    address: '',
  });

  // Editable items data (Description, Qty, Rate, Line Total)
  const [editableItems, setEditableItems] = useState([]);
  const [customDiscount, setCustomDiscount] = useState('');

  // Editable stationery profile overrides
  const [customInfo, setCustomInfo] = useState({
    companyName: settings.companyName || settings.businessName || 'মেসার্স শান্তা রেফ্রিজারেশন',
    companyNameEn: settings.companyNameEn || settings.businessNameEn || 'M/S. SHANTA REFRIGERATION',
    proprietor: settings.proprietor || 'মোঃ রুহুল আমিন (লিটন)',
    proprietorEn: settings.proprietorEn || 'Md. Ruhul Amin (Liton)',
    companyPhone: settings.companyPhone || settings.businessPhone || '01711-169875',
    companyEmail: settings.companyEmail || settings.businessEmail || 'shanta.refrigeration@gmail.com',
    companyAddress: settings.companyAddress || settings.address || '৪০৬, সি.ডি.এ মার্কেট (মসজিদের বিপরীতে), পাহাড়তলী, চট্টগ্রাম।',
    companyAddressEn: settings.companyAddressEn || settings.addressEn || '406, C.D.A Market, Pahartali, Chattogram.',
    bin: settings.bin || 'BIN-001651149-0505',
    businessScope: settings.businessScope || 'এখানে সকল প্রকারের রেফ্রিজারেশন কোল্ড স্টোর, এয়ার কন্ডিশন, মেশিন ও যন্ত্রাংশ, আইস প্ল্যান্ট, চিলার প্ল্যান্ট R-12, R-22, R-502a, R-134a, R-407a, R-404a ইত্যাদি গ্যাস, কম্প্রেসার ওয়েল, পিস্টন ও এ্যামোনিয়া কম্প্রেসারের খুচরা যন্ত্রাংশ ক্রয় ও বিক্রয় করা হয়।',
    businessScopeEn: settings.businessScopeEn || 'Dealers & suppliers of all types of refrigeration cold storage, air conditioning equipment & parts, ice plant, chiller plant, R-12, R-22, R-502a, R-134a, R-407a, R-404a gases, compressor oil, piston and ammonia compressor spare parts.',
    disclaimer: settings.disclaimer || 'বিঃদ্রঃ উপরোক্ত মালামাল ভালো অবস্থায় বুঝিয়া পাইলাম।',
    disclaimerEn: settings.disclaimerEn || 'Notice: Received the above goods in good condition.',
    customSerial: '',
  });

  // Populate editable customer, items, and discount when sale changes
  useEffect(() => {
    if (sale) {
      setCustomerData({
        name: sale.customerName || '',
        company: sale.customerCompany || '',
        role: sale.customerRole || 'owner',
        phone: sale.customerPhone || '',
        email: sale.customerEmail || '',
        address: sale.customerAddress || sale.customerLocation || '',
      });

      const initialItems = (sale.items || []).map((it, idx) => {
        const qty = Number(it.quantity) || 1;
        const rate = Number(it.unitPrice !== undefined ? it.unitPrice : (it.rate !== undefined ? it.rate : it.price)) || 0;
        return {
          id: it.id || `it-${idx + 1}-${Date.now()}`,
          productId: it.productId || '',
          productName: it.productName || it.name || '',
          sku: it.sku || '',
          quantity: qty,
          unit: normalizeUnit(it.unit),
          unitPrice: rate > 0 ? rate : '',
          lineTotal: Number(it.lineTotal !== undefined ? it.lineTotal : (it.total || qty * rate)),
          description: it.description || '',
        };
      });
      setEditableItems(initialItems);
      setCustomDiscount(Number(sale.discount) > 0 ? String(sale.discount) : '');
    }
  }, [sale, isOpen]);

  // Sync when settings change
  useEffect(() => {
    if (settings) {
      setCustomInfo((prev) => ({
        ...prev,
        companyName: settings.companyName || settings.businessName || prev.companyName,
        companyNameEn: settings.companyNameEn || settings.businessNameEn || prev.companyNameEn,
        proprietor: settings.proprietor || prev.proprietor,
        companyPhone: settings.companyPhone || settings.businessPhone || prev.companyPhone,
        companyEmail: settings.companyEmail || settings.businessEmail || prev.companyEmail,
        companyAddress: settings.companyAddress || settings.address || prev.companyAddress,
        companyAddressEn: settings.companyAddressEn || settings.addressEn || prev.companyAddressEn,
        bin: settings.bin || prev.bin,
        businessScope: settings.businessScope || prev.businessScope,
        businessScopeEn: settings.businessScopeEn || prev.businessScopeEn,
        disclaimer: settings.disclaimer || prev.disclaimer,
        disclaimerEn: settings.disclaimerEn || prev.disclaimerEn,
      }));
    }
  }, [settings]);

  // Handle item change in live editor
  const handleItemChange = (idx, field, value) => {
    setEditableItems((prev) => {
      const updated = [...prev];
      const cur = { ...updated[idx], [field]: value };
      if (field === 'quantity' || field === 'unitPrice') {
        const q = Number(field === 'quantity' ? value : cur.quantity) || 0;
        const r = Number(field === 'unitPrice' ? value : cur.unitPrice) || 0;
        cur.lineTotal = Math.round(q * r * 100) / 100;
      }
      updated[idx] = cur;
      return updated;
    });
  };

  const handleAddItem = () => {
    setEditableItems((prev) => [
      ...prev,
      {
        id: `it-${Date.now()}-${prev.length + 1}`,
        productId: 'custom',
        productName: '',
        sku: '',
        quantity: 1,
        unit: 'pc',
        unitPrice: '',
        lineTotal: 0,
        description: '',
      },
    ]);
  };

  const handleRemoveItem = (idx) => {
    if (editableItems.length <= 1) return;
    setEditableItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const isMoneyReceipt = docType === DOCUMENT_TYPES.MONEY_RECEIPT || !!sale?.receiptNumber;
  const isQuotation = !isMoneyReceipt && (docType === DOCUMENT_TYPES.QUOTATION || !!sale?.quotationNumber);
  const invoiceNumber = customInfo.customSerial || sale?.receiptNumber || sale?.quotationNumber || sale?.invoiceNumber || sale?.invoiceNo || (isMoneyReceipt ? 'MR-2026-0001' : isQuotation ? 'QT-2026-0541' : '376');
  const cleanSerial = isMoneyReceipt
    ? invoiceNumber
    : isQuotation
    ? (invoiceNumber.replace(/\D/g, '').slice(-4) || '0541')
    : (invoiceNumber.replace(/\D/g, '').slice(-3) || '376');

  // Reactive Live Totals
  const liveSubtotal = useMemo(() => {
    return editableItems.reduce((sum, it) => sum + (Number(it.lineTotal) || 0), 0);
  }, [editableItems]);

  const discountVal = Math.min(liveSubtotal, Math.max(0, Number(customDiscount) || 0));
  const taxVal = Math.max(0, Number(sale?.tax) || 0);
  const liveGrandTotal = Math.max(0, liveSubtotal - discountVal + taxVal);
  const paidVal =
    sale?.paymentStatus === 'paid'
      ? liveGrandTotal
      : sale?.paymentStatus === 'due'
      ? 0
      : Math.min(liveGrandTotal, Math.max(0, Number(sale?.paidAmount) || 0));
  const dueVal = Math.max(0, liveGrandTotal - paidVal);
  const totalUnits = editableItems.reduce((sum, it) => sum + (Number(it.quantity) || 1), 0);

  // Consolidated effective sale reflecting all live customer and item edits
  const effectiveSale = useMemo(() => {
    if (!sale) return {};
    return {
      ...sale,
      customerName: customerData.name,
      customerCompany: customerData.company,
      customerRole: customerData.role,
      customerPhone: customerData.phone,
      customerEmail: customerData.email,
      customerAddress: customerData.address,
      customerLocation: customerData.address,
      items: editableItems,
      subtotal: liveSubtotal,
      discount: discountVal,
      tax: taxVal,
      totalAmount: liveGrandTotal,
      total: liveGrandTotal,
      paidAmount: paidVal,
      dueAmount: dueVal,
    };
  }, [sale, customerData, editableItems, liveSubtotal, discountVal, taxVal, liveGrandTotal, paidVal, dueVal]);

  // Date parsing
  const saleDate = sale?.date ? new Date(sale.date) : sale?.createdAt ? new Date(sale.createdAt) : new Date();
  const day = String(saleDate.getDate()).padStart(2, '0');
  const month = String(saleDate.getMonth() + 1).padStart(2, '0');
  const year = String(saleDate.getFullYear());

  // Generate resolved profile for UI preview
  const options = useMemo(() => ({
    language: docLanguage,
    showRate,
    showLineTotal,
    showGrandTotal,
    overrides: {
      ...customInfo,
      invoiceNumber,
    },
  }), [docLanguage, customInfo, invoiceNumber, showRate, showLineTotal, showGrandTotal]);

  const profile = useMemo(() => {
    return resolveStationeryProfile(settings, options);
  }, [settings, options]);

  const resolvedTerms = useMemo(() => {
    if (!sale?.termsAndConditions || isStandardDefaultTerms(sale.termsAndConditions)) {
      return profile.t.defaultTerms;
    }
    return sale.termsAndConditions;
  }, [sale?.termsAndConditions, profile.t.defaultTerms]);

  // Generate HTML for current template using effectiveSale
  const currentHtml = useMemo(() => {
    if (!effectiveSale) return '';
    switch (docType) {
      case DOCUMENT_TYPES.CHALLAN:
        return generateChallanHtml(effectiveSale, settings, options);
      case DOCUMENT_TYPES.OFFICIAL_PAD:
        return generateOfficialPadHtml(effectiveSale, settings, options);
      case DOCUMENT_TYPES.QUOTATION:
        return generateQuotationHtml(effectiveSale, settings, options);
      case DOCUMENT_TYPES.MONEY_RECEIPT:
        return generateMoneyReceiptHtml(effectiveSale, settings, options);
      case DOCUMENT_TYPES.THERMAL:
        return generateThermalReceiptHtml(effectiveSale, settings, options);
      case DOCUMENT_TYPES.CASH_MEMO:
      default:
        return generateCashMemoHtml(effectiveSale, settings, options);
    }
  }, [effectiveSale, settings, docType, options]);

  // Standardized print & save filename: Customer Number + Memo/Doc Number + Date + Customer Name
  const printFileName = useMemo(() => {
    return generatePrintFileName(effectiveSale, docType, options);
  }, [effectiveSale, docType, options]);

  if (!sale) return null;

  const handlePrint = () => {
    printDocumentViaIframe(currentHtml, printFileName);
  };

  const handleOpenRaw = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(currentHtml);
      try {
        printWindow.document.title = printFileName;
      } catch {
        // ignore
      }
      printWindow.document.close();
    }
  };

  const handleDownloadHtml = () => {
    try {
      const blob = new Blob([currentHtml], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${printFileName}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download voucher error:', err);
    }
  };

  const handleSaveAsDefault = () => {
    updateSettings({
      companyName: customInfo.companyName,
      companyNameEn: customInfo.companyNameEn,
      businessName: customInfo.companyName,
      businessNameEn: customInfo.companyNameEn,
      proprietor: customInfo.proprietor,
      proprietorEn: customInfo.proprietorEn,
      companyPhone: customInfo.companyPhone,
      businessPhone: customInfo.companyPhone,
      companyEmail: customInfo.companyEmail,
      businessEmail: customInfo.companyEmail,
      companyAddress: customInfo.companyAddress,
      address: customInfo.companyAddress,
      companyAddressEn: customInfo.companyAddressEn,
      addressEn: customInfo.companyAddressEn,
      bin: customInfo.bin,
      businessScope: customInfo.businessScope,
      businessScopeEn: customInfo.businessScopeEn,
      disclaimer: customInfo.disclaimer,
      disclaimerEn: customInfo.disclaimerEn,
      docLanguage,
    });
    if (addToast) {
      addToast({
        title: 'ডিফল্ট সেটিংস সংরক্ষিত হয়েছে',
        message: 'ভবিষ্যতের সকল ইনভয়েস ও চালানে এই তথ্য স্বয়ংক্রিয়ভাবে ব্যবহৃত হবে।',
        type: 'success',
      });
    }
    setIsEditing(false);
  };

  const handleResetToSeed = () => {
    setCustomInfo({
      companyName: 'মেসার্স শান্তা রেফ্রিজারেশন',
      companyNameEn: 'M/S. SHANTA REFRIGERATION',
      proprietor: 'মোঃ রুহুল আমিন (লিটন)',
      proprietorEn: 'Md. Ruhul Amin (Liton)',
      companyPhone: '01711-169875',
      companyEmail: 'shanta.refrigeration@gmail.com',
      companyAddress: '৪০৬, সি.ডি.এ মার্কেট (মসজিদের বিপরীতে), পাহাড়তলী, চট্টগ্রাম।',
      companyAddressEn: '406, C.D.A Market, Pahartali, Chattogram.',
      bin: 'BIN-001651149-0505',
      businessScope: 'এখানে সকল প্রকারের রেফ্রিজারেশন কোল্ড স্টোর, এয়ার কন্ডিশন, মেশিন ও যন্ত্রাংশ, আইস প্ল্যান্ট, চিলার প্ল্যান্ট R-12, R-22, R-502a, R-134a, R-407a, R-404a ইত্যাদি গ্যাস, কম্প্রেসার ওয়েল, পিস্টন ও এ্যামোনিয়া কম্প্রেসারের খুচরা যন্ত্রাংশ ক্রয় ও বিক্রয় করা হয়।',
      businessScopeEn: 'Dealers & suppliers of all types of refrigeration cold storage, air conditioning equipment & parts, ice plant, chiller plant, R-12, R-22, R-502a, R-134a, R-407a, R-404a gases, compressor oil, piston and ammonia compressor spare parts.',
      disclaimer: 'বিঃদ্রঃ উপরোক্ত মালামাল ভালো অবস্থায় বুঝিয়া পাইলাম।',
      disclaimerEn: 'Notice: Received the above goods in good condition.',
      customSerial: '',
    });
    setDocLanguage(DOCUMENT_LANGUAGES.BANGLA);
  };

  const handleSaveToRecord = () => {
    try {
      const targetId = sale?._id || sale?.id;
      if (isMoneyReceipt && targetId && updateMoneyReceipt) {
        const res = updateMoneyReceipt(targetId, {
          customerName: customerData.name,
          customerCompany: customerData.company,
          customerRole: customerData.role,
          customerPhone: customerData.phone,
          customerEmail: customerData.email,
          customerAddress: customerData.address,
        });
        if (res && res.success !== false) {
          addToast({
            title: 'মানি রিসিপ্ট আপডেট সম্পন্ন',
            message: `রসিদ #${sale.receiptNumber || invoiceNumber}-এর তথ্য সংরক্ষিত হয়েছে।`,
            type: 'success',
          });
        }
      } else if (isQuotation && targetId) {
        const mappedItems = editableItems.map((it) => ({
          productId: it.productId || null,
          name: it.productName || it.name || 'Equipment Part',
          productName: it.productName || it.name || 'Equipment Part',
          description: it.description || '',
          quantity: Number(it.quantity) || 1,
          unit: it.unit || 'pc',
          unitPrice: Number(it.unitPrice || it.rate || it.price) || 0,
          lineTotal: Number(it.lineTotal) || 0,
        }));
        const payload = {
          customerId: sale.customerId || null,
          customerName: customerData.name,
          customerCompany: customerData.company,
          customerRole: customerData.role,
          customerPhone: customerData.phone,
          customerEmail: customerData.email,
          customerAddress: customerData.address,
          customerLocation: customerData.address,
          items: mappedItems,
          subtotal: liveSubtotal,
          discount: discountVal,
          tax: taxVal,
          totalAmount: liveGrandTotal,
          total: liveGrandTotal,
          autoSaveCustomer: true,
        };
        const res = updateQuotation(targetId, payload);
        if (res && res.success !== false) {
          addToast({
            title: 'কোটেশন রেকর্ড আপডেট সম্পন্ন',
            message: `কোটেশন #${sale.quotationNumber || invoiceNumber}-এর তথ্য সফলভাবে ডেটাবেসে সেভ হয়েছে।`,
            type: 'success',
          });
        }
      } else if (targetId) {
        const mappedItems = editableItems.map((it) => ({
          productId: it.productId || 'custom',
          productName: it.productName || it.name || 'Equipment Part',
          sku: it.sku || '',
          quantity: Number(it.quantity) || 1,
          unit: it.unit || 'pc',
          unitPrice: Number(it.unitPrice || it.rate || it.price) || 0,
          lineTotal: Number(it.lineTotal) || 0,
        }));
        const payload = {
          customerId: sale.customerId || null,
          customerName: customerData.name,
          customerCompany: customerData.company,
          customerRole: customerData.role,
          customerPhone: customerData.phone,
          customerEmail: customerData.email,
          customerAddress: customerData.address,
          customerLocation: customerData.address,
          items: mappedItems,
          subtotal: liveSubtotal,
          discount: discountVal,
          tax: taxVal,
          totalAmount: liveGrandTotal,
          total: liveGrandTotal,
          paidAmount: paidVal,
          dueAmount: dueVal,
          autoSaveCustomer: true,
        };
        const res = updateSale(targetId, payload, 'Sales Executive');
        if (res && res.success !== false) {
          addToast({
            title: 'ইনভয়েস রেকর্ড আপডেট সম্পন্ন',
            message: `ইনভয়েস #${sale.invoiceNo || invoiceNumber}-এর তথ্য সফলভাবে ডেটাবেসে সেভ হয়েছে।`,
            type: 'success',
          });
        }
      }
    } catch (err) {
      console.error('Failed to save record:', err);
      addToast({
        title: 'সেভ ব্যর্থ',
        message: err.message || 'রেকর্ড সংরক্ষণ করা যায়নি।',
        type: 'error',
      });
    }
  };

  const getDocTitle = () => {
    switch (docType) {
      case DOCUMENT_TYPES.CHALLAN:
        return profile.t.challanBadge;
      case DOCUMENT_TYPES.OFFICIAL_PAD:
        return profile.t.padBadge;
      case DOCUMENT_TYPES.QUOTATION:
        return 'দরপত্র / প্রফর্মা কোটেশন (Quotation Pad)';
      case DOCUMENT_TYPES.THERMAL:
        return profile.t.thermalBadge;
      case DOCUMENT_TYPES.CASH_MEMO:
      default:
        return profile.t.cashMemoBadge;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="প্রিন্ট ও চালান ভাউচার ম্যানেজার (Universal Stationery Print Engine)"
      description={`${docType === DOCUMENT_TYPES.QUOTATION ? 'দরপত্র / কোটেশন' : docType === DOCUMENT_TYPES.CHALLAN ? 'ডেলিভারী চালান' : 'ক্যাশ মেমো / ইনভয়েস'} #${invoiceNumber} · যেকোনো প্রতিষ্ঠান বা ভাষায় তাৎক্ষণিক পরিবর্তন ও লাইভ প্রিন্ট`}
      maxWidth="max-w-5xl"
    >
      <div className="space-y-3.5">
        {/* Top Control Bar: Format Selector + Language Switcher + Edit Button */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
          {/* Document Format Tabs */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700/60 flex-1">
            <button
              type="button"
              onClick={() => setDocType(DOCUMENT_TYPES.CASH_MEMO)}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${docType === DOCUMENT_TYPES.CASH_MEMO
                ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-500/30'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
            >
              <Receipt className="h-3.5 w-3.5" />
              <span>ক্যাশ মেমো</span>
            </button>

            <button
              type="button"
              onClick={() => setDocType(DOCUMENT_TYPES.CHALLAN)}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${docType === DOCUMENT_TYPES.CHALLAN
                ? 'bg-sky-600 text-white shadow-sm ring-2 ring-sky-500/30'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
            >
              <Truck className="h-3.5 w-3.5" />
              <span>ডেলিভারী চালান</span>
            </button>

            <button
              type="button"
              onClick={() => setDocType(DOCUMENT_TYPES.OFFICIAL_PAD)}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${docType === DOCUMENT_TYPES.OFFICIAL_PAD
                ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-500/30'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
            >
              <FileText className="h-3.5 w-3.5" />
              <span>অফিসিয়াল প্যাড</span>
            </button>

            <button
              type="button"
              onClick={() => setDocType(DOCUMENT_TYPES.QUOTATION)}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${docType === DOCUMENT_TYPES.QUOTATION
                ? 'bg-purple-600 text-white shadow-sm ring-2 ring-purple-500/30'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              <span>কোটেশন প্যাড</span>
            </button>

            <button
              type="button"
              onClick={() => setDocType(DOCUMENT_TYPES.MONEY_RECEIPT)}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${docType === DOCUMENT_TYPES.MONEY_RECEIPT
                ? 'bg-teal-600 text-white shadow-sm ring-2 ring-teal-500/30'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
            >
              <Wallet className="h-3.5 w-3.5" />
              <span>মানি রিসিপ্ট</span>
            </button>

            <button
              type="button"
              onClick={() => setDocType(DOCUMENT_TYPES.THERMAL)}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${docType === DOCUMENT_TYPES.THERMAL
                ? 'bg-slate-800 text-white dark:bg-slate-700 shadow-sm ring-2 ring-slate-500/30'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
            >
              <Printer className="h-3.5 w-3.5" />
              <span>পিওএস থার্মাল</span>
            </button>
          </div>

          {/* Right Tools: Language Selector & Edit Toggle */}
          <div className="flex items-center gap-2 self-end md:self-auto">
            {/* Language Switcher Buttons */}
            <div className="inline-flex rounded-lg p-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setDocLanguage(DOCUMENT_LANGUAGES.BANGLA)}
                className={`px-2 py-1 text-xs font-bold rounded-md transition-all ${docLanguage === DOCUMENT_LANGUAGES.BANGLA
                  ? 'bg-emerald-500 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                title="বাংলায় দেখুন ও প্রিন্ট করুন"
              >
                বাংলা
              </button>
              <button
                type="button"
                onClick={() => setDocLanguage(DOCUMENT_LANGUAGES.ENGLISH)}
                className={`px-2 py-1 text-xs font-bold rounded-md transition-all ${docLanguage === DOCUMENT_LANGUAGES.ENGLISH
                  ? 'bg-emerald-500 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                title="View & Print in English"
              >
                English
              </button>
              <button
                type="button"
                onClick={() => setDocLanguage(DOCUMENT_LANGUAGES.OBRO)}
                className={`px-2 py-1 text-xs font-bold rounded-md transition-all ${docLanguage === DOCUMENT_LANGUAGES.OBRO
                  ? 'bg-emerald-500 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                title="অভ্রো / বাংলিশ ফরম্যাটে দেখুন ও প্রিন্ট করুন"
              >
                অভ্রো
              </button>
              <button
                type="button"
                onClick={() => setDocLanguage(DOCUMENT_LANGUAGES.BILINGUAL)}
                className={`px-2 py-1 text-xs font-bold rounded-md transition-all ${docLanguage === DOCUMENT_LANGUAGES.BILINGUAL
                  ? 'bg-emerald-500 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                title="বাংলা + English উভয়ই"
              >
                উভয়
              </button>
            </div>

            {/* Customization Drawer Toggle */}
            <button
              type="button"
              onClick={() => setIsEditing(!isEditing)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${isEditing
                ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                }`}
            >
              <Edit3 className="h-3.5 w-3.5" />
              <span>{isEditing ? 'এডিটর লুকান' : 'তথ্য এডিট করুন'}</span>
              {isEditing ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
          </div>
        </div>

        {/* Single Line Column & Total Visibility Toolbar ("eta ek line e thakbe eigula") */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-3.5 py-2 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700/60 text-xs">
          <div className="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-300">
            <span className="text-[11px] uppercase tracking-wider text-purple-700 dark:text-purple-400 font-extrabold flex items-center gap-1.5">
              <span>👁️ কলাম ও টোটাল প্রদর্শন (Visibility Controls):</span>
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
              <span>মোট টাকা / Amount কলাম</span>
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

        {/* Accordion / Drawer: Live Customization Panel */}
        {isEditing && (
          <div className="bg-amber-50/70 dark:bg-amber-950/20 p-4 rounded-xl border border-amber-300 dark:border-amber-800/60 space-y-3.5 text-xs animate-in fade-in slide-in-from-top-2 duration-200">
            {/* Drawer Header with Title and Action Buttons */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-amber-200 dark:border-amber-800/40 pb-2.5 gap-2">
              <div className="flex items-center gap-2">
                <Edit3 className="h-4 w-4 text-amber-600 flex-shrink-0" />
                <span className="font-bold text-amber-900 dark:text-amber-200 text-sm">
                  গ্রাহক, পণ্যের দর ও প্রতিষ্ঠানের তথ্য লাইভ এডিটর (Live Customizer)
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleResetToSeed}
                  className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>রিসেট</span>
                </button>
                {activeEditorTab === 'company' && (
                  <button
                    type="button"
                    onClick={handleSaveAsDefault}
                    className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded text-xs font-bold shadow-xs transition-colors"
                  >
                    <Save className="h-3 w-3" />
                    <span>কোম্পানি ডিফল্ট সেভ করুন</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleSaveToRecord}
                  className="flex items-center gap-1 bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded text-xs font-bold shadow-xs transition-colors"
                  title="এই ইনভয়েস বা কোটেশনের মূল রেকর্ডে গ্রাহক ও আইটেম ডেটাবেসে সংরক্ষণ করুন"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>রেকর্ডে সেভ করুন (Save to DB)</span>
                </button>
              </div>
            </div>

            {/* Subtabs Navigation */}
            <div className="flex items-center gap-1.5 border-b border-amber-200/80 dark:border-amber-800/30 pb-2">
              <button
                type="button"
                onClick={() => setActiveEditorTab('customer')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs transition-all ${
                  activeEditorTab === 'customer'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-white/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-white'
                }`}
              >
                <Users2 className="h-3.5 w-3.5" />
                <span>গ্রাহক / কাস্টমার তথ্য</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveEditorTab('items')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs transition-all ${
                  activeEditorTab === 'items'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-white/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-white'
                }`}
              >
                <Package className="h-3.5 w-3.5" />
                <span>পণ্য ও মূল্য তালিকা ({editableItems.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveEditorTab('company')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs transition-all ${
                  activeEditorTab === 'company'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-white/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-white'
                }`}
              >
                <Building2 className="h-3.5 w-3.5" />
                <span>প্রতিষ্ঠান প্যাড ও শর্ত</span>
              </button>
            </div>

            {/* TAB 1: CUSTOMER PROFILE */}
            {activeEditorTab === 'customer' && (
              <div className="space-y-3 pt-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-0.5">
                      গ্রাহক / প্রাপকের নাম (Customer / Contact Person):
                    </label>
                    <input
                      type="text"
                      value={customerData.name}
                      onChange={(e) => setCustomerData({ ...customerData, name: e.target.value })}
                      placeholder="যেমন: ইঞ্জিঃ কামরুল ইসলাম / মোঃ রুবেল"
                      className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-0.5">
                      প্রতিষ্ঠান / কোম্পানির নাম (Company / Firm):
                    </label>
                    <input
                      type="text"
                      value={customerData.company}
                      onChange={(e) => setCustomerData({ ...customerData, company: e.target.value })}
                      placeholder="যেমন: সোনারগাঁও টেক্সটাইল মিলস লিঃ"
                      className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-0.5">
                      পদবী / কাস্টমার স্ট্যাটাস (Role / Designation):
                    </label>
                    <select
                      value={customerData.role}
                      onChange={(e) => setCustomerData({ ...customerData, role: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
                    >
                      <option value="owner">কোম্পানির মালিক / স্বত্বাধিকারী (Owner)</option>
                      <option value="agent">কোম্পানির প্রতিনিধি / এজেন্ট (Agent)</option>
                      <option value="purchaser">ক্রয় কর্মকর্তা / প্রকিউরমেন্ট ম্যানেজার (Purchaser)</option>
                      <option value="supplier_rep">সরবরাহকারী / ভেন্ডর প্রতিনিধি (Supplier Rep)</option>
                      <option value="wholesale">পাইকারি ডিলার (Wholesale)</option>
                      <option value="retail">সাধারণ খুচরা ক্রেতা (Retail)</option>
                      <option value="manager">ম্যানেজার / ফ্যাক্টরি ইনচার্জ (Manager)</option>
                      <option value="managing_director">ম্যানেজিং ডিরেক্টর / এমডি (MD)</option>
                      <option value="purchase_manager">পারচেজ ম্যানেজার (Purchase Manager)</option>
                      <option value="project_director">প্রজেক্ট ডিরেক্টর (Project Director)</option>
                      <option value="contractor">ঠিকাদার / কন্ট্রাক্টর (Contractor)</option>
                      <option value="retail_customer">খুচরা ক্রেতা (Retail Customer)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-0.5">
                      মোবাইল নম্বর (Contact Phone):
                    </label>
                    <input
                      type="text"
                      value={customerData.phone}
                      onChange={(e) => setCustomerData({ ...customerData, phone: e.target.value })}
                      placeholder="01711-xxxxxx"
                      className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-0.5">
                      ইমেইল এড্রেস (Email Address):
                    </label>
                    <input
                      type="email"
                      value={customerData.email}
                      onChange={(e) => setCustomerData({ ...customerData, email: e.target.value })}
                      placeholder="client@company.com"
                      className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-0.5">
                      ঠিকানা / লোকেশন (Location / Address):
                    </label>
                    <input
                      type="text"
                      value={customerData.address}
                      onChange={(e) => setCustomerData({ ...customerData, address: e.target.value })}
                      placeholder="প্লট নং ১২, নাসিরাবাদ বায়েজিদ, চট্টগ্রাম"
                      className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: ITEMS & PRICING */}
            {activeEditorTab === 'items' && (
              <div className="space-y-3 pt-1">
                <div className="overflow-x-auto rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900">
                  <table className="w-full min-w-[700px] text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-b border-slate-300 dark:border-slate-700 font-bold">
                        <th className="py-2 px-2 text-center w-10">#</th>
                        <th className="py-2 px-3 min-w-[220px]">পণ্যের নাম ও বিবরণ (Product Description)</th>
                        <th className="py-2 px-2 text-center w-24">পরিমাণ (Qty)</th>
                        <th className="py-2 px-2 text-center w-28">একক (Unit)</th>
                        <th className="py-2 px-3 text-right w-32">দর / রেট (৳ Rate)</th>
                        <th className="py-2 px-3 text-right w-36">মোট মূল্য (৳ Total)</th>
                        <th className="py-2 px-2 text-center w-12">মুছুন</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {editableItems.map((it, idx) => (
                        <tr key={it.id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="py-1.5 px-2 text-center font-mono text-slate-500 font-bold">
                            {idx + 1}
                          </td>
                          <td className="py-1.5 px-2">
                            <input
                              type="text"
                              value={it.productName}
                              onChange={(e) => handleItemChange(idx, 'productName', e.target.value)}
                              placeholder="পণ্যের নাম ও স্পেসিফিকেশন"
                              className="w-full px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
                            />
                          </td>
                          <td className="py-1.5 px-2">
                            <input
                              type="number"
                              min="0.01"
                              step="any"
                              value={it.quantity}
                              onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                              className="w-full px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono font-bold text-center"
                            />
                          </td>
                          <td className="py-1.5 px-2">
                            <select
                              value={normalizeUnit(it.unit)}
                              onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                              className="w-full px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono text-center"
                            >
                              {getUnitSelectOptions(it.unit, currentGlobalLang).map((u) => (
                                <option key={u.value} value={u.value}>
                                  {u.label}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="py-1.5 px-2">
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={it.unitPrice}
                              onChange={(e) => handleItemChange(idx, 'unitPrice', e.target.value)}
                              placeholder="0"
                              className="w-full px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono font-bold text-right text-emerald-700 dark:text-emerald-400"
                            />
                          </td>
                          <td className="py-1.5 px-3 text-right font-mono font-bold text-xs text-slate-800 dark:text-slate-200 whitespace-nowrap">
                            {formatCurrency(it.lineTotal || 0, settings.currency)}
                          </td>
                          <td className="py-1.5 px-2 text-center">
                            <button
                              type="button"
                              disabled={editableItems.length <= 1}
                              onClick={() => handleRemoveItem(idx)}
                              className="p-1 rounded text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 disabled:opacity-30 disabled:cursor-not-allowed"
                              title="এই লাইন আইটেমটি মুছুন"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Items Actions & Totals */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-xs transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>নতুন পণ্য / আইটেম যোগ করুন (Add Line Item)</span>
                  </button>

                  <div className="flex items-center gap-4 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 font-mono text-xs">
                    <div>
                      <span className="text-slate-500 font-sans mr-1">সাবটোটাল:</span>
                      <strong>{formatCurrency(liveSubtotal, settings.currency)}</strong>
                    </div>

                    <div className="flex items-center gap-1 font-sans">
                      <label className="text-slate-500 text-[11px] font-bold">ছাড় / ডিসকাউন্ট (৳):</label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={customDiscount}
                        onChange={(e) => setCustomDiscount(e.target.value)}
                        placeholder="0"
                        className="w-20 px-2 py-0.5 rounded border border-slate-300 dark:border-slate-700 font-mono text-xs font-bold text-right"
                      />
                    </div>

                    <div className="text-emerald-700 dark:text-emerald-400 font-bold">
                      <span className="font-sans mr-1">সর্বমোট (Net):</span>
                      <span>{formatCurrency(liveGrandTotal, settings.currency)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: COMPANY & PAD OVERRIDES */}
            {activeEditorTab === 'company' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-0.5">
                    প্রতিষ্ঠানের নাম (বাংলা):
                  </label>
                  <input
                    type="text"
                    value={customInfo.companyName}
                    onChange={(e) => setCustomInfo({ ...customInfo, companyName: e.target.value })}
                    placeholder="যেমন: মেসার্স শান্তা রেফ্রিজারেশন"
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-0.5">
                    Company Name (English):
                  </label>
                  <input
                    type="text"
                    value={customInfo.companyNameEn}
                    onChange={(e) => setCustomInfo({ ...customInfo, companyNameEn: e.target.value })}
                    placeholder="e.g. M/S. SHANTA REFRIGERATION"
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-0.5">
                    স্বত্বাধিকারী / প্রোপ্রাইটর:
                  </label>
                  <input
                    type="text"
                    value={customInfo.proprietor}
                    onChange={(e) => setCustomInfo({ ...customInfo, proprietor: e.target.value })}
                    placeholder="মোঃ রুহুল আমিন (লিটন)"
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-0.5">
                    মোবাইল / ফোন নম্বর:
                  </label>
                  <input
                    type="text"
                    value={customInfo.companyPhone}
                    onChange={(e) => setCustomInfo({ ...customInfo, companyPhone: e.target.value })}
                    placeholder="01711-169875"
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-0.5">
                    ইমেইল এড্রেস:
                  </label>
                  <input
                    type="text"
                    value={customInfo.companyEmail}
                    onChange={(e) => setCustomInfo({ ...customInfo, companyEmail: e.target.value })}
                    placeholder="shanta.refrigeration@gmail.com"
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-0.5">
                    BIN / ভ্যাট নিবন্ধন নং:
                  </label>
                  <input
                    type="text"
                    value={customInfo.bin}
                    onChange={(e) => setCustomInfo({ ...customInfo, bin: e.target.value })}
                    placeholder="BIN-001651149-0505"
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono font-bold"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-0.5">
                    প্রতিষ্ঠানের পূর্ণ ঠিকানা:
                  </label>
                  <input
                    type="text"
                    value={customInfo.companyAddress}
                    onChange={(e) => setCustomInfo({ ...customInfo, companyAddress: e.target.value })}
                    placeholder="৪০৬, সি.ডি.এ মার্কেট (মসজিদের বিপরীতে), পাহাড়তলী, চট্টগ্রাম।"
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-0.5">
                    মেমো নম্বর ওভাররাইড (Memo Serial):
                  </label>
                  <input
                    type="text"
                    value={customInfo.customSerial}
                    onChange={(e) => setCustomInfo({ ...customInfo, customSerial: e.target.value })}
                    placeholder={invoiceNumber}
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono font-bold text-red-600"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-0.5">
                    ব্যবসার বিবরণী ও পণ্যের তালিকা (Business Scope & Product Scope):
                  </label>
                  <input
                    type="text"
                    value={customInfo.businessScope}
                    onChange={(e) => setCustomInfo({ ...customInfo, businessScope: e.target.value })}
                    placeholder="এখানে সকল প্রকারের রেফ্রিজারেশন কোল্ড স্টোর, এয়ার কন্ডিশন..."
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-0.5">
                    ফুটার শর্ত ও নোটিশ (Disclaimer & Return Policy):
                  </label>
                  <input
                    type="text"
                    value={customInfo.disclaimer}
                    onChange={(e) => setCustomInfo({ ...customInfo, disclaimer: e.target.value })}
                    placeholder="বিঃদ্রঃ উপরোক্ত মালামাল ভালো অবস্থায় বুঝিয়া পাইলাম।"
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Live Visual Interactive Preview in Modal */}
        <div className="bg-slate-200/70 dark:bg-slate-950 p-3 sm:p-5 rounded-2xl border border-slate-300 dark:border-slate-800 max-h-[500px] overflow-y-auto font-['Hind_Siliguri',sans-serif]">
          {/* FORMAT 1: CASH MEMO (১ম কপি) */}
          {docType === DOCUMENT_TYPES.CASH_MEMO && (
            <div className="bg-white text-slate-900 p-5 sm:p-7 rounded-xl shadow-md border-2 border-slate-300 max-w-2xl mx-auto space-y-3 relative overflow-hidden">
              {profile.t.bismi && (
                <div className="text-center text-xs font-semibold text-slate-600">
                  {profile.t.bismi}
                </div>
              )}

              {/* Header Top Row */}
              <div className="grid grid-cols-3 items-center mb-1">
                <div />
                <div className="text-center">
                  <span className="inline-block bg-[#1e1b4b] text-white font-bold text-xs px-4 py-1 rounded shadow-sm uppercase tracking-wider">
                    {profile.t.cashMemoBadge}
                  </span>
                </div>
                <div className="text-right text-[11px] leading-tight">
                  <p className="font-bold text-slate-800">{profile.t.proprietor} {profile.proprietorName}</p>
                  <p className="font-mono text-emerald-700 font-semibold">📞 {profile.phone}</p>
                  {profile.email && <p className="text-[10px] text-slate-500">{profile.email}</p>}
                </div>
              </div>

              {/* Main Titles */}
              <div className="text-center space-y-0.5">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#047857] tracking-tight">
                  {profile.primaryTitle}
                </h1>
                {profile.secondaryTitle && (
                  <h2 className="text-base sm:text-lg font-extrabold text-[#b91c1c] tracking-wide font-sans">
                    {profile.secondaryTitle}
                  </h2>
                )}
                <div className="border border-slate-300 bg-slate-50 rounded-md p-1.5 text-[10px] leading-relaxed text-slate-700">
                  {profile.scope}
                </div>
                <p className="text-[11px] font-bold text-slate-800 pt-0.5">
                  📍 {profile.address}
                </p>
              </div>

              {/* Meta bar */}
              <div className="flex justify-between items-center text-xs font-semibold border-b border-slate-300 pb-1.5 pt-1">
                <div className="flex items-center gap-3">
                  <span className="text-slate-600">{profile.t.copy1}</span>
                  <span>{profile.t.memoNo} <strong className="font-mono text-red-600 text-sm font-black">{cleanSerial}</strong></span>
                </div>
                <div className="font-mono text-blue-900 font-bold text-[11px]">
                  {profile.bin}
                </div>
                <div className="flex items-center gap-1 text-[11px]">
                  <span>{profile.t.date}</span>
                  <span className="border border-slate-800 px-1.5 py-0.5 font-mono font-bold bg-white">{day}</span>
                  <span className="border border-slate-800 px-1.5 py-0.5 font-mono font-bold bg-white">{month}</span>
                  <span className="border border-slate-800 px-2 py-0.5 font-mono font-bold bg-white">{year}</span>
                </div>
              </div>

              {/* Customer Box */}
              <div className="border border-slate-400 rounded p-2 text-xs space-y-1 bg-white">
                <div className="flex items-baseline gap-2">
                  <span className="font-bold text-slate-800 w-14 flex-shrink-0">{profile.t.name}</span>
                  <span className="flex-1 border-b border-dotted border-slate-400 font-semibold text-slate-900">
                    {effectiveSale.customerName || profile.t.walkInBuyer}
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="font-bold text-slate-800 w-14 flex-shrink-0">{profile.t.address}</span>
                  <span className="flex-1 border-b border-dotted border-slate-400 font-medium text-slate-700">
                    {effectiveSale.customerAddress || effectiveSale.customerPhone || profile.t.counterSale}
                  </span>
                </div>
              </div>

              {/* Watermark in background */}
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex flex-col items-center justify-center pointer-events-none opacity-[0.06] select-none">
                <div className="text-6xl font-black text-sky-800 -rotate-12 tracking-widest">
                  {profile.primaryTitle}
                </div>
                <div className="text-2xl font-bold text-emerald-800 mt-2">
                  {profile.watermarkText}
                </div>
              </div>

              {/* Memo Item Table */}
              <div className="overflow-x-auto relative z-10">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#38bdf8] text-slate-900 font-bold border border-sky-600 text-center">
                      <th className="py-1 px-1.5 w-10 border border-sky-600">{profile.t.sl}</th>
                      <th className="py-1 px-2 border border-sky-600 text-left">{profile.t.itemDesc}</th>
                      <th className="py-1 px-1.5 w-20 border border-sky-600">{profile.t.qty}</th>
                      {showRate && <th className="py-1 px-2 w-24 border border-sky-600 text-right">{profile.t.rate}</th>}
                      {showLineTotal && <th className="py-1 px-2 w-28 border border-sky-600 text-right">{profile.t.amount}</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {editableItems.map((it, idx) => {
                      const qty = Number(it.quantity) || 1;
                      const rate = Number(it.unitPrice !== undefined ? it.unitPrice : it.price) || 0;
                      const amt = Number(it.lineTotal !== undefined ? it.lineTotal : it.total || qty * rate);
                      return (
                        <tr key={idx} className="border-b border-slate-300 text-xs">
                          <td className="py-1 px-1.5 text-center font-mono bg-[#faf5ff] border-x border-slate-300">{idx + 1}</td>
                          <td className="py-1 px-2 font-semibold bg-[#fffbeb] border-r border-slate-300">
                            {cleanItemName(it.productName || it.name)}
                            {cleanItemSku(it.sku) && <span className="text-[10px] text-slate-500 font-normal ml-1">({cleanItemSku(it.sku)})</span>}
                          </td>
                          <td className="py-1 px-1.5 text-center font-mono font-bold bg-[#f0fdf4] border-r border-slate-300 whitespace-nowrap">{qty} {it.unit || 'pc'}</td>
                          {showRate && <td className="py-1 px-2 text-right font-mono bg-[#fdf2f8] border-r border-slate-300">{formatCurrency(rate, profile.currencySymbol)}</td>}
                          {showLineTotal && <td className="py-1 px-2 text-right font-mono font-bold bg-[#eff6ff] border-r border-slate-300">{formatCurrency(amt, profile.currencySymbol)}</td>}
                        </tr>
                      );
                    })}
                    {Array.from({ length: Math.max(0, 5 - editableItems.length) }).map((_, i) => (
                      <tr key={`empty-${i}`} className="border-b border-slate-200 text-xs h-6">
                        <td className="py-1 px-1.5 text-center font-mono text-slate-300 bg-[#faf5ff] border-x border-slate-300">{editableItems.length + i + 1}</td>
                        <td className="bg-[#fffbeb] border-r border-slate-300"></td>
                        <td className="bg-[#f0fdf4] border-r border-slate-300"></td>
                        {showRate && <td className="bg-[#fdf2f8] border-r border-slate-300"></td>}
                        {showLineTotal && <td className="bg-[#eff6ff] border-r border-slate-300"></td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals Table */}
              {showGrandTotal && (
                <div className="flex justify-end relative z-10">
                  <table className="w-full max-w-[280px] sm:w-72 text-xs border border-slate-400 tabular-nums">
                    <tbody>
                      {(discountVal > 0 || taxVal > 0) && (
                        <tr className="border-b border-slate-300 bg-slate-50">
                          <td className="py-1 px-2 font-bold text-right border-r border-slate-300">{profile.t.subtotal}</td>
                          <td className="py-1 px-2 font-mono font-bold text-right bg-blue-50/50">{formatCurrency(liveSubtotal, profile.currencySymbol)}</td>
                        </tr>
                      )}
                      {discountVal > 0 && (
                        <tr className="border-b border-slate-300 bg-slate-50 text-emerald-700">
                          <td className="py-1 px-2 font-bold text-right border-r border-slate-300">{profile.t.discount}</td>
                          <td className="py-1 px-2 font-mono font-bold text-right bg-emerald-50/50 whitespace-nowrap">-{formatCurrency(discountVal, profile.currencySymbol)}</td>
                        </tr>
                      )}
                      <tr className="border-b border-slate-300 bg-slate-50">
                        <td className="py-1 px-2 font-bold text-right border-r border-slate-300">{discountVal > 0 ? profile.t.netPayable : profile.t.total}</td>
                        <td className="py-1 px-2 font-mono font-bold text-right bg-blue-50/50">{formatCurrency(liveGrandTotal, profile.currencySymbol)}</td>
                      </tr>
                      <tr className="border-b border-slate-300 bg-slate-50">
                        <td className="py-1 px-2 font-bold text-right border-r border-slate-300">{profile.t.paid}</td>
                        <td className="py-1 px-2 font-mono font-bold text-right text-emerald-700 bg-blue-50/50">{formatCurrency(paidVal, profile.currencySymbol)}</td>
                      </tr>
                      <tr className="bg-slate-50">
                        <td className="py-1 px-2 font-bold text-right border-r border-slate-300">{profile.t.due}</td>
                        <td className={`py-1 px-2 font-mono font-bold text-right bg-blue-50/50 ${dueVal > 0 ? 'text-red-600' : 'text-slate-600'}`}>
                          {formatCurrency(dueVal, profile.currencySymbol)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {/* Disclaimer and Notices */}
              <div className="text-center text-[10px] space-y-0.5 pt-1 text-slate-600">
                <p>{profile.disclaimer}</p>
                <span className="inline-block border border-red-500 text-red-600 font-bold px-2 py-0.5 rounded text-[9.5px] bg-red-50">
                  {profile.nonRefundable}
                </span>
              </div>

              {/* Signatures */}
              <div className="flex justify-between items-end pt-8 px-4 text-xs font-bold text-slate-800">
                <div className="border-t border-dashed border-slate-500 pt-1 text-center w-36">
                  {profile.t.buyerSign}
                </div>
                <div className="border-t border-dashed border-slate-500 pt-1 text-center w-52">
                  {profile.t.sellerSign} {profile.primaryTitle}
                </div>
              </div>
            </div>
          )}

          {/* FORMAT 2: DELIVERY CHALLAN (২য় কপি) */}
          {docType === DOCUMENT_TYPES.CHALLAN && (
            <div className="bg-white text-slate-900 p-5 sm:p-7 rounded-xl shadow-md border-2 border-slate-300 max-w-2xl mx-auto space-y-3 relative overflow-hidden">
              {profile.t.bismi && (
                <div className="text-center text-xs font-semibold text-slate-600">
                  {profile.t.bismi}
                </div>
              )}

              {/* Header Top Row */}
              <div className="grid grid-cols-3 items-center mb-1">
                <div />
                <div className="text-center">
                  <span className="inline-block bg-[#0369a1] text-white font-bold text-xs px-4 py-1 rounded shadow-sm uppercase tracking-wider">
                    {profile.t.challanBadge}
                  </span>
                </div>
                <div className="text-right text-[11px] leading-tight">
                  <p className="font-bold text-slate-800">{profile.t.proprietor} {profile.proprietorName}</p>
                  <p className="font-mono text-sky-700 font-semibold">📞 {profile.phone}</p>
                  {profile.email && <p className="text-[10px] text-slate-500">{profile.email}</p>}
                </div>
              </div>

              {/* Main Titles */}
              <div className="text-center space-y-0.5">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#047857] tracking-tight">
                  {profile.primaryTitle}
                </h1>
                {profile.secondaryTitle && (
                  <h2 className="text-base sm:text-lg font-extrabold text-[#0369a1] tracking-wide font-sans">
                    {profile.secondaryTitle}
                  </h2>
                )}
                <div className="border border-slate-300 bg-slate-50 rounded-md p-1.5 text-[10px] leading-relaxed text-slate-700">
                  {profile.scope}
                </div>
                <p className="text-[11px] font-bold text-slate-800 pt-0.5">
                  📍 {profile.address}
                </p>
              </div>

              {/* Meta bar */}
              <div className="flex justify-between items-center text-xs font-semibold border-b border-slate-300 pb-1.5 pt-1">
                <div className="flex items-center gap-3">
                  <span className="text-slate-600">{profile.t.copy2}</span>
                  <span>{profile.t.memoNo} <strong className="font-mono text-sky-700 text-sm font-black">{cleanSerial}</strong></span>
                </div>
                <div className="font-mono text-sky-900 font-bold text-[11px]">
                  {profile.bin}
                </div>
                <div className="flex items-center gap-1 text-[11px]">
                  <span>{profile.t.date}</span>
                  <span className="border border-slate-800 px-1.5 py-0.5 font-mono font-bold bg-white">{day}</span>
                  <span className="border border-slate-800 px-1.5 py-0.5 font-mono font-bold bg-white">{month}</span>
                  <span className="border border-slate-800 px-2 py-0.5 font-mono font-bold bg-white">{year}</span>
                </div>
              </div>

              {/* Customer Box */}
              <div className="border border-slate-400 rounded p-2 text-xs space-y-1 bg-white">
                <div className="flex items-baseline gap-2">
                  <span className="font-bold text-slate-800 w-14 flex-shrink-0">{profile.t.name}</span>
                  <span className="flex-1 border-b border-dotted border-slate-400 font-semibold text-slate-900">
                    {effectiveSale.customerName || profile.t.consigneeDefault}
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="font-bold text-slate-800 w-14 flex-shrink-0">{profile.t.address}</span>
                  <span className="flex-1 border-b border-dotted border-slate-400 font-medium text-slate-700">
                    {effectiveSale.customerAddress || effectiveSale.customerPhone || profile.t.deliverySiteDefault}
                  </span>
                </div>
              </div>

              {/* Challan Table without commercial rates/prices */}
              <div className="overflow-x-auto relative z-10">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#38bdf8] text-slate-900 font-bold border border-sky-600 text-center">
                      <th className="py-1 px-2 w-12 border border-sky-600">{profile.t.sl}</th>
                      <th className="py-1 px-3 border border-sky-600 text-left">{profile.t.itemDesc}</th>
                      <th className="py-1 px-3 w-28 border border-sky-600">{profile.t.qty}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {editableItems.map((it, idx) => {
                      const qty = Number(it.quantity) || 1;
                      return (
                        <tr key={idx} className="border-b border-slate-300 text-xs">
                          <td className="py-1.5 px-2 text-center font-mono bg-[#faf5ff] border-x border-slate-300">{idx + 1}</td>
                          <td className="py-1.5 px-3 font-semibold bg-[#fffbeb] border-r border-slate-300">
                            {cleanItemName(it.productName || it.name)}
                            {cleanItemSku(it.sku) && <span className="text-[10px] text-slate-500 font-normal ml-1">({cleanItemSku(it.sku)})</span>}
                          </td>
                          <td className="py-1.5 px-3 text-center font-mono font-bold text-sky-700 text-sm bg-[#f0fdf4] border-r border-slate-300 whitespace-nowrap">
                            {qty} {it.unit || 'pc'}
                          </td>
                        </tr>
                      );
                    })}
                    {Array.from({ length: Math.max(0, 6 - editableItems.length) }).map((_, i) => (
                      <tr key={`empty-chl-${i}`} className="border-b border-slate-200 text-xs h-6">
                        <td className="py-1.5 px-2 text-center font-mono text-slate-300 bg-[#faf5ff] border-x border-slate-300">{editableItems.length + i + 1}</td>
                        <td className="bg-[#fffbeb] border-r border-slate-300"></td>
                        <td className="bg-[#f0fdf4] border-r border-slate-300"></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Total Units Summary */}
              <div className="flex justify-between items-center border border-slate-300 bg-slate-50 p-2 text-xs font-bold">
                <span>{profile.t.totalQtyDispatched}</span>
                <span className="font-mono text-sky-800 text-sm">{totalUnits} Units</span>
              </div>

              {/* Disclaimer */}
              <div className="text-center text-[10px] space-y-0.5 pt-1 text-slate-600">
                <p>{profile.disclaimer}</p>
                <span className="inline-block border border-red-500 text-red-600 font-bold px-2 py-0.5 rounded text-[9.5px] bg-red-50">
                  {profile.nonRefundable}
                </span>
              </div>

              {/* Signatures */}
              <div className="flex justify-between items-end pt-8 px-4 text-xs font-bold text-slate-800">
                <div className="border-t border-dashed border-slate-500 pt-1 text-center w-36">
                  {profile.t.receiverSign}
                </div>
                <div className="border-t border-dashed border-slate-500 pt-1 text-center w-52">
                  {profile.t.sellerSign} {profile.primaryTitle}
                </div>
              </div>
            </div>
          )}

          {/* FORMAT 3: OFFICIAL LETTERHEAD / PAD */}
          {docType === DOCUMENT_TYPES.OFFICIAL_PAD && (
            <div className="bg-white text-slate-900 p-5 sm:p-7 rounded-xl shadow-md border-2 border-slate-300 max-w-2xl mx-auto space-y-3 relative overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-emerald-600 to-teal-500 rounded-full mb-1"></div>

              {/* Pad Header */}
              <div className="grid grid-cols-3 items-center border-b border-slate-800 pb-2">
                <div />
                <div className="text-center">
                  <h1 className="text-xl sm:text-2xl font-extrabold text-[#047857]">
                    {profile.primaryTitle}
                  </h1>
                  {profile.secondaryTitle && (
                    <h2 className="text-sm sm:text-base font-extrabold text-[#b91c1c] font-sans">
                      {profile.secondaryTitle}
                    </h2>
                  )}
                </div>
                <div className="text-right text-[11px] leading-tight">
                  <p className="font-bold text-slate-800">{profile.t.proprietor} {profile.proprietorName}</p>
                  <p className="font-mono text-emerald-700 font-semibold">📞 {profile.phone}</p>
                  {profile.email && <p className="text-[10px] text-slate-500">{profile.email}</p>}
                </div>
              </div>

              <div className="border border-slate-300 bg-slate-50 rounded p-1 text-[9.5px] leading-tight text-slate-700 text-center">
                {profile.scope}
              </div>

              <div className="flex justify-between text-[10.5px] font-semibold text-slate-800 border-b border-slate-300 pb-1">
                <span>📍 {profile.address}</span>
                <span className="font-mono">{profile.bin}</span>
              </div>

              {/* Reference and Date */}
              <div className="flex justify-between items-center text-xs font-semibold pt-1">
                <div className="flex items-center gap-2">
                  <span className="text-red-600 font-bold text-sm font-mono">{cleanSerial}</span>
                  <span className="text-slate-600">{profile.t.refNo}</span>
                  <span className="font-mono text-slate-800">#INV-{cleanSerial}</span>
                </div>
                <div className="flex items-center gap-1 text-[11px]">
                  <span>{profile.t.date}</span>
                  <span className="border border-slate-800 px-1.5 py-0.5 font-mono font-bold bg-white">{day}</span>
                  <span className="border border-slate-800 px-1.5 py-0.5 font-mono font-bold bg-white">{month}</span>
                  <span className="border border-slate-800 px-2 py-0.5 font-mono font-bold bg-white">{year}</span>
                </div>
              </div>

              {/* Customer Box */}
              <div className="border border-slate-400 rounded p-2 text-xs space-y-1 bg-white">
                <div className="flex items-baseline gap-2">
                  <span className="font-bold text-slate-800 w-14 flex-shrink-0">{profile.t.name}</span>
                  <span className="flex-1 border-b border-dotted border-slate-400 font-semibold text-slate-900">
                    {effectiveSale.customerName || profile.t.walkInBuyer}
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="font-bold text-slate-800 w-14 flex-shrink-0">{profile.t.address}</span>
                  <span className="flex-1 border-b border-dotted border-slate-400 font-medium text-slate-700">
                    {effectiveSale.customerAddress || (effectiveSale.customerPhone ? effectiveSale.customerPhone : 'N/A')}
                  </span>
                </div>
              </div>

              {/* Pad item table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 font-bold border-y border-slate-400">
                      <th className="py-1 px-1.5 w-8 text-center">{profile.t.sl}</th>
                      <th className="py-1 px-2">{profile.t.itemDesc}</th>
                      <th className="py-1 px-1.5 w-20 text-center">{profile.t.qty}</th>
                      {showRate && <th className="py-1 px-2 w-24 text-right">{profile.t.rate}</th>}
                      {showLineTotal && <th className="py-1 px-2 w-28 text-right">{profile.t.amount}</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {editableItems.map((it, idx) => {
                      const qty = Number(it.quantity) || 1;
                      const rate = Number(it.unitPrice !== undefined ? it.unitPrice : it.price) || 0;
                      const amt = Number(it.lineTotal !== undefined ? it.lineTotal : it.total || qty * rate);
                      return (
                        <tr key={idx}>
                          <td className="py-1 px-1.5 text-center font-mono text-slate-500">{idx + 1}</td>
                          <td className="py-1 px-2 font-semibold">
                            {cleanItemName(it.productName || it.name)}
                            {cleanItemSku(it.sku) && <span className="text-[10px] text-slate-500 ml-1">({cleanItemSku(it.sku)})</span>}
                          </td>
                          <td className="py-1 px-1.5 text-center font-mono font-bold whitespace-nowrap">{qty} {it.unit || 'pc'}</td>
                          {showRate && <td className="py-1 px-2 text-right font-mono">{formatCurrency(rate, profile.currencySymbol)}</td>}
                          {showLineTotal && <td className="py-1 px-2 text-right font-mono font-bold">{formatCurrency(amt, profile.currencySymbol)}</td>}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              {showGrandTotal && (
                <div className="flex justify-end pt-2">
                  <div className="w-60 space-y-1 text-xs border-t-2 border-slate-800 pt-1">
                    <div className="flex justify-between">
                      <span className="text-slate-600">{profile.t.subtotal}</span>
                      <span className="font-mono font-bold">{formatCurrency(liveSubtotal, profile.currencySymbol)}</span>
                    </div>
                    {discountVal > 0 && (
                      <div className="flex justify-between text-emerald-700">
                        <span>{profile.t.discount}</span>
                        <span className="font-mono whitespace-nowrap">-{formatCurrency(discountVal, profile.currencySymbol)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm font-extrabold text-slate-900 border-t border-slate-300 pt-1">
                      <span>{profile.t.netPayable}</span>
                      <span className="font-mono text-emerald-700">{formatCurrency(liveGrandTotal, profile.currencySymbol)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Signatures */}
              <div className="flex justify-between items-end pt-10 px-4 text-xs font-bold text-slate-800">
                <div className="border-t border-dashed border-slate-500 pt-1 text-center w-36">
                  {profile.t.buyerSign}
                </div>
                <div className="border-t border-dashed border-slate-500 pt-1 text-center w-52">
                  {profile.t.managerSign}
                </div>
              </div>

              <div className="h-1 bg-gradient-to-r from-red-600 via-blue-600 to-indigo-700 rounded-full mt-4"></div>
            </div>
          )}

          {/* FORMAT: QUOTATION PAD (হুবহু হ্যান্ডরিটেন কোটেশন ফরম্যাট) */}
          {docType === DOCUMENT_TYPES.QUOTATION && (
            <div className="bg-white text-slate-900 p-5 sm:p-7 rounded-xl shadow-md border-2 border-slate-300 max-w-2xl mx-auto space-y-3 relative overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-emerald-600 to-teal-500 rounded-full mb-1"></div>

              {/* Pad Header */}
              <div className="grid grid-cols-3 items-center border-b border-slate-800 pb-2">
                <div />
                <div className="text-center">
                  <h1 className="text-xl sm:text-2xl font-extrabold text-[#047857]">
                    {profile.primaryTitle}
                  </h1>
                  {profile.secondaryTitle && (
                    <h2 className="text-sm sm:text-base font-extrabold text-[#b91c1c] font-sans">
                      {profile.secondaryTitle}
                    </h2>
                  )}
                </div>
                <div className="text-right text-[10.5px] leading-tight font-semibold">
                  <p>{profile.t.proprietor} {profile.proprietorName}</p>
                  <p className="font-mono text-emerald-700">📞 {profile.phone}</p>
                </div>
              </div>

              <div className="border border-slate-300 bg-slate-50 rounded p-1 text-[9.5px] leading-tight text-slate-700 text-center">
                {profile.scope}
              </div>

              <div className="flex justify-between text-[10.5px] font-semibold text-slate-800 border-b border-slate-300 pb-1">
                <span>📍 {profile.address}</span>
                <span className="font-mono">{profile.bin}</span>
              </div>

              <div className="flex justify-between items-center text-xs font-semibold pt-1">
                <div className="flex items-center gap-2">
                  <span className="text-red-600 font-bold text-sm font-mono">{cleanSerial}</span>
                  <span className="text-slate-600">{profile.t.refNo}</span>
                  <span className="font-mono text-slate-800">#{invoiceNumber}</span>
                  {sale.requisitionRef && <span className="text-[10px] text-slate-500">(Req: {sale.requisitionRef})</span>}
                </div>
                <div className="flex items-center gap-1 text-[11px]">
                  <span>{profile.t.date}</span>
                  <span className="border border-slate-800 px-1.5 py-0.5 font-mono font-bold bg-white">{day}</span>
                  <span className="border border-slate-800 px-1.5 py-0.5 font-mono font-bold bg-white">{month}</span>
                  <span className="border border-slate-800 px-2 py-0.5 font-mono font-bold bg-white">{year}</span>
                </div>
              </div>

              <div className="text-center my-1">
                <span className="text-lg font-black tracking-wider text-slate-900 underline decoration-slate-800 decoration-1 underline-offset-4">
                  {profile.t.quotationBadge}
                </span>
              </div>

              {/* Customer Box */}
              <div className="border border-slate-300 rounded p-2 text-xs space-y-1 bg-slate-50">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="font-bold text-slate-800">{profile.t.recipient} </span>
                    <strong className="text-emerald-700">{effectiveSale.customerName || profile.t.walkInBuyer}</strong>
                  </div>
                  <div>
                    <span className="font-bold text-slate-800">{profile.t.company} </span>
                    <strong>{effectiveSale.customerCompany || (profile.lang === 'en' ? 'Direct Client' : 'ব্যক্তিগত / রিটেইল')}</strong>
                  </div>
                  <div>
                    <span className="font-bold text-slate-800">{profile.t.mobile} </span>
                    <span className="font-mono">{effectiveSale.customerPhone || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-800">{profile.t.address} </span>
                    <span>{effectiveSale.customerAddress || effectiveSale.customerLocation || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Pad item table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 font-bold border-y border-slate-400">
                      <th className="py-1 px-1.5 w-8 text-center">{profile.t.sl}</th>
                      <th className="py-1 px-2">{profile.t.itemDesc}</th>
                      <th className="py-1 px-1.5 w-20 text-center">{profile.t.qty}</th>
                      {showRate && <th className="py-1 px-2 w-24 text-right">{profile.t.rate}</th>}
                      {showLineTotal && <th className="py-1 px-2 w-28 text-right">{profile.t.amount}</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {editableItems.map((it, idx) => {
                      const qty = Number(it.quantity) || 1;
                      const rate = Number(it.unitPrice !== undefined ? it.unitPrice : (it.rate !== undefined ? it.rate : it.price)) || 0;
                      const amt = Number(it.lineTotal !== undefined ? it.lineTotal : (it.total || qty * rate));
                      return (
                        <tr key={idx}>
                          <td className="py-1 px-1.5 text-center font-mono text-slate-500">{idx + 1}</td>
                          <td className="py-1 px-2 font-semibold">
                            {cleanItemName(it.productName || it.name)}
                            {cleanItemSku(it.sku) && <span className="text-[10px] text-slate-500 ml-1">({cleanItemSku(it.sku)})</span>}
                          </td>
                          <td className="py-1 px-1.5 text-center font-mono font-bold whitespace-nowrap">{qty} {it.unit || 'pc'}</td>
                          {showRate && <td className="py-1 px-2 text-right font-mono">{formatCurrency(rate, profile.currencySymbol)}</td>}
                          {showLineTotal && <td className="py-1 px-2 text-right font-mono font-bold">{formatCurrency(amt, profile.currencySymbol)}</td>}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              {showGrandTotal && (
                <div className="flex justify-end pt-2">
                  <div className="w-60 space-y-1 text-xs border-t-2 border-slate-800 pt-1">
                    <div className="flex justify-between">
                      <span className="text-slate-600">{profile.t.subtotal}</span>
                      <span className="font-mono font-bold">{formatCurrency(liveSubtotal, profile.currencySymbol)}</span>
                    </div>
                    {discountVal > 0 && (
                      <div className="flex justify-between text-emerald-700">
                        <span>{profile.t.discount}</span>
                        <span className="font-mono whitespace-nowrap">-{formatCurrency(discountVal, profile.currencySymbol)}</span>
                      </div>
                    )}
                    {taxVal > 0 && (
                      <div className="flex justify-between text-slate-700">
                        <span>{profile.t.tax || 'Tax:'}</span>
                        <span className="font-mono">+{formatCurrency(taxVal, profile.currencySymbol)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm font-extrabold text-slate-900 border-t border-slate-300 pt-1">
                      <span>{profile.t.netPayable}</span>
                      <span className="font-mono text-emerald-700">{formatCurrency(liveGrandTotal, profile.currencySymbol)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Terms note */}
              <div className="bg-slate-50 border border-dashed border-slate-300 p-2 rounded text-[10.5px] text-slate-600">
                <span className="font-bold underline text-slate-800 block mb-0.5">{profile.t.termsTitle}</span>
                <p className="whitespace-pre-line leading-relaxed">
                  {resolvedTerms}
                </p>
              </div>

              {/* Signatures */}
              <div className="flex justify-between items-end pt-8 px-4 text-xs font-bold text-slate-800">
                <div className="border-t border-dashed border-slate-500 pt-1 text-center w-36">
                  {profile.t.makerSign}
                </div>
                <div className="border-t border-dashed border-slate-500 pt-1 text-center w-48">
                  {profile.t.managerSign}
                </div>
              </div>

              <div className="h-1 bg-gradient-to-r from-red-600 via-blue-600 to-indigo-700 rounded-full mt-4"></div>
            </div>
          )}

          {/* FORMAT 5: MONEY RECEIPT (মানি রিসিপ্ট / টাকা জমার রসিদ) */}
          {docType === DOCUMENT_TYPES.MONEY_RECEIPT && (
            <div className="bg-white text-slate-900 p-5 sm:p-7 rounded-xl shadow-md border-2 border-emerald-600 max-w-2xl mx-auto space-y-3 relative overflow-hidden">
              {profile.t.bismi && (
                <div className="text-center text-xs font-semibold text-slate-600">
                  {profile.t.bismi}
                </div>
              )}

              <div className="grid grid-cols-3 items-center mb-1">
                <div />
                <div className="text-center">
                  <span className="inline-block bg-emerald-700 text-white font-bold text-xs px-4 py-1 rounded shadow-sm uppercase tracking-wider">
                    {profile.t.moneyReceiptBadge}
                  </span>
                </div>
                <div className="text-right text-[11px] leading-tight">
                  <p className="font-bold text-slate-800">{profile.t.proprietor} {profile.proprietorName}</p>
                  <p className="font-mono text-emerald-700 font-semibold">📞 {profile.phone}</p>
                </div>
              </div>

              <div className="text-center space-y-0.5">
                <h1 className="text-2xl font-extrabold text-[#047857] tracking-tight">{profile.primaryTitle}</h1>
                {profile.secondaryTitle && <h2 className="text-base font-extrabold text-[#b91c1c]">{profile.secondaryTitle}</h2>}
                <p className="text-[11px] font-bold text-slate-800">📍 {profile.address}</p>
              </div>

              <div className="flex justify-between items-center text-xs font-semibold border-b border-slate-300 pb-1.5 pt-1">
                <div>
                  <span>{profile.t.memoNo} <strong className="font-mono text-red-600 text-sm font-black">{cleanSerial}</strong></span>
                  {sale.bookNumber && <span className="ml-2 text-[10.5px] text-slate-500">(Book: {sale.bookNumber}{sale.manualSerialNo ? ` · Sl: ${sale.manualSerialNo}` : ''})</span>}
                </div>
                <div className="font-mono text-blue-900 font-bold text-[11px]">{profile.bin}</div>
                <div className="flex items-center gap-1 text-[11px]">
                  <span>{profile.t.date}</span>
                  <span className="border border-slate-800 px-1.5 py-0.5 font-mono font-bold bg-white">{day}</span>
                  <span className="border border-slate-800 px-1.5 py-0.5 font-mono font-bold bg-white">{month}</span>
                  <span className="border border-slate-800 px-2 py-0.5 font-mono font-bold bg-white">{year}</span>
                </div>
              </div>

              {(() => {
                const mrAmt = Number(sale?.amount !== undefined ? sale.amount : (paidVal || liveGrandTotal || 0));
                const methodLabel = String(sale?.paymentMethod || 'cash').replace('_', ' ').toUpperCase();
                return (
                  <div className="border-2 border-emerald-600 rounded-lg p-4 space-y-2.5 text-xs bg-white">
                    <div className="flex items-baseline gap-2">
                      <span className="font-bold text-slate-800 shrink-0">{profile.t.receivedWithThanks}</span>
                      <span className="flex-1 border-b border-dotted border-slate-400 font-semibold text-slate-900">
                        {effectiveSale.customerName || profile.t.walkInBuyer}{effectiveSale.customerCompany ? ` (${effectiveSale.customerCompany})` : ''}
                      </span>
                    </div>
                    {(effectiveSale.customerAddress || effectiveSale.customerPhone) && (
                      <div className="flex items-baseline gap-2">
                        <span className="font-bold text-slate-800 shrink-0">{profile.t.address}</span>
                        <span className="flex-1 border-b border-dotted border-slate-400 text-slate-700">
                          {[effectiveSale.customerAddress, effectiveSale.customerPhone].filter(Boolean).join(' · ')}
                        </span>
                      </div>
                    )}
                    <div className="flex items-baseline gap-2">
                      <span className="font-bold text-slate-800 shrink-0">{profile.t.paymentModeLabel}</span>
                      <span className="flex-1 border-b border-dotted border-slate-400 font-semibold">
                        {methodLabel}{sale?.chequeOrRefNo ? ` · Ref/Cheque: ${sale.chequeOrRefNo}` : ''}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="font-bold text-slate-800 shrink-0">{profile.t.againstBillLabel}</span>
                      <span className="flex-1 border-b border-dotted border-slate-400 font-semibold">
                        {sale?.purpose || 'Bill / Due Payment'}{sale?.linkedInvoiceNo ? ` (#${sale.linkedInvoiceNo})` : ''}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="font-bold text-slate-800 shrink-0">{profile.t.inWordsLabel}</span>
                      <span className="flex-1 border-b border-dotted border-slate-400 italic font-semibold">
                        {numberToWords(mrAmt)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-dashed border-slate-300">
                      <div>
                        <span className="text-[11px] font-bold text-slate-600 block">{profile.t.sumOfTaka}</span>
                        <span className="inline-block mt-1 px-4 py-1.5 rounded-lg border-2 border-emerald-600 bg-emerald-50 text-emerald-800 font-mono font-extrabold text-lg whitespace-nowrap">
                          {formatCurrency(mrAmt, profile.currencySymbol)}
                        </span>
                      </div>
                      {sale?.notes && <span className="text-[11px] text-slate-500 max-w-xs text-right">Note: {sale.notes}</span>}
                    </div>
                  </div>
                );
              })()}

              <div className="flex justify-between items-end pt-10 px-4 text-xs font-bold text-slate-800">
                <div className="border-t border-dashed border-slate-500 pt-1 text-center w-40">{profile.t.depositorSign}</div>
                <div className="border-t border-dashed border-slate-500 pt-1 text-center w-52">{profile.t.sellerSign} {profile.primaryTitle}</div>
              </div>
            </div>
          )}

          {/* FORMAT 4: POS THERMAL (80mm) */}
          {docType === DOCUMENT_TYPES.THERMAL && (
            <div className="bg-white text-slate-900 p-5 rounded-xl shadow-md border border-slate-300 max-w-[320px] mx-auto text-xs space-y-2.5 font-mono">
              <div className="text-center space-y-1">
                {profile.t.bismi && <p className="text-[10px]">{profile.t.bismi}</p>}
                <h3 className="font-extrabold text-sm text-emerald-800 font-['Hind_Siliguri']">
                  {profile.primaryTitle}
                </h3>
                {profile.secondaryTitle && (
                  <p className="text-[11px] font-bold text-red-700 font-sans">{profile.secondaryTitle}</p>
                )}
                <p className="text-[10px] text-slate-600 font-['Hind_Siliguri']">{profile.address}</p>
                <p className="text-[10px] text-slate-600">{profile.t.phone} {profile.phone}</p>
                <div className="border-t border-dashed border-slate-400 my-1" />
                <p className="font-bold text-xs uppercase">{profile.t.thermalBadge}</p>
                <p className="text-[11px] font-bold">{profile.t.memoNo} #{cleanSerial}</p>
                <p className="text-[10px] text-slate-500">{formatDateTime(saleDate)}</p>
              </div>

              <div className="border-t border-dashed border-slate-400" />

              <div className="text-[10px] space-y-0.5 font-['Hind_Siliguri']">
                <p>{profile.t.name} <strong className="text-slate-900">{effectiveSale.customerName || profile.t.walkInBuyer}</strong></p>
                {effectiveSale.customerPhone && <p>{profile.t.phone} {effectiveSale.customerPhone}</p>}
              </div>

              <div className="border-t border-dashed border-slate-400" />

              <div className="space-y-1.5 text-[11px]">
                {editableItems.map((item, idx) => {
                  const qty = Number(item.quantity) || 1;
                  const rate = Number(item.unitPrice !== undefined ? item.unitPrice : item.price) || 0;
                  const amt = Number(item.lineTotal !== undefined ? item.lineTotal : item.total || qty * rate);
                  return (
                    <div key={idx} className="border-b border-dotted border-slate-200 pb-1">
                      <p className="font-bold font-['Hind_Siliguri']">{cleanItemName(item.productName || item.name)}</p>
                      <div className="flex justify-between text-slate-600 text-[10px]">
                        <span>{qty} {item.unit || 'pc'} x {formatCurrency(rate, profile.currencySymbol)}</span>
                        <span className="font-bold text-slate-900">{formatCurrency(amt, profile.currencySymbol)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="border-t border-dashed border-slate-400 pt-2 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span>{profile.t.total}</span>
                  <span>{formatCurrency(liveSubtotal, profile.currencySymbol)}</span>
                </div>
                {discountVal > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>{profile.t.discount}</span>
                    <span className="font-mono whitespace-nowrap">-{formatCurrency(discountVal, profile.currencySymbol)}</span>
                  </div>
                )}
                <div className="flex justify-between font-extrabold text-sm border-t border-slate-900 pt-1 mt-1">
                  <span>{profile.t.netPayable}</span>
                  <span className="text-emerald-700">{formatCurrency(liveGrandTotal, profile.currencySymbol)}</span>
                </div>
              </div>

              <div className="border-t border-dashed border-slate-400 pt-2 text-center text-[10px] text-slate-600 space-y-0.5 font-['Hind_Siliguri']">
                <p>{profile.t.thanks}</p>
                <p>* {profile.nonRefundable} *</p>
                <p className="text-[9px] pt-1 font-mono text-slate-400">{profile.t.endOfSlip}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
          <div className="text-xs text-slate-600 dark:text-slate-300 flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5">
              <Check className="h-4 w-4 text-emerald-500 flex-shrink-0" />
              <span className="font-medium">
                ফরম্যাট: <strong>{getDocTitle()}</strong> · ভাষা: <strong>{docLanguage === 'bn' ? 'বাংলা' : docLanguage === 'en' ? 'English' : 'উভয়'}</strong>
              </span>
            </div>
            <div
              className="text-[11px] font-mono text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 truncate max-w-[260px]"
              title={`সেভ বা প্রিন্ট ফাইলের নাম: ${printFileName}`}
            >
              📄 {printFileName}
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              icon={Download}
              onClick={handleDownloadHtml}
              title={`ভাউচার ডাউনলোড (${printFileName}.html)`}
              className="text-xs text-blue-600 border-blue-200 hover:bg-blue-50 dark:hover:bg-blue-900/20"
            >
              ভাউচার সেভ
            </Button>
            <Button
              variant="outline"
              size="sm"
              icon={ExternalLink}
              onClick={handleOpenRaw}
              title="নতুন ট্যাবে সম্পূর্ণ HTML ভাউচার খুলুন"
              className="text-xs"
            >
              ট্যাব প্রিভিউ
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={onClose}
              className="flex-1 sm:flex-initial text-xs"
            >
              বন্ধ করুন
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={Printer}
              onClick={handlePrint}
              className="flex-1 sm:flex-initial shadow-md shadow-emerald-500/20 text-xs font-bold"
            >
              সরাসরি প্রিন্ট করুন (Print Now)
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
