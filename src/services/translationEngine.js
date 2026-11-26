/**
 * StockLine Universal Translation Engine (অনুবাদ ইঞ্জিন)
 * -------------------------------------------------------------
 * Features:
 * 1. Normalized Bidirectional Lookup (English <-> Bengali <-> Avro/Banglish)
 * 2. Instant Curated ERP & Inventory Lexicon (500+ curated terms)
 * 3. Integrated Dictionary indexing (indexes TRANSLATIONS from translations.js)
 * 4. Dynamic Template & Regex Matcher (for dynamic counts, dates, IDs, codes)
 * 5. Online Google Translate Fallback Engine (auto-fetches unknown phrases)
 * 6. High-Performance Persistent LocalStorage Cache ('stockline_translation_cache')
 * 7. Reactive Event Dispatcher ('stockline:translation-updated') for zero-lag UI updates
 */

import { TRANSLATIONS } from '../utils/translations.js';
import { PUBLIC_TRANSLATIONS } from '../utils/publicTranslations.js';

const STORAGE_CACHE_KEY = 'stockline_translation_cache_v2';
const LEGACY_STORAGE_CACHE_KEY = 'stockline_translation_cache';
const MAX_ONLINE_CONCURRENCY = 4;

// Contextless single stop-words/fragments that must never be word-by-word machine translated
const ISOLATED_STOPWORDS = new Set([
  'to',
  'of',
  'from',
  'in',
  'on',
  'at',
  'by',
  'for',
  'with',
  'or',
  'and',
  'as',
  'is',
  'it',
  'be',
  'are',
  'was',
  'the',
  'a',
  'an',
  'left',
  'each',
  'new',
  'ago',
  'per',
  'entries',
  'results',
  'items',
  'item',
  'units',
  'bills',
  'quotes',
]);

const IDENTIFIER_KEY_RE = /^[a-z][a-z0-9]*(?:_[a-z0-9]+)+$/i;

const BN_INDEPENDENT_VOWELS = {
  অ: 'o', আ: 'a', ই: 'i', ঈ: 'i', উ: 'u', ঊ: 'u', ঋ: 'ri', এ: 'e', ঐ: 'oi', ও: 'o', ঔ: 'ou',
};
const BN_MATRAS = {
  '\u09BE': 'a', '\u09BF': 'i', '\u09C0': 'i', '\u09C1': 'u', '\u09C2': 'u',
  '\u09C3': 'ri', '\u09C7': 'e', '\u09C8': 'oi', '\u09CB': 'o', '\u09CC': 'ou',
};
const BN_CONSONANTS = {
  ক: 'k', খ: 'kh', গ: 'g', ঘ: 'gh', ঙ: 'ng',
  চ: 'ch', ছ: 'chh', জ: 'j', ঝ: 'jh', ঞ: 'n',
  ট: 't', ঠ: 'th', ড: 'd', ঢ: 'dh', ণ: 'n',
  ত: 't', থ: 'th', দ: 'd', ধ: 'dh', ন: 'n',
  প: 'p', ফ: 'f', ব: 'b', ভ: 'bh', ম: 'm',
  য: 'j', র: 'r', ল: 'l', শ: 'sh', ষ: 'sh', স: 's', হ: 'h',
  ড়: 'r', ঢ়: 'rh', য়: 'y', '\u09DC': 'r', '\u09DD': 'rh', '\u09DF': 'y',
};
const BN_SPECIAL_WORDS = {
  এবং: 'ebong', কিন্তু: 'kintu', জন্য: 'jonno', থেকে: 'theke', সাথে: 'sathe',
  দিয়ে: 'diye', দিয়ে: 'diye', করে: 'kore', করুন: 'korun', হবে: 'hobe', নেই: 'nei',
  আছে: 'achhe', সব: 'shob', সকল: 'shokol', নতুন: 'notun', পুরনো: 'purono', পুরানো: 'purano',
  খাতা: 'khata', অফলাইন: 'offline', অনলাইন: 'online', ডকুমেন্ট: 'document', হাব: 'hub',
  মেশিন: 'machine', পার্টস: 'parts', প্রাইস: 'price', লিস্ট: 'list', স্টক: 'stock',
  ইনভেন্টরি: 'inventory', ডাটাবেজ: 'database', ডাটাবেজে: 'database-e', ডাটাবেসে: 'database-e',
  কোটেশন: 'quotation', চালান: 'challan', মেমো: 'memo', ক্যাশ: 'cash', রিসিপ্ট: 'receipt',
  ইনভয়েস: 'invoice', কাস্টমার: 'customer', গ্রাহক: 'grahok', গ্রাহকের: 'grahoker',
  প্রতিষ্ঠান: 'protishthan', প্রতিষ্ঠানের: 'protishthaner', পণ্য: 'ponno', পণ্যের: 'ponnyer',
  তালিকা: 'talika', খুঁজুন: 'khujun', সার্চ: 'search', স্ক্যান: 'scan', ছবি: 'chhobi',
  আপলোড: 'upload', সেভ: 'save', প্রিন্ট: 'print', ফর্ম: 'form', ফর্মে: 'form-e',
  বকেয়া: 'bokeya', বাকি: 'baki', জমা: 'joma', পরিমাণ: 'poriman', একক: 'ekok',
  দর: 'dor', মূল্য: 'mullo', মোট: 'mot', সর্বমোট: 'shorbomot', টাকা: 'taka',
  তারিখ: 'tarikh', মোবাইল: 'mobile', নম্বর: 'nombor', নাম: 'nam', ঠিকানা: 'thikana',
  বিবরণ: 'biboron', মডেল: 'model', ধরন: 'dhoron', সিলিন্ডার: 'cylinder', অশ্বশক্তি: 'HP',
  অ্যাকশন: 'action', বাতিল: 'batil', মুছুন: 'muchhun', বিস্তারিত: 'bistarito', যুক্ত: 'jukto',
  হয়েছে: 'hoyeche', হয়নি: 'hoyni', পাওয়া: 'paoa', যায়নি: 'jayni', যোগ: 'jog',
  একটি: 'ekti', কমপক্ষে: 'kompokkhe', নির্ভুলতা: 'nirbhulota', উৎস: 'utso',
  বই: 'boi', সিরিয়াল: 'serial', ঐচ্ছিক: 'oichhik', চালু: 'chalu', বন্ধ: 'bondho',
};
const BN_DIGITS = { '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4', '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9' };

const isBanglaLetter = (ch) => /[\u0980-\u09FF]/.test(ch || '');

