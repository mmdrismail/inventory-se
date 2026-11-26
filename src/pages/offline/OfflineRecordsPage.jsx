import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAppData } from '../../context/AppDataContext';
import { useLanguage } from '../../context/LanguageContext';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { PrintableReceiptModal } from '../../components/receipt/PrintableReceiptModal';
import { DOCUMENT_TYPES } from '../../utils/printTemplateGenerator';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { getUnitSelectOptions, normalizeUnit } from '../../utils/units';
import { scanDocumentPhoto, parseOcrTextToDocument } from '../../utils/documentOcrParser';
import { EMPTY_MACHINE_DETAILS, normalizeMachineDetails } from '../../utils/partPriceSearch';
import { MachineSpecCard } from '../../components/forms/MachineSpecCard';
import { SmartPartLookupModal } from '../../components/forms/SmartPartLookupModal';
import {
  Camera,
  Upload,
  ScanLine,
  FileText,
  FileSpreadsheet,
  Receipt,
  Banknote,
  BookOpen,
  Printer,
  Trash2,
  Plus,
  Copy,
  Search,
  CheckCircle2,
  AlertCircle,
  Eye,
  X,
  Sparkles,
  ShieldCheck,
  RefreshCw,
  Building2,
  Phone,
  MapPin,
  Package,
  Calendar,
} from 'lucide-react';

const DOC_TYPE_OPTIONS = [
  {
    value: 'cash_memo',
    bn: 'ক্যাশ মেমো / বিল',
    en: 'Cash Memo / Bill',
    obro: 'Cash Memo / Bill',
    icon: Receipt,
    color: 'emerald',
  },
  {
    value: 'challan',
    bn: 'ডেলিভারি চালান',
    en: 'Delivery Challan',
    obro: 'Delivery Challan',
    icon: FileText,
    color: 'blue',
  },
  {
    value: 'quotation',
    bn: 'কোটেশন / দরপত্র',
    en: 'Quotation / Tender',
    obro: 'Quotation / Tender',
    icon: FileSpreadsheet,
    color: 'purple',
  },
  {
    value: 'money_receipt',
    bn: 'মানি রিসিপ্ট (জমা)',
    en: 'Money Receipt',
    obro: 'Money Receipt (Joma)',
    icon: Banknote,
    color: 'amber',
  },
];

const PAYMENT_METHODS = [
  { value: 'cash', bn: 'নগদ (Cash)', en: 'Cash' },
  { value: 'bank_transfer', bn: 'ব্যাংক (Bank Transfer)', en: 'Bank Transfer' },
  { value: 'bkash', bn: 'বিকাশ (bKash)', en: 'bKash' },
  { value: 'nagad', bn: 'নগদ (Nagad)', en: 'Nagad' },
  { value: 'cheque', bn: 'চেক (Cheque)', en: 'Cheque' },
  { value: 'card', bn: 'কার্ড (Card)', en: 'Card' },
];

const createEmptyItem = (firstProduct = null) => ({
  id: `itm-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
  productId: firstProduct?.id || 'custom',
  productName: firstProduct?.name || '',
  quantity: 1,
  unit: normalizeUnit(firstProduct?.unit || 'pc'),
  unitPrice: Number(firstProduct?.sellingPrice) || 0,
});

const createBatchRow = () => ({
  id: `row-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
  documentType: 'cash_memo',
  entrySource: 'khata',
  date: new Date().toISOString().split('T')[0],
  bookNumber: '',
  manualSerialNo: '',
  customerId: '',
  customerName: '',
  customerCompany: '',
  customerPhone: '',
  itemDescription: '',
  quantity: 1,
  unit: 'pc',
  unitPrice: '',
  paidAmount: '',
  paymentMethod: 'cash',
  notes: '',
});

