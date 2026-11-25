/**
 * StockLine Enterprise Print Engine & Fully Customizable Trade Stationery Generator
 * Fully editable & white-label ready for ANY enterprise or trade firm.
 * Supports:
 *   1. ক্যাশ মেমো (Cash Memo - ১ম কপি)
 *   2. ডেলিভারী চালান (Delivery Challan - ২য় কপি)
 *   3. অফিশিয়াল প্যাড / কমার্শিয়াল ইনভয়েস (Official Letterhead / Pad)
 *   4. পিওএস থার্মাল রিসিপ্ট (POS Thermal 80mm / 58mm)
 * Instant Multi-language Switch: Bangla (বাংলা), English, and Bilingual (উভয়).
 */

import { formatCurrency, formatDateTime, formatDate } from './formatters';

export const DOCUMENT_TYPES = {
  CASH_MEMO: 'cash_memo',
  CHALLAN: 'challan',
  OFFICIAL_PAD: 'official_pad',
  QUOTATION: 'quotation',
  THERMAL: 'thermal',
  INVOICE: 'official_pad',
};

export const DOCUMENT_LANGUAGES = {
  BANGLA: 'bn',
  ENGLISH: 'en',
  OBRO: 'obro',
  BILINGUAL: 'bilingual',
};

/**
 * Standardized Document Filename Generator
 * Formats: Customer Number (Phone) + Memo/Quotation/Doc Number + Date (YYYY-MM-DD) + Customer Name
 * Safe for Windows, macOS, Linux, and browser PDF printing dialogs.
 */