const transliterateBanglaWord = (word) => {
  if (!word) return '';
  if (BN_SPECIAL_WORDS[word]) return BN_SPECIAL_WORDS[word];

  let out = '';
  const chars = Array.from(word);
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    if (BN_DIGITS[ch] !== undefined) {
      out += BN_DIGITS[ch];
      continue;
    }
    if (ch === '।') {
      out += '.';
      continue;
    }
    if (BN_INDEPENDENT_VOWELS[ch]) {
      out += BN_INDEPENDENT_VOWELS[ch];
      continue;
    }
    if (ch === 'ৎ') {
      out += 't';
      continue;
    }
    if (ch === 'ং') {
      out += 'ng';
      continue;
    }
    if (ch === 'ঃ') {
      out += 'h';
      continue;
    }
    if (ch === 'ঁ' || ch === '\u09BC') {
      continue;
    }

    const base = BN_CONSONANTS[ch];
    if (!base) {
      out += BN_MATRAS[ch] || '';
      continue;
    }

    const next = chars[i + 1];
    // Special conjuncts: ক্ষ (k+s+sh -> kh/kkh) and জ্ঞ (j+g+n -> gg)
    if (ch === 'ক' && next === '\u09CD' && chars[i + 2] === 'ষ') {
      out += i === 0 ? 'kh' : 'kkh';
      i += 2;
      const post = chars[i + 1];
      if (BN_MATRAS[post]) {
        out += BN_MATRAS[post];
        i += 1;
      } else if (post && isBanglaLetter(post) && post !== '\u09CD') {
        out += 'o';
      }
      continue;
    }
    if (ch === 'জ' && next === '\u09CD' && chars[i + 2] === 'ঞ') {
      out += 'gg';
      i += 2;
      const post = chars[i + 1];
      if (BN_MATRAS[post]) {
        out += BN_MATRAS[post];
        i += 1;
      } else if (post && isBanglaLetter(post) && post !== '\u09CD') {
        out += 'o';
      }
      continue;
    }

    // Hasanta conjunct suppresses inherent vowel
    if (next === '\u09CD') {
      const joined = chars[i + 2];
      if (joined === 'য') {
        out += i === 0 ? `${base}y` : `${base}y`;
        i += 2;
        const post = chars[i + 1];
        if (BN_MATRAS[post]) {
          out += BN_MATRAS[post];
          i += 1;
        }
        continue;
      }
      out += base;
      i += 1; // Advance to hasanta so next iteration handles joined consonant
      continue;
    }

    // Consonant followed by vowel sign (matra)
    if (BN_MATRAS[next]) {
      out += base + BN_MATRAS[next];
      i += 1;
      continue;
    }

    // Bare consonant: keep inherent 'o' only before continuing Bengali letters
    const hasTrailingBn = next && isBanglaLetter(next);
    out += hasTrailingBn ? `${base}o` : base;
  }
  return out;
};

const transliterateBanglaToAvro = (text) => {
  if (!text || typeof text !== 'string') return text;
  const converted = text.replace(/[\u0980-\u09FF]+/g, (segment) => transliterateBanglaWord(segment));
  return converted.replace(/^[a-z]/, (c) => c.toUpperCase());
};