export const OfflineRecordsPage = () => {
  const {
    customers,
    products,
    sales,
    quotations,
    moneyReceipts,
    priceCatalog,
    settings,
    createSale,
    createQuotation,
    deleteQuotation,
    createMoneyReceipt,
    deleteMoneyReceipt,
    addToast,
    confirmAction,
  } = useAppData();

  const { language } = useLanguage();
  const location = useLocation();
  const l = (texts) => {
    if (language === 'en') return texts.en;
    if (language === 'obro') return texts.obro || `${texts.bn} (${texts.en})`;
    return texts.bn;
  };
  const notify = (message, type = 'success') => {
    const title =
      type === 'error'
        ? l({ bn: 'ত্রুটি / সতর্কতা', en: 'Error' })
        : type === 'warning'
        ? l({ bn: 'সতর্কবার্তা', en: 'Notice' })
        : l({ bn: 'সফল হয়েছে', en: 'Success' });
    addToast({ title, message, type });
  };

  // Navigation / initial prefill from CustomerDetailPage etc.
  const preselectCustomer = location.state?.preselectCustomer || null;
  const defaultDocType = location.state?.defaultDocType || 'cash_memo';

  const [activeTab, setActiveTab] = useState('scan'); // 'scan' | 'batch' | 'archive'

  // Temporary in-memory image preview (NEVER saved to storage/database)
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [ocrLang, setOcrLang] = useState('eng+ben');
  const [isScanning, setIsScanning] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrConfidence, setOcrConfidence] = useState(null);
  const [rawOcrText, setRawOcrText] = useState('');

  // Revoke object URL on unmount / replacement so memory is cleanly freed
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // Single Entry Form State
  const [documentType, setDocumentType] = useState(defaultDocType);
  const [entrySource, setEntrySource] = useState('khata'); // 'khata' | 'offline'
  const [issueDate, setIssueDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [bookNumber, setBookNumber] = useState('');
  const [manualSerialNo, setManualSerialNo] = useState('');
  const [customDocNumber, setCustomDocNumber] = useState('');
  const [deductStock, setDeductStock] = useState(false);

  const [customerId, setCustomerId] = useState(
    preselectCustomer?.id || preselectCustomer?._id || ''
  );
  const [customerName, setCustomerName] = useState(preselectCustomer?.name || '');
  const [customerCompany, setCustomerCompany] = useState(preselectCustomer?.companyName || '');
  const [customerPhone, setCustomerPhone] = useState(preselectCustomer?.phone || '');
  const [customerAddress, setCustomerAddress] = useState(
    preselectCustomer?.address || preselectCustomer?.location || ''
  );
  const [customerRole, setCustomerRole] = useState(preselectCustomer?.designationRole || 'owner');
  const [autoSaveCustomer, setAutoSaveCustomer] = useState(true);

  const [items, setItems] = useState(() => [createEmptyItem(null)]);
  const [discount, setDiscount] = useState('0');
  const [paidAmount, setPaidAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [notes, setNotes] = useState('');
  const [requisitionRef, setRequisitionRef] = useState('');
  const [showRate, setShowRate] = useState(true);
  const [showLineTotal, setShowLineTotal] = useState(true);
  const [showGrandTotal, setShowGrandTotal] = useState(true);
  const [machineDetails, setMachineDetails] = useState(() => ({ ...EMPTY_MACHINE_DETAILS }));
  const [lookupModalState, setLookupModalState] = useState({ isOpen: false, targetRowIdx: null });

  // Money Receipt specific state
  const [linkedSaleId, setLinkedSaleId] = useState('');
  const [receiptAmount, setReceiptAmount] = useState('');
  const [chequeOrRefNo, setChequeOrRefNo] = useState('');
  const [purpose, setPurpose] = useState('বকেয়া পরিশোধ / বিল জমা (Bill Payment)');
  const [receivedBy, setReceivedBy] = useState('Accounts');

  // Batch Khata Register State (Proposal 3)
  const [batchRows, setBatchRows] = useState(() => [createBatchRow(), createBatchRow(), createBatchRow()]);
  const [batchSkipStock, setBatchSkipStock] = useState(true);
  const [isSavingBatch, setIsSavingBatch] = useState(false);

  // Archive State
  const [archiveSearch, setArchiveSearch] = useState('');
  const [archiveTypeFilter, setArchiveTypeFilter] = useState('all'); // 'all' | 'cash_memo' | 'challan' | 'quotation' | 'money_receipt'
  const [archiveSourceFilter, setArchiveSourceFilter] = useState('all'); // 'all' | 'khata' | 'offline'

  // Printable Modal State
  const [printTarget, setPrintTarget] = useState(null); // { doc, docType }

  // (Initial customer/docType prefills from location.state are applied cleanly in useState above)

  // Adjust stock & Challan defaults when user toggles documentType or entrySource
  const handleEntrySourceChange = (nextSource) => {
    setEntrySource(nextSource);
    setDeductStock(nextSource === 'offline');
  };

  const handleDocTypeChange = (nextType) => {
    setDocumentType(nextType);
    if (nextType === 'challan') {
      setShowRate(false);
      setShowLineTotal(false);
      setShowGrandTotal(false);
    } else {
      setShowRate(true);
      setShowLineTotal(true);
      setShowGrandTotal(true);
    }
  };

  // Customer quick selection
  const handleCustomerSelect = (cid) => {
    setCustomerId(cid);
    const found = customers.find((c) => c.id === cid || c._id === cid);
    if (found) {
      setCustomerName(found.name || '');
      setCustomerCompany(found.companyName || '');
      setCustomerPhone(found.phone || '');
      setCustomerAddress(found.address || found.location || '');
      setCustomerRole(found.designationRole || 'owner');
    }
  };

  // Available invoices for Money Receipt linking
  const linkableSales = useMemo(() => {
    return (sales || [])
      .filter((s) => s.status !== 'cancelled')
      .filter((s) => !customerId || s.customerId === customerId || s._id === linkedSaleId)
      .slice(0, 60);
  }, [sales, customerId, linkedSaleId]);

  const handleLinkedSaleSelect = (sid) => {
    setLinkedSaleId(sid);
    if (!sid) return;
    const found = (sales || []).find((s) => s.id === sid || s._id === sid);
    if (found) {
      if (found.customerId) handleCustomerSelect(found.customerId);
      else if (found.customerName) setCustomerName(found.customerName);
      const due = Number(found.dueAmount) || 0;
      const tot = Number(found.total !== undefined ? found.total : found.totalAmount) || 0;
      const suggested = due > 0 ? due : tot;
      if (suggested > 0) setReceiptAmount(String(suggested));
      const inv = found.invoiceNumber || found.invoiceNo || '';
      setPurpose(`ইনভয়েস #${inv} বাবদ বিল পরিশোধ (Payment for ${inv})`);
    }
  };

  // Apply parsed OCR object onto the form
  const applyParsedDataToForm = (parsed) => {
    if (!parsed) return;
    if (parsed.documentType) handleDocTypeChange(parsed.documentType);
    if (parsed.date) setIssueDate(parsed.date);
    if (parsed.bookNumber) setBookNumber(parsed.bookNumber);
    if (parsed.manualSerialNo) setManualSerialNo(parsed.manualSerialNo);

    if (parsed.customerId) {
      handleCustomerSelect(parsed.customerId);
    } else {
      setCustomerId('');
      if (parsed.customerName) setCustomerName(parsed.customerName);
      if (parsed.customerCompany) setCustomerCompany(parsed.customerCompany);
      if (parsed.customerPhone) setCustomerPhone(parsed.customerPhone);
      if (parsed.customerAddress) setCustomerAddress(parsed.customerAddress);
    }

    if (parsed.documentType === 'money_receipt') {
      if (parsed.receiptAmount > 0) setReceiptAmount(String(parsed.receiptAmount));
    } else if (parsed.items && parsed.items.length > 0) {
      setItems(
        parsed.items.map((it, idx) => ({
          id: `ocr-${Date.now()}-${idx}`,
          productId: it.productId || 'custom',
          productName: it.productName || it.name || '',
          quantity: Number(it.quantity) || 1,
          unit: normalizeUnit(it.unit || 'pc'),
          unitPrice: Number(it.unitPrice) || 0,
        }))
      );
      if (parsed.discount > 0) setDiscount(String(parsed.discount));
      if (parsed.paidAmount >= 0 && parsed.paidAmount !== '') {
        setPaidAmount(String(parsed.paidAmount));
      }
    }
  };

  // Run Tesseract OCR on selected photo (Zero Storage)
  const runPhotoOcr = async (fileToScan) => {
    if (!fileToScan) return;
    setIsScanning(true);
    setOcrProgress(0);
    try {
      const { text, confidence } = await scanDocumentPhoto(fileToScan, {
        lang: ocrLang,
        onProgress: (p) => setOcrProgress(p),
      });
      setRawOcrText(text || '');
      setOcrConfidence(confidence);
      const parsed = parseOcrTextToDocument(text || '', products, customers);
      applyParsedDataToForm(parsed);
      notify(
        l({
          bn: `ছবি স্ক্যান সম্পন্ন হয়েছে (Confidence: ${confidence}%) — ডাটা ফর্মে বসানো হয়েছে।`,
          en: `Photo scanned (${confidence}% confidence) & auto-filled into form.`,
          obro: `Scan complete (${confidence}% confidence). Form auto-filled.`,
        }),
        'success'
      );
    } catch (err) {
      notify(
        l({
          bn: `OCR স্ক্যান ব্যর্থ হয়েছে: ${err?.message || 'Unknown error'}। আপনি নিচে টেক্সট লিখে বা সরাসরি ফর্ম পূরণ করতে পারেন।`,
          en: `OCR scan failed: ${err?.message || 'Unknown error'}. You can paste text or fill manually.`,
          obro: `OCR scan failed: ${err?.message || 'Error'}. Paste text or enter manually.`,
        }),
        'error'
      );
    } finally {
      setIsScanning(false);
    }
  };

  const handlePhotoSelected = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const objUrl = URL.createObjectURL(file);
    setPreviewUrl(objUrl);
    setSelectedFile(file);
    setOcrConfidence(null);
    // Reset input so re-selecting same file works
    e.target.value = '';
    // Automatically run scan right away for smooth UX
    runPhotoOcr(file);
  };

  const handleClearPhoto = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setSelectedFile(null);
    setOcrConfidence(null);
    setOcrProgress(0);
  };

  const handleParseRawText = () => {
    if (!rawOcrText.trim()) {
      notify(
        l({ bn: 'পার্স করার জন্য আগে টেক্সট লিখুন বা পেস্ট করুন।', en: 'Enter or paste text to parse first.' }),
        'warning'
      );
      return;
    }
    const parsed = parseOcrTextToDocument(rawOcrText, products, customers);
    applyParsedDataToForm(parsed);
    notify(
      l({
        bn: `টেক্সট থেকে ${parsed.items.length}টি আইটেম ও তথ্য ফর্মে বসানো হয়েছে!`,
        en: `Extracted ${parsed.items.length} item(s) and document metadata into form!`,
      }),
      'success'
    );
  };

  // Single Entry Item Helpers
  const handleItemChange = (idx, field, val) => {
    setItems((prev) => {
      const next = [...prev];
      const cur = { ...next[idx], [field]: val };
      if (field === 'productId') {
        const prod = products.find((p) => p.id === val || p._id === val);
        if (prod) {
          cur.productName = prod.name;
          cur.unit = normalizeUnit(prod.unit || 'pc');
          cur.unitPrice = Number(prod.sellingPrice) || 0;
        }
      }
      next[idx] = cur;
      return next;
    });
  };

  const singleSubtotal = useMemo(() => {
    return items.reduce(
      (sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0),
      0
    );
  }, [items]);

  const singleDiscountVal = Math.min(singleSubtotal, Math.max(0, Number(discount) || 0));
  const singleNetTotal = Math.max(0, singleSubtotal - singleDiscountVal);
  const singlePaidVal =
    paidAmount === ''
      ? singleNetTotal
      : Math.min(singleNetTotal, Math.max(0, Number(paidAmount) || 0));
  const singleDueVal = Math.max(0, singleNetTotal - singlePaidVal);
  const singlePaymentStatus =
    singleDueVal <= 0.005 ? 'paid' : singlePaidVal > 0 ? 'partial' : 'due';

  // Submit Single Entry
  const handleSaveSingle = (andPrint = false) => {
    const finalCustomerName = customerName.trim() || 'Direct Client';

    if (documentType === 'money_receipt') {
      const amt = Number(receiptAmount) || 0;
      if (amt <= 0) {
        notify(
          l({
            bn: 'মানি রিসিপ্টে টাকার পরিমাণ (Amount) শূন্যের বেশি হতে হবে।',
            en: 'Money Receipt amount must be greater than 0.',
          }),
          'error'
        );
        return;
      }

      const linkedSaleObj = (sales || []).find((s) => s.id === linkedSaleId || s._id === linkedSaleId);
      const mrPayload = {
        receiptNumber: customDocNumber.trim() || undefined,
        date: new Date(issueDate).toISOString(),
        entrySource,
        bookNumber: bookNumber.trim(),
        manualSerialNo: manualSerialNo.trim(),
        customerId: customerId || null,
        customerName: finalCustomerName,
        customerCompany: customerCompany.trim(),
        customerRole,
        customerPhone: customerPhone.trim(),
        customerAddress: customerAddress.trim(),
        linkedSaleId: linkedSaleObj ? linkedSaleObj._id || linkedSaleObj.id : null,
        linkedInvoiceNo: linkedSaleObj ? linkedSaleObj.invoiceNumber || linkedSaleObj.invoiceNo || '' : '',
        purpose: purpose.trim() || 'বকেয়া পরিশোধ / বিল জমা (Bill Payment)',
        amount: amt,
        paymentMethod,
        chequeOrRefNo: chequeOrRefNo.trim(),
        status: 'active',
        notes: notes.trim(),
        receivedBy: receivedBy.trim() || 'Accounts',
        autoSaveCustomer,
      };

      const res = createMoneyReceipt(mrPayload, receivedBy);
      if (res?.success && res.receipt) {
        notify(
          l({
            bn: `মানি রিসিপ্ট #${res.receipt.receiptNumber} সফলভাবে সংরক্ষিত হয়েছে!`,
            en: `Money Receipt #${res.receipt.receiptNumber} saved!`,
          }),
          'success'
        );
        if (andPrint) {
          setPrintTarget({ doc: res.receipt, docType: DOCUMENT_TYPES.MONEY_RECEIPT });
        }
        // Reset receipt fields & clear transient photo from memory
        setReceiptAmount('');
        setChequeOrRefNo('');
        setManualSerialNo('');
        setCustomDocNumber('');
        handleClearPhoto();
      } else {
        notify(res?.message || 'Failed to save Money Receipt.', 'error');
      }
      return;
    }

    // Items validation for Cash Memo / Challan / Quotation
    const validItems = items.filter((it) => (it.productName || '').trim() !== '');
    if (validItems.length === 0) {
      notify(
        l({
          bn: 'কমপক্ষে একটি পণ্যের নাম/বিবরণ লিখুন।',
          en: 'Please enter at least one item description.',
        }),
        'error'
      );
      return;
    }

    if (documentType === 'quotation') {
      const qItems = validItems.map((it, idx) => {
        const q = Number(it.quantity) || 1;
        const r = Number(it.unitPrice) || 0;
        return {
          id: it.id || `qi-${Date.now()}-${idx}`,
          productId: it.productId === 'custom' ? null : it.productId,
          name: it.productName.trim(),
          quantity: q,
          unit: normalizeUnit(it.unit),
          unitPrice: r,
          lineTotal: Math.round(q * r * 100) / 100,
        };
      });

      const qRes = createQuotation({
        quotationNumber: customDocNumber.trim() || undefined,
        date: new Date(issueDate).toISOString(),
        entrySource,
        bookNumber: bookNumber.trim(),
        manualSerialNo: manualSerialNo.trim(),
        requisitionRef: requisitionRef.trim(),
        customerId: customerId || null,
        customerName: finalCustomerName,
        customerCompany: customerCompany.trim(),
        customerRole,
        customerPhone: customerPhone.trim(),
        customerAddress: customerAddress.trim(),
        customerLocation: customerAddress.trim(),
        autoSaveCustomer,
        machineDetails: normalizeMachineDetails(machineDetails),
        items: qItems,
        subtotal: singleSubtotal,
        discount: singleDiscountVal,
        tax: 0,
        totalAmount: singleNetTotal,
        showRate,
        showLineTotal,
        showGrandTotal,
        status: 'sent',
        notes: notes.trim(),
      });

      if (qRes?.success && qRes.quotation) {
        notify(
          l({
            bn: `খাতা/অফলাইন কোটেশন #${qRes.quotation.quotationNumber} সেভ হয়েছে!`,
            en: `Quotation #${qRes.quotation.quotationNumber} saved!`,
          }),
          'success'
        );
        if (andPrint) {
          setPrintTarget({ doc: qRes.quotation, docType: DOCUMENT_TYPES.QUOTATION });
        }
        setManualSerialNo('');
        setCustomDocNumber('');
        handleClearPhoto();
      } else {
        notify(qRes?.message || 'Failed to save quotation.', 'error');
      }
      return;
    }

    // Cash Memo or Challan -> Sale
    const sItems = validItems.map((it) => {
      const q = Number(it.quantity) || 1;
      const r = Number(it.unitPrice) || 0;
      const prod = products.find((p) => p.id === it.productId || p._id === it.productId);
      return {
        productId: prod?.id || 'custom',
        productName: it.productName.trim(),
        sku: prod?.sku || '',
        quantity: q,
        unit: normalizeUnit(it.unit || prod?.unit),
        unitPrice: r,
        total: Math.round(q * r * 100) / 100,
      };
    });

    const saleRes = createSale(
      {
        invoiceNo: customDocNumber.trim() || undefined,
        documentType,
        entrySource,
        bookNumber: bookNumber.trim(),
        manualSerialNo: manualSerialNo.trim(),
        deductStock,
        date: new Date(issueDate).toISOString(),
        status: 'completed',
        customerId: customerId || null,
        customerName: finalCustomerName,
        customerCompany: customerCompany.trim(),
        customerRole,
        customerPhone: customerPhone.trim(),
        customerAddress: customerAddress.trim(),
        customerLocation: customerAddress.trim(),
        autoSaveCustomer,
        machineDetails: normalizeMachineDetails(machineDetails),
        items: sItems,
        subtotal: singleSubtotal,
        discount: singleDiscountVal,
        tax: 0,
        total: singleNetTotal,
        paymentMethod,
        paymentStatus: singlePaymentStatus,
        paidAmount: singlePaidVal,
        dueAmount: singleDueVal,
        requisitionRef: requisitionRef.trim(),
        notes: notes.trim(),
        showRate,
        showLineTotal,
        showGrandTotal,
      },
      'Khata/Offline Entry'
    );

    if (saleRes?.success && saleRes.sale) {
      const savedSale = { ...saleRes.sale, showRate, showLineTotal, showGrandTotal };
      notify(
        l({
          bn: `${documentType === 'challan' ? 'চালান' : 'ক্যাশ মেমো'} #${savedSale.invoiceNo || savedSale.invoiceNumber} সফলভাবে সেভ হয়েছে!`,
          en: `${documentType === 'challan' ? 'Challan' : 'Cash Memo'} #${savedSale.invoiceNo || savedSale.invoiceNumber} saved!`,
        }),
        'success'
      );
      if (andPrint) {
        setPrintTarget({
          doc: savedSale,
          docType: documentType === 'challan' ? DOCUMENT_TYPES.CHALLAN : DOCUMENT_TYPES.CASH_MEMO,
        });
      }
      setManualSerialNo('');
      setCustomDocNumber('');
      handleClearPhoto();
    } else {
      notify(saleRes?.message || 'Failed to save record.', 'error');
    }
  };

  // Batch Register Handlers (Proposal 3)
  const handleBatchFieldChange = (rowIdx, field, value) => {
    setBatchRows((prev) => {
      const next = [...prev];
      const cur = { ...next[rowIdx], [field]: value };
      if (field === 'customerId') {
        const c = customers.find((x) => x.id === value || x._id === value);
        if (c) {
          cur.customerName = c.name || '';
          cur.customerCompany = c.companyName || '';
          cur.customerPhone = c.phone || '';
        }
      }
      next[rowIdx] = cur;
      return next;
    });
  };

  const handleDuplicateBatchRow = (rowIdx) => {
    setBatchRows((prev) => {
      const clone = {
        ...prev[rowIdx],
        id: `row-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        manualSerialNo: '',
      };
      const next = [...prev];
      next.splice(rowIdx + 1, 0, clone);
      return next;
    });
  };

  const handleSaveBatch = () => {
    const actionable = batchRows.filter(
      (r) =>
        (r.customerName && r.customerName.trim()) ||
        (r.itemDescription && r.itemDescription.trim()) ||
        Number(r.unitPrice) > 0 ||
        Number(r.paidAmount) > 0
    );

    if (actionable.length === 0) {
      notify(
        l({
          bn: 'বাল্ক রেজিস্টারে কমপক্ষে ১টি সারি (কাস্টমার বা বিবরণ ও দর) পূরণ করুন।',
          en: 'Please fill at least one row before saving batch.',
        }),
        'warning'
      );
      return;
    }

    setIsSavingBatch(true);
    let savedCount = 0;
    const failedRows = [];

    for (const row of actionable) {
      const custName = (row.customerName || '').trim() || 'Direct Client';
      const isoDate = row.date ? new Date(row.date).toISOString() : new Date().toISOString();
      const qty = Math.max(1, Number(row.quantity) || 1);
      const unitPrice = Number(row.unitPrice) || 0;
      const lineTotal = Math.round(qty * unitPrice * 100) / 100;

      if (row.documentType === 'money_receipt') {
        const amt = Number(row.paidAmount) || lineTotal;
        if (amt <= 0) {
          failedRows.push(row);
          continue;
        }
        const mrRes = createMoneyReceipt(
          {
            date: isoDate,
            entrySource: row.entrySource || 'khata',
            bookNumber: row.bookNumber || '',
            manualSerialNo: row.manualSerialNo || '',
            customerId: row.customerId || null,
            customerName: custName,
            customerCompany: row.customerCompany || '',
            customerPhone: row.customerPhone || '',
            purpose: row.itemDescription || 'বকেয়া পরিশোধ / বিল জমা',
            amount: amt,
            paymentMethod: row.paymentMethod || 'cash',
            notes: row.notes || '',
            autoSaveCustomer: true,
          },
          'Batch Register'
        );
        if (mrRes?.success) savedCount += 1;
        else failedRows.push(row);
      } else if (row.documentType === 'quotation') {
        const qRes = createQuotation({
          date: isoDate,
          entrySource: row.entrySource || 'khata',
          bookNumber: row.bookNumber || '',
          manualSerialNo: row.manualSerialNo || '',
          customerId: row.customerId || null,
          customerName: custName,
          customerCompany: row.customerCompany || '',
          customerPhone: row.customerPhone || '',
          autoSaveCustomer: true,
          items: [
            {
              productId: null,
              name: (row.itemDescription || 'Spare Parts / Equipment').trim(),
              quantity: qty,
              unit: normalizeUnit(row.unit),
              unitPrice,
              lineTotal,
            },
          ],
          subtotal: lineTotal,
          discount: 0,
          tax: 0,
          totalAmount: lineTotal,
          status: 'sent',
          notes: row.notes || '',
        });
        if (qRes?.success) savedCount += 1;
        else failedRows.push(row);
      } else {
        const paidVal =
          row.paidAmount === '' || row.paidAmount === undefined
            ? lineTotal
            : Math.min(lineTotal, Math.max(0, Number(row.paidAmount) || 0));
        const dueVal = Math.max(0, lineTotal - paidVal);
        const pStatus = dueVal <= 0.005 ? 'paid' : paidVal > 0 ? 'partial' : 'due';

        const sRes = createSale(
          {
            documentType: row.documentType || 'cash_memo',
            entrySource: row.entrySource || 'khata',
            bookNumber: row.bookNumber || '',
            manualSerialNo: row.manualSerialNo || '',
            deductStock: row.entrySource === 'khata' && batchSkipStock ? false : !batchSkipStock,
            date: isoDate,
            status: 'completed',
            customerId: row.customerId || null,
            customerName: custName,
            customerCompany: row.customerCompany || '',
            customerPhone: row.customerPhone || '',
            autoSaveCustomer: true,
            items: [
              {
                productId: 'custom',
                productName: (row.itemDescription || 'Parts & Service Supply').trim(),
                quantity: qty,
                unit: normalizeUnit(row.unit),
                unitPrice,
                total: lineTotal,
              },
            ],
            subtotal: lineTotal,
            discount: 0,
            tax: 0,
            total: lineTotal,
            paymentMethod: row.paymentMethod || 'cash',
            paymentStatus: pStatus,
            paidAmount: paidVal,
            dueAmount: dueVal,
            notes: row.notes || '',
            showRate: row.documentType !== 'challan',
            showLineTotal: row.documentType !== 'challan',
            showGrandTotal: row.documentType !== 'challan',
          },
          'Batch Register'
        );
        if (sRes?.success) savedCount += 1;
        else failedRows.push(row);
      }
    }

    setIsSavingBatch(false);
    if (savedCount > 0) {
      notify(
        l({
          bn: `মোট ${savedCount}টি খাতা/অফলাইন ডকুমেন্ট সফলভাবে ডাটাবেসে সংরক্ষিত হয়েছে!`,
          en: `Successfully saved ${savedCount} khata/offline record(s)!`,
        }),
        'success'
      );
      setBatchRows(
        failedRows.length > 0
          ? failedRows
          : [createBatchRow(), createBatchRow(), createBatchRow()]
      );
    } else {
      notify('কোনো সারি সংরক্ষণ করা যায়নি। দয়া করে তথ্য যাচাই করুন।', 'error');
    }
  };

  // Unified Archive Records
  const archiveRecords = useMemo(() => {
    const list = [];

    (sales || []).forEach((s) => {
      const src = s.entrySource || 'online';
      if (src === 'khata' || src === 'offline' || s.documentType === 'challan') {
        const docType = s.documentType === 'challan' ? 'challan' : 'cash_memo';
        list.push({
          uid: `sale-${s.id || s._id}`,
          kind: docType,
          entrySource: src,
          date: s.date || s.createdAt,
          docNo: s.invoiceNumber || s.invoiceNo || '',
          bookNumber: s.bookNumber || '',
          manualSerialNo: s.manualSerialNo || '',
          customerId: s.customerId || '',
          customerName: s.customerName || 'Walk-in Client',
          customerCompany: s.customerCompany || '',
          customerPhone: s.customerPhone || '',
          amount: Number(s.total !== undefined ? s.total : s.totalAmount) || 0,
          paidAmount: Number(s.paidAmount) || 0,
          dueAmount: Number(s.dueAmount) || 0,
          detailLink: `/sales/${s.id || s._id}`,
          raw: s,
          printDocType: docType === 'challan' ? DOCUMENT_TYPES.CHALLAN : DOCUMENT_TYPES.CASH_MEMO,
        });
      }
    });

    (quotations || []).forEach((q) => {
      const src = q.entrySource || 'online';
      if (src === 'khata' || src === 'offline') {
        list.push({
          uid: `quote-${q.id || q._id}`,
          kind: 'quotation',
          entrySource: src,
          date: q.date || q.createdAt,
          docNo: q.quotationNumber || '',
          bookNumber: q.bookNumber || '',
          manualSerialNo: q.manualSerialNo || '',
          customerId: q.customerId || '',
          customerName: q.customerName || 'Direct Client',
          customerCompany: q.customerCompany || '',
          customerPhone: q.customerPhone || '',
          amount: Number(q.totalAmount) || 0,
          detailLink: `/quotations/${q.id || q._id}`,
          raw: q,
          printDocType: DOCUMENT_TYPES.QUOTATION,
        });
      }
    });

    (moneyReceipts || []).forEach((r) => {
      list.push({
        uid: `mr-${r.id || r._id}`,
        kind: 'money_receipt',
        entrySource: r.entrySource || 'khata',
        date: r.date || r.createdAt,
        docNo: r.receiptNumber || '',
        bookNumber: r.bookNumber || '',
        manualSerialNo: r.manualSerialNo || '',
        customerId: r.customerId || '',
        customerName: r.customerName || 'Direct Client',
        customerCompany: r.customerCompany || '',
        customerPhone: r.customerPhone || '',
        amount: Number(r.amount) || 0,
        linkedInvoiceNo: r.linkedInvoiceNo || '',
        raw: r,
        printDocType: DOCUMENT_TYPES.MONEY_RECEIPT,
      });
    });

    const query = archiveSearch.toLowerCase().trim();
    return list
      .filter((item) => {
        if (archiveTypeFilter !== 'all' && item.kind !== archiveTypeFilter) return false;
        if (archiveSourceFilter !== 'all' && item.entrySource !== archiveSourceFilter) return false;
        if (!query) return true;
        return (
          item.docNo.toLowerCase().includes(query) ||
          item.bookNumber.toLowerCase().includes(query) ||
          item.manualSerialNo.toLowerCase().includes(query) ||
          item.customerName.toLowerCase().includes(query) ||
          item.customerCompany.toLowerCase().includes(query) ||
          item.customerPhone.toLowerCase().includes(query)
        );
      })
      .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  }, [sales, quotations, moneyReceipts, archiveSearch, archiveTypeFilter, archiveSourceFilter]);

  const archiveSummary = useMemo(() => {
    const billsCount = (sales || []).filter(
      (s) => s.entrySource === 'khata' || s.entrySource === 'offline' || s.documentType === 'challan'
    ).length;
    const quotesCount = (quotations || []).filter(
      (q) => q.entrySource === 'khata' || q.entrySource === 'offline'
    ).length;
    const receiptsTotal = (moneyReceipts || [])
      .filter((r) => r.status !== 'cancelled')
      .reduce((s, r) => s + (Number(r.amount) || 0), 0);
    return {
      billsCount,
      quotesCount,
      receiptsCount: (moneyReceipts || []).length,
      receiptsTotal,
    };
  }, [sales, quotations, moneyReceipts]);

  const handleDeleteArchiveRecord = async (item) => {
    const confirmed = await confirmAction({
      title: l({ bn: 'রেকর্ড মুছে ফেলুন', en: 'Delete Record' }),
      message: l({
        bn: `আপনি কি নিশ্চিতভাবে "${item.docNo}" রেকর্ডটি মুছে ফেলতে চান?`,
        en: `Are you sure you want to delete "${item.docNo}"?`,
      }),
      confirmText: l({ bn: 'মুছে ফেলুন', en: 'Delete' }),
      cancelText: l({ bn: 'বাতিল', en: 'Cancel' }),
    });
    if (!confirmed) return;

    if (item.kind === 'quotation') {
      deleteQuotation(item.raw.id || item.raw._id);
    } else if (item.kind === 'money_receipt') {
      deleteMoneyReceipt(item.raw.id || item.raw._id);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <Badge variant="emerald" size="sm">
              <Sparkles className="h-3 w-3" />
              {l({ bn: 'স্মার্ট OCR + খাতা রেজিস্টার', en: 'Smart OCR + Khata Register' })}
            </Badge>
            <Badge variant="blue" size="sm">
              <ShieldCheck className="h-3 w-3" />
              {l({
                bn: 'ছবি স্টোরেজে সেভ হয় না (Zero Image Storage)',
                en: 'Zero Image Storage · Privacy Scan',
              })}
            </Badge>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {l({
              bn: 'পুরনো খাতা ও অফলাইন ডকুমেন্ট হাব',
              en: 'Legacy Khata & Offline Document Hub',
            })}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {l({
              bn: 'পুরনো খাতা বা হার্ডকপির ক্যাশ মেমো, ডেলিভারি চালান, কোটেশন ও মানি রিসিপ্ট ছবি তুলে স্ক্যান করুন অথবা দ্রুত বাল্ক এন্ট্রি দিন।',
              en: 'Scan photos of hardcopy Cash Memos, Delivery Challans, Quotations & Money Receipts with on-device OCR or enter multiple khata rows at once.',
            })}
          </p>
        </div>

        {/* Summary Pills */}
        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          <div className="px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <span className="text-slate-400 block text-[10px]">
              {l({ bn: 'খাতা বিল/চালান', en: 'Khata Bills/Challan' })}
            </span>
            <span className="font-bold text-slate-900 dark:text-slate-100">
              {archiveSummary.billsCount}
            </span>
          </div>
          <div className="px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <span className="text-slate-400 block text-[10px]">
              {l({ bn: 'খাতা কোটেশন', en: 'Khata Quotes' })}
            </span>
            <span className="font-bold text-purple-600 dark:text-purple-400">
              {archiveSummary.quotesCount}
            </span>
          </div>
          <div className="px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <span className="text-slate-400 block text-[10px]">
              {l({ bn: 'মানি রিসিপ্ট আদায়', en: 'Money Receipts' })}
            </span>
            <span className="font-bold text-amber-600 dark:text-amber-400 font-mono">
              {archiveSummary.receiptsCount} · {formatCurrency(archiveSummary.receiptsTotal, settings.currency)}
            </span>
          </div>
        </div>
      </div>

      {/* Mode Switcher Tabs */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm w-fit">
        <button
          type="button"
          onClick={() => setActiveTab('scan')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'scan'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <ScanLine className="h-4 w-4" />
          <span>
            {l({
              bn: 'ছবি স্ক্যান ও একক এন্ট্রি',
              en: 'Photo OCR & Single Entry',
            })}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('batch')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'batch'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <BookOpen className="h-4 w-4" />
          <span>
            {l({
              bn: 'বাল্ক খাতা রেজিস্টার',
              en: 'Batch Khata Register',
            })}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('archive')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'archive'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Receipt className="h-4 w-4" />
          <span>
            {l({
              bn: `সংরক্ষিত তালিকা (${archiveRecords.length})`,
              en: `Saved Archive (${archiveRecords.length})`,
            })}
          </span>
        </button>
      </div>

      {/* TAB 1: PHOTO OCR SCAN & SINGLE ENTRY */}
      {activeTab === 'scan' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* Left Column: Photo Scanner & Text Parser (Zero Storage) */}
          <div className="xl:col-span-5 space-y-4">
            <Card className="border-emerald-200 dark:border-emerald-900/50">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-base">
                  <span className="flex items-center gap-2">
                    <Camera className="h-4 w-4 text-emerald-600" />
                    {l({
                      bn: 'খাতা / হার্ডকপির ছবি স্ক্যানার (OCR)',
                      en: 'Document Photo OCR Scanner',
                    })}
                  </span>
                  {ocrConfidence !== null && (
                    <Badge variant={ocrConfidence >= 65 ? 'emerald' : 'amber'} size="sm">
                      {ocrConfidence}% {l({ bn: 'নির্ভুলতা', en: 'Match' })}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 flex items-start gap-2.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    {l({
                      bn: 'আপনার তোলা বা আপলোড করা ছবি শুধুমাত্র আপনার ব্রাউজারে স্ক্যান করার কাজে ব্যবহৃত হবে—ডাটাবেস বা স্টোরেজে কোনো ছবি জমা থাকবে না।',
                      en: 'Uploaded photos stay purely in transient browser memory to extract text and are never saved to MongoDB or localStorage.',
                    })}
                  </span>
                </div>

                {/* Language Choice & Action Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={ocrLang}
                    onChange={(e) => setOcrLang(e.target.value)}
                    className="px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                    title="OCR Language"
                  >
                    <option value="eng+ben">English + বাংলা (Mixed)</option>
                    <option value="eng">English Only (Fastest)</option>
                    <option value="ben">শুধু বাংলা (Bengali)</option>
                  </select>

                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handlePhotoSelected}
                    className="hidden"
                  />
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoSelected}
                    className="hidden"
                  />

                  <Button
                    type="button"
                    size="sm"
                    variant="primary"
                    icon={Camera}
                    onClick={() => cameraInputRef.current?.click()}
                    disabled={isScanning}
                  >
                    {l({ bn: 'ক্যামেরা দিয়ে তুলুন', en: 'Take Photo' })}
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    icon={Upload}
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isScanning}
                  >
                    {l({ bn: 'ছবি আপলোড', en: 'Upload Image' })}
                  </Button>
                </div>

                {/* Live Transient Preview */}
                {previewUrl ? (
                  <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-950/5">
                    <img
                      src={previewUrl}
                      alt="Temporary Scan Preview"
                      className="w-full max-h-64 object-contain mx-auto"
                    />
                    <button
                      type="button"
                      onClick={handleClearPhoto}
                      className="absolute top-2 right-2 p-1.5 rounded-lg bg-slate-900/75 text-white hover:bg-red-600 transition-colors"
                      title={l({ bn: 'ছবি সরান', en: 'Clear Preview' })}
                    >
                      <X className="h-4 w-4" />
                    </button>
                    {selectedFile && !isScanning && (
                      <div className="p-2 bg-white/95 dark:bg-slate-900/95 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
                        <span className="text-[11px] text-slate-500 truncate">{selectedFile.name}</span>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          icon={RefreshCw}
                          onClick={() => runPhotoOcr(selectedFile)}
                        >
                          {l({ bn: 'পুনরায় স্ক্যান', en: 'Re-Scan' })}
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="cursor-pointer rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 p-6 text-center transition-colors bg-slate-50/50 dark:bg-slate-900/40"
                  >
                    <ScanLine className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                      {l({
                        bn: 'পুরনো ক্যাশ মেমো, চালান, কোটেশন বা মানি রিসিপ্টের ছবি নির্বাচন করুন',
                        en: 'Click to upload a photo of a Cash Memo, Challan, Quotation or Money Receipt',
                      })}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {l({
                        bn: 'পরিষ্কার আলো ও সোজা ছবি হলে OCR সবচেয়ে নির্ভুল কাজ করে',
                        en: 'Bright, flat photos yield the highest OCR accuracy',
                      })}
                    </p>
                  </div>
                )}

                {/* Progress Indicator */}
                {isScanning && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-semibold text-emerald-600">
                      <span>
                        {l({ bn: 'ছবি থেকে লেখা পড়া হচ্ছে...', en: 'Recognizing document text...' })}
                      </span>
                      <span>{ocrProgress}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-emerald-600 transition-all duration-200"
                        style={{ width: `${ocrProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Raw OCR / Paste Text Editor & Re-parse */}
                <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {l({
                        bn: 'স্ক্যান করা টেক্সট / হোয়াটসঅ্যাপ টেক্সট পেস্ট করুন',
                        en: 'Extracted OCR / Pasted Text (Editable)',
                      })}
                    </label>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      icon={Sparkles}
                      onClick={handleParseRawText}
                    >
                      {l({ bn: 'ফর্মে বসান', en: 'Parse Text' })}
                    </Button>
                  </div>
                  <textarea
                    rows={5}
                    value={rawOcrText}
                    onChange={(e) => setRawOcrText(e.target.value)}
                    placeholder={l({
                      bn: 'যেমন:\nCash Memo Book No: 04 Serial: 267 Date: 23/11/2026\nCustomer: Riyan 01403222019\n2 pair Bearing Set 1500 3000\nDiscount: 500 Paid: 2500',
                      en: 'Example:\nCash Memo Book No: 04 Serial: 267 Date: 23/11/2026\nCustomer: Riyan 01403222019\n2 pair Bearing Set 1500 3000',
                    })}
                    className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Dynamic 4-Type Form */}
          <div className="xl:col-span-7 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  {l({
                    bn: 'ডকুমেন্টের ধরন ও তথ্য যাচাই করুন',
                    en: 'Verify Document Type & Entry Fields',
                  })}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* 4 Document Type Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {DOC_TYPE_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    const active = documentType === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => handleDocTypeChange(opt.value)}
                        className={`p-2.5 rounded-xl border text-left transition-all flex flex-col gap-1 ${
                          active
                            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 shadow-sm'
                            : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        <span className="text-xs font-bold leading-tight">{l(opt)}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Metadata Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                      {l({ bn: 'উৎস (Source)', en: 'Source' })}
                    </label>
                    <select
                      value={entrySource}
                      onChange={(e) => handleEntrySourceChange(e.target.value)}
                      className="w-full px-2.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                    >
                      <option value="khata">{l({ bn: 'পুরনো খাতা', en: 'Legacy Khata' })}</option>
                      <option value="offline">{l({ bn: 'অফলাইন', en: 'Offline' })}</option>
                    </select>
                  </div>

                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                      <Calendar className="h-3 w-3 inline mr-1" />
                      {l({ bn: 'তারিখ (Date)', en: 'Issue Date' })}
                    </label>
                    <input
                      type="date"
                      value={issueDate}
                      onChange={(e) => setIssueDate(e.target.value)}
                      className="w-full px-2.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                      {l({ bn: 'বই নং (Book)', en: 'Book No' })}
                    </label>
                    <input
                      type="text"
                      value={bookNumber}
                      onChange={(e) => setBookNumber(e.target.value)}
                      placeholder="e.g. B-04"
                      className="w-full px-2.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                      {l({ bn: 'খাতার সিরিয়াল', en: 'Manual Serial' })}
                    </label>
                    <input
                      type="text"
                      value={manualSerialNo}
                      onChange={(e) => setManualSerialNo(e.target.value)}
                      placeholder="e.g. 267"
                      className="w-full px-2.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                      {l({ bn: 'সিস্টেম নং (ঐচ্ছিক)', en: 'Sys Doc # (Opt)' })}
                    </label>
                    <input
                      type="text"
                      value={customDocNumber}
                      onChange={(e) => setCustomDocNumber(e.target.value)}
                      placeholder="Auto"
                      className="w-full px-2.5 py-2 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                  </div>
                </div>

                {/* Customer Info Block */}
                <div className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5 text-emerald-600" />
                      {l({ bn: 'গ্রাহক / পার্টির তথ্য', en: 'Customer / Party Details' })}
                    </span>
                    <label className="flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoSaveCustomer}
                        onChange={(e) => setAutoSaveCustomer(e.target.checked)}
                        className="rounded border-slate-300 text-emerald-600"
                      />
                      {l({
                        bn: 'নতুন গ্রাহক হলে ডাটাবেসে সেভ করুন',
                        en: 'Auto-save / update customer profile',
                      })}
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                        {l({ bn: 'তালিকা থেকে বাছুন', en: 'Select Existing' })}
                      </label>
                      <select
                        value={customerId}
                        onChange={(e) => handleCustomerSelect(e.target.value)}
                        className="w-full px-2.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                      >
                        <option value="">
                          {l({ bn: '-- নতুন / সরাসরি গ্রাহক --', en: '-- New / Direct Client --' })}
                        </option>
                        {customers.map((c) => (
                          <option key={c.id || c._id} value={c.id || c._id}>
                            {c.name} {c.companyName ? `(${c.companyName})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                        {l({ bn: 'গ্রাহকের নাম *', en: 'Customer Name' })}
                      </label>
                      <input
                        type="text"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder={l({ bn: 'নাম লিখুন...', en: 'Enter name...' })}
                        className="w-full px-2.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                        <Phone className="h-3 w-3 inline mr-1" />
                        {l({ bn: 'মোবাইল নম্বর', en: 'Phone' })}
                      </label>
                      <input
                        type="text"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="01XXXXXXXXX"
                        className="w-full px-2.5 py-2 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <input
                      type="text"
                      value={customerCompany}
                      onChange={(e) => setCustomerCompany(e.target.value)}
                      placeholder={l({ bn: 'কোম্পানি / প্রতিষ্ঠানের নাম', en: 'Company / Business Name' })}
                      className="w-full px-2.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                    <div className="relative">
                      <MapPin className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                      <input
                        type="text"
                        value={customerAddress}
                        onChange={(e) => setCustomerAddress(e.target.value)}
                        placeholder={l({ bn: 'ঠিকানা / সাইট লোকেশন', en: 'Address / Site Location' })}
                        className="w-full pl-8 pr-2.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                      />
                    </div>
                  </div>
                </div>

                {/* MACHINE / EQUIPMENT SPEC BOX (COLLAPSIBLE) */}
                {documentType !== 'money_receipt' && (
                  <MachineSpecCard
                    value={machineDetails}
                    onChange={setMachineDetails}
                    quotations={quotations}
                    sales={sales}
                    priceCatalog={priceCatalog}
                    language={language}
                    compact
                    defaultExpanded={false}
                  />
                )}

                {/* CONDITIONAL BODY: MONEY RECEIPT vs LINE ITEMS */}
                {documentType === 'money_receipt' ? (
                  <div className="space-y-3 p-4 rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/40 dark:bg-amber-950/20">
                    <div className="flex items-center gap-2 text-xs font-bold text-amber-800 dark:text-amber-300">
                      <Banknote className="h-4 w-4" />
                      {l({
                        bn: 'মানি রিসিপ্ট (টাকা জমা ও ইনভয়েস সমন্বয়)',
                        en: 'Money Receipt Payment & Ledger Linking',
                      })}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                          {l({
                            bn: 'কোন বিলের বিপরীতে? (ঐচ্ছিক - বাকি সমন্বয়)',
                            en: 'Link to Invoice (Optional - Auto Reduces Due)',
                          })}
                        </label>
                        <select
                          value={linkedSaleId}
                          onChange={(e) => handleLinkedSaleSelect(e.target.value)}
                          className="w-full px-2.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                        >
                          <option value="">
                            {l({
                              bn: '-- সরাসরি জেনারেল লেজার জমা (Unlinked Receipt) --',
                              en: '-- Unlinked General Customer Payment --',
                            })}
                          </option>
                          {linkableSales.map((s) => {
                            const inv = s.invoiceNumber || s.invoiceNo || '';
                            const due = Number(s.dueAmount) || 0;
                            const tot = Number(s.total !== undefined ? s.total : s.totalAmount) || 0;
                            return (
                              <option key={s.id || s._id} value={s.id || s._id}>
                                {inv} · {s.customerName} (Total: {formatCurrency(tot, settings.currency)} / Due: {formatCurrency(due, settings.currency)})
                              </option>
                            );
                          })}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                          {l({ bn: 'গৃহীত টাকার পরিমাণ (Amount) *', en: 'Received Amount *' })}
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={receiptAmount}
                          onChange={(e) => setReceiptAmount(e.target.value)}
                          placeholder="0.00"
                          className="w-full px-3 py-2 text-sm font-bold font-mono rounded-xl border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900 text-amber-700 dark:text-amber-300"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                          {l({ bn: 'পেমেন্ট মাধ্যম', en: 'Payment Method' })}
                        </label>
                        <select
                          value={paymentMethod}
                          onChange={(e) => setPaymentMethod(e.target.value)}
                          className="w-full px-2.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                        >
                          {PAYMENT_METHODS.map((pm) => (
                            <option key={pm.value} value={pm.value}>
                              {l(pm)}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                          {l({ bn: 'চেক / ট্রানজেকশন নং', en: 'Cheque / Ref No' })}
                        </label>
                        <input
                          type="text"
                          value={chequeOrRefNo}
                          onChange={(e) => setChequeOrRefNo(e.target.value)}
                          placeholder="e.g. CHQ-98421 / TrxID"
                          className="w-full px-2.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                          {l({ bn: 'আদায়কারী (Received By)', en: 'Received By' })}
                        </label>
                        <input
                          type="text"
                          value={receivedBy}
                          onChange={(e) => setReceivedBy(e.target.value)}
                          className="w-full px-2.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                        {l({ bn: 'টাকা গ্রহণের বিবরণ / কারণ (Purpose)', en: 'Purpose / Against' })}
                      </label>
                      <input
                        type="text"
                        value={purpose}
                        onChange={(e) => setPurpose(e.target.value)}
                        className="w-full px-2.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Stock Safety & Column Visibility Toggles */}
                    <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-xs">
                      {documentType !== 'quotation' ? (
                        <label className="flex items-center gap-2 font-semibold cursor-pointer text-slate-700 dark:text-slate-200">
                          <input
                            type="checkbox"
                            checked={deductStock}
                            onChange={(e) => setDeductStock(e.target.checked)}
                            className="rounded border-slate-300 text-emerald-600"
                          />
                          <Package className="h-3.5 w-3.5 text-emerald-600" />
                          <span>
                            {deductStock
                              ? l({
                                  bn: 'বর্তমান ইনভেন্টরি স্টক থেকে কমবে',
                                  en: 'Deduct from current live stock',
                                })
                              : l({
                                  bn: 'স্টক কমবে না (পুরনো খাতা / ঐতিহাসিক এন্ট্রি)',
                                  en: 'Skip stock deduction (Historical/Khata Entry)',
                                })}
                          </span>
                        </label>
                      ) : (
                        <span className="text-xs text-purple-600 font-semibold">
                          {l({ bn: 'কোটেশন — ইনভেন্টরি স্টক অপরিবর্তিত থাকে', en: 'Quotation — Does not alter stock' })}
                        </span>
                      )}

                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input type="checkbox" checked={showRate} onChange={(e) => setShowRate(e.target.checked)} />
                          {l({ bn: 'দর দেখাও', en: 'Rate' })}
                        </label>
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input type="checkbox" checked={showLineTotal} onChange={(e) => setShowLineTotal(e.target.checked)} />
                          {l({ bn: 'মোট', en: 'Amount' })}
                        </label>
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input type="checkbox" checked={showGrandTotal} onChange={(e) => setShowGrandTotal(e.target.checked)} />
                          {l({ bn: 'সর্বমোট', en: 'Grand Total' })}
                        </label>
                      </div>
                    </div>

                    {/* Line Items Table */}
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                          {l({ bn: 'পণ্য ও বিবরণের তালিকা', en: 'Line Items' })} ({items.length})
                        </span>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            icon={Search}
                            onClick={() => setLookupModalState({ isOpen: true, targetRowIdx: null })}
                          >
                            {l({ bn: 'প্রাইস লিস্ট খুঁজুন', en: 'Price Lookup' })}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            icon={Plus}
                            onClick={() => setItems((prev) => [...prev, createEmptyItem(null)])}
                          >
                            {l({ bn: '+ নতুন লাইন', en: '+ Add Line' })}
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                        {items.map((it, idx) => {
                          const unitOpts = getUnitSelectOptions(it.unit, language);
                          const rowTotal = (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0);
                          return (
                            <div
                              key={it.id || idx}
                              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 grid grid-cols-12 gap-2 items-center"
                            >
                              <div className="col-span-12 sm:col-span-5 flex gap-1.5">
                                <select
                                  value={it.productId || 'custom'}
                                  onChange={(e) => handleItemChange(idx, 'productId', e.target.value)}
                                  className="w-24 shrink-0 px-2 py-1.5 text-[11px] rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                                  title="Catalog Match"
                                >
                                  <option value="custom">Custom</option>
                                  {products.map((p) => (
                                    <option key={p.id || p._id} value={p.id || p._id}>
                                      {p.name} ({p.quantity})
                                    </option>
                                  ))}
                                </select>
                                <input
                                  type="text"
                                  value={it.productName}
                                  onChange={(e) => handleItemChange(idx, 'productName', e.target.value)}
                                  placeholder={l({ bn: 'পণ্যের নাম / বিবরণ', en: 'Item description' })}
                                  className="flex-1 min-w-0 px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                                />
                              </div>

                              <div className="col-span-3 sm:col-span-2">
                                <input
                                  type="number"
                                  min="0.01"
                                  step="any"
                                  value={it.quantity}
                                  onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                                  className="w-full px-2 py-1.5 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                                  title="Qty"
                                />
                              </div>

                              <div className="col-span-4 sm:col-span-2">
                                <select
                                  value={normalizeUnit(it.unit)}
                                  onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                                  className="w-full px-1.5 py-1.5 text-[11px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                                  title="Unit"
                                >
                                  {unitOpts.map((u) => (
                                    <option key={u.value} value={u.value}>
                                      {u.label}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div className="col-span-3 sm:col-span-2">
                                <input
                                  type="number"
                                  min="0"
                                  step="any"
                                  value={it.unitPrice}
                                  onChange={(e) => handleItemChange(idx, 'unitPrice', e.target.value)}
                                  placeholder="Rate"
                                  className="w-full px-2 py-1.5 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                                  title="Rate"
                                />
                              </div>

                              <div className="col-span-2 sm:col-span-1 flex items-center justify-end gap-1">
                                <span className="hidden lg:inline text-[10px] font-mono font-bold text-slate-600 dark:text-slate-300">
                                  {Math.round(rowTotal)}
                                </span>
                                {items.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))}
                                    className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Discount / Payment Summary */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                          {l({ bn: 'বিশেষ ছাড় (Discount -)', en: 'Discount (-)' })}
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={discount}
                          onChange={(e) => setDiscount(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                        />
                      </div>

                      {documentType !== 'quotation' && (
                        <>
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                              {l({ bn: 'নগদ জমা (খালি=সম্পূর্ণ)', en: 'Paid (blank=full)' })}
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={paidAmount}
                              onChange={(e) => setPaidAmount(e.target.value)}
                              placeholder={String(singleNetTotal)}
                              className="w-full px-2.5 py-1.5 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                              {l({ bn: 'পেমেন্ট মাধ্যম', en: 'Method' })}
                            </label>
                            <select
                              value={paymentMethod}
                              onChange={(e) => setPaymentMethod(e.target.value)}
                              className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                            >
                              {PAYMENT_METHODS.map((pm) => (
                                <option key={pm.value} value={pm.value}>
                                  {l(pm)}
                                </option>
                              ))}
                            </select>
                          </div>
                        </>
                      )}

                      <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 text-right">
                        <span className="block text-[10px] text-slate-500">
                          {l({ bn: 'সর্বমোট মূল্য', en: 'Net Total' })}
                        </span>
                        <span className="text-sm font-black font-mono text-emerald-700 dark:text-emerald-300">
                          {formatCurrency(singleNetTotal, settings.currency)}
                        </span>
                        {documentType !== 'quotation' && singleDueVal > 0 && (
                          <span className="block text-[10px] font-mono text-red-600 font-bold">
                            Due: {formatCurrency(singleDueVal, settings.currency)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Notes & Optional Requisition Ref */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {documentType !== 'money_receipt' && (
                    <input
                      type="text"
                      value={requisitionRef}
                      onChange={(e) => setRequisitionRef(e.target.value)}
                      placeholder={l({ bn: 'চাহিদাপত্র / খাতা রেফারেন্স', en: 'Requisition / Khata Ref' })}
                      className="w-full px-2.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                  )}
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={l({ bn: 'অতিরিক্ত নোট / মন্তব্য...', en: 'Notes or remarks...' })}
                    className={`w-full px-2.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 ${
                      documentType === 'money_receipt' ? 'sm:col-span-2' : ''
                    }`}
                  />
                </div>

                {/* Action Footer */}
                <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <Button
                    type="button"
                    variant="outline"
                    icon={CheckCircle2}
                    onClick={() => handleSaveSingle(false)}
                  >
                    {l({ bn: 'সেভ করুন', en: 'Save to Database' })}
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    icon={Printer}
                    onClick={() => handleSaveSingle(true)}
                  >
                    {l({ bn: 'সেভ ও প্রিন্ট / PDF', en: 'Save & Print / PDF' })}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 2: RAPID BATCH KHATA REGISTER (Proposal 3) */}
      {activeTab === 'batch' && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-emerald-600" />
                  {l({
                    bn: 'একসাথে অনেকগুলো খাতা / অফলাইন এন্ট্রি (বাল্ক রেজিস্টার)',
                    en: 'Rapid Batch Khata Register Grid',
                  })}
                </CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">
                  {l({
                    bn: 'পুরনো খাতার পাতা দেখে দ্রুত একাধিক ক্যাশ মেমো, চালান, কোটেশন বা মানি রিসিপ্ট একসাথে ডাটাবেসে তুলুন।',
                    en: 'Enter multiple hardcopy Cash Memos, Challans, Quotations, or Money Receipts in one batch.',
                  })}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={batchSkipStock}
                    onChange={(e) => setBatchSkipStock(e.target.checked)}
                    className="rounded border-slate-300 text-emerald-600"
                  />
                  {l({
                    bn: 'খাতার এন্ট্রিতে বর্তমান স্টক অপরিবর্তিত রাখুন',
                    en: 'Keep Live Stock Unchanged for Khata Rows',
                  })}
                </label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  icon={Plus}
                  onClick={() => setBatchRows((prev) => [...prev, createBatchRow()])}
                >
                  {l({ bn: '+ নতুন সারি', en: '+ Add Row' })}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs min-w-[1050px]">
              <thead>
                <tr className="border-y border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-500">
                  <th className="py-2.5 px-2.5">#</th>
                  <th className="py-2.5 px-2">{l({ bn: 'ধরন', en: 'Type' })}</th>
                  <th className="py-2.5 px-2">{l({ bn: 'উৎস', en: 'Src' })}</th>
                  <th className="py-2.5 px-2">{l({ bn: 'তারিখ', en: 'Date' })}</th>
                  <th className="py-2.5 px-2">{l({ bn: 'বই / সিরিয়াল', en: 'Book / S.No' })}</th>
                  <th className="py-2.5 px-2">{l({ bn: 'গ্রাহক / পার্টি', en: 'Customer' })}</th>
                  <th className="py-2.5 px-2">{l({ bn: 'বিবরণ / কারণ', en: 'Item / Purpose' })}</th>
                  <th className="py-2.5 px-2">{l({ bn: 'পরিমাণ ও একক', en: 'Qty & Unit' })}</th>
                  <th className="py-2.5 px-2">{l({ bn: 'দর (Rate)', en: 'Rate' })}</th>
                  <th className="py-2.5 px-2">{l({ bn: 'জমা / টাকা', en: 'Paid / Amt' })}</th>
                  <th className="py-2.5 px-2 text-right">{l({ bn: 'অ্যাকশন', en: 'Act' })}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {batchRows.map((row, idx) => {
                  const unitOpts = getUnitSelectOptions(row.unit, language);
                  const isMR = row.documentType === 'money_receipt';
                  return (
                    <tr key={row.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="py-2 px-2.5 font-mono text-slate-400">{idx + 1}</td>
                      <td className="py-2 px-1.5">
                        <select
                          value={row.documentType}
                          onChange={(e) => handleBatchFieldChange(idx, 'documentType', e.target.value)}
                          className="px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[11px] font-semibold"
                        >
                          <option value="cash_memo">মেমো</option>
                          <option value="challan">চালান</option>
                          <option value="quotation">কোটেশন</option>
                          <option value="money_receipt">রিসিপ্ট</option>
                        </select>
                      </td>
                      <td className="py-2 px-1.5">
                        <select
                          value={row.entrySource}
                          onChange={(e) => handleBatchFieldChange(idx, 'entrySource', e.target.value)}
                          className="px-1.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[11px]"
                        >
                          <option value="khata">খাতা</option>
                          <option value="offline">অফলাইন</option>
                        </select>
                      </td>
                      <td className="py-2 px-1.5">
                        <input
                          type="date"
                          value={row.date}
                          onChange={(e) => handleBatchFieldChange(idx, 'date', e.target.value)}
                          className="w-32 px-1.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[11px]"
                        />
                      </td>
                      <td className="py-2 px-1.5">
                        <div className="flex gap-1">
                          <input
                            type="text"
                            value={row.bookNumber}
                            onChange={(e) => handleBatchFieldChange(idx, 'bookNumber', e.target.value)}
                            placeholder="Book"
                            className="w-14 px-1.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[11px]"
                          />
                          <input
                            type="text"
                            value={row.manualSerialNo}
                            onChange={(e) => handleBatchFieldChange(idx, 'manualSerialNo', e.target.value)}
                            placeholder="No."
                            className="w-16 px-1.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[11px]"
                          />
                        </div>
                      </td>
                      <td className="py-2 px-1.5">
                        <div className="flex flex-col gap-1 min-w-[160px]">
                          <select
                            value={row.customerId}
                            onChange={(e) => handleBatchFieldChange(idx, 'customerId', e.target.value)}
                            className="px-1.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-[10px]"
                          >
                            <option value="">-- কাস্টমার বাছুন --</option>
                            {customers.map((c) => (
                              <option key={c.id || c._id} value={c.id || c._id}>
                                {c.name} {c.phone ? `(${c.phone})` : ''}
                              </option>
                            ))}
                          </select>
                          <div className="flex gap-1">
                            <input
                              type="text"
                              value={row.customerName}
                              onChange={(e) => handleBatchFieldChange(idx, 'customerName', e.target.value)}
                              placeholder="নাম..."
                              className="w-24 px-1.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[11px]"
                            />
                            <input
                              type="text"
                              value={row.customerPhone}
                              onChange={(e) => handleBatchFieldChange(idx, 'customerPhone', e.target.value)}
                              placeholder="ফোন"
                              className="w-24 px-1.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[11px] font-mono"
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-2 px-1.5">
                        <input
                          type="text"
                          value={row.itemDescription}
                          onChange={(e) => handleBatchFieldChange(idx, 'itemDescription', e.target.value)}
                          placeholder={isMR ? 'বকেয়া জমা' : 'পণ্য / পার্টসের নাম'}
                          className="w-40 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[11px]"
                        />
                      </td>
                      <td className="py-2 px-1.5">
                        {!isMR ? (
                          <div className="flex gap-1">
                            <input
                              type="number"
                              min="1"
                              step="any"
                              value={row.quantity}
                              onChange={(e) => handleBatchFieldChange(idx, 'quantity', e.target.value)}
                              className="w-12 px-1.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[11px] font-mono"
                            />
                            <select
                              value={normalizeUnit(row.unit)}
                              onChange={(e) => handleBatchFieldChange(idx, 'unit', e.target.value)}
                              className="w-20 px-1 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[10px]"
                            >
                              {unitOpts.map((u) => (
                                <option key={u.value} value={u.value}>
                                  {u.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        ) : (
                          <span className="text-[10px] text-amber-600 font-semibold">—</span>
                        )}
                      </td>
                      <td className="py-2 px-1.5">
                        {!isMR ? (
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={row.unitPrice}
                            onChange={(e) => handleBatchFieldChange(idx, 'unitPrice', e.target.value)}
                            placeholder="0"
                            className="w-20 px-1.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[11px] font-mono"
                          />
                        ) : (
                          <span className="text-[10px] text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-2 px-1.5">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={row.paidAmount}
                          onChange={(e) => handleBatchFieldChange(idx, 'paidAmount', e.target.value)}
                          placeholder={isMR ? 'টাকা *' : 'পূর্ণ জমা'}
                          className="w-20 px-1.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[11px] font-mono"
                        />
                      </td>
                      <td className="py-2 px-2 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleDuplicateBatchRow(idx)}
                          className="p-1 text-slate-400 hover:text-emerald-600"
                          title="Duplicate Row"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                        {batchRows.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setBatchRows((prev) => prev.filter((_, i) => i !== idx))}
                            className="p-1 text-slate-400 hover:text-red-500 ml-1"
                            title="Remove Row"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900">
              <span className="text-xs text-slate-500">
                {l({
                  bn: 'টিপস: প্রতিটি সারিতে অন্তত কাস্টমারের নাম বা পণ্যের নাম লিখলে সেই সারিগুলো সংরক্ষিত হবে।',
                  en: 'Tip: Rows with a customer, item description, or amount entered will be saved cleanly.',
                })}
              </span>
              <Button
                type="button"
                variant="primary"
                icon={CheckCircle2}
                isLoading={isSavingBatch}
                onClick={handleSaveBatch}
              >
                {l({
                  bn: 'সব সারি ডাটাবেসে সেভ করুন',
                  en: 'Save All Valid Rows',
                })}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* TAB 3: ARCHIVE & MONEY RECEIPT REGISTRY */}
      {activeTab === 'archive' && (
        <div className="space-y-4">
          <Card className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-6 relative">
                <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={archiveSearch}
                  onChange={(e) => setArchiveSearch(e.target.value)}
                  placeholder={l({
                    bn: 'মেমো/রিসিপ্ট নং, বই নং, সিরিয়াল, গ্রাহক বা ফোন দিয়ে খুঁজুন...',
                    en: 'Search doc no, book no, serial, customer, phone...',
                  })}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>

              <div className="md:col-span-3">
                <select
                  value={archiveTypeFilter}
                  onChange={(e) => setArchiveTypeFilter(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                >
                  <option value="all">{l({ bn: 'সব ধরনের ডকুমেন্ট', en: 'All Document Types' })}</option>
                  <option value="cash_memo">{l({ bn: 'ক্যাশ মেমো', en: 'Cash Memo' })}</option>
                  <option value="challan">{l({ bn: 'ডেলিভারি চালান', en: 'Delivery Challan' })}</option>
                  <option value="quotation">{l({ bn: 'কোটেশন / দরপত্র', en: 'Quotation' })}</option>
                  <option value="money_receipt">{l({ bn: 'মানি রিসিপ্ট', en: 'Money Receipt' })}</option>
                </select>
              </div>

              <div className="md:col-span-3">
                <select
                  value={archiveSourceFilter}
                  onChange={(e) => setArchiveSourceFilter(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                >
                  <option value="all">{l({ bn: 'সব উৎস (খাতা ও অফলাইন)', en: 'All Sources' })}</option>
                  <option value="khata">{l({ bn: 'পুরনো খাতা (Khata)', en: 'Legacy Khata' })}</option>
                  <option value="offline">{l({ bn: 'অফলাইন (Offline)', en: 'Offline' })}</option>
                </select>
              </div>
            </div>
          </Card>

          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 text-slate-500">
                    <th className="py-3 px-4">{l({ bn: 'তারিখ', en: 'Date' })}</th>
                    <th className="py-3 px-4">{l({ bn: 'নম্বর ও বই/সিরিয়াল', en: 'Doc # & Book/Serial' })}</th>
                    <th className="py-3 px-4">{l({ bn: 'ধরন ও উৎস', en: 'Type & Source' })}</th>
                    <th className="py-3 px-4">{l({ bn: 'গ্রাহক / প্রতিষ্ঠান', en: 'Customer' })}</th>
                    <th className="py-3 px-4 text-right">{l({ bn: 'মোট / পরিমাণ', en: 'Amount' })}</th>
                    <th className="py-3 px-4 text-right">{l({ bn: 'অ্যাকশন', en: 'Actions' })}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {archiveRecords.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-12 text-center text-slate-400">
                        <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        {l({
                          bn: 'কোনো খাতা বা অফলাইন ডকুমেন্ট পাওয়া যায়নি। উপরের ট্যাব থেকে ছবি স্ক্যান বা নতুন এন্ট্রি দিন।',
                          en: 'No khata or offline documents found yet.',
                        })}
                      </td>
                    </tr>
                  ) : (
                    archiveRecords.map((item) => (
                      <tr key={item.uid} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                        <td className="py-3 px-4 whitespace-nowrap text-slate-600 dark:text-slate-300">
                          {formatDate(item.date)}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="font-mono font-bold text-slate-900 dark:text-slate-100 block">
                            {item.docNo}
                          </span>
                          {(item.bookNumber || item.manualSerialNo) && (
                            <span className="text-[10px] text-slate-500 font-mono">
                              {item.bookNumber ? `Book: ${item.bookNumber}` : ''}
                              {item.bookNumber && item.manualSerialNo ? ' · ' : ''}
                              {item.manualSerialNo ? `S.No: ${item.manualSerialNo}` : ''}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Badge
                              variant={
                                item.kind === 'money_receipt'
                                  ? 'amber'
                                  : item.kind === 'quotation'
                                  ? 'purple'
                                  : item.kind === 'challan'
                                  ? 'blue'
                                  : 'emerald'
                              }
                              size="sm"
                            >
                              {item.kind === 'money_receipt'
                                ? l({ bn: 'মানি রিসিপ্ট', en: 'Money Receipt' })
                                : item.kind === 'challan'
                                ? l({ bn: 'চালান', en: 'Challan' })
                                : item.kind === 'quotation'
                                ? l({ bn: 'কোটেশন', en: 'Quotation' })
                                : l({ bn: 'ক্যাশ মেমো', en: 'Cash Memo' })}
                            </Badge>
                            <Badge variant="slate" size="sm">
                              {item.entrySource === 'khata'
                                ? l({ bn: 'খাতা', en: 'Khata' })
                                : item.entrySource === 'offline'
                                ? l({ bn: 'অফলাইন', en: 'Offline' })
                                : l({ bn: 'অনলাইন', en: 'Online' })}
                            </Badge>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-slate-900 dark:text-slate-100 block" data-transliterate="true">
                            {item.customerName}
                          </span>
                          {(item.customerCompany || item.customerPhone) && (
                            <span className="text-[10px] text-slate-500 block">
                              {item.customerCompany && <span data-transliterate="true">{item.customerCompany}</span>}
                              {item.customerCompany && item.customerPhone ? ' · ' : ''}
                              {item.customerPhone || ''}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                          {formatCurrency(item.amount, settings.currency)}
                          {item.kind !== 'money_receipt' && item.dueAmount > 0 && (
                            <span className="block text-[10px] text-red-500 font-normal">
                              Due: {formatCurrency(item.dueAmount, settings.currency)}
                            </span>
                          )}
                          {item.linkedInvoiceNo && (
                            <span className="block text-[10px] text-amber-600 font-normal">
                              Ref: {item.linkedInvoiceNo}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() =>
                                setPrintTarget({ doc: item.raw, docType: item.printDocType })
                              }
                              className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors"
                              title={l({ bn: 'প্রিন্ট / PDF', en: 'Print' })}
                            >
                              <Printer className="h-4 w-4" />
                            </button>
                            {item.detailLink && (
                              <Link
                                to={item.detailLink}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors"
                                title={l({ bn: 'বিস্তারিত', en: 'View Details' })}
                              >
                                <Eye className="h-4 w-4" />
                              </Link>
                            )}
                            {(item.kind === 'quotation' || item.kind === 'money_receipt') && (
                              <button
                                type="button"
                                onClick={() => handleDeleteArchiveRecord(item)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                                title={l({ bn: 'মুছে ফেলুন', en: 'Delete' })}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

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
            if (prev.length === 1 && !prev[0].productName?.trim()) {
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
                id: `itm-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
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

      {/* Printable Receipt / Cash Memo / Challan / Quotation / Money Receipt Modal */}
      {printTarget && (
        <PrintableReceiptModal
          isOpen={Boolean(printTarget)}
          onClose={() => setPrintTarget(null)}
          sale={printTarget.doc}
          initialDocType={printTarget.docType}
        />
      )}
    </div>
  );
};