export const generatePrintFileName = (doc = {}, docType = DOCUMENT_TYPES.CASH_MEMO, options = {}) => {
  // 1. Customer Number / Phone
  const rawPhone = options.overrides?.customerPhone ||
    doc.customerPhone ||
    doc.phone ||
    doc.clientPhone ||
    doc.customer?.phone ||
    '';
  const cleanPhone = String(rawPhone).replace(/[^\d+]/g, '').trim() || 'NoPhone';

  // 2. Memo / Quotation / Document Number
  const isQuote = docType === DOCUMENT_TYPES.QUOTATION || Boolean(doc.quotationNumber || doc.quotationNo);
  const rawNumber = options.overrides?.invoiceNumber ||
    (isQuote
      ? (doc.quotationNumber || doc.quotationNo || doc.invoiceNumber || 'QT-000')
      : (doc.invoiceNumber || doc.invoiceNo || doc.receiptNumber || 'INV-000'));
  const cleanNumber = String(rawNumber).replace(/[/\\?%*:|"<>]/g, '-').trim() || 'DOC';

  // 3. Document Date (YYYY-MM-DD)
  const rawDate = doc.date || doc.quotationDate || doc.createdAt || new Date();
  let cleanDate = '';
  try {
    const d = new Date(rawDate);
    if (!isNaN(d.getTime())) {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      cleanDate = `${yyyy}-${mm}-${dd}`;
    } else {
      cleanDate = new Date().toISOString().slice(0, 10);
    }
  } catch {
    cleanDate = new Date().toISOString().slice(0, 10);
  }

  // 4. Customer Name
  const rawName = options.overrides?.customerName ||
    doc.customerName ||
    doc.clientContactPerson ||
    doc.customer?.name ||
    doc.name ||
    doc.customerCompany ||
    'Customer';
  const cleanName = String(rawName)
    .replace(/[/\\?%*:|"<>]/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .slice(0, 40) || 'Customer';

  // Customer Number + Memo/Quotation Number + Date + Customer Name
  return `${cleanPhone}_${cleanNumber}_${cleanDate}_${cleanName}`;
};

/**
 * Isolated Iframe Printing Engine
 * Bypasses all modal layout constraints, transforms, body overflow, and screen dark modes.
 * Ensures the target filename (customTitle) is enforced in browser "Save as PDF" dialogs.
 */
export const printDocumentViaIframe = (htmlContent, customTitle) => {
  let iframe = document.getElementById('shanta-print-engine-frame');
  if (!iframe) {
    iframe = document.createElement('iframe');
    iframe.id = 'shanta-print-engine-frame';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '210mm';
    iframe.style.height = '297mm';
    iframe.style.border = 'none';
    iframe.style.opacity = '0.001';
    iframe.style.pointerEvents = 'none';
    iframe.style.zIndex = '-9999';
    document.body.appendChild(iframe);
  }

  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(htmlContent);
  doc.close();

  if (customTitle) {
    try {
      doc.title = customTitle;
    } catch {
      // ignore
    }
  }

  const triggerPrint = () => {
    const originalDocumentTitle = document.title;
    if (customTitle) {
      try {
        document.title = customTitle;
      } catch {
        // ignore
      }
    }

    try {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } catch (err) {
      console.error('Print engine error:', err);
      // Fallback: open in new window if iframe print is blocked
      const fallbackWin = window.open('', '_blank');
      if (fallbackWin) {
        if (customTitle) {
          try {
            fallbackWin.document.title = customTitle;
          } catch {
            // ignore
          }
        }
        fallbackWin.document.write(htmlContent);
        fallbackWin.document.close();
        fallbackWin.focus();
        fallbackWin.print();
      }
    } finally {
      // Revert top document.title after print preview settles
      setTimeout(() => {
        try {
          document.title = originalDocumentTitle;
        } catch {
          // ignore
        }
      }, 1500);
    }
  };

  // Wait for web fonts & styles to settle before opening browser print preview
  if (doc.fonts && doc.fonts.ready) {
    doc.fonts.ready
      .then(() => {
        setTimeout(triggerPrint, 200);
      })
      .catch(() => {
        setTimeout(triggerPrint, 350);
      });
  } else {
    setTimeout(triggerPrint, 350);
  }
};

// Vector Illustrations for Header & Watermark
const ICONS_SVG = {
  watermarkBg: `
    <svg viewBox="0 0 400 300" width="340" height="250" fill="none" xmlns="http://www.w3.org/2000/svg" style="opacity: 0.08;">
      <rect x="60" y="80" width="220" height="150" rx="24" fill="#0284c7" stroke="#0369a1" stroke-width="6"/>
      <circle cx="170" cy="155" r="50" fill="#38bdf8" stroke="#0284c7" stroke-width="6"/>
      <path d="M170 120v70M135 155h70" stroke="#0284c7" stroke-width="8" stroke-linecap="round"/>
      <rect x="280" y="110" width="60" height="90" rx="14" fill="#0ea5e9" stroke="#0369a1" stroke-width="5"/>
      <path d="M28 110c0-18 14-30 30-30s30 12 30 30v90c0 10-8 18-18 18H46c-10 0-18-8-18-18v-90z" fill="#059669" stroke="#047857" stroke-width="4"/>
    </svg>
  `,
};

/**
 * Stationery Bilingual Vocabularies
 */
export const I18N = {
  bn: {
    bismi: 'বিসমিল্লাহির রাহমানির রাহিম',
    cashMemoBadge: 'ক্যাশ মেমো',
    challanBadge: 'ডেলিভারী চালান',
    padBadge: 'অফিসিয়াল প্যাড',
    quotationBadge: 'দরপত্র / কোটেশন',
    thermalBadge: 'ক্যাশ মেমো (POS SLIP)',
    copy1: '১ম কপি',
    copy2: '২য় কপি',
    memoNo: 'নং-',
    refNo: 'সূত্রঃ',
    date: 'তারিখ :',
    name: 'নাম :',
    address: 'ঠিকানা :',
    mobile: 'মোবা:',
    phone: 'ফোন:',
    email: 'ইমেইল:',
    proprietor: 'প্রোঃ',
    binLabel: 'BIN:',
    sl: 'সংখ্যা',
    itemDesc: 'মালের বিবরণ',
    qty: 'পরিমাণ',
    rate: 'দর',
    amount: 'টাকা',
    total: 'মোট:-',
    paid: 'অগ্রিম / জমা:-',
    due: 'বাকী:-',
    subtotal: 'সর্বমোট:',
    discount: 'বিশেষ ছাড়:',
    netPayable: 'নিট প্রদেয়:',
    totalQtyDispatched: 'মোট সরবরাহকৃত মালামাল (Total Quantity):',
    receivedNotice: 'বিঃদ্রঃ উপরোক্ত মালামাল ভালো অবস্থায় বুঝিয়া পাইলাম।',
    nonRefundable: '[ বিক্রিত মাল ফেরত নেওয়া হয় না। ]',
    buyerSign: 'ক্রেতার স্বাক্ষর',
    receiverSign: 'গ্রহীতার স্বাক্ষর',
    sellerSign: 'পক্ষে-',
    managerSign: 'স্বত্বাধিকারী / ম্যানেজার',
    cashier: 'ক্যাশিয়ার',
    endOfSlip: '--- সমাপ্ত ---',
    thanks: 'ধন্যবাদ আবার আসবেন',
    walkInBuyer: 'খুচরা ক্রেতা (Walk-in Retail Buyer)',
    counterSale: 'কাউন্টার বিক্রয়',
    consigneeDefault: 'ডেলিভারি গ্রহীতা (Direct Consignee)',
    deliverySiteDefault: 'সাইট / কাউন্টার ডেলিভারি',
    recipient: 'প্রাপক / গ্রাহক:',
    company: 'প্রতিষ্ঠান / ফার্ম:',
    termsTitle: 'শর্তাবলী:',
    defaultTerms: '১. সকল মালামাল প্রাপ্যতা সাপেক্ষে সরবরাহ করা হইবে।\n২. ডেলিভারি সময়: কার্যাদেশ প্রাপ্তির ৩ কার্যদিবসের মধ্যে।\n৩. এই কোটেশনের মেয়াদ জারির তারিখ হইতে ১৫ দিন পর্যন্ত বৈধ।',
    makerSign: 'প্রস্তুতকারকের স্বাক্ষর',
  },
  en: {
    bismi: '',
    cashMemoBadge: 'CASH MEMO',
    challanBadge: 'DELIVERY CHALLAN',
    padBadge: 'COMMERCIAL INVOICE',
    quotationBadge: 'QUOTATION',
    thermalBadge: 'POS SALES RECEIPT',
    copy1: '1st Copy',
    copy2: '2nd Copy',
    memoNo: 'No -',
    refNo: 'Ref:',
    date: 'Date :',
    name: 'Name :',
    address: 'Address :',
    mobile: 'Mob:',
    phone: 'Phone:',
    email: 'Email:',
    proprietor: 'Prop:',
    binLabel: 'BIN / Tax ID:',
    sl: 'SL',
    itemDesc: 'Item Description & Specs',
    qty: 'Qty',
    rate: 'Rate',
    amount: 'Amount',
    total: 'Total:-',
    paid: 'Advance / Paid:-',
    due: 'Due / Balance:-',
    subtotal: 'Subtotal:',
    discount: 'Discount:',
    netPayable: 'Net Payable:',
    totalQtyDispatched: 'Total Dispatched Goods (Quantity):',
    receivedNotice: 'Notice: Received the above goods in good condition.',
    nonRefundable: '[ Sold goods are non-refundable. ]',
    buyerSign: 'Customer Signature',
    receiverSign: 'Receiver Signature',
    sellerSign: 'For -',
    managerSign: 'Authorized Signatory / Seal',
    cashier: 'Cashier',
    endOfSlip: '*** END OF RECEIPT ***',
    thanks: 'Thank you for your business!',
    walkInBuyer: 'Walk-in Retail Buyer',
    counterSale: 'Counter Direct Sale',
    consigneeDefault: 'Direct Consignee',
    deliverySiteDefault: 'Site Delivery / Store Counter',
    recipient: 'Customer / Recipient:',
    company: 'Company / Firm:',
    termsTitle: 'Terms & Conditions:',
    defaultTerms: '1. All items are subject to stock availability.\n2. Delivery time: Within 3 working days upon work order confirmation.\n3. Quotation validity: 15 calendar days from the date of issuance.',
    makerSign: 'Prepared By (Signature)',
  },
  obro: {
    bismi: 'Bismillahir Rahmanir Rahim',
    cashMemoBadge: 'CASH MEMO',
    challanBadge: 'DELIVERY CHALLAN',
    padBadge: 'OFFICIAL PAD',
    quotationBadge: 'QUOTATION',
    thermalBadge: 'CASH MEMO (POS SLIP)',
    copy1: '1st Copy',
    copy2: '2nd Copy',
    memoNo: 'No -',
    refNo: 'Sutro:',
    date: 'Tarikh :',
    name: 'Nam :',
    address: 'Thikana :',
    mobile: 'Moba:',
    phone: 'Phone:',
    email: 'Email:',
    proprietor: 'Prop:',
    binLabel: 'BIN:',
    sl: 'SL',
    itemDesc: 'Maler Biboron',
    qty: 'Poriman',
    rate: 'Dor',
    amount: 'Taka',
    total: 'Mot:-',
    paid: 'Agrim / Joma:-',
    due: 'Baki:-',
    subtotal: 'Sorbomot:',
    discount: 'Bishes Chhar:',
    netPayable: 'Net Prodey:',
    totalQtyDispatched: 'Mot Sorborahkrito Malamal (Total Quantity):',
    receivedNotice: 'B.D: Uporokto mal bhalo obosthay bujhiya pailam.',
    nonRefundable: '[ Bikrito mal pherot newa hoy na ]',
    buyerSign: 'Kretar Shakkhor',
    receiverSign: 'Grohitar Shakkhor',
    sellerSign: 'Pokkhe -',
    managerSign: 'Shottadhikari / Manager',
    cashier: 'Cashier',
    endOfSlip: '--- Shomapto ---',
    thanks: 'Dhonnobad abar ashben',
    walkInBuyer: 'Khuchra Kreta (Walk-in Retail Buyer)',
    counterSale: 'Counter Bikroy',
    consigneeDefault: 'Delivery Grohita (Direct Consignee)',
    deliverySiteDefault: 'Site / Counter Delivery',
    recipient: 'Grahok / Prapok:',
    company: 'Protishthan / Firm:',
    termsTitle: 'Shortaboli (Terms & Conditions):',
    defaultTerms: '1. Shokol malamal prapyota shapekkhe shorboraho kora hoibe.\n2. Delivery shomoy: Karjadesh praptir 3 karjodibosher moddhe.\n3. Ei quotation er meyadh jarir tarikh hoite 15 din porjonto boidho.',
    makerSign: 'Prostutkaroker Shakkhor',
  },
  bilingual: {
    bismi: 'বিসমিল্লাহির রাহমানির রাহিম',
    cashMemoBadge: 'ক্যাশ মেমো / CASH MEMO',
    challanBadge: 'ডেলিভারী চালান / CHALLAN',
    padBadge: 'অফিসিয়াল প্যাড / COMMERCIAL INVOICE',
    quotationBadge: 'দরপত্র / QUOTATION',
    thermalBadge: 'ক্যাশ মেমো / POS RECEIPT',
    copy1: '১ম কপি (1st Copy)',
    copy2: '২য় কপি (2nd Copy)',
    memoNo: 'নং / No:',
    refNo: 'সূত্র / Ref:',
    date: 'তারিখ / Date :',
    name: 'নাম / Name :',
    address: 'ঠিকানা / Address :',
    mobile: 'মোবা / Mob:',
    phone: 'ফোন / Phone:',
    email: 'ইমেইল / Email:',
    proprietor: 'প্রোঃ / Prop:',
    binLabel: 'BIN / Tax:',
    sl: 'সংখ্যা / SL',
    itemDesc: 'মালের বিবরণ / Description',
    qty: 'পরিমাণ / Qty',
    rate: 'দর / Rate',
    amount: 'টাকা / Amount',
    total: 'মোট / Total:-',
    paid: 'অগ্রিম / Paid:-',
    due: 'বাকী / Due:-',
    subtotal: 'সর্বমোট / Subtotal:',
    discount: 'ছাড় / Discount:',
    netPayable: 'নিট প্রদেয় / Net Payable:',
    totalQtyDispatched: 'মোট সরবরাহকৃত মালামাল / Total Dispatched:',
    receivedNotice: 'বিঃদ্রঃ উপরোক্ত মালামাল ভালো অবস্থায় বুঝিয়া পাইলাম। / Received in good condition.',
    nonRefundable: '[ বিক্রিত মাল ফেরত নেওয়া হয় না / Non-refundable ]',
    buyerSign: 'ক্রেতার স্বাক্ষর / Customer',
    receiverSign: 'গ্রহীতার স্বাক্ষর / Receiver',
    sellerSign: 'পক্ষে- / For -',
    managerSign: 'স্বত্বাধিকারী / Manager',
    cashier: 'ক্যাশিয়ার / Cashier',
    endOfSlip: '--- সমাপ্ত / END OF RECEIPT ---',
    thanks: 'ধন্যবাদ আবার আসবেন / Thank You!',
    walkInBuyer: 'খুচরা ক্রেতা / Walk-in Buyer',
    counterSale: 'কাউন্টার বিক্রয় / Counter Sale',
    consigneeDefault: 'ডেলিভারি গ্রহীতা / Consignee',
    deliverySiteDefault: 'সাইট ডেলিভারি / Site Delivery',
    recipient: 'প্রাপক / Customer:',
    company: 'প্রতিষ্ঠান / Company:',
    termsTitle: 'শর্তাবলী / Terms & Conditions:',
    defaultTerms: '১. সকল মালামাল প্রাপ্যতা সাপেক্ষে সরবরাহ করা হইবে। (Subject to stock availability)\n২. ডেলিভারি সময়: কার্যাদেশ প্রাপ্তির ৩ কার্যদিবসের মধ্যে।\n৩. এই কোটেশনের মেয়াদ ১৫ দিন পর্যন্ত বৈধ। (Validity: 15 Days)',
    makerSign: 'প্রস্তুতকারকের স্বাক্ষর / Prepared By',
  },
};

/**
 * Checks if a quotation terms string is a standard default template
 */
export const isStandardDefaultTerms = (terms) => {
  if (!terms || typeof terms !== 'string' || !terms.trim()) return true;
  const t = terms.trim();
  for (const langKey of Object.keys(I18N)) {
    if (I18N[langKey]?.defaultTerms?.trim() === t) return true;
  }
  if (t.includes('সকল মালামাল') || t.includes('মালামাল প্রাপ্যতা')) return true;
  if (t.includes('All items are subject') || t.includes('subject to stock availability')) return true;
  if (t.includes('Shokol malamal') || t.includes('prapyota shapekkhe')) return true;
  return false;
};

/**
 * Resolves normalized settings and language parameters
 * Guarantees STRICT SINGLE-LANGUAGE PURITY per mode:
 *   - 'bn' -> 100% Bangla (No English subtitle)
 *   - 'en' -> 100% English (No Bangla subtitle)
 *   - 'obro' -> 100% Avro/Banglish
 *   - 'bilingual' -> Both Bangla and English
 */
export const resolveStationeryProfile = (settings = {}, options = {}) => {
  const s = { ...settings, ...(options.overrides || {}) };
  const lang = options.language || s.docLanguage || 'bn';
  const t = I18N[lang] || I18N.bn;

  // Company Name
  const nameBn = s.companyName || s.businessName || 'মেসার্স শান্তা রেফ্রিজারেশন';
  const nameEn = s.companyNameEn || s.businessNameEn || 'M/S. SHANTA REFRIGERATION';
  const nameObro = s.companyNameObro || 'M/S. Shanta Refrigeration';

  let primaryTitle = nameBn;
  let secondaryTitle = '';

  if (lang === 'en') {
    primaryTitle = nameEn;
    secondaryTitle = ''; // Pure single language! No Bangla subtitle in English mode!
  } else if (lang === 'obro') {
    primaryTitle = nameObro;
    secondaryTitle = ''; // Pure single language!
  } else if (lang === 'bn') {
    primaryTitle = nameBn;
    secondaryTitle = ''; // Pure single language! No English subtitle in Bangla mode!
  } else if (lang === 'bilingual') {
    primaryTitle = nameBn;
    secondaryTitle = nameEn;
  }

  // Proprietor
  const propBn = s.proprietor || 'মোঃ রুহুল আমিন (লিটন)';
  const propEn = s.proprietorEn || 'Md. Ruhul Amin (Liton)';
  const proprietorName = (lang === 'en' || lang === 'obro') ? propEn : propBn;

  // Contacts
  const phone = s.companyPhone || s.businessPhone || '01711-169875';
  const email = s.companyEmail || s.businessEmail || 'shanta.refrigeration@gmail.com';

  // Address
  const addrBn = s.companyAddress || s.address || '৪০৬, সি.ডি.এ মার্কেট (মসজিদের বিপরীতে), পাহাড়তলী, চট্টগ্রাম।';
  const addrEn = s.companyAddressEn || s.addressEn || '406, C.D.A Market (Opposite to Mosque), Pahartali, Chattogram.';
  const addrObro = '406, C.D.A Market (Mosjider biporite), Pahartali, Chattogram.';
  const address = lang === 'en' ? addrEn : lang === 'obro' ? addrObro : addrBn;

  // BIN / Tax
  const bin = s.bin || 'BIN-001651149-0505';

  // Scope
  const scopeBn = s.businessScope || 'এখানে সকল প্রকারের রেফ্রিজারেশন কোল্ড স্টোর, এয়ার কন্ডিশন, মেশিন ও যন্ত্রাংশ, আইস প্ল্যান্ট, চিলার প্ল্যান্ট R-12, R-22, R-502a, R-134a, R-407a, R-404a ইত্যাদি গ্যাস, কম্প্রেসার ওয়েল, পিস্টন ও এ্যামোনিয়া কম্প্রেসারের খুচরা যন্ত্রাংশ ক্রয় ও বিক্রয় করা হয়।';
  const scopeEn = s.businessScopeEn || 'Dealers & suppliers of all types of refrigeration cold storage, air conditioning equipment & parts, ice plant, chiller plant, R-12, R-22, R-502a, R-134a, R-407a, R-404a gases, compressor oil, piston and ammonia compressor spare parts.';
  const scopeObro = 'Ekhane shokol prokare refrigeration cold storage, air condition, machine o jontrangsho, ice plant, chiller plant, compressor oil, piston o ammonia compressor er khuchra jontrangsho kroy o bikroy kora hoy.';
  const scope = lang === 'en' ? scopeEn : lang === 'obro' ? scopeObro : scopeBn;

  // Disclaimer
  const disclaimerBn = s.disclaimer || 'বিঃদ্রঃ উপরোক্ত মালামাল ভালো অবস্থায় বুঝিয়া পাইলাম।';
  const disclaimerEn = s.disclaimerEn || 'Notice: Received the above goods in good condition.';
  const disclaimerObro = 'B.D: Uporokto mal bhalo obosthay bujhiya pailam.';
  const disclaimer = lang === 'en' ? disclaimerEn : lang === 'obro' ? disclaimerObro : disclaimerBn;

  const nonRefundable = lang === 'en' ? '[ Sold goods are non-refundable. ]' : lang === 'obro' ? '[ Bikrito mal pherot newa hoy na ]' : '[ বিক্রিত মাল ফেরত নেওয়া হয় না। ]';
  const watermarkText = lang === 'en' ? 'THANK YOU' : lang === 'obro' ? 'DHONNOBAD ABAR ASHBEN' : 'ধন্যবাদ আবার আসবেন';
  const currencySymbol = s.currencySymbol || (s.currency === 'USD' ? '$' : '৳');

  return {
    s,
    lang,
    t,
    nameBn,
    nameEn,
    primaryTitle,
    secondaryTitle,
    proprietorName,
    phone,
    email,
    address,
    bin,
    scope,
    disclaimer,
    nonRefundable,
    watermarkText,
    currencySymbol,
  };
};

/**
 * Shared Authentic Bangladesh Trade Memo CSS Styles
 */
const getAuthenticStyles = (isThermal = false) => `
  @import url('https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600;700&display=swap');

  @page {
    size: ${isThermal ? '80mm auto' : 'A4 portrait'};
    margin: ${isThermal ? '2mm 3mm' : '8mm 12mm 10mm 12mm'};
  }

  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  body {
    font-family: 'Hind Siliguri', 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    color: #0f172a;
    background: #ffffff;
    font-size: ${isThermal ? '11px' : '12px'};
    line-height: ${isThermal ? '1.3' : '1.38'};
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .font-mono { font-family: 'JetBrains Mono', monospace; }
  .text-right { text-align: right; }
  .text-center { text-align: center; }
  .text-left { text-align: left; }
  .font-bold { font-weight: 700; }
  .font-semibold { font-weight: 600; }
  .uppercase { text-transform: uppercase; }

  .pad-page {
    position: relative;
    width: 100%;
    max-width: 190mm;
    margin: 0 auto;
    background: #ffffff;
  }

  .top-bismi {
    font-size: 11px;
    font-weight: 600;
    color: #334155;
    text-align: center;
    letter-spacing: 0.05em;
    margin-bottom: 2px;
  }

  .top-header-grid {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    margin-bottom: 4px;
    width: 100%;
  }

  .top-left-cell {
    /* Empty balance cell - No image/graphics on top left */
  }

  .top-center-cell {
    text-align: center;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .top-right-cell {
    text-align: right;
  }

  .prop-line {
    font-size: 11px;
    font-weight: 700;
    color: #0f172a;
    text-align: right;
  }

  .title-bn {
    font-size: 26px;
    font-weight: 800;
    color: #047857;
    line-height: 1.1;
    letter-spacing: -0.01em;
    text-align: center;
  }

  .title-en {
    font-size: 18px;
    font-weight: 800;
    color: #b91c1c;
    letter-spacing: 0.03em;
    line-height: 1.1;
    text-align: center;
    margin-top: 1px;
  }

  .scope-box {
    border: 1px solid #cbd5e1;
    background: #f8fafc;
    border-radius: 6px;
    padding: 3px 8px;
    font-size: 9.5px;
    line-height: 1.35;
    color: #334155;
    text-align: center;
    margin: 4px 0;
  }

  .address-line {
    font-size: 10.5px;
    font-weight: 600;
    color: #0f172a;
    text-align: center;
  }

  .memo-badge {
    display: inline-block;
    background: #1e1b4b;
    color: #ffffff;
    font-weight: 800;
    font-size: 13.5px;
    padding: 3px 20px;
    border-radius: 4px;
    letter-spacing: 0.08em;
    box-shadow: 0 1px 3px rgba(0,0,0,0.18);
    text-align: center;
    text-transform: uppercase;
  }

  .meta-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 6px;
    font-size: 11.5px;
    font-weight: 600;
  }

  .date-box {
    display: inline-block;
    border: 1px solid #0f172a;
    padding: 1px 6px;
    min-width: 26px;
    text-align: center;
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    font-weight: 700;
    background: #ffffff;
    margin-left: 2px;
  }

  .customer-box {
    border: 1px solid #94a3b8;
    border-radius: 4px;
    padding: 4px 8px;
    margin: 6px 0 8px 0;
    font-size: 11.5px;
    line-height: 1.45;
    background: #ffffff;
  }

  .customer-row {
    display: flex;
    align-items: baseline;
  }

  .customer-label {
    font-weight: 700;
    color: #0f172a;
    width: 60px;
    flex-shrink: 0;
  }

  .customer-dotted-line {
    flex: 1;
    border-bottom: 1px dotted #94a3b8;
    padding-bottom: 1px;
    font-weight: 600;
    color: #0f172a;
  }

  .memo-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 4px;
    position: relative;
    z-index: 2;
  }

  .memo-table th {
    background: #38bdf8;
    color: #0f172a;
    font-size: 11.5px;
    font-weight: 700;
    padding: 4px 6px;
    border: 1px solid #0284c7;
    text-align: center;
  }

  .memo-table td {
    padding: 4.5px 6px;
    border: 1px solid #cbd5e1;
    font-size: 11.5px;
    line-height: 1.3;
    height: 25px;
  }

  .col-sl { width: 38px; text-align: center; background-color: #faf5ff; }
  .col-desc { text-align: left; background-color: #fffbeb; }
  .col-qty { width: 78px; text-align: center; background-color: #f0fdf4; white-space: nowrap; }
  .col-rate { width: 85px; text-align: right; background-color: #fdf2f8; }
  .col-amount { width: 95px; text-align: right; background-color: #eff6ff; }

  .memo-totals-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: -1px;
  }

  .memo-totals-table td {
    border: 1px solid #cbd5e1;
    padding: 4px 8px;
    font-size: 12px;
  }

  .totals-label {
    font-weight: 700;
    text-align: right;
    padding-right: 12px;
    background: #f8fafc;
    width: 75%;
  }

  .totals-value {
    text-align: right;
    font-weight: 700;
    font-family: 'JetBrains Mono', monospace;
    width: 25%;
    background: #eff6ff;
    white-space: nowrap;
  }

  .watermark-layer {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -40%);
    pointer-events: none;
    z-index: 1;
    text-align: center;
  }

  .watermark-diagonal {
    font-size: 26px;
    font-weight: 800;
    color: rgba(2, 132, 199, 0.12);
    transform: rotate(-18deg);
    letter-spacing: 0.15em;
    margin-top: 15px;
  }

  .footer-notice {
    margin-top: 6px;
    font-size: 10px;
    color: #334155;
    font-weight: 600;
    text-align: center;
  }

  .disclaimer-pill {
    display: inline-block;
    border: 1px solid #b91c1c;
    color: #b91c1c;
    font-size: 10px;
    font-weight: 700;
    padding: 1px 8px;
    border-radius: 3px;
    margin-top: 2px;
    background: #fef2f2;
  }

  .signatures-row {
    display: flex;
    justify-content: space-between;
    margin-top: 36px;
    padding: 0 10px;
  }

  .sig-block {
    text-align: center;
    font-size: 11px;
    font-weight: 700;
    color: #0f172a;
    border-top: 1px dashed #475569;
    padding-top: 3px;
    min-width: 140px;
  }

  .pad-layout {
    display: block;
  }

  .pad-sidebar {
    display: none !important;
  }
`;

/**
 * Helper to split date into Day, Month, Year
 */
const getDateParts = (dateInput) => {
  const d = dateInput ? new Date(dateInput) : new Date();
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = String(d.getFullYear());
  return { day, month, year };
};

/**
 * Strips internal system markers like "(CUSTOM)" or "(কাস্টম)" from item descriptions
 * for professional, client-facing final prints.
 */
export const cleanItemName = (name) => {
  if (!name) return '';
  return String(name).replace(/\s*\((?:custom|কাস্টম)\)/gi, '').trim();
};

/**
 * Filters out internal placeholder SKUs like 'CUSTOM', 'NONE', 'N/A' from client prints.
 */
export const cleanItemSku = (sku) => {
  if (!sku) return '';
  const s = String(sku).trim();
  if (/^(custom|none|n\/a|undefined|null)$/i.test(s)) return '';
  return s;
};

/**
 * 1. CASH MEMO (ক্যাশ মেমো - ১ম কপি)
 * Supports live customizable info & English/Bangla switching
 */
export const generateCashMemoHtml = (sale, settings = {}, options = {}) => {
  const p = resolveStationeryProfile(settings, options);
  const invoiceNumber = options.overrides?.invoiceNumber || sale.invoiceNumber || sale.invoiceNo || '376';
  const cleanSerial = invoiceNumber.replace(/\D/g, '').slice(-3) || '376';
  const { day, month, year } = getDateParts(sale.date || sale.createdAt);

  const items = sale.items || [];
  const subtotal = Number(sale.subtotal) || 0;
  const discount = Number(sale.discount) || 0;
  const tax = Number(sale.tax) || 0;
  const total = Number(sale.totalAmount !== undefined ? sale.totalAmount : (sale.total !== undefined ? sale.total : Math.max(0, subtotal - discount + tax))) || 0;
  const paid =
    sale.paymentStatus === 'paid'
      ? total
      : sale.paymentStatus === 'due'
      ? 0
      : Math.min(total, Math.max(0, Number(sale.paidAmount) || 0));
  const due = Math.max(0, total - paid);

  const showRate = options.showRate !== undefined ? options.showRate : (sale.showRate !== undefined ? sale.showRate : true);
  const showLineTotal = options.showLineTotal !== undefined ? options.showLineTotal : (sale.showLineTotal !== undefined ? sale.showLineTotal : true);
  const showGrandTotal = options.showGrandTotal !== undefined ? options.showGrandTotal : (sale.showGrandTotal !== undefined ? sale.showGrandTotal : true);

  const TOTAL_LINES = 13;
  const dummyRowsNeeded = Math.max(0, TOTAL_LINES - items.length);
  const docFileName = generatePrintFileName(sale, DOCUMENT_TYPES.CASH_MEMO, options);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${docFileName}</title>
  <style>${getAuthenticStyles(false)}</style>
</head>
<body>
  <div class="pad-page">
    ${p.t.bismi ? `<div class="top-bismi">${p.t.bismi}</div>` : ''}

    <div class="top-header-grid">
      <div class="top-left-cell"></div>
      <div class="top-center-cell">
        <div class="memo-badge">${p.t.cashMemoBadge}</div>
      </div>
      <div class="top-right-cell prop-line">
        <div>${p.t.proprietor} ${p.proprietorName}</div>
        <div class="font-mono" style="font-size: 10px; color: #047857;">📞 ${p.phone}</div>
        ${p.email ? `<div style="font-size: 9px; color: #64748b;">✉ ${p.email}</div>` : ''}
      </div>
    </div>

    <div style="text-align: center; margin-top: 2px;">
      <h1 class="title-bn">${p.primaryTitle}</h1>
      ${p.secondaryTitle ? `<h2 class="title-en">${p.secondaryTitle}</h2>` : ''}
      
      <div class="scope-box">${p.scope}</div>
      <div class="address-line">📍 ${p.address}</div>
    </div>

    <div class="meta-bar">
      <div>
        <span style="font-size: 11px; color: #475569;">${p.t.copy1}</span>
        <span style="margin-left: 10px;">${p.t.memoNo} <strong class="font-mono" style="color: #dc2626; font-size: 15px;">${cleanSerial}</strong></span>
      </div>
      <div class="font-mono font-bold" style="font-size: 11px; color: #1e3a8a;">
        ${p.bin}
      </div>
      <div>
        <span>${p.t.date}</span>
        <span class="date-box">${day}</span>
        <span class="date-box">${month}</span>
        <span class="date-box" style="min-width: 38px;">${year}</span>
      </div>
    </div>

    <div class="customer-box">
      <div class="customer-row">
        <span class="customer-label">${p.t.name}</span>
        <span class="customer-dotted-line">${sale.customerName || p.t.walkInBuyer}</span>
      </div>
      <div class="customer-row" style="margin-top: 3px;">
        <span class="customer-label">${p.t.address}</span>
        <span class="customer-dotted-line">${sale.customerAddress || sale.customerPhone || p.t.counterSale}</span>
      </div>
    </div>

    <div class="watermark-layer">
      ${ICONS_SVG.watermarkBg}
      <div class="watermark-diagonal">${p.watermarkText}</div>
    </div>

    <table class="memo-table">
      <thead>
        <tr>
          <th class="col-sl">${p.t.sl}</th>
          <th class="col-desc">${p.t.itemDesc}</th>
          <th class="col-qty">${p.t.qty}</th>
          ${showRate ? `<th class="col-rate">${p.t.rate}</th>` : ''}
          ${showLineTotal ? `<th class="col-amount">${p.t.amount}</th>` : ''}
        </tr>
      </thead>
      <tbody>
        ${items
          .map((it, idx) => {
            const qty = Number(it.quantity) || 1;
            const unit = it.unit || 'pc';
            const rate = Number(it.unitPrice !== undefined ? it.unitPrice : it.price) || 0;
            const amt = Number(it.lineTotal !== undefined ? it.lineTotal : it.total || qty * rate);
            return `
            <tr>
              <td class="col-sl font-mono">${idx + 1}</td>
              <td class="col-desc font-semibold">
                ${cleanItemName(it.productName || it.name)}
                ${cleanItemSku(it.sku) ? `<span style="font-size: 9.5px; color: #64748b; font-weight: normal; margin-left: 4px;">(${cleanItemSku(it.sku)})</span>` : ''}
              </td>
              <td class="col-qty font-mono font-bold">${qty} ${unit}</td>
              ${showRate ? `<td class="col-rate font-mono">${formatCurrency(rate, p.currencySymbol)}</td>` : ''}
              ${showLineTotal ? `<td class="col-amount font-mono font-bold">${formatCurrency(amt, p.currencySymbol)}</td>` : ''}
            </tr>
          `;
          })
          .join('')}

        ${Array.from({ length: dummyRowsNeeded })
          .map(
            (_, i) => `
            <tr>
              <td class="col-sl font-mono" style="color: #cbd5e1;">${items.length + i + 1}</td>
              <td class="col-desc"></td>
              <td class="col-qty"></td>
              ${showRate ? `<td class="col-rate"></td>` : ''}
              ${showLineTotal ? `<td class="col-amount"></td>` : ''}
            </tr>
          `
          )
          .join('')}
      </tbody>
    </table>

    ${showGrandTotal ? `
    <table class="memo-totals-table">
      <tbody>
        ${discount > 0 || tax > 0 ? `
        <tr>
          <td class="totals-label">${p.t.subtotal}</td>
          <td class="totals-value">${formatCurrency(subtotal, p.currencySymbol)}</td>
        </tr>` : ''}
        ${discount > 0 ? `
        <tr>
          <td class="totals-label" style="color: #047857;">${p.t.discount}</td>
          <td class="totals-value" style="color: #047857;">-${formatCurrency(discount, p.currencySymbol)}</td>
        </tr>` : ''}
        <tr>
          <td class="totals-label">${discount > 0 ? p.t.netPayable : p.t.total}</td>
          <td class="totals-value">${formatCurrency(total, p.currencySymbol)}</td>
        </tr>
        <tr>
          <td class="totals-label">${p.t.paid}</td>
          <td class="totals-value" style="color: #047857;">${formatCurrency(paid, p.currencySymbol)}</td>
        </tr>
        <tr>
          <td class="totals-label">${p.t.due}</td>
          <td class="totals-value" style="color: ${due > 0 ? '#b91c1c' : '#475569'};">${formatCurrency(due, p.currencySymbol)}</td>
        </tr>
      </tbody>
    </table>` : ''}

    <div class="footer-notice">
      <div>${p.disclaimer}</div>
      <div class="disclaimer-pill">${p.nonRefundable}</div>
    </div>

    <div class="signatures-row">
      <div class="sig-block">${p.t.buyerSign}</div>
      <div class="sig-block">${p.t.sellerSign} ${p.primaryTitle}</div>
    </div>
  </div>
</body>
</html>
`;
};

/**
 * 2. DELIVERY CHALLAN (ডেলিভারী চালান - ২য় কপি)
 */
export const generateChallanHtml = (sale, settings = {}, options = {}) => {
  const p = resolveStationeryProfile(settings, options);
  const invoiceNumber = options.overrides?.invoiceNumber || sale.invoiceNumber || sale.invoiceNo || '491';
  const cleanSerial = invoiceNumber.replace(/\D/g, '').slice(-3) || '491';
  const { day, month, year } = getDateParts(sale.date || sale.createdAt);

  const items = sale.items || [];
  const TOTAL_LINES = 14;
  const dummyRowsNeeded = Math.max(0, TOTAL_LINES - items.length);
  const totalUnits = items.reduce((sum, it) => sum + (Number(it.quantity) || 1), 0);
  const docFileName = generatePrintFileName(sale, DOCUMENT_TYPES.CHALLAN, options);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${docFileName}</title>
  <style>${getAuthenticStyles(false)}</style>
</head>
<body>
  <div class="pad-page">
    ${p.t.bismi ? `<div class="top-bismi">${p.t.bismi}</div>` : ''}

    <div class="top-header-grid">
      <div class="top-left-cell"></div>
      <div class="top-center-cell">
        <div class="memo-badge" style="background: #0369a1;">${p.t.challanBadge}</div>
      </div>
      <div class="top-right-cell prop-line">
        <div>${p.t.proprietor} ${p.proprietorName}</div>
        <div class="font-mono" style="font-size: 10px; color: #0284c7;">📞 ${p.phone}</div>
        ${p.email ? `<div style="font-size: 9px; color: #64748b;">✉ ${p.email}</div>` : ''}
      </div>
    </div>

    <div style="text-align: center; margin-top: 2px;">
      <h1 class="title-bn">${p.primaryTitle}</h1>
      ${p.secondaryTitle ? `<h2 class="title-en" style="color: #0369a1;">${p.secondaryTitle}</h2>` : ''}
      
      <div class="scope-box">${p.scope}</div>
      <div class="address-line">📍 ${p.address}</div>
    </div>

    <div class="meta-bar">
      <div>
        <span style="font-size: 11px; color: #475569;">${p.t.copy2}</span>
        <span style="margin-left: 10px;">${p.t.memoNo} <strong class="font-mono" style="color: #0369a1; font-size: 15px;">${cleanSerial}</strong></span>
      </div>
      <div class="font-mono font-bold" style="font-size: 11px; color: #0369a1;">
        ${p.bin}
      </div>
      <div>
        <span>${p.t.date}</span>
        <span class="date-box">${day}</span>
        <span class="date-box">${month}</span>
        <span class="date-box" style="min-width: 38px;">${year}</span>
      </div>
    </div>

    <div class="customer-box">
      <div class="customer-row">
        <span class="customer-label">${p.t.name}</span>
        <span class="customer-dotted-line">${sale.customerName || p.t.consigneeDefault}</span>
      </div>
      <div class="customer-row" style="margin-top: 3px;">
        <span class="customer-label">${p.t.address}</span>
        <span class="customer-dotted-line">${sale.customerAddress || sale.customerPhone || p.t.deliverySiteDefault}</span>
      </div>
    </div>

    <div class="watermark-layer">
      ${ICONS_SVG.watermarkBg}
    </div>

    <table class="memo-table">
      <thead>
        <tr>
          <th style="width: 45px;">${p.t.sl}</th>
          <th style="text-align: left; padding-left: 10px;">${p.t.itemDesc}</th>
          <th style="width: 90px;">${p.t.qty}</th>
        </tr>
      </thead>
      <tbody>
        ${items
          .map((it, idx) => {
            const qty = Number(it.quantity) || 1;
            const unit = it.unit || 'pc';
            return `
            <tr>
              <td class="col-sl font-mono font-semibold">${idx + 1}</td>
              <td class="col-desc font-semibold">
                ${cleanItemName(it.productName || it.name)}
                ${cleanItemSku(it.sku) ? `<span style="font-size: 10px; color: #64748b; font-weight: normal; margin-left: 6px;">[SKU: ${cleanItemSku(it.sku)}]</span>` : ''}
              </td>
              <td class="col-qty font-mono font-bold" style="font-size: 13px; color: #0369a1;">${qty} ${unit}</td>
            </tr>
          `;
          })
          .join('')}

        ${Array.from({ length: dummyRowsNeeded })
          .map(
            (_, i) => `
            <tr>
              <td class="col-sl font-mono" style="color: #cbd5e1;">${items.length + i + 1}</td>
              <td class="col-desc"></td>
              <td class="col-qty"></td>
            </tr>
          `
          )
          .join('')}
      </tbody>
    </table>

    <div style="display: flex; justify-content: space-between; align-items: center; border: 1px solid #cbd5e1; border-top: none; padding: 4px 10px; font-size: 11.5px; background: #f8fafc; font-weight: 700;">
      <span>${p.t.totalQtyDispatched}</span>
      <span class="font-mono" style="color: #0369a1; font-size: 13px;">${totalUnits} Units</span>
    </div>

    <div class="footer-notice">
      <div>${p.disclaimer}</div>
      <div class="disclaimer-pill">${p.nonRefundable}</div>
    </div>

    <div class="signatures-row">
      <div class="sig-block">${p.t.receiverSign}</div>
      <div class="sig-block">${p.t.sellerSign} ${p.primaryTitle}</div>
    </div>
  </div>
</body>
</html>
`;
};

/**
 * 3. OFFICIAL PAD / INVOICE (অফিসিয়াল প্যাড)
 */
export const generateOfficialPadHtml = (sale, settings = {}, options = {}) => {
  const p = resolveStationeryProfile(settings, options);
  const invoiceNumber = options.overrides?.invoiceNumber || sale.invoiceNumber || sale.invoiceNo || '556';
  const cleanSerial = invoiceNumber.replace(/\D/g, '').slice(-3) || '556';
  const { day, month, year } = getDateParts(sale.date || sale.createdAt);

  const items = sale.items || [];
  const subtotal = Number(sale.subtotal) || 0;
  const discount = Number(sale.discount) || 0;
  const tax = Number(sale.tax) || 0;
  const total = Number(sale.totalAmount || sale.total) || subtotal - discount + tax;

  const showRate = options.showRate !== undefined ? options.showRate : (sale.showRate !== undefined ? sale.showRate : true);
  const showLineTotal = options.showLineTotal !== undefined ? options.showLineTotal : (sale.showLineTotal !== undefined ? sale.showLineTotal : true);
  const showGrandTotal = options.showGrandTotal !== undefined ? options.showGrandTotal : (sale.showGrandTotal !== undefined ? sale.showGrandTotal : true);
  const docFileName = generatePrintFileName(sale, DOCUMENT_TYPES.OFFICIAL_PAD, options);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${docFileName}</title>
  <style>
    ${getAuthenticStyles(false)}
    .pad-top-bar {
      background: linear-gradient(to right, #047857, #059669);
      height: 4px;
      border-radius: 2px;
      margin-bottom: 6px;
    }
    .pad-bottom-bar {
      margin-top: 40px;
      height: 4px;
      background: linear-gradient(to right, #b91c1c 40%, #1e40af 100%);
      border-radius: 2px;
    }
  </style>
</head>
<body>
  <div class="pad-page">
    <div class="pad-top-bar"></div>

    <div class="top-header-grid" style="border-bottom: 1.5px solid #0f172a; padding-bottom: 6px;">
      <div class="top-left-cell"></div>
      <div class="top-center-cell" style="display: block;">
        <h1 class="title-bn" style="font-size: 27px;">${p.primaryTitle}</h1>
        ${p.secondaryTitle ? `<h2 class="title-en" style="font-size: 18px;">${p.secondaryTitle}</h2>` : ''}
      </div>
      <div class="top-right-cell prop-line">
        <div>${p.t.proprietor} ${p.proprietorName}</div>
        <div class="font-mono" style="font-size: 10px; color: #047857;">📞 ${p.phone}</div>
        ${p.email ? `<div style="font-size: 9px; color: #64748b;">✉ ${p.email}</div>` : ''}
      </div>
    </div>

    <div class="scope-box" style="margin-top: 4px;">${p.scope}</div>

    <div style="display: flex; justify-content: space-between; font-size: 10.5px; font-weight: 600; color: #0f172a; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px;">
      <div>📍 ${p.address}</div>
      <div class="font-mono">${p.bin}</div>
    </div>

    <div style="display: flex; justify-content: space-between; align-items: center; margin: 8px 0; font-size: 12px; font-weight: 600;">
      <div>
        <span style="color: #dc2626; font-size: 14px; font-weight: 800; margin-right: 14px;">${cleanSerial}</span>
        <span>${p.t.refNo} </span>
        <span class="font-mono" style="color: #475569;">#INV-${cleanSerial}</span>
      </div>
      <div>
        <span>${p.t.date}</span>
        <span class="date-box">${day}</span>
        <span class="date-box">${month}</span>
        <span class="date-box" style="min-width: 38px;">${year}</span>
      </div>
    </div>

    <div style="position: relative;">
      <div class="watermark-layer" style="top: 45%;">
        ${ICONS_SVG.watermarkBg}
      </div>

      <div class="customer-box" style="margin-top: 0;">
        <div class="customer-row">
          <span class="customer-label">${p.t.name}</span>
          <span class="customer-dotted-line">${sale.customerName || p.t.walkInBuyer}</span>
        </div>
        <div class="customer-row" style="margin-top: 3px;">
          <span class="customer-label">${p.t.address}</span>
          <span class="customer-dotted-line">${sale.customerAddress || (sale.customerPhone ? sale.customerPhone : 'N/A')}</span>
        </div>
      </div>

        <table class="memo-table">
          <thead>
            <tr>
              <th style="width: 35px;">${p.t.sl}</th>
              <th style="text-align: left;">${p.t.itemDesc}</th>
              <th style="width: 55px;">${p.t.qty}</th>
              ${showRate ? `<th style="width: 80px;">${p.t.rate}</th>` : ''}
              ${showLineTotal ? `<th style="width: 90px;">${p.t.amount}</th>` : ''}
            </tr>
          </thead>
          <tbody>
            ${items
              .map((it, idx) => {
                const qty = Number(it.quantity) || 1;
                const unit = it.unit || 'pc';
                const rate = Number(it.unitPrice !== undefined ? it.unitPrice : it.price) || 0;
                const amt = Number(it.lineTotal !== undefined ? it.lineTotal : it.total || qty * rate);
                return `
                <tr>
                  <td class="col-sl font-mono">${idx + 1}</td>
                  <td class="col-desc font-semibold">
                    ${cleanItemName(it.productName || it.name)}
                    ${cleanItemSku(it.sku) ? `<div style="font-size: 9px; color: #64748b; font-weight: normal;">SKU: ${cleanItemSku(it.sku)}</div>` : ''}
                  </td>
                  <td class="col-qty font-mono font-bold">${qty} ${unit}</td>
                  ${showRate ? `<td class="col-rate font-mono">${formatCurrency(rate, p.currencySymbol)}</td>` : ''}
                  ${showLineTotal ? `<td class="col-amount font-mono font-bold">${formatCurrency(amt, p.currencySymbol)}</td>` : ''}
                </tr>
              `;
              })
              .join('')}

            ${Array.from({ length: Math.max(0, 8 - items.length) })
              .map(
                (_, i) => `
                <tr>
                  <td class="col-sl font-mono" style="color: #cbd5e1;">${items.length + i + 1}</td>
                  <td class="col-desc"></td>
                  <td class="col-qty"></td>
                  ${showRate ? `<td class="col-rate"></td>` : ''}
                  ${showLineTotal ? `<td class="col-amount"></td>` : ''}
                </tr>
              `
              )
              .join('')}
          </tbody>
        </table>

        ${showGrandTotal ? `
        <table class="memo-totals-table">
          <tbody>
            <tr>
              <td class="totals-label">${p.t.subtotal}</td>
              <td class="totals-value">${formatCurrency(subtotal, p.currencySymbol)}</td>
            </tr>
            ${
              discount > 0
                ? `
              <tr>
                <td class="totals-label" style="color: #047857;">${p.t.discount}</td>
                <td class="totals-value" style="color: #047857;">-${formatCurrency(discount, p.currencySymbol)}</td>
              </tr>`
                : ''
            }
            <tr>
              <td class="totals-label" style="font-size: 13px;">${p.t.netPayable}</td>
              <td class="totals-value" style="font-size: 13px; color: #047857;">${formatCurrency(total, p.currencySymbol)}</td>
            </tr>
          </tbody>
        </table>` : ''}

        <div class="signatures-row" style="margin-top: 45px;">
          <div class="sig-block">${p.t.buyerSign}</div>
          <div class="sig-block">${p.t.managerSign}</div>
        </div>
      </div>

    <div class="pad-bottom-bar"></div>
  </div>
</body>
</html>
`;
};

/**
 * 4. POS THERMAL RECEIPT (৮০ মিমি / ৫৮ মিমি থার্মাল স্লিপ)
 */
export const generateThermalReceiptHtml = (sale, settings = {}, options = {}) => {
  const p = resolveStationeryProfile(settings, options);
  const invoiceNumber = options.overrides?.invoiceNumber || sale.invoiceNumber || sale.invoiceNo || '376';
  const cleanSerial = invoiceNumber.replace(/\D/g, '').slice(-3) || '376';
  const items = sale.items || [];
  const subtotal = Number(sale.subtotal) || 0;
  const discount = Number(sale.discount) || 0;
  const total = Number(sale.totalAmount || sale.total) || subtotal - discount;
  const docFileName = generatePrintFileName(sale, DOCUMENT_TYPES.THERMAL, options);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${docFileName}</title>
  <style>
    ${getAuthenticStyles(true)}
    .thermal-box {
      width: 74mm;
      margin: 0 auto;
      font-family: 'JetBrains Mono', 'Hind Siliguri', monospace;
    }
  </style>
</head>
<body>
  <div class="thermal-box">
    <div class="text-center">
      ${p.t.bismi ? `<div style="font-size: 9px;">${p.t.bismi}</div>` : ''}
      <h2 style="font-size: 14px; font-weight: 800; color: #047857; margin-top: 1px;">${p.primaryTitle}</h2>
      ${p.secondaryTitle ? `<div style="font-size: 11px; font-weight: 700; color: #b91c1c;">${p.secondaryTitle}</div>` : ''}
      <p style="font-size: 9.5px; color: #334155;">${p.address}</p>
      <p style="font-size: 9.5px; color: #334155;">${p.t.phone} ${p.phone}</p>
      <div style="border-top: 1px dashed #000; margin: 4px 0;"></div>
      <p style="font-weight: 800; font-size: 11px;">${p.t.thermalBadge}</p>
      <p style="font-size: 10px; font-weight: 700;">${p.t.memoNo} #${cleanSerial}</p>
      <p style="font-size: 9px; color: #475569;">${formatDateTime(sale.date || sale.createdAt || new Date())}</p>
    </div>

    <div style="border-top: 1px dashed #000; margin: 4px 0;"></div>

    <div style="font-size: 9.5px; margin-bottom: 2px;">
      <p>${p.t.name} <strong>${sale.customerName || p.t.walkInBuyer}</strong></p>
      ${sale.customerPhone ? `<p>${p.t.phone} ${sale.customerPhone}</p>` : ''}
    </div>

    <div style="border-top: 1px dashed #000; margin: 4px 0;"></div>

    <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
      <thead>
        <tr style="border-bottom: 1px dashed #000;">
          <th style="text-align: left; padding: 2px 0;">${p.t.itemDesc}</th>
          <th style="text-align: center; padding: 2px 0;">${p.t.qty}</th>
          <th style="text-align: right; padding: 2px 0;">${p.t.amount}</th>
        </tr>
      </thead>
      <tbody>
        ${items
          .map((it) => {
            const qty = Number(it.quantity) || 1;
            const unit = it.unit || 'pc';
            const rate = Number(it.unitPrice !== undefined ? it.unitPrice : it.price) || 0;
            const amt = Number(it.lineTotal !== undefined ? it.lineTotal : it.total || qty * rate);
            return `
            <tr>
              <td colspan="3" style="padding-top: 3px; font-weight: 700;">${cleanItemName(it.productName || it.name)}</td>
            </tr>
            <tr style="border-bottom: 1px dotted #e2e8f0;">
              <td style="font-size: 9px; color: #64748b;">${cleanItemSku(it.sku)}</td>
              <td style="text-align: center;">${qty} ${unit} x ${rate}</td>
              <td style="text-align: right; font-weight: 700;">${formatCurrency(amt, p.currencySymbol)}</td>
            </tr>
          `;
          })
          .join('')}
      </tbody>
    </table>

    <div style="border-top: 1px dashed #000; margin: 4px 0; padding-top: 3px; font-size: 10px;">
      <div style="display: flex; justify-content: space-between;">
        <span>${p.t.total}</span>
        <span style="font-weight: 700;">${formatCurrency(subtotal, p.currencySymbol)}</span>
      </div>
      ${
        discount > 0
          ? `
        <div style="display: flex; justify-content: space-between; color: #047857;">
          <span>${p.t.discount}</span>
          <span style="white-space: nowrap;">-${formatCurrency(discount, p.currencySymbol)}</span>
        </div>`
          : ''
      }
      <div style="display: flex; justify-content: space-between; font-size: 12px; font-weight: 800; border-top: 1px solid #000; margin-top: 3px; padding-top: 2px;">
        <span>${p.t.netPayable}</span>
        <span style="color: #047857;">${formatCurrency(total, p.currencySymbol)}</span>
      </div>
    </div>

    <div style="border-top: 1px dashed #000; margin: 6px 0; text-align: center; font-size: 9px; line-height: 1.35;">
      <p>${p.t.thanks}</p>
      <p>* ${p.nonRefundable} *</p>
      <p style="margin-top: 2px; font-family: monospace;">${p.t.endOfSlip}</p>
    </div>
  </div>
</body>
</html>
`;
};

/**
 * 5. QUOTATION (দরপত্র / কোটেশন - মেসার্স শান্তা রেফ্রিজারেশন অফিসিয়াল প্যাড)
 * Exact replica of uploaded handwritten quotation photo (media_1794906003295_4fad90c1.jpg)
 */
export const generateQuotationHtml = (quotation, settings = {}, options = {}) => {
  const p = resolveStationeryProfile(settings, options);
  const quotationNumber = options.overrides?.quotationNumber || quotation.quotationNumber || 'QT-2026-0541';
  const cleanSerial = quotationNumber.replace(/\D/g, '').slice(-4) || '0541';
  const { day, month, year } = getDateParts(quotation.date || quotation.createdAt);

  const items = quotation.items || [];
  const subtotal = Number(quotation.subtotal) || items.reduce((sum, it) => sum + (Number(it.lineTotal) || 0), 0);
  const discount = Number(quotation.discount) || 0;
  const tax = Number(quotation.tax) || 0;
  const total = Number(quotation.totalAmount) || subtotal - discount + tax;

  const showRate = options.showRate !== undefined ? options.showRate : (quotation.showRate !== undefined ? quotation.showRate : true);
  const showLineTotal = options.showLineTotal !== undefined ? options.showLineTotal : (quotation.showLineTotal !== undefined ? quotation.showLineTotal : true);
  const showGrandTotal = options.showGrandTotal !== undefined ? options.showGrandTotal : (quotation.showGrandTotal !== undefined ? quotation.showGrandTotal : true);

  const getRoleText = (role, lang) => {
    const roles = {
      owner: { bn: 'কোম্পানির মালিক / স্বত্বাধিকারী', en: 'Owner / Proprietor', obro: 'Owner', bilingual: 'মালিক / Owner' },
      agent: { bn: 'কোম্পানির প্রতিনিধি / এজেন্ট', en: 'Agent / Representative', obro: 'Agent', bilingual: 'এজেন্ট / Agent' },
      purchaser: { bn: 'ক্রয় কর্মকর্তা / প্রকিউরমেন্ট ম্যানেজার', en: 'Procurement / Purchase Officer', obro: 'Purchaser', bilingual: 'ক্রয় কর্মকর্তা / Purchaser' },
      supplier_rep: { bn: 'সরবরাহকারী / ভেন্ডর প্রতিনিধি', en: 'Supplier / Vendor Rep', obro: 'Supplier Rep', bilingual: 'সরবরাহকারী / Supplier Rep' },
      wholesale: { bn: 'পাইকারি ডিলার', en: 'Wholesale Dealer', obro: 'Wholesale Dealer', bilingual: 'পাইকারি / Wholesale' },
      retail: { bn: 'খুচরা গ্রাহক', en: 'Retail Customer', obro: 'Retail Customer', bilingual: 'খুচরা / Retail' },
    };
    const entry = roles[role] || { bn: 'গ্রাহক', en: 'Customer', obro: 'Customer', bilingual: 'গ্রাহক / Customer' };
    return entry[lang] || entry.en || 'Customer';
  };
  const roleText = getRoleText(quotation.customerRole, p.lang);

  const resolvedTerms = (!quotation.termsAndConditions || isStandardDefaultTerms(quotation.termsAndConditions))
    ? p.t.defaultTerms
    : quotation.termsAndConditions;
  const docFileName = generatePrintFileName(quotation, DOCUMENT_TYPES.QUOTATION, options);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${docFileName}</title>
  <style>
    ${getAuthenticStyles(false)}
    .pad-top-bar {
      background: linear-gradient(to right, #047857, #059669);
      height: 4px;
      border-radius: 2px;
      margin-bottom: 6px;
    }
    .quotation-title-banner {
      text-align: center;
      margin: 10px 0 6px 0;
    }
    .quotation-title-banner span {
      display: inline-block;
      font-size: 21px;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-decoration: underline;
      text-underline-offset: 4px;
      text-decoration-thickness: 1.5px;
      color: #0f172a;
      font-family: 'Inter', 'Hind Siliguri', sans-serif;
    }
    .pad-bottom-bar {
      margin-top: 36px;
      height: 4px;
      background: linear-gradient(to right, #b91c1c 40%, #1e40af 100%);
      border-radius: 2px;
    }
  </style>
</head>
<body>
  <div class="pad-page">
    <div class="pad-top-bar"></div>

    <div class="top-header-grid" style="border-bottom: 1.5px solid #0f172a; padding-bottom: 4px;">
      <div class="top-left-cell"></div>
      <div class="top-center-cell" style="display: block;">
        <h1 class="title-bn" style="font-size: 27px;">${p.primaryTitle}</h1>
        ${p.secondaryTitle ? `<h2 class="title-en" style="font-size: 17px;">${p.secondaryTitle}</h2>` : ''}
      </div>
      <div class="top-right-cell" style="font-size: 10.5px; line-height: 1.25; font-weight: 700;">
        <div>${p.t.proprietor} ${p.proprietorName}</div>
        <div class="font-mono" style="color: #047857;">📞 ${p.phone}</div>
        ${p.email ? `<div style="font-size: 9px; color: #64748b;">✉ ${p.email}</div>` : ''}
      </div>
    </div>

    <div class="scope-box" style="margin-top: 4px;">${p.scope}</div>

    <div style="display: flex; justify-content: space-between; font-size: 10.5px; font-weight: 600; color: #0f172a; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px;">
      <div>📍 ${p.address}</div>
      <div class="font-mono">${p.bin}</div>
    </div>

    <div style="display: flex; justify-content: space-between; align-items: center; margin: 6px 0; font-size: 11.5px; font-weight: 600;">
      <div>
        <span style="color: #dc2626; font-size: 14px; font-weight: 800; margin-right: 12px;">${cleanSerial}</span>
        <span>${p.t.refNo} </span>
        <span class="font-mono" style="color: #1e3a8a; font-weight: 700;">#${quotationNumber}</span>
        ${quotation.requisitionRef ? `<span style="font-size: 10px; color: #64748b; margin-left: 6px;">(Req: ${quotation.requisitionRef})</span>` : ''}
      </div>
      <div>
        <span>${p.t.date} </span>
        <span class="date-box">${day}</span>
        <span class="date-box">${month}</span>
        <span class="date-box" style="min-width: 38px;">${year}</span>
      </div>
    </div>

    <div style="position: relative;">
      <div class="watermark-layer" style="top: 45%;">
        ${ICONS_SVG.watermarkBg}
      </div>

        <div class="quotation-title-banner">
          <span>${p.t.quotationBadge}</span>
        </div>

        <div class="customer-box" style="margin-top: 0; background: #f8fafc; border-color: #cbd5e1;">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px;">
            <div>
              <span style="font-weight: 700; color: #0f172a;">${p.t.recipient} </span>
              <strong style="color: #047857;">${quotation.customerName || (p.lang === 'en' ? 'Valued Client' : 'সম্মানিত ক্লায়েন্ট')}</strong>
              ${quotation.customerRole ? `<span style="font-size: 10px; color: #475569; margin-left: 4px;">(${roleText})</span>` : ''}
            </div>
            <div>
              <span style="font-weight: 700; color: #0f172a;">${p.t.company} </span>
              <strong>${quotation.customerCompany || (p.lang === 'en' ? 'Direct Client' : 'ব্যক্তিগত / রিটেইল')}</strong>
            </div>
            <div>
              <span style="font-weight: 700; color: #0f172a;">${p.t.mobile} </span>
              <span class="font-mono">${quotation.customerPhone || 'N/A'}</span>
            </div>
            <div>
              <span style="font-weight: 700; color: #0f172a;">${p.t.address} </span>
              <span>${quotation.customerAddress || quotation.customerLocation || 'N/A'}</span>
            </div>
          </div>
        </div>

        <table class="memo-table">
          <thead>
            <tr>
              <th style="width: 32px;">${p.t.sl}</th>
              <th style="text-align: left; padding-left: 8px;">${p.t.itemDesc}</th>
              <th style="width: 60px;">${p.t.qty}</th>
              ${showRate ? `<th style="width: 80px;">${p.t.rate}</th>` : ''}
              ${showLineTotal ? `<th style="width: 90px;">${p.t.amount}</th>` : ''}
            </tr>
          </thead>
          <tbody>
            ${items
              .map((it, idx) => {
                const qty = Number(it.quantity) || 1;
                const unit = it.unit || 'pc';
                const rate = Number(it.unitPrice || it.rate || 0);
                const amt = Number(it.lineTotal || qty * rate);
                return `
                <tr>
                  <td class="col-sl font-mono">${idx + 1}</td>
                  <td class="col-desc font-semibold">
                    ${cleanItemName(it.name || it.productName)}
                    ${cleanItemSku(it.sku) ? `<span style="font-size: 9.5px; color: #64748b; font-weight: normal; margin-left: 4px;">(${cleanItemSku(it.sku)})</span>` : ''}
                    ${it.description ? `<div style="font-size: 9.5px; color: #64748b; font-weight: normal;">${it.description}</div>` : ''}
                  </td>
                  <td class="col-qty font-mono font-bold">${qty} ${unit}</td>
                  ${showRate ? `<td class="col-rate font-mono">${formatCurrency(rate, p.currencySymbol)}</td>` : ''}
                  ${showLineTotal ? `<td class="col-amount font-mono font-bold">${formatCurrency(amt, p.currencySymbol)}</td>` : ''}
                </tr>
              `;
              })
              .join('')}

            ${Array.from({ length: Math.max(0, 10 - items.length) })
              .map(
                (_, i) => `
                <tr>
                  <td class="col-sl font-mono" style="color: #cbd5e1;">${items.length + i + 1}</td>
                  <td class="col-desc"></td>
                  <td class="col-qty"></td>
                  ${showRate ? `<td class="col-rate"></td>` : ''}
                  ${showLineTotal ? `<td class="col-amount"></td>` : ''}
                </tr>
              `
              )
              .join('')}
          </tbody>
        </table>

        ${showGrandTotal ? `
        <table class="memo-totals-table">
          <tbody>
            <tr>
              <td class="totals-label">${p.t.subtotal}</td>
              <td class="totals-value">${formatCurrency(subtotal, p.currencySymbol)}</td>
            </tr>
            ${
              discount > 0
                ? `
              <tr>
                <td class="totals-label" style="color: #047857;">${p.t.discount}</td>
                <td class="totals-value" style="color: #047857;">-${formatCurrency(discount, p.currencySymbol)}</td>
              </tr>`
                : ''
            }
            <tr>
              <td class="totals-label" style="font-size: 13px;">${p.t.netPayable}</td>
              <td class="totals-value" style="font-size: 13px; color: #047857;">${formatCurrency(total, p.currencySymbol)}</td>
            </tr>
          </tbody>
        </table>` : ''}

        <div style="margin-top: 10px; font-size: 10.5px; background: #f8fafc; border: 1px dashed #94a3b8; border-radius: 4px; padding: 6px 10px; line-height: 1.45;">
          <strong style="color: #0f172a; text-decoration: underline;">${p.t.termsTitle}</strong>
          <div style="white-space: pre-line; color: #334155; margin-top: 2px;">
            ${resolvedTerms}
          </div>
        </div>

        <div class="signatures-row" style="margin-top: 35px;">
          <div class="sig-block">${p.t.makerSign}</div>
          <div class="sig-block">${p.t.managerSign}<br/><span style="font-size: 9px; font-weight: normal;">(${p.primaryTitle})</span></div>
        </div>
      </div>

    <div class="pad-bottom-bar"></div>
  </div>
</body>
</html>
`;
};

// Backward-compatible alias
export const generateInvoiceHtml = generateOfficialPadHtml;