// Load persistent cache from LocalStorage (purge poisoned v1 fragment & raw identifier caches)
const loadPersistentCache = () => {
  try {
    if (localStorage.getItem(LEGACY_STORAGE_CACHE_KEY)) {
      localStorage.removeItem(LEGACY_STORAGE_CACHE_KEY);
    }
    const raw = localStorage.getItem(STORAGE_CACHE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    let mutated = false;
    for (const cacheKey of Object.keys(parsed)) {
      const sep = cacheKey.indexOf(':');
      const term = sep >= 0 ? cacheKey.slice(sep + 1) : cacheKey;
      if (IDENTIFIER_KEY_RE.test(term)) {
        delete parsed[cacheKey];
        mutated = true;
      }
    }
    if (mutated) {
      localStorage.setItem(STORAGE_CACHE_KEY, JSON.stringify(parsed));
    }
    return parsed;
  } catch {
    return {};
  }
};

// Save persistent cache
const savePersistentCache = (cache) => {
  try {
    localStorage.setItem(STORAGE_CACHE_KEY, JSON.stringify(cache));
  } catch {}
};

class TranslationEngineService {
  constructor() {
    this.memoryCache = loadPersistentCache();
    this.lexicon = new Map();
    this.pendingFetches = new Set();
    this.fetchQueue = [];
    this.activeFetches = 0;
    this.listeners = new Set();

    this.initCuratedLexicon();
    this.indexBaseTranslations();
  }

  /**
   * Clean and normalize text for uniform lookup
   */
  normalizeKey(text) {
    if (typeof text !== 'string') return '';
    return text
      .trim()
      .toLowerCase()
      .replace(/[\r\n\t]+/g, ' ')
      .replace(/\s+/g, ' ');
  }

  /**
   * Subscribe to async translation updates
   */
  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notifyListeners(key, translatedText, targetLang) {
    this.listeners.forEach((fn) => {
      try {
        fn(key, translatedText, targetLang);
      } catch (err) {
        console.error('Translation listener error:', err);
      }
    });

    try {
      window.dispatchEvent(
        new CustomEvent('stockline:translation-updated', {
          detail: { key, translatedText, targetLang },
        })
      );
    } catch {}
  }

  /**
   * Populate high-priority curated business terms
   */
  initCuratedLexicon() {
    const curated = [
      // Settings & Configuration
      {
        en: 'System Preferences & Configuration',
        bn: 'সিস্টেম প্রেফারেন্স ও কনফিগারেশন',
        obro: 'System Preferences & Configuration',
      },
      {
        en: 'Customize currency formatting, regional information, automated stock deduction policy, and backups.',
        bn: 'মুদ্রা ফরম্যাট, আঞ্চলিক তথ্য, স্টক হ্রাস নীতি এবং ডেটা ব্যাকআপ কাস্টমাইজ করুন।',
        obro: 'Currency formatting, regional totho, stock deduction policy ebong backup configure korun.',
      },
      {
        en: 'Business Profile',
        bn: 'প্রতিষ্ঠানের বিবরণ (বিজনেস প্রোফাইল)',
        obro: 'Business Profile',
      },
      {
        en: 'Information displayed on printable receipts and invoices',
        bn: 'ক্যাশ মেমো, চালান ও প্রিন্ট ডকুমেন্টে প্রদর্শিত প্রাতিষ্ঠানিক তথ্য',
        obro: 'Printable receipts o invoice-e prodorshito totho',
      },
      {
        en: 'Company Name (Bangla)',
        bn: 'প্রতিষ্ঠানের নাম (বাংলা)',
        obro: 'Protishthaner Nam (Bangla)',
      },
      {
        en: 'Company Name (English)',
        bn: 'প্রতিষ্ঠানের নাম (ইংরেজি)',
        obro: 'Company Name (English)',
      },
      {
        en: 'Proprietor Name (Bangla)',
        bn: 'স্বত্বাধিকারী / প্রোপ্রাইটর (বাংলা)',
        obro: 'Shottadhikari / Proprietor (Bangla)',
      },
      {
        en: 'Proprietor Name (English)',
        bn: 'স্বত্বাধিকারী / প্রোপ্রাইটর (ইংরেজি)',
        obro: 'Proprietor Name (English)',
      },
      {
        en: 'Official Contact Phone',
        bn: 'যোগাযোগের মোবাইল / ফোন',
        obro: 'Mobile / Phone Number',
      },
      {
        en: 'Official Business Email',
        bn: 'অফিসিয়াল ইমেইল',
        obro: 'Official Email Address',
      },
      {
        en: 'BIN / VAT Reg. Number',
        bn: 'BIN / ভ্যাট নিবন্ধন নম্বর',
        obro: 'BIN / VAT Number',
      },
      {
        en: 'Facility Address (Bangla)',
        bn: 'প্রতিষ্ঠানের ঠিকানা (বাংলা)',
        obro: 'Protishthaner Thikana (Bangla)',
      },
      {
        en: 'Facility Address (English)',
        bn: 'প্রতিষ্ঠানের ঠিকানা (ইংরেজি)',
        obro: 'Facility Address (English)',
      },
      {
        en: 'Business Scope & Goods Description (Bangla)',
        bn: 'ব্যবসার বিবরণী ও পণ্যের পরিধি (বাংলা)',
        obro: 'Business Scope / Ponner Poridhi (Bangla)',
      },
      {
        en: 'Business Scope & Goods Description (English)',
        bn: 'ব্যবসার বিবরণী ও পণ্যের পরিধি (ইংরেজি)',
        obro: 'Business Scope & Goods Description (English)',
      },
      {
        en: 'Sales Terms & Notice (Bangla)',
        bn: 'বিক্রয় শর্ত ও নোটিশ (বাংলা)',
        obro: 'Bikroy Shortho o Notice (Bangla)',
      },
      {
        en: 'Return Policy / Disclaimer (English)',
        bn: 'রিটার্ন পলিসি ও ডিসক্লেইমার (ইংরেজি)',
        obro: 'Return Policy / Disclaimer (English)',
      },
      {
        en: 'Default Document Print Language',
        bn: 'ডিফল্ট প্রিন্ট ভাষা',
        obro: 'Default Print Language',
      },
      {
        en: 'Currency & Inventory Thresholds',
        bn: 'মুদ্রা ও ইনভেন্টরি সীমা (Currency & Inventory)',
        obro: 'Currency & Inventory Thresholds',
      },
      {
        en: 'System Currency',
        bn: 'সিস্টেমের মুদ্রা (System Currency)',
        obro: 'System Currency',
      },
      {
        en: 'Default Low Stock Threshold',
        bn: 'ডিফল্ট লো-স্টক সতর্কবার্তা সীমা',
        obro: 'Default Low Stock Threshold',
      },
      {
        en: 'Storefront Order Stock Deduction Policy',
        bn: 'অনলাইন অর্ডারে স্টক কর্তন নীতি',
        obro: 'Online Order Stock Deduction Policy',
      },
      {
        en: 'Alerts & Appearance',
        bn: 'অ্যালার্ট ও থিম ডিসপ্লে (Alerts & Appearance)',
        obro: 'Alerts & Theme Appearance',
      },
      {
        en: 'Theme Mode',
        bn: 'থিম মোড (Theme Mode)',
        obro: 'Theme Mode',
      },
      {
        en: 'Enable top notification bell alerts',
        bn: 'উপরের নোটিফিকেশন বেল অ্যালার্ট চালু রাখুন',
        obro: 'Top notification bell alert chalu rakhun',
      },
      {
        en: 'Show low-stock warnings in overview widgets',
        bn: 'ওভারভিউ উইজেটে লো-স্টক সতর্কবার্তা প্রদর্শন করুন',
        obro: 'Overview widget-e low-stock warning dekhaben',
      },
      {
        en: 'Save Preferences',
        bn: 'সেটিংস সংরক্ষণ করুন',
        obro: 'Settings Save Korun',
      },
      {
        en: 'MERN Stack API Server (Express.js & MongoDB)',
        bn: 'মার্ন স্ট্যাক এপিআই সার্ভার (Express.js ও MongoDB)',
        obro: 'MERN Stack API Server (Express.js & MongoDB)',
      },
      {
        en: 'API Base URL',
        bn: 'এপিআই বেস ইউআরএল',
        obro: 'API Base URL',
      },
      {
        en: 'Database Engine',
        bn: 'ডাটাবেজ ইঞ্জিন',
        obro: 'Database Engine',
      },
      {
        en: 'Server Process',
        bn: 'সার্ভার প্রসেস',
        obro: 'Server Process',
      },
      {
        en: 'Test API Connection',
        bn: 'এপিআই সংযোগ পরীক্ষা করুন',
        obro: 'Test API Connection',
      },
      {
        en: 'Demo Data Management (LocalStorage)',
        bn: 'ডেমো ডেটা ব্যবস্থাপনা (ব্যাকআপ ও রিসেট)',
        obro: 'Demo Data Babosthapona (Backup & Reset)',
      },
      {
        en: 'Export Backup (JSON)',
        bn: 'ব্যাকআপ এক্সপোর্ট (JSON)',
        obro: 'Export Backup (JSON)',
      },
      {
        en: 'Import Backup',
        bn: 'ব্যাকআপ ইম্পোর্ট করুন',
        obro: 'Import Backup',
      },
      {
        en: 'Reset All Demo Data',
        bn: 'সকল ডেমো ডেটা রিসেট করুন',
        obro: 'Shokol Demo Data Reset Korun',
      },

      // User Roles & Permissions
      {
        en: 'User Roles & Permissions',
        bn: 'ইউজার রোল ও পারমিশন ব্যবস্থাপনা',
        obro: 'User Roles & Access Permissions',
      },
      {
        en: 'Configure simulated administrative personas and access privileges.',
        bn: 'সিস্টেমের প্রশাসনিক ভূমিকা, কর্মী অ্যাক্সেস এবং অধিকার কনফিগার করুন।',
        obro: 'Administrative persona ebong access privileges configure korun.',
      },
      {
        en: 'Reset Demo Accounts',
        bn: 'ডেমো অ্যাকাউন্ট রিসেট',
        obro: 'Reset Demo Accounts',
      },
      {
        en: 'Add Demo User',
        bn: 'নতুন ইউজার যোগ করুন',
        obro: 'Add Demo User',
      },
      {
        en: 'Search by user name, email, or department...',
        bn: 'ব্যবহারকারীর নাম, ইমেইল বা বিভাগ দিয়ে খুঁজুন...',
        obro: 'Search by user name, email, or department...',
      },
      {
        en: 'All Roles',
        bn: 'সকল রোল',
        obro: 'Shokol Roles',
      },
      {
        en: 'User',
        bn: 'ব্যবহারকারী',
        obro: 'User',
      },
      {
        en: 'Role',
        bn: 'রোল / ভূমিকা',
        obro: 'Role',
      },
      {
        en: 'Department',
        bn: 'বিভাগ / দায়িত্ব',
        obro: 'Department',
      },
      {
        en: 'Registered',
        bn: 'নিবন্ধন তারিখ',
        obro: 'Registered',
      },
      {
        en: 'Status',
        bn: 'অবস্থা',
        obro: 'Status',
      },
      {
        en: 'Actions',
        bn: 'অ্যাকশন',
        obro: 'Actions',
      },
      {
        en: 'Admin (Full Access)',
        bn: 'অ্যাডমিন (সকল ক্ষমতা)',
        obro: 'Admin (Full Access)',
      },
      {
        en: 'Manager (Operations & Reports)',
        bn: 'ম্যানেজার (অপারেশন ও রিপোর্ট)',
        obro: 'Manager (Operations & Reports)',
      },
      {
        en: 'Staff (POS & Customer Sales)',
        bn: 'স্টাফ (পিওএস ও বিক্রয় কাউন্টার)',
        obro: 'Staff (POS & Customer Sales)',
      },
      {
        en: 'Customer (Storefront & My Orders)',
        bn: 'গ্রাহক (অনলাইন শপ ও অর্ডার)',
        obro: 'Customer (Storefront & My Orders)',
      },
      {
        en: 'Full Name',
        bn: 'পূর্ণ নাম',
        obro: 'Full Name',
      },
      {
        en: 'Email Address',
        bn: 'ইমেইল ঠিকানা',
        obro: 'Email Address',
      },
      {
        en: 'Assigned Demo Role',
        bn: 'নির্ধারিত ভূমিকা (Role)',
        obro: 'Assigned Demo Role',
      },
      {
        en: 'Department / Assignment',
        bn: 'বিভাগ / দায়িত্বের ক্ষেত্র',
        obro: 'Department / Assignment',
      },
      {
        en: 'Account Status',
        bn: 'অ্যাকাউন্ট স্ট্যাটাস',
        obro: 'Account Status',
      },

      // Customer Storefront Orders
      {
        en: 'Customer Storefront Orders',
        bn: 'কাস্টমার অনলাইন অর্ডার',
        obro: 'Customer Online Orders',
      },
      {
        en: 'Fulfill online customer orders with automated single stock reservation and tracking.',
        bn: 'স্বয়ংক্রিয় একক স্টক রিজার্ভেশন এবং ট্র্যাকিং সহ অনলাইন গ্রাহকদের অর্ডার পরিচালনা করুন।',
        obro: 'Automated stock reservation shoho online orders fulfill korun.',
      },
      {
        en: 'Refresh',
        bn: 'রিফ্রেশ',
        obro: 'Refresh',
      },
      {
        en: 'Export CSV',
        bn: 'এক্সপোর্ট CSV',
        obro: 'Export CSV',
      },
      {
        en: 'Visit Storefront',
        bn: 'অনলাইন শপ দেখুন',
        obro: 'Online Shop Dekhun',
      },
      {
        en: 'Search by order number, customer name, or email...',
        bn: 'অর্ডার নম্বর, গ্রাহকের নাম বা ইমেইল দিয়ে অনুসন্ধান করুন...',
        obro: 'Order number, customer name ba email diye search korun...',
      },
      {
        en: 'All Order Statuses',
        bn: 'সকল অর্ডার অবস্থা',
        obro: 'All Order Statuses',
      },
      {
        en: 'Pending',
        bn: 'অপেক্ষমান (Pending)',
        obro: 'Pending',
      },
      {
        en: 'Confirmed (Stock Reserved)',
        bn: 'নিশ্চিতকৃত (Confirmed - স্টক সংরক্ষিত)',
        obro: 'Confirmed (Stock Reserved)',
      },
      {
        en: 'Processing (Warehouse Packaging)',
        bn: 'প্রক্রিয়াকরণ চলছে (Processing)',
        obro: 'Processing',
      },
      {
        en: 'Ready (Out for Delivery)',
        bn: 'ডেলিভারির জন্য প্রস্তুত (Ready)',
        obro: 'Ready (Out for Delivery)',
      },
      {
        en: 'Completed (Delivered)',
        bn: 'সম্পন্ন / ডেলিভার্ড (Completed)',
        obro: 'Completed (Delivered)',
      },
      {
        en: 'Cancelled (Stock Restored)',
        bn: 'বাতিলকৃত (Cancelled - স্টক ফেরত)',
        obro: 'Cancelled (Stock Restored)',
      },
      {
        en: 'Order #',
        bn: 'অর্ডার নং',
        obro: 'Order #',
      },
      {
        en: 'Customer',
        bn: 'গ্রাহক',
        obro: 'Customer',
      },
      {
        en: 'Date',
        bn: 'তারিখ',
        obro: 'Date',
      },
      {
        en: 'Items',
        bn: 'আইটেম',
        obro: 'Items',
      },
      {
        en: 'Total Amount',
        bn: 'মোট মূল্য',
        obro: 'Total Amount',
      },
      {
        en: 'Payment',
        bn: 'পেমেন্ট',
        obro: 'Payment',
      },
      {
        en: 'Quick Action',
        bn: 'অ্যাকশন',
        obro: 'Quick Action',
      },
      {
        en: 'PAID',
        bn: 'পরিশোধিত',
        obro: 'PAID',
      },
      {
        en: 'DUE',
        bn: 'বকেয়া',
        obro: 'DUE',
      },
      {
        en: 'ACTIVE',
        bn: 'সক্রিয়',
        obro: 'ACTIVE',
      },
      {
        en: 'INACTIVE',
        bn: 'নিষ্ক্রিয়',
        obro: 'INACTIVE',
      },

      // Common Form Actions & Buttons
      {
        en: 'Save Changes',
        bn: 'আপডেট সংরক্ষণ করুন',
        obro: 'Save Changes',
      },
      {
        en: 'Create User',
        bn: 'ইউজার তৈরি করুন',
        obro: 'Create User',
      },
      {
        en: 'Cancel',
        bn: 'বাতিল',
        obro: 'Cancel',
      },
      {
        en: 'Delete',
        bn: 'মুছে ফেলুন',
        obro: 'Delete',
      },
      {
        en: 'Edit',
        bn: 'সম্পাদনা',
        obro: 'Edit',
      },
      {
        en: 'Save',
        bn: 'সংরক্ষণ',
        obro: 'Save',
      },
      {
        en: 'Subtotal',
        bn: 'উপমোট (Subtotal)',
        obro: 'Subtotal',
      },
      {
        en: 'Net Payable',
        bn: 'নিট মূল্য (Net Payable)',
        obro: 'Net Payable',
      },
      {
        en: 'Paid',
        bn: 'জমা / নগদ প্রাপ্তি',
        obro: 'Paid',
      },
      {
        en: 'Balance Due',
        bn: 'বাকী / বকেয়া',
        obro: 'Balance Due',
      },
      {
        en: 'Discount Applied',
        bn: 'ছাড় / ডিসকাউন্ট',
        obro: 'Discount Applied',
      },
      {
        en: 'Grand Total',
        bn: 'সর্বমোট প্রদেয়',
        obro: 'Grand Total',
      },
      {
        en: 'Print Invoice / Challan',
        bn: 'প্রিন্ট মেমো / চালান',
        obro: 'Print Invoice / Challan',
      },
      {
        en: 'Complete Sale Now',
        bn: 'এখনই সম্পন্ন করুন',
        obro: 'Complete Sale Now',
      },
      {
        en: 'Cancel Invoice',
        bn: 'ইনভয়েস বাতিল করুন',
        obro: 'Cancel Invoice',
      },
      {
        en: 'Update Invoice',
        bn: 'ইনভয়েস আপডেট করুন',
        obro: 'Update Invoice',
      },
      {
        en: 'Record Sale / POS Invoice',
        bn: 'নতুন বিক্রয় চালান (POS)',
        obro: 'Record Sale / POS Invoice',
      },
      {
        en: 'Back to Sales List',
        bn: 'বিক্রয় তালিকায় ফিরে যান',
        obro: 'Back to Sales List',
      },
      {
        en: 'Back to Products',
        bn: 'পণ্য তালিকায় ফিরে যান',
        obro: 'Back to Products',
      },
      {
        en: 'Print Barcode Label',
        bn: 'প্রিন্ট বারকোড লেবেল',
        obro: 'Print Barcode Label',
      },
      {
        en: 'Edit Product',
        bn: 'পণ্য সম্পাদনা (Edit)',
        obro: 'Edit Product',
      },
      {
        en: 'Delete Product',
        bn: 'পণ্য মুছুন',
        obro: 'Delete Product',
      },
      {
        en: 'Back to Customers List',
        bn: 'গ্রাহক তালিকায় ফিরে যান',
        obro: 'Back to Customers List',
      },
      {
        en: 'Create Quotation',
        bn: 'নতুন দরপত্র (Quotation)',
        obro: 'Create Quotation',
      },
      {
        en: 'Record New Sale',
        bn: 'নতুন বিক্রয় (Record Sale)',
        obro: 'Record New Sale',
      },
      {
        en: 'Back to Suppliers',
        bn: 'সরবরাহকারী তালিকায় ফিরে যান',
        obro: 'Back to Suppliers',
      },
      {
        en: 'Create Purchase Order',
        bn: 'নতুন ক্রয় অর্ডার (PO)',
        obro: 'Create Purchase Order',
      },
      {
        en: 'Page Not Found',
        bn: 'পৃষ্ঠাটি পাওয়া যায়নি',
        obro: 'Page Not Found',
      },
      {
        en: 'Return to Dashboard',
        bn: 'ড্যাশবোর্ডে ফিরে যান',
        obro: 'Dashboard-e Jan',
      },
      // Machine & Parts Price Catalog & Spec Box
      {
        en: 'Machine & Price List',
        bn: 'মেশিন ও প্রাইস লিস্ট',
        obro: 'Machine o Price List',
      },
      {
        en: 'Offline Ledger (OCR)',
        bn: 'খাতা ও অফলাইন (OCR)',
        obro: 'Khata o Offline (OCR)',
      },
      {
        en: 'Machine & Parts Price Intelligence',
        bn: 'মেশিন ও পার্টস প্রাইস ইন্টেলিজেন্স',
        obro: 'Machine o Parts Price Intelligence',
      },
      {
        en: 'Machine, Specifications & Parts Price List',
        bn: 'মেশিন, স্পেসিফিকেশন ও পার্টস প্রাইস লিস্ট',
        obro: 'Machine, Spec o Parts Price List',
      },
      {
        en: 'Sync Past Quotes & Sales',
        bn: 'পূর্বের কোটেশন/বিক্রয় সিঙ্ক করুন',
        obro: 'Purber Quotation/Sales Sync Korun',
      },
      {
        en: '+ Add New Part & Price',
        bn: '+ নতুন পার্টস ও দাম যোগ করুন',
        obro: '+ Notun Parts o Dam Jog Korun',
      },
      {
        en: 'Total Price Entries',
        bn: 'মোট প্রাইস এন্ট্রি',
        obro: 'Mot Price Entry',
      },
      {
        en: 'Not in Stock (Price List Only)',
        bn: 'স্টক এন্ট্রি নেই (শুধু প্রাইস লিস্ট)',
        obro: 'Stock Entry Nei (Shudhu Price List)',
      },
      {
        en: 'Linked to Stock Inventory',
        bn: 'স্টক ইনভেন্টরির সাথে যুক্ত',
        obro: 'Stock Inventory-r Sathe Jukto',
      },
      {
        en: 'Registered Machine Types',
        bn: 'নিবন্ধিত মেশিনের ধরন',
        obro: 'Nibondhito Machine Dhoron',
      },
      {
        en: 'All Machines / Brands',
        bn: 'সব মেশিন / ব্র্যান্ড',
        obro: 'Shob Machine / Brand',
      },
      {
        en: 'All Sources & Statuses',
        bn: 'সব উৎস ও স্ট্যাটাস',
        obro: 'Shob Utso o Status',
      },
      {
        en: 'Price List Only (Not in Stock)',
        bn: 'শুধু প্রাইস লিস্ট (স্টকে এন্ট্রি নেই)',
        obro: 'Shudhu Price List (Stock Nei)',
      },
      {
        en: 'Linked to Stock Products',
        bn: 'স্টক প্রোডাক্টে যুক্ত আছে',
        obro: 'Stock Product-e Jukto Achhe',
      },
      {
        en: 'From Quotation',
        bn: 'কোটেশন থেকে পাওয়া',
        obro: 'Quotation Theke Paoa',
      },
      {
        en: 'From Sale / Challan',
        bn: 'বিক্রয় / চালান থেকে পাওয়া',
        obro: 'Bikroy / Challan Theke Paoa',
      },
      {
        en: 'Part / Product Name',
        bn: 'পার্টস / পণ্যের নাম',
        obro: 'Parts / Ponnyer Nam',
      },
      {
        en: 'Machine & Technical Spec',
        bn: 'মেশিন ও টেকনিক্যাল স্পেক',
        obro: 'Machine o Technical Spec',
      },
      {
        en: 'Rate / Price History',
        bn: 'দর / প্রাইস ইতিহাস',
        obro: 'Dor / Price Itihas',
      },
      {
        en: 'Last Source & Date',
        bn: 'শেষ উৎস ও তারিখ',
        obro: 'Shesh Utso o Tarikh',
      },
      {
        en: 'Actions',
        bn: 'অ্যাকশন',
        obro: 'Action',
      },
      {
        en: 'Add to Product Database',
        bn: 'প্রোডাক্ট ডাটাবেজে যোগ করুন',
        obro: 'Product Database-e Jog Korun',
      },
      {
        en: 'Create Quotation at This Price',
        bn: 'এই দামে কোটেশন বানান',
        obro: 'Ei Dame Quotation Banan',
      },
      {
        en: 'Create Cash Memo at This Price',
        bn: 'এই দামে ক্যাশ মেমো বানান',
        obro: 'Ei Dame Cash Memo Banan',
      },
      {
        en: 'Save to Price List',
        bn: 'প্রাইস লিস্টে সেভ করুন',
        obro: 'Price List-e Save Korun',
      },
      {
        en: 'Not in Stock',
        bn: 'স্টকে এন্ট্রি নেই',
        obro: 'Stock-e Entry Nei',
      },
      {
        en: '+ Add to Products',
        bn: '+ প্রোডাক্টে নিন',
        obro: '+ Product-e Nin',
      },
      {
        en: 'Machine & Technical Specification Box (Machine Profile)',
        bn: 'মেশিন ও টেকনিক্যাল স্পেসিফিকেশন বক্স (Machine Profile)',
        obro: 'Machine & Technical Specification Box (Machine Profile)',
      },
      {
        en: 'Saves to Price List',
        bn: 'প্রাইস লিস্টে সেভ হয়',
        obro: 'Price List-e Save Hoy',
      },
      {
        en: 'Every part and rate from quotations or sales of this machine auto-saves to the Price List',
        bn: 'প্রতিটি কোটেশন ও বিক্রয় থেকে এই মেশিনের পার্টস ও দর প্রাইস লিস্টে সেভ হবে',
        obro: 'Protiti Quotation o Sale theke ei Machine-er Parts o Dor Price List-e save hobe',
      },
      {
        en: 'Price List Save: ON',
        bn: 'প্রাইস লিস্ট সেভ: চালু',
        obro: 'Price List Save: ON',
      },
      {
        en: 'Price List Save: OFF',
        bn: 'প্রাইস লিস্ট সেভ: বন্ধ',
        obro: 'Price List Save: OFF',
      },
      {
        en: '⚡ Select Past Machine...',
        bn: '⚡ আগের মেশিন বাছুন...',
        obro: '⚡ Ager Machine Bachhun...',
      },
      {
        en: 'Clear Machine Info',
        bn: 'মেশিন তথ্য মুছুন',
        obro: 'Machine Totho Muchhun',
      },
      {
        en: 'Machine & Parts Price Search (Stock + Past Quotes & Sales)',
        bn: 'মেশিন ও পার্টস প্রাইস সার্চ (স্টক + পূর্বের কোটেশন ও বিক্রয়)',
        obro: 'Machine o Parts Price Search (Stock + Quotes & Sales)',
      },
      {
        en: 'Not in Stock · Price List',
        bn: 'স্টক এন্ট্রি নেই · প্রাইস লিস্ট',
        obro: 'Stock Entry Nei · Price List',
      },
      {
        en: 'Latest Rate',
        bn: 'সর্বশেষ দর',
        obro: 'Shorboshesh Dor',
      },
      // Offline Khata & OCR Hub
      {
        en: 'Smart OCR + Khata Register',
        bn: 'স্মার্ট OCR + খাতা রেজিস্টার',
        obro: 'Smart OCR + Khata Register',
      },
      {
        en: 'Photos Not Stored (Zero Image Storage)',
        bn: 'ছবি স্টোরেজে সেভ হয় না (Zero Image Storage)',
        obro: 'Chhobi Storage-e Save Hoy Na (Zero Image Storage)',
      },
      {
        en: 'Old Khata & Offline Document Hub',
        bn: 'পুরনো খাতা ও অফলাইন ডকুমেন্ট হাব',
        obro: 'Purono Khata o Offline Document Hub',
      },
      {
        en: 'Khata Bill / Challan',
        bn: 'খাতা বিল/চালান',
        obro: 'Khata Bill / Challan',
      },
      {
        en: 'Khata Quotation',
        bn: 'খাতা কোটেশন',
        obro: 'Khata Quotation',
      },
      {
        en: 'Money Receipt Collection',
        bn: 'মানি রিসিপ্ট আদায়',
        obro: 'Money Receipt Aday',
      },
      {
        en: 'Photo Scan & Single Entry',
        bn: 'ছবি স্ক্যান ও একক এন্ট্রি',
        obro: 'Chhobi Scan o Ekok Entry',
      },
      {
        en: 'Bulk Khata Register',
        bn: 'বাল্ক খাতা রেজিস্টার',
        obro: 'Bulk Khata Register',
      },
      {
        en: 'Khata / Hardcopy Photo Scanner (OCR)',
        bn: 'খাতা / হার্ডকপির ছবি স্ক্যানার (OCR)',
        obro: 'Khata / Hardcopy Photo Scanner (OCR)',
      },
      {
        en: 'Capture with Camera',
        bn: 'ক্যামেরা দিয়ে তুলুন',
        obro: 'Camera Diye Tulun',
      },
      {
        en: 'Upload Photo',
        bn: 'ছবি আপলোড',
        obro: 'Chhobi Upload',
      },
      {
        en: 'Remove Photo',
        bn: 'ছবি সরান',
        obro: 'Chhobi Shoran',
      },
      {
        en: 'Re-scan',
        bn: 'পুনরায় স্ক্যান',
        obro: 'Punoray Scan',
      },
      {
        en: 'Fill Form',
        bn: 'ফর্মে বসান',
        obro: 'Form-e Bosan',
      },
      {
        en: 'Verify Document Type & Details',
        bn: 'ডকুমেন্টের ধরন ও তথ্য যাচাই করুন',
        obro: 'Document-er Dhoron o Totho Jachai Korun',
      },
      {
        en: 'Old Khata',
        bn: 'পুরনো খাতা',
        obro: 'Purono Khata',
      },
      {
        en: 'Offline',
        bn: 'অফলাইন',
        obro: 'Offline',
      },
      {
        en: 'Customer / Party Info',
        bn: 'গ্রাহক / পার্টির তথ্য',
        obro: 'Grahok / Party Totho',
      },
      {
        en: 'Products & Items List',
        bn: 'পণ্য ও বিবরণের তালিকা',
        obro: 'Ponno o Biboroner Talika',
      },
      {
        en: 'Search Price List',
        bn: 'প্রাইস লিস্ট খুঁজুন',
        obro: 'Price List Khujun',
      },
      {
        en: '+ New Line',
        bn: '+ নতুন লাইন',
        obro: '+ Notun Line',
      },
      {
        en: 'Save',
        bn: 'সেভ করুন',
        obro: 'Save Korun',
      },
      {
        en: 'Save & Print / PDF',
        bn: 'সেভ ও প্রিন্ট / PDF',
        obro: 'Save & Print / PDF',
      },
      {
        en: 'Save All Rows to Database',
        bn: 'সব সারি ডাটাবেসে সেভ করুন',
        obro: 'Shob Sari Database-e Save Korun',
      },
      {
        en: 'Print / PDF',
        bn: 'প্রিন্ট / PDF',
        obro: 'Print / PDF',
      },
      {
        en: 'Details',
        bn: 'বিস্তারিত',
        obro: 'Bistarito',
      },
      {
        en: 'Delete',
        bn: 'মুছে ফেলুন',
        obro: 'Muchhe Felun',
      },
      {
        en: 'Cancel',
        bn: 'বাতিল',
        obro: 'Batil',
      },
    ];

    curated.forEach((item) => {
      this.registerEntry(item);
    });
    if (Array.isArray(PUBLIC_TRANSLATIONS)) {
      PUBLIC_TRANSLATIONS.forEach((item) => {
        this.registerEntry(item);
      });
    }
  }

  /**
   * Index all entries from base translations.js
   */
  indexBaseTranslations() {
    if (!TRANSLATIONS || typeof TRANSLATIONS !== 'object') return;

    Object.entries(TRANSLATIONS).forEach(([key, val]) => {
      if (val && typeof val === 'object') {
        this.registerEntry(val, key);
      }
    });
  }

  /**
   * Register a translation entry into internal map
   */
  registerEntry(entry, keyId = null) {
    if (keyId) {
      this.lexicon.set(this.normalizeKey(keyId), entry);
    }
    if (entry.en) {
      this.lexicon.set(this.normalizeKey(entry.en), entry);
    }
    if (entry.bn) {
      this.lexicon.set(this.normalizeKey(entry.bn), entry);
    }
    if (entry.obro) {
      const obroKey = this.normalizeKey(entry.obro);
      if (obroKey && !this.lexicon.has(obroKey)) {
        this.lexicon.set(obroKey, entry);
      }
    }
  }

  hasBangla(text) {
    return /[\u0980-\u09FF]/.test(String(text || ''));
  }

  /**
   * Process concurrency-limited online translation queue
   */
  drainFetchQueue() {
    while (this.activeFetches < MAX_ONLINE_CONCURRENCY && this.fetchQueue.length > 0) {
      const task = this.fetchQueue.shift();
      this.activeFetches += 1;
      task().finally(() => {
        this.activeFetches = Math.max(0, this.activeFetches - 1);
        this.drainFetchQueue();
      });
    }
  }

  /**
   * Asynchronously fetch translation from Google Translate public API (throttled & cached)
   */
  fetchOnlineTranslation(text, targetLang) {
    const norm = this.normalizeKey(text);
    if (!norm || IDENTIFIER_KEY_RE.test(norm)) {
      return Promise.resolve(text);
    }
    const cacheKey = `${targetLang}:${norm}`;
    const apiTarget = targetLang === 'en' ? 'en' : 'bn';
    const bnCacheKey = `bn:${norm}`;

    if (this.memoryCache[cacheKey]) {
      return Promise.resolve(this.memoryCache[cacheKey]);
    }

    // Reuse cached Bangla translation cleanly when formatting Banglish ('obro')
    if (targetLang === 'obro' && this.memoryCache[bnCacheKey]) {
      const bnVal = this.memoryCache[bnCacheKey];
      const combined = bnVal !== text ? `${bnVal} (${text})` : text;
      this.memoryCache[cacheKey] = combined;
      savePersistentCache(this.memoryCache);
      this.notifyListeners(text, combined, targetLang);
      return Promise.resolve(combined);
    }

    if (this.pendingFetches.has(cacheKey)) {
      return Promise.resolve(text);
    }

    this.pendingFetches.add(cacheKey);

    return new Promise((resolve) => {
      const runFetch = async () => {
        try {
          const sourceLang = apiTarget === 'en' ? 'bn' : 'en';
          const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${apiTarget}&dt=t&q=${encodeURIComponent(
            text
          )}`;

          const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data?.[0])) {
              const joined = data[0]
                .map((seg) => (Array.isArray(seg) && typeof seg[0] === 'string' ? seg[0] : ''))
                .join('')
                .trim();

              if (joined) {
                if (apiTarget === 'bn') {
                  this.memoryCache[bnCacheKey] = joined;
                }
                const finalValue =
                  targetLang === 'obro' && joined !== text ? `${joined} (${text})` : joined;

                this.memoryCache[cacheKey] = finalValue;
                savePersistentCache(this.memoryCache);
                this.notifyListeners(text, finalValue, targetLang);
                resolve(finalValue);
                return;
              }
            }
          }
        } catch {
          // Offline fallback: graceful degradation
        } finally {
          this.pendingFetches.delete(cacheKey);
        }
        resolve(text);
      };

      this.fetchQueue.push(runFetch);
      this.drainFetchQueue();
    });
  }

  /**
   * Main Translation Function (Translate string or object)
   */
  translate(input, targetLang = 'bn', fallback = '', { allowOnline = true } = {}) {
    if (input === null || input === undefined) return fallback || '';

    // If input is an object with { bn, en, obro }
    if (typeof input === 'object') {
      if (targetLang === 'en') return input.en || input.bn || fallback || '';
      if (targetLang === 'obro') return input.obro || `${input.bn || ''} (${input.en || ''})` || fallback || '';
      return input.bn || input.en || fallback || '';
    }

    const text = String(input);
    const norm = this.normalizeKey(text);
    if (!norm) return fallback || text;

    // 1. Direct match in Curated / Base Lexicon
    const exact = this.lexicon.get(norm);
    if (exact) {
      if (targetLang === 'en') return exact.en || text;
      if (targetLang === 'obro') return exact.obro || `${exact.bn} (${exact.en})`;
      return exact.bn || text;
    }

    // Never pass unresolved snake_case identifier keys (e.g. nav_offline_entries) to Google Translate
    if (IDENTIFIER_KEY_RE.test(norm)) {
      if (fallback && this.normalizeKey(fallback) !== norm) {
        return this.translate(fallback, targetLang, '', { allowOnline });
      }
      return text
        .split('_')
        .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : ''))
        .join(' ');
    }

    // 2. Check Persistent / Memory Cache (from previous auto-translations)
    const cacheKey = `${targetLang}:${norm}`;
    if (this.memoryCache[cacheKey]) {
      return this.memoryCache[cacheKey];
    }

    // 3. Dynamic Grammar-Aware Full-Sentence Pattern Matches
    if (/^order\s*#?\s*([\w-]+)$/i.test(text)) {
      const match = text.match(/^order\s*#?\s*([\w-]+)$/i);
      return targetLang === 'en' ? `Order #${match[1]}` : `অর্ডার #${match[1]}`;
    }
    if (/^invoice\s*#?\s*([\w-]+)$/i.test(text)) {
      const match = text.match(/^invoice\s*#?\s*([\w-]+)$/i);
      return targetLang === 'en' ? `Invoice #${match[1]}` : `ইনভয়েস #${match[1]}`;
    }
    if (/^showing\s+([\d,]+)\s+to\s+([\d,]+)\s+of\s+([\d,]+)(?:\s*(?:entries|results|items))?$/i.test(text)) {
      const m = text.match(/^showing\s+([\d,]+)\s+to\s+([\d,]+)\s+of\s+([\d,]+)/i);
      if (targetLang === 'en') return text;
      if (targetLang === 'obro') return `Mot ${m[3]}-tir moddhe ${m[1]} theke ${m[2]} proshorshito hocche`;
      return `মোট ${m[3]}টি রেকর্ডের মধ্যে ${m[1]} থেকে ${m[2]} প্রদর্শিত হচ্ছে`;
    }
    if (/^(?:only\s+)?([\d/.,-]+)\s+left$/i.test(text)) {
      const m = text.match(/^(?:only\s+)?([\d/.,-]+)\s+left$/i);
      if (targetLang === 'en') return `Only ${m[1]} left`;
      if (targetLang === 'obro') return `Matro ${m[1]}-ti baki`;
      return `মাত্র ${m[1]}টি বাকি`;
    }
    if (/^([\d.,]+)\s+days?\s+left$/i.test(text)) {
      const m = text.match(/^([\d.,]+)\s+days?\s+left$/i);
      if (targetLang === 'en') return text;
      return targetLang === 'obro' ? `Ar ${m[1]} din baki` : `আর মাত্র ${m[1]} দিন বাকি`;
    }
    if (/^expired\s+([\d.,]+)\s+days?\s+ago$/i.test(text)) {
      const m = text.match(/^expired\s+([\d.,]+)\s+days?\s+ago$/i);
      if (targetLang === 'en') return text;
      return targetLang === 'obro' ? `${m[1]} din age meyad shesh` : `${m[1]} দিন আগে মেয়াদোত্তীর্ণ হয়েছে`;
    }
    if (/^expires\s+soon\s*\(([\d.,]+)\s+days?\)$/i.test(text)) {
      const m = text.match(/^expires\s+soon\s*\(([\d.,]+)\s+days?\)$/i);
      if (targetLang === 'en') return text;
      return targetLang === 'obro' ? `Shighroi meyad shesh (${m[1]} din)` : `শীঘ্রই মেয়াদ শেষ হবে (${m[1]} দিন)`;
    }
    if (/^expires\s+today$/i.test(text)) {
      return targetLang === 'en' ? text : targetLang === 'obro' ? 'Aji meyad shesh' : 'আজই মেয়াদ শেষ';
    }
    if (/^(\d+)\s+items?$/i.test(text)) {
      const m = text.match(/^(\d+)\s+items?$/i);
      return targetLang === 'en' ? text : targetLang === 'obro' ? `${m[1]}-ti item` : `${m[1]}টি আইটেম`;
    }
    if (/^shopping\s+cart\s*\((\d+)\s+items?\)$/i.test(text)) {
      const m = text.match(/^shopping\s+cart\s*\((\d+)\s+items?\)$/i);
      if (targetLang === 'en') return text;
      return targetLang === 'obro' ? `Shopping Cart (${m[1]}-ti item)` : `শপিং কার্ট (${m[1]}টি আইটেম)`;
    }
    if (/^([^\s]+(?:\s*[^\s]+)?)\s+each$/i.test(text) && /[\d৳$]/.test(text)) {
      const m = text.match(/^(.+?)\s+each$/i);
      if (targetLang === 'en') return text;
      return targetLang === 'obro' ? `Protiti ${m[1]}` : `প্রতিটি ${m[1]}`;
    }
    if (/^(\d+)\s+new$/i.test(text)) {
      const m = text.match(/^(\d+)\s+new$/i);
      return targetLang === 'en' ? text : targetLang === 'obro' ? `${m[1]}-ti notun` : `${m[1]}টি নতুন`;
    }
    if (/^registered:\s*(.+)$/i.test(text)) {
      const m = text.match(/^registered:\s*(.+)$/i);
      return targetLang === 'en' ? text : targetLang === 'obro' ? `Nibondhito: ${m[1]}` : `নিবন্ধিত: ${m[1]}`;
    }
    if (/^account\s+registered\s+on\s+(.+)$/i.test(text)) {
      const m = text.match(/^account\s+registered\s+on\s+(.+)$/i);
      if (targetLang === 'en') return text;
      return targetLang === 'obro' ? `Account toirir tarikh: ${m[1]}` : `অ্যাকাউন্ট নিবন্ধনের তারিখ: ${m[1]}`;
    }
    if (/^issued\s+on\s+(.+)$/i.test(text)) {
      const m = text.match(/^issued\s+on\s+(.+)$/i);
      return targetLang === 'en' ? text : targetLang === 'obro' ? `Issur tarikh: ${m[1]}` : `ইস্যুর তারিখ: ${m[1]}`;
    }
    if (/^(\d+)\s+bills?\s*[·•]\s*(\d+)\s+quotes?$/i.test(text)) {
      const m = text.match(/^(\d+)\s+bills?\s*[·•]\s*(\d+)\s+quotes?$/i);
      return targetLang === 'en'
        ? text
        : targetLang === 'obro'
        ? `${m[1]}-ti bill · ${m[2]}-ti quote`
        : `${m[1]}টি বিল · ${m[2]}টি কোটেশন`;
    }
    if (/^(\d+)\s+skus?$/i.test(text)) {
      const m = text.match(/^(\d+)\s+skus?$/i);
      return targetLang === 'en' ? text : `${m[1]}টি SKU`;
    }
    if (/^(\d+)\s+pending$/i.test(text)) {
      const m = text.match(/^(\d+)\s+pending$/i);
      return targetLang === 'en' ? text : `${m[1]}টি অপেক্ষমাণ`;
    }
    if (/^(\d+)\s+roles?$/i.test(text)) {
      const m = text.match(/^(\d+)\s+roles?$/i);
      return targetLang === 'en' ? text : `${m[1]}টি রোল`;
    }
    if (/^([+-]?\d+)\s+units?$/i.test(text)) {
      const m = text.match(/^([+-]?\d+)\s+units?$/i);
      return targetLang === 'en' ? text : `${m[1]} ইউনিট`;
    }
    if (/^all\s+categories\s*\((\d+)\)$/i.test(text)) {
      const m = text.match(/^all\s+categories\s*\((\d+)\)$/i);
      return targetLang === 'en' ? text : `সকল ক্যাটাগরি (${m[1]})`;
    }
    if (/^sign\s+out\s*\(([^)]+)\)$/i.test(text)) {
      const m = text.match(/^sign\s+out\s*\(([^)]+)\)$/i);
      return targetLang === 'en' ? text : `লগ আউট (${m[1]})`;
    }
    if (/^"(.+?)"\s+\(SKU:\s*([^)]+)\)\s+is\s+at\s+0\s+units\./i.test(text)) {
      const m = text.match(/^"(.+?)"\s+\(SKU:\s*([^)]+)\)/i);
      return targetLang === 'en'
        ? text
        : `"${m[1]}" (SKU: ${m[2]}) পণ্যের মজুদ শূন্য (0)। জরুরি রিস্টক প্রয়োজন।`;
    }
    if (/^"(.+?)"\s+has\s+(\d+)\s+units?\s+remaining\s+\(Threshold:\s*(\d+)\)\.?$/i.test(text)) {
      const m = text.match(/^"(.+?)"\s+has\s+(\d+)\s+units?\s+remaining\s+\(Threshold:\s*(\d+)\)/i);
      return targetLang === 'en'
        ? text
        : `"${m[1]}" পণ্যের মাত্র ${m[2]} ইউনিট মজুদ আছে (সতর্কতা সীমা: ${m[3]})।`;
    }
    if (/^order\s+#([\w-]+)\s+placed\s+by\s+(.+?)\s+awaits\s+confirmation\.?$/i.test(text)) {
      const m = text.match(/^order\s+#([\w-]+)\s+placed\s+by\s+(.+?)\s+awaits/i);
      return targetLang === 'en'
        ? text
        : `${m[2]}-এর অর্ডার #${m[1]} অনুমোদনের অপেক্ষায় আছে।`;
    }
    if (/^সংরক্ষিত\s+তালিকা\s*\((\d+)\)$/i.test(text)) {
      const m = text.match(/^সংরক্ষিত\s+তালিকা\s*\((\d+)\)$/i);
      if (targetLang === 'en') return `Saved Archive (${m[1]})`;
      if (targetLang === 'obro') return `Songrokhito Talika (${m[1]})`;
      return text;
    }
    if (/^পূর্বের\s+কোটেশন\s+ও\s+বিক্রয়\s+প্রাইস\s+লিস্ট\s*\((\d+)\)$/i.test(text)) {
      const m = text.match(/^পূর্বের\s+কোটেশন\s+ও\s+বিক্রয়\s+প্রাইস\s+লিস্ট\s*\((\d+)\)$/i);
      if (targetLang === 'en') return `Previous Quotation & Sales Price List (${m[1]})`;
      if (targetLang === 'obro') return `Purber Quotation o Bikroy Price List (${m[1]})`;
      return text;
    }
    if (/^ইনভেন্টরি\s+স্টক\s+ক্যাটালগ\s*\((\d+)\)$/i.test(text)) {
      const m = text.match(/^ইনভেন্টরি\s+স্টক\s+ক্যাটালগ\s*\((\d+)\)$/i);
      if (targetLang === 'en') return `Inventory Stock Catalog (${m[1]})`;
      if (targetLang === 'obro') return `Inventory Stock Catalog (${m[1]})`;
      return text;
    }

    const textHasBangla = this.hasBangla(text);
    const textHasLatin = /[A-Za-z]{2,}/.test(text);

    // Prevent word-by-word Google Translate of contextless single stop-words
    if (!textHasBangla && ISOLATED_STOPWORDS.has(norm)) {
      return fallback || text;
    }

    // Handle pre-formatted bilingual strings like "গ্রাহকের নাম (Customer Name)" or "খাতা ও অফলাইন (OCR)"
    if (textHasBangla && textHasLatin) {
      const parenMatch = text.match(/^(.*?)\s*\(([^()]*[A-Za-z0-9]{2,}[^()]*)\)\s*([:*]?)\s*$/);
      if (targetLang === 'en' && parenMatch) {
        const before = parenMatch[1].trim();
        const inside = parenMatch[2].trim();
        const suffix = parenMatch[3] || '';
        const isKeepPrefixTag =
          /^[A-Z0-9/+._-]{1,6}$/.test(inside) ||
          /^(BDT|USD|EUR|POS|RFQ|VAT|BIN|SKU|OCR|AI|PDF|CSV|JSON|API|HP|TR|KG|KW|RPM|BN|EN|Admin|Manager|Staff|Owner|Agent)$/i.test(
            inside
          );
        if (!isKeepPrefixTag) {
          return `${inside}${suffix}`;
        }
        const normBefore = this.normalizeKey(before);
        const lexBefore = this.lexicon.get(normBefore);
        const cachedBefore = this.memoryCache[`en:${normBefore}`];
        if (lexBefore?.en || cachedBefore) {
          return `${lexBefore?.en || cachedBefore} (${inside})${suffix}`;
        }
        if (allowOnline && typeof window !== 'undefined' && this.hasBangla(before)) {
          this.fetchOnlineTranslation(before, 'en');
        }
      } else if (targetLang === 'obro') {
        if (parenMatch) {
          const before = parenMatch[1].trim();
          const inside = parenMatch[2].trim();
          const suffix = parenMatch[3] || '';
          const normBefore = this.normalizeKey(before);
          const lexBefore = this.lexicon.get(normBefore);
          const avroBefore =
            lexBefore?.obro || this.memoryCache[`obro:${normBefore}`] || transliterateBanglaToAvro(before);
          if (avroBefore) {
            return avroBefore.toLowerCase().includes(inside.toLowerCase())
              ? `${avroBefore}${suffix}`
              : `${avroBefore} (${inside})${suffix}`;
          }
        }
        return transliterateBanglaToAvro(text);
      } else if (targetLang === 'bn') {
        return text;
      }
    }

    // Immediate phonetic Avro/Banglish fallback for any unmapped Bangla UI text in 'obro' mode
    if (targetLang === 'obro' && textHasBangla) {
      return transliterateBanglaToAvro(text);
    }

    // 4. Online Async Auto-Translate Trigger (Non-blocking, Bidirectional)
    if (allowOnline && typeof window !== 'undefined') {
      if (targetLang === 'en' && textHasBangla) {
        this.fetchOnlineTranslation(text, 'en');
      } else if (targetLang !== 'en' && !textHasBangla && textHasLatin) {
        this.fetchOnlineTranslation(text, targetLang);
      }
    }

    return fallback || text;
  }
}

export const translationEngine = new TranslationEngineService();

export const t = (textOrKey, targetLang = 'bn', fallback = '') => {
  return translationEngine.translate(textOrKey, targetLang, fallback);
};
