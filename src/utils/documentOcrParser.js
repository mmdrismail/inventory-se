import { normalizeUnit } from './units';

const BANGLA_DIGITS = {
  '০': '0',
  '১': '1',
  '২': '2',
  '৩': '3',
  '৪': '4',
  '৫': '5',
  '৬': '6',
  '৭': '7',
  '৮': '8',
  '৯': '9',
};

export const normalizeDigits = (text = '') =>
  String(text).replace(/[০-৯]/g, (d) => BANGLA_DIGITS[d] || d);

/**
 * Light grayscale + contrast canvas preprocessing in memory only (no storage saved).
 */
export const preprocessImageForOcr = (file) =>
  new Promise((resolve) => {
    if (!file || typeof document === 'undefined') {
      resolve(file);
      return;
    }

    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const scale = img.width < 1200 ? Math.min(2, 1600 / Math.max(1, img.width)) : 1;
        const width = Math.round(img.width * scale);
        const height = Math.round(img.height * scale);

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const imgData = ctx.getImageData(0, 0, width, height);
        const data = imgData.data;
        const contrast = 1.28;
        const intercept = 128 * (1 - contrast);

        for (let i = 0; i < data.length; i += 4) {
          const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          const val = Math.max(0, Math.min(255, gray * contrast + intercept));
          data[i] = val;
          data[i + 1] = val;
          data[i + 2] = val;
        }
        ctx.putImageData(imgData, 0, 0);

        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(url);
            resolve(blob || file);
          },
          'image/png',
          0.95
        );
      } catch {
        URL.revokeObjectURL(url);
        resolve(file);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };
    img.src = url;
  });

/**
 * Client-side Tesseract OCR scan. Dynamically imported so main bundle remains light.
 */
export const scanDocumentPhoto = async (file, { lang = 'eng+ben', onProgress } = {}) => {
  const { createWorker } = await import('tesseract.js');
  const processed = await preprocessImageForOcr(file);
  const worker = await createWorker(lang, 1, {
    logger: (m) => {
      if (typeof onProgress === 'function' && m.status === 'recognizing text') {
        onProgress(Math.round((m.progress || 0) * 100));
      }
    },
  });

  try {
    const {
      data: { text, confidence },
    } = await worker.recognize(processed);
    return {
      text: text || '',
      confidence: Math.round(confidence || 0),
    };
  } finally {
    await worker.terminate();
  }
};

const parseAmountToken = (raw) => {
  if (!raw) return 0;
  const cleaned = normalizeDigits(String(raw)).replace(/[^\d.]/g, '');
  const num = parseFloat(cleaned);
  return Number.isFinite(num) ? num : 0;
};

const parseIsoDateFromText = (normalizedText) => {
  // DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const dmy = normalizedText.match(/\b(\d{1,2})[/.\-\s]+(\d{1,2})[/.\-\s]+(20\d{2}|19\d{2})\b/);
  if (dmy) {
    const dd = dmy[1].padStart(2, '0');
    const mm = dmy[2].padStart(2, '0');
    const yyyy = dmy[3];
    if (Number(mm) >= 1 && Number(mm) <= 12 && Number(dd) >= 1 && Number(dd) <= 31) {
      return `${yyyy}-${mm}-${dd}`;
    }
  }

  // YYYY-MM-DD
  const ymd = normalizedText.match(/\b(20\d{2}|19\d{2})[/.-](\d{1,2})[/.-](\d{1,2})\b/);
  if (ymd) {
    return `${ymd[1]}-${ymd[2].padStart(2, '0')}-${ymd[3].padStart(2, '0')}`;
  }

  return '';
};

const OCR_UNIT_MAP = {
  pc: 'pc',
  pcs: 'pc',
  piece: 'pc',
  pieces: 'pc',
  pair: 'pair',
  pairs: 'pair',
  set: 'set',
  sets: 'set',
  kg: 'kg',
  kgs: 'kg',
  can: 'can',
  cans: 'can',
  cylinder: 'cylinder',
  cylinders: 'cylinder',
  cyl: 'cylinder',
  drum: 'drum',
  drums: 'drum',
  box: 'box',
  boxes: 'box',
};

