/**
 * Secret Price Cipher & Multi-Tier Pricing Utility
 * 
 * Implements 4-tier pricing:
 * 1. Buying Price (ক্রয় মূল্য / কেনা খরচ)
 * 2. Staff Selling Price (স্টাফদের সর্বনিম্ন বিক্রয় সীমা)
 * 3. Manager Selling Price (ম্যানেজার বা পাইকারি বিক্রয় সীমা)
 * 4. Customer Selling Price (সাধারণ কাস্টমার / এমআরপি বিক্রয়মূল্য)
 * 
 * Supports Secret Encoding:
 * - Role Code: B45K · S80K · M90K · C100K
 * - 10-Letter Cipher: CK-IH-TH-BH (using BLACKSMITH: B=1,L=2,A=3,C=4,K=5,S=6,M=7,I=8,T=9,H=0)
 */

export const DEFAULT_CIPHER_KEY = 'BLACKSMITH';

/**
 * Format number into short K/Lakh representation or digits
 */
export const formatCompactPrice = (num) => {
  const n = Number(num) || 0;
  if (n <= 0) return '0';
  if (n >= 100000) {
    const val = (n / 100000).toFixed(1).replace(/\.0$/, '');
    return `${val}L`;
  }
  if (n >= 1000) {
    const val = (n / 1000).toFixed(1).replace(/\.0$/, '');
    return `${val}K`;
  }
  return String(n);
};

/**
 * Encodes a numeric price into a secret 10-letter cipher
 * Default keyword: B L A C K S M I T H
 * Mapping: 1=B, 2=L, 3=A, 4=C, 5=K, 6=S, 7=M, 8=I, 9=T, 0=H
 */
export const encodeToLetterCipher = (number, cipherKey = DEFAULT_CIPHER_KEY) => {
  const keyUpper = (cipherKey || DEFAULT_CIPHER_KEY).toUpperCase().padEnd(10, 'X');
  // map 0 to keyUpper[9] or keyUpper[0], standard mapping:
  // 1->key[0], 2->key[1], 3->key[2], 4->key[3], 5->key[4], 6->key[5], 7->key[6], 8->key[7], 9->key[8], 0->key[9]
  const digitMap = {
    '1': keyUpper[0] || 'B',
    '2': keyUpper[1] || 'L',
    '3': keyUpper[2] || 'A',
    '4': keyUpper[3] || 'C',
    '5': keyUpper[4] || 'K',
    '6': keyUpper[5] || 'S',
    '7': keyUpper[6] || 'M',
    '8': keyUpper[7] || 'I',
    '9': keyUpper[8] || 'T',
    '0': keyUpper[9] || 'H',
  };

  const n = Math.round(Number(number) || 0);
  if (n <= 0) return 'H';

  // Use compact thousands if > 1000 to keep sticker clean (e.g. 45000 -> 45k -> CK)
  let str = String(n);
  if (n >= 1000 && n % 1000 === 0) {
    str = String(n / 1000);
  }

  return str
    .split('')
    .map((char) => digitMap[char] || char)
    .join('');
};

/**
 * Generate full sticker price string based on selected display mode
 */
export const generateStickerPriceDisplay = ({
  buyingPrice = 0,
  staffPrice = 0,
  managerPrice = 0,
  customerPrice = 0,
  format = 'role_code', // 'role_code' | 'letter_cipher' | 'cust_with_code' | 'customer_only' | 'no_price'
  currencySymbol = '৳',
  cipherKey = DEFAULT_CIPHER_KEY,
}) => {
  const buy = Number(buyingPrice) || 0;
  const staff = Number(staffPrice) || Math.round(buy * 1.3);
  const manager = Number(managerPrice) || Math.round(buy * 1.5);
  const cust = Number(customerPrice) || Math.round(buy * 1.8);

  switch (format) {
    case 'letter_cipher': {
      // Secret Letter Cipher: e.g. CK-IH-TH-BH
      const cBuy = encodeToLetterCipher(buy, cipherKey);
      const cStaff = encodeToLetterCipher(staff, cipherKey);
      const cMgr = encodeToLetterCipher(manager, cipherKey);
      const cCust = encodeToLetterCipher(cust, cipherKey);
      return `COD: ${cBuy}-${cStaff}-${cMgr}-${cCust}`;
    }

    case 'cust_with_code': {
      // Customer Price visible, Secret Staff/Manager Code beside it
      const bCompact = formatCompactPrice(buy);
      const sCompact = formatCompactPrice(staff);
      const mCompact = formatCompactPrice(manager);
      return `${currencySymbol}${cust.toLocaleString()} [${bCompact}/${sCompact}/${mCompact}]`;
    }

    case 'customer_only': {
      // Traditional plain customer price only
      return `${currencySymbol}${cust.toLocaleString()}`;
    }

    case 'no_price': {
      return 'PRC: CODE ONLY';
    }

    case 'role_code':
    default: {
      // Standard Wholesale/Yards Role Code: B45K · S80K · M90K · C100K
      const bCode = `B${formatCompactPrice(buy)}`;
      const sCode = `S${formatCompactPrice(staff)}`;
      const mCode = `M${formatCompactPrice(manager)}`;
      const cCode = `C${formatCompactPrice(cust)}`;
      return `COD: ${bCode}·${sCode}·${mCode}·${cCode}`;
    }
  }
};

/**
 * Calculates recommended multi-tier prices from a single base buying cost
 */
export const calculateTierDefaults = (buyingCost = 0) => {
  const cost = Number(buyingCost) || 0;
  return {
    buyingPrice: cost,
    staffPrice: Math.round(cost * 1.3), // 30% margin baseline
    managerPrice: Math.round(cost * 1.5), // 50% margin wholesale/negotiation
    customerPrice: Math.round(cost * 1.8), // 80% margin retail quote
  };
};