/**
 * Parses extracted OCR or pasted text into structured Quotation / Challan / Cash Memo / Money Receipt fields
 */
export const parseOcrTextToDocument = (rawText = '', catalogProducts = [], existingCustomers = []) => {
  const normText = normalizeDigits(rawText || '');
  const lower = normText.toLowerCase();
  const lines = normText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  // 1. Detect Document Type
  let documentType = 'cash_memo';
  if (/money\s*receipt|received\s*with\s*thanks|মানি\s*রিসিপ্ট|প্রাপ্তি\s*স্বীকার|টাকা\s*জমা/.test(lower)) {
    documentType = 'money_receipt';
  } else if (/delivery\s*challan|challan|চালান/.test(lower)) {
    documentType = 'challan';
  } else if (/quotation|quote\b|estimate|দরপত্র|কোটেশন/.test(lower)) {
    documentType = 'quotation';
  }

  // 2. Date
  const date = parseIsoDateFromText(normText);

  // 3. Phone (BD mobile)
  const phoneMatch = normText.match(/(?:\+?88[-\s]?)?(01[3-9]\d{2}[-\s]?\d{6})/);
  let customerPhone = phoneMatch ? phoneMatch[1].replace(/\s+/g, '') : '';

  // 4. Book & Manual Serial / Document No
  const bookMatch = normText.match(/(?:book|বই)\s*(?:no|নং|#|:)?\s*[:#-]?\s*([A-Z0-9-]{1,12})/i);
  const bookNumber = bookMatch ? bookMatch[1] : '';

  // Remove book reference before extracting serial no so "Book No: B-04" never masks "Memo No: 267"
  const textWithoutBook = bookMatch ? normText.replace(bookMatch[0], ' ') : normText;
  const specificSerialMatch = textWithoutBook.match(
    /(?:memo|invoice|inv|qt|quote|challan|mr|receipt|serial|sl)\s*(?:no|নং|#)?\s*[:.#-]?\s*([A-Z]{0,5}[-]?\d{1,10}(?:-\d{1,6})?)/i
  );
  const genericSerialMatch = textWithoutBook.match(
    /(?:no|নং)\s*[:.#-]?\s*([A-Z]{0,5}[-]?\d{2,10}(?:-\d{1,6})?)/i
  );
  const serialMatch = specificSerialMatch || genericSerialMatch;
  const manualSerialNo = serialMatch ? serialMatch[1].trim() : '';

  // 5. Customer Name / Company
  let customerName = '';
  let customerCompany = '';
  let customerAddress = '';

  for (const line of lines) {
    const cleanLine = line.trim();
    if (!customerName) {
      const m = cleanLine.match(/(?:name|client|customer|received\s*from|recipient|নাম|গ্রাহক|প্রাপক|জনাব)\s*[:ঃ-]?\s*(.+)/i);
      if (m && m[1] && m[1].trim().length >= 2) {
        customerName = m[1].split(/(?:date|mob|phone|তারিখ)/i)[0].trim();
      }
    }
    if (!customerCompany) {
      const mc = cleanLine.match(/(?:company|firm|m\/s|messrs|প্রতিষ্ঠান)\s*[:ঃ.-]?\s*(.+)/i);
      if (mc && mc[1] && mc[1].trim().length >= 2) {
        customerCompany = mc[1].trim();
      }
    }
    if (!customerAddress) {
      const ma = cleanLine.match(/(?:address|location|ঠিকানা)\s*[:ঃ-]?\s*(.+)/i);
      if (ma && ma[1] && ma[1].trim().length >= 3) {
        customerAddress = ma[1].trim();
      }
    }
  }

  // Match against existing customers using phone or name
  let matchedCustomer = null;
  if (customerPhone) {
    const digits = customerPhone.replace(/\D/g, '').slice(-10);
    matchedCustomer = existingCustomers.find(
      (c) => c.phone && String(c.phone).replace(/\D/g, '').slice(-10) === digits
    );
  }
  if (!matchedCustomer && customerName) {
    const cnameLower = customerName.toLowerCase();
    matchedCustomer = existingCustomers.find(
      (c) => c.name && c.name.toLowerCase().trim() === cnameLower
    );
  }
  if (matchedCustomer) {
    customerName = customerName || matchedCustomer.name || '';
    customerCompany = customerCompany || matchedCustomer.companyName || '';
    customerPhone = customerPhone || matchedCustomer.phone || '';
    customerAddress = customerAddress || matchedCustomer.address || '';
  }

  // 6. Totals (Subtotal, Discount, Paid, Due, Grand Total)
  let subtotal = 0;
  let discount = 0;
  let paidAmount = 0;
  let dueAmount = 0;
  let totalAmount = 0;

  for (const line of lines) {
    const amtMatch = line.match(/(\d[\d,]*(?:\.\d{1,2})?)\s*$/);
    if (!amtMatch) continue;
    const val = parseAmountToken(amtMatch[1]);
    const lLower = line.toLowerCase();

    if (/discount|ছাড়|ছাড়/.test(lLower)) {
      discount = val;
    } else if (/advance|paid|deposit|received|অগ্রিম|জমা/.test(lLower) && !/total\s*payable/.test(lLower)) {
      paidAmount = val;
    } else if (/due|balance|বাকি|বাকী/.test(lLower)) {
      dueAmount = val;
    } else if (/subtotal|উপ-মোট|সাবটোটাল/.test(lLower)) {
      subtotal = val;
    } else if (/grand\s*total|net\s*payable|total|সর্বমোট|নিট/.test(lLower)) {
      totalAmount = val;
    }
  }

  // 7. Extract Line Items from tabular/listed rows
  const items = [];
  const UNIT_RE = /\b(pcs?|pieces?|pairs?|sets?|kgs?|cans?|cylinders?|cyl|drums?|box(?:es)?)\b/i;

  for (const line of lines) {
    const lLower = line.toLowerCase();
    // Skip summary/header/meta lines
    if (
      /^(?:sl|name|address|location|phone|mobile|mob|date|book|memo|inv|invoice|qt|quote|challan|mr|receipt|serial|customer|client|company|firm|cash\s*memo|delivery\s*challan|quotation|money\s*receipt|m\/s\.|bin|prop|paid|payment|total|sub\s*total|বই|মেমো|তারিখ|নাম|গ্রাহক|প্রতিষ্ঠান|ঠিকানা|মোবাইল)\b/i.test(lLower) ||
      /(subtotal|discount|grand\s*total|net\s*payable|advance|balance|due|received|\bpaid\s*[:ঃ-]|\btotal\s*[:ঃ-]|বাকি|বাকী|সর্বমোট|উপ-মোট|ছাড়|অগ্রিম|জমা)/i.test(lLower) ||
      /01[3-9]\d{2}[-\s]?\d{6}/.test(line)
    ) {
      continue;
    }

    // Strip optional leading serial like "1." or "1)"
    let rowBody = line.replace(/^\d{1,3}[.)]\s+/, '').trim();

    // Detect leading "<qty> <unit> <description...>" rows (e.g., "2 pair Bearing Set 1500 3000")
    let leadingQty = null;
    let leadingUnit = null;
    const leadMatch = rowBody.match(
      /^(\d+(?:\.\d+)?)\s*(pcs?|pieces?|pairs?|sets?|kgs?|cans?|cylinders?|cyl|drums?|box(?:es)?|x|×)\b\s+(.+)$/i
    );
    if (leadMatch) {
      const qVal = parseFloat(leadMatch[1]);
      if (Number.isFinite(qVal) && qVal > 0 && qVal <= 10000) {
        leadingQty = qVal;
        const tok = leadMatch[2].toLowerCase();
        leadingUnit = tok === 'x' || tok === '×' ? 'pc' : OCR_UNIT_MAP[tok] || normalizeUnit(tok);
        rowBody = leadMatch[3].trim();
      }
    }

    const numTokens = [...rowBody.matchAll(/(?:৳\s*)?(\d[\d,]*(?:\.\d{1,2})?)/g)].filter(
      (m) => m.index > 0
    );

    if (numTokens.length >= 1 || leadingQty !== null) {
      const firstNumIdx = numTokens.length >= 1 ? numTokens[0].index : rowBody.length;
      let rawName = rowBody.slice(0, firstNumIdx).trim();
      const unitMatch = rowBody.match(UNIT_RE);
      let unit = leadingUnit || 'pc';
      if (!leadingUnit && unitMatch) {
        unit = OCR_UNIT_MAP[unitMatch[1].toLowerCase()] || normalizeUnit(unitMatch[1]);
        rawName = rawName.replace(UNIT_RE, '').trim();
      }
      rawName = rawName.replace(/[৳:|_-]+$/g, '').trim();
      if (rawName.length < 2) continue;

      const nums = numTokens.map((m) => parseAmountToken(m[1]));
      let qty = leadingQty ?? 1;
      let rate = 0;
      let lineTotal = 0;

      if (leadingQty !== null) {
        if (nums.length >= 2) {
          rate = nums[0];
          lineTotal = nums[1];
        } else if (nums.length === 1) {
          const val = nums[0];
          if (qty > 1 && val >= qty && val % qty === 0) {
            lineTotal = val;
            rate = val / qty;
          } else {
            rate = val;
            lineTotal = Math.round(qty * rate * 100) / 100;
          }
        }
      } else if (nums.length >= 3) {
        qty = nums[0] > 0 && nums[0] <= 10000 ? nums[0] : 1;
        rate = nums[1];
        lineTotal = nums[2];
      } else if (nums.length === 2) {
        qty = nums[0] > 0 && nums[0] <= 10000 ? nums[0] : 1;
        const second = nums[1];
        if (Math.abs(second - qty * second) < 0.01 && qty === 1) {
          rate = second;
          lineTotal = second;
        } else if (qty > 1 && second >= qty && second % qty === 0) {
          lineTotal = second;
          rate = second / qty;
        } else {
          rate = second;
          lineTotal = Math.round(qty * rate * 100) / 100;
        }
      } else if (nums.length === 1) {
        if (unitMatch && nums[0] <= 1000) {
          qty = nums[0] || 1;
        } else {
          rate = nums[0];
          lineTotal = nums[0];
        }
      }

      // Optional fuzzy catalog match
      const nameLower = rawName.toLowerCase();
      const matchedProd = catalogProducts.find(
        (p) =>
          p.name?.toLowerCase() === nameLower ||
          p.sku?.toLowerCase() === nameLower ||
          (nameLower.length >= 4 && p.name?.toLowerCase().includes(nameLower))
      );

      items.push({
        productId: matchedProd?.id || 'custom',
        name: matchedProd?.name || rawName,
        productName: matchedProd?.name || rawName,
        quantity: qty || 1,
        unit: unit || normalizeUnit(matchedProd?.unit || 'pc'),
        unitPrice: rate || Number(matchedProd?.sellingPrice || 0),
        lineTotal: lineTotal || Math.round((qty || 1) * (rate || Number(matchedProd?.sellingPrice || 0)) * 100) / 100,
      });
    }
  }

  const computedSub = items.reduce((s, it) => s + (Number(it.lineTotal) || 0), 0);
  if (!subtotal && computedSub > 0) subtotal = computedSub;
  if (!totalAmount && (subtotal > 0 || computedSub > 0)) {
    totalAmount = Math.max(0, (subtotal || computedSub) - discount);
  }
  const receiptAmount = documentType === 'money_receipt' ? (paidAmount || totalAmount || subtotal || 0) : 0;

  return {
    documentType,
    date,
    bookNumber,
    manualSerialNo,
    customerId: matchedCustomer?.id || matchedCustomer?._id || '',
    customerName,
    customerCompany,
    customerPhone,
    customerAddress,
    items,
    subtotal,
    discount,
    totalAmount,
    paidAmount: paidAmount || (documentType === 'money_receipt' ? receiptAmount : totalAmount),
    dueAmount,
    receiptAmount,
    rawText: normText,
  };
};
