/**
 * Bidirectional Phonetic Script & Numeral Localizer for Entities & Prices
 * ----------------------------------------------------------------------
 * Preserves semantic identity of proper names, businesses, addresses, and spare parts
 * by converting only script (English <-> Bengali letters) rather than meaning.
 * Never alters alphanumeric IDs, SKUs, dates, emails, URLs, or phone numbers.
 */

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
  // Proper entity / place / business phonetic words (Bengali -> English)
  মেসার্স: 'M/S.', শান্তা: 'Shanta', রেফ্রিজারেশন: 'Refrigeration', রিয়ান: 'Riyan', রিয়াদ: 'Riyad',
  রহমান: 'Rahman', আহমেদ: 'Ahmed', ইসলাম: 'Islam', হোসেন: 'Hossain', করিম: 'Karim', রহিম: 'Rahim',
  মাহির: 'Mahir', সাজেদ: 'Sajed', সাইফুল: 'Saiful', ইসমাইল: 'Ismail', সুলতানা: 'Sultana', পারভীন: 'Parveen',
  চৌধুরী: 'Chowdhury', আলম: 'Alam', খান: 'Khan', আলী: 'Ali', হাসান: 'Hasan', সরকার: 'Sarker',
  ব্লু: 'Blue', স্কাই: 'Sky', ট্রেডিং: 'Trading', ট্রেডার্স: 'Traders', এন্টারপ্রাইজ: 'Enterprise',
  কর্পোরেশন: 'Corporation', কোম্পানি: 'Company', লিমিটেড: 'Limited', ইন্টারন্যাশনাল: 'International',
  ইঞ্জিনিয়ারিং: 'Engineering', ব্রাদার্স: 'Brothers', কোল্ড: 'Cold', স্টোরেজ: 'Storage',
  চট্টগ্রাম: 'Chattogram', পাহাড়তলী: 'Pahartali', হালিশহর: 'Halishahar', আগ্রাবাদ: 'Agrabad',
  নাসিরাবাদ: 'Nasirabad', বায়েজিদ: 'Bayezid', ঢাকা: 'Dhaka', সিলেট: 'Sylhet', খুলনা: 'Khulna',
  রাজশাহী: 'Rajshahi', ব্লক: 'Block', মার্কেট: 'Market', রোড: 'Road', বাংলাদেশ: 'Bangladesh',
  অয়েল: 'Oil', রিং: 'Ring', ভালভ: 'Valve', অ্যাসি: 'Assy', গ্যাসকেট: 'Gasket', কভার: 'Cover',
  অ্যাক্সেস: 'Access', পিস্টন: 'Piston', প্যাকিং: 'Packing', কনডেনসার: 'Condenser',
  কম্প্রেসার: 'Compressor', ইভাপোরেটর: 'Evaporator', চিলার: 'Chiller', বিটজার: 'Bitzer',
  মাইকম: 'Mycom', সাবরো: 'Sabroe', ক্যারিয়ার: 'Carrier', ড্যানফস: 'Danfoss', কোপল্যান্ড: 'Copeland',
};

// Pure phonetic English -> Bengali words (strictly sound-based, NEVER semantic word meanings)
const EN_TO_BN_PHONETIC_WORDS = {
  // Business & proper entity terms
  trading: 'ট্রেডিং', traders: 'ট্রেডার্স', trade: 'ট্রেড', enterprise: 'এন্টারপ্রাইজ',
  enterprises: 'এন্টারপ্রাইজেস', corporation: 'কর্পোরেশন', corp: 'কর্প', company: 'কোম্পানি',
  co: 'কোং', ltd: 'লিঃ', limited: 'লিমিটেড', pvt: 'প্রাঃ', international: 'ইন্টারন্যাশনাল',
  industries: 'ইন্ডাস্ট্রিজ', industry: 'ইন্ডাস্ট্রি', engineering: 'ইঞ্জিনিয়ারিং',
  works: 'ওয়ার্কস', brothers: 'ব্রাদার্স', bros: 'ব্রাদার্স', sons: 'সন্স',
  associates: 'অ্যাসোসিয়েটস', group: 'গ্রুপ', agency: 'এজেন্সি', agencies: 'এজেন্সিস',
  store: 'স্টোর', stores: 'স্টোর্স', mart: 'মার্ট', center: 'সেন্টার', centre: 'সেন্টার',
  house: 'হাউস', cold: 'কোল্ড', storage: 'স্টোরেজ', ice: 'আইস', plant: 'প্ল্যান্ট',
  mills: 'মিলস', mill: 'মিল', textile: 'টেক্সটাইল', textiles: 'টেক্সটাইলস',
  garments: 'গার্মেন্টস', apparels: 'অ্যাপারেলস', pharma: 'ফার্মা', agro: 'এগ্রো',
  foods: 'ফুডস', food: 'ফুড', dairy: 'ডেইরি', fisheries: 'ফিশারিজ', marine: 'মেরিন',
  shipping: 'শিপিং', line: 'লাইন', lines: 'লাইনস', service: 'সার্ভিস', services: 'সার্ভিসেস',
  solutions: 'সল্যুশনস', tech: 'টেক', technology: 'টেকনোলজি', global: 'গ্লোবাল',
  apex: 'অ্যাপেক্স', delta: 'ডেল্টা', retail: 'রিটেইল', wholesale: 'হোলসেল',
  // Color/nature words common in company names (strictly phonetic!)
  blue: 'ব্লু', sky: 'স্কাই', green: 'গ্রিন', red: 'রেড', white: 'হোয়াইট', black: 'ব্ল্যাক',
  golden: 'গোল্ডেন', gold: 'গোল্ড', silver: 'সিলভার', star: 'স্টার', sun: 'সান', moon: 'মুন',
  ocean: 'ওশান', sea: 'সি', river: 'রিভার', valley: 'ভ্যালি', city: 'সিটি', metro: 'মেট্রো',
  royal: 'রয়্যাল', national: 'ন্যাশনাল', bangla: 'বাংলা', bengal: 'বেঙ্গল',
  eastern: 'ইস্টার্ন', western: 'ওয়েস্টার্ন', northern: 'নর্দার্ন', southern: 'সাউদার্ন',
  united: 'ইউনাইটেড', prime: 'প্রাইম', super: 'সুপার', mega: 'মেগা', smart: 'স্মার্ট',
  modern: 'মডার্ন', classic: 'ক্লাসিক', crown: 'ক্রাউন', diamond: 'ডায়মন্ড', pearl: 'পার্ল',
  walk: 'ওয়াক', owner: 'ওনার', agent: 'এজেন্ট',
  // Common Bangladeshi personal names & surnames
  riyan: 'রিয়ান', mahir: 'মাহির', chowdhury: 'চৌধুরী', shanta: 'শান্তা', ruhul: 'রুহুল',
  amin: 'আমিন', liton: 'লিটন', ismail: 'ইসমাইল', sajed: 'সাজেদ', saiful: 'সাইফুল',
  sultana: 'সুলতানা', parveen: 'পারভীন', rahman: 'রহমান', ahmed: 'আহমেদ', islam: 'ইসলাম',
  hossain: 'হোসেন', karim: 'করিম', rahim: 'রহিম', khan: 'খান', ali: 'আলী', hasan: 'হাসান',
  hassan: 'হাসান', alam: 'আলম', uddin: 'উদ্দিন', mia: 'মিয়া', miah: 'মিয়া', sheikh: 'শেখ',
  sarker: 'সরকার', roy: 'রায়', das: 'দাস', barua: 'বড়ুয়া', tariq: 'তারেক', tarek: 'তারেক',
  kamal: 'কামাল', jamal: 'জামাল', kabir: 'কবির', nasir: 'নাসির', faruk: 'ফারুক',
  // Places / Chattogram / Bangladesh
  chattogram: 'চট্টগ্রাম', chittagong: 'চট্টগ্রাম', dhaka: 'ঢাকা', sylhet: 'সিলেট',
  khulna: 'খুলনা', rajshahi: 'রাজশাহী', cumilla: 'কুমিল্লা', comilla: 'কুমিল্লা',
  halishahar: 'হালিশহর', pahartali: 'পাহাড়তলী', agrabad: 'আগ্রাবাদ', nasirabad: 'নাসিরাবাদ',
  bayezid: 'বায়েজিদ', baizid: 'বায়েজিদ', gec: 'জিইসি', muradpur: 'মুরাদপুর', patenga: 'পতেঙ্গা',
  kalurghat: 'কালুরঘাট', sitakunda: 'সীতাকুণ্ড', jubilee: 'জুবিলি', market: 'মার্কেট',
  cda: 'সিডিএ', road: 'রোড', rd: 'রোড', lane: 'লেন', street: 'স্ট্রিট', avenue: 'এভিনিউ',
  block: 'ব্লক', sector: 'সেক্টর', plot: 'প্লট', floor: 'ফ্লোর', building: 'বিল্ডিং',
  bhaban: 'ভবন', tower: 'টাওয়ার', plaza: 'প্লাজা', complex: 'কমপ্লেক্স', zone: 'জোন',
  epz: 'ইপিজেড', industrial: 'ইন্ডাস্ট্রিয়াল', area: 'এরিয়া', port: 'পোর্ট', bazar: 'বাজার',
  bazaar: 'বাজার', gate: 'গেট', bangladesh: 'বাংলাদেশ', mirpur: 'মিরপুর', uttara: 'উত্তরা',
  gulshan: 'গুলশান', banani: 'বনানী', motijheel: 'মতিঝিল', narayanganj: 'নারায়ণগঞ্জ',
  gazipur: 'গাজীপুর', savar: 'সাভার',
  // HVAC / Refrigeration & spare parts phonetic lexicon
  refrigeration: 'রেফ্রিজারেশন', compressor: 'কম্প্রেসার', compressors: 'কম্প্রেসার',
  condenser: 'কনডেনসার', evaporator: 'ইভাপোরেটর', chiller: 'চিলার', freezer: 'ফ্রিজার',
  cooling: 'কুলিং', air: 'এয়ার', conditioning: 'কন্ডিশনিং', ammonia: 'অ্যামোনিয়া',
  freon: 'ফ্রেয়ন', gas: 'গ্যাস', oil: 'অয়েল', ring: 'রিং', rings: 'রিংস',
  piston: 'পিস্টন', pistons: 'পিস্টনস', valve: 'ভালভ', valves: 'ভালভস', assy: 'অ্যাসি',
  assembly: 'অ্যাসেম্বলি', gasket: 'গ্যাসকেট', gaskets: 'গ্যাসকেটস', cover: 'কভার',
  access: 'অ্যাক্সেস', packing: 'প্যাকিং', seal: 'সিল', mechanical: 'মেকানিক্যাল',
  shaft: 'শ্যাফট', crank: 'ক্র্যাঙ্ক', crankshaft: 'ক্র্যাঙ্কশ্যাফট', connecting: 'কানেক্টিং',
  rod: 'রড', bearing: 'বিয়ারিং', bearings: 'বিয়ারিংস', liner: 'লাইনার', sleeve: 'স্লিভ',
  cylinder: 'সিলিন্ডার', cyl: 'সিল', head: 'হেড', plate: 'প্লেট', spring: 'স্প্রিং',
  suction: 'সাকশন', discharge: 'ডিসচার্জ', expansion: 'এক্সপানশন', thermostat: 'থার্মোস্ট্যাট',
  solenoid: 'সলেনয়েড', coil: 'কয়েল', motor: 'মোটর', fan: 'ফ্যান', blade: 'ব্লেড',
  belt: 'বেল্ট', filter: 'ফিল্টার', drier: 'ড্রায়ার', dryer: 'ড্রায়ার', strainer: 'স্ট্রেইনার',
  gauge: 'গেজ', pressure: 'প্রেশার', switch: 'সুইচ', relay: 'রিলে', contactor: 'কন্টাক্টর',
  capacitor: 'ক্যাপাসিটর', heater: 'হিটার', defrost: 'ডিফ্রস্ট', copper: 'কপার', pipe: 'পাইপ',
  tube: 'টিউব', elbow: 'এলবো', tee: 'টি', nut: 'নাট', bolt: 'বোল্ট', screw: 'স্ক্রু',
  washer: 'ওয়াশার', pin: 'পিন', bush: 'বুশ', bushing: 'বুশিং', set: 'সেট', kit: 'কিট',
  repair: 'রিপেয়ার', spare: 'স্পেয়ার', parts: 'পার্টস', part: 'পার্ট', for: 'ফর',
  with: 'উইথ', and: 'অ্যান্ড', of: 'অব', in: 'ইন', on: 'অন', heavy: 'হেভি', duty: 'ডিউটি',
  semi: 'সেমি', hermetic: 'হারমেটিক', open: 'ওপেন', type: 'টাইপ', model: 'মডেল',
  bitzer: 'বিটজার', mycom: 'মাইকম', sabroe: 'সাবরো', carrier: 'ক্যারিয়ার', copeland: 'কোপল্যান্ড',
  york: 'ইয়র্ক', trane: 'ট্রেন', daikin: 'ডাইকিন', danfoss: 'ড্যানফস', emerson: 'এমারসন',
  alco: 'অ্যালকো', bock: 'বক', frascold: 'ফ্রাস্কোল্ড', vilter: 'ভিল্টার', frick: 'ফ্রিক',
  hall: 'হল', maneurope: 'ম্যানইউরোপ', maneurop: 'ম্যানইউরোপ', tecumseh: 'টেকামসেহ',
  bristol: 'ব্রিস্টল', dorin: 'ডরিন', grasso: 'গ্রাসো', stafa: 'স্টাফা', howden: 'হাউডেন',
};

const EN_SINGLE_LETTER_BN = {
  A: 'এ', B: 'বি', C: 'সি', D: 'ডি', E: 'ই', F: 'এফ', G: 'জি', H: 'এইচ',
  I: 'আই', J: 'জে', K: 'কে', L: 'এল', M: 'এম', N: 'এন', O: 'ও', P: 'পি',
  Q: 'কিউ', R: 'আর', S: 'এস', T: 'টি', U: 'ইউ', V: 'ভি', W: 'ডব্লিউ', X: 'এক্স',
  Y: 'ওয়াই', Z: 'জেড',
};

const EN_CONSONANT_BN = {
  b: 'ব', c: 'ক', d: 'ড', f: 'ফ', g: 'গ', h: 'হ', j: 'জ', k: 'ক', l: 'ল', m: 'ম',
  n: 'ন', p: 'প', q: 'ক', r: 'র', s: 'স', t: 'ট', v: 'ভ', w: 'ও', x: 'ক্স', y: 'য়', z: 'জ',
};

const EN_DIGRAPH_BN = {
  ch: 'চ', sh: 'শ', th: 'থ', ph: 'ফ', gh: 'ঘ', kh: 'খ', bh: 'ভ', dh: 'ধ', jh: 'ঝ',
  ng: 'ং', ck: 'ক', qu: 'কু',
};

const EN_CLUSTERS_WITH_HASANTA = new Set([
  'bl', 'br', 'cl', 'cr', 'dr', 'fl', 'fr', 'gl', 'gr', 'kl', 'kr', 'pl', 'pr',
  'sk', 'sl', 'sm', 'sn', 'sp', 'st', 'sw', 'tr',
]);

const BN_DIGITS = { '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4', '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9' };
const EN_TO_BN_DIGITS = { '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪', '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯' };

const isBanglaLetter = (ch) => /[\u0980-\u09FF]/.test(ch || '');
const isAsciiVowel = (ch) => /[aeiou]/i.test(ch || '');

export const transliterateBanglaWord = (word) => {
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

    if (next === '\u09CD') {
      const joined = chars[i + 2];
      if (joined === 'য') {
        out += `${base}y`;
        i += 2;
        const post = chars[i + 1];
        if (BN_MATRAS[post]) {
          out += BN_MATRAS[post];
          i += 1;
        }
        continue;
      }
      out += base;
      i += 1;
      continue;
    }

    if (BN_MATRAS[next]) {
      out += base + BN_MATRAS[next];
      i += 1;
      continue;
    }

    const hasTrailingBn = next && isBanglaLetter(next);
    out += hasTrailingBn ? `${base}o` : base;
  }
  return out;
};

export const transliterateBanglaToAvro = (text, { titleCase = false } = {}) => {
  if (!text || typeof text !== 'string') return text;
  const converted = text.replace(/[\u0980-\u09FF]+/g, (segment) => transliterateBanglaWord(segment));
  if (titleCase) {
    return converted.replace(/(^|\s)([a-z])/g, (_, sp, c) => `${sp}${c.toUpperCase()}`);
  }
  return converted.replace(/^[a-z]/, (c) => c.toUpperCase());
};

/**
 * Sound-based English -> Bengali letter converter for unseen proper names and places.
 */
const phoneticEnglishWordToBangla = (rawWord) => {
  if (!rawWord) return '';
  if (rawWord.length === 1 && EN_SINGLE_LETTER_BN[rawWord]) {
    return EN_SINGLE_LETTER_BN[rawWord];
  }

  const lower = rawWord.toLowerCase();
  if (EN_TO_BN_PHONETIC_WORDS[lower]) {
    return EN_TO_BN_PHONETIC_WORDS[lower];
  }

  // Keep pure uppercase acronyms/codes (<=4 chars like AC, DC, HP, TR, GEC handled via dict) when no vowels
  if (/^[A-Z]{2,4}$/.test(rawWord) && !/[AEIOUY]/.test(rawWord)) {
    return Array.from(rawWord).map((c) => EN_SINGLE_LETTER_BN[c] || c).join('');
  }

  let out = '';
  let i = 0;
  let sawVowel = false;

  while (i < lower.length) {
    // Endings: -tion / -sion -> শন
    if ((lower.startsWith('tion', i) || lower.startsWith('sion', i)) && i + 4 === lower.length) {
      out += 'শন';
      i += 4;
      continue;
    }

    // Leading or post-vowel standalone vowels
    const ch = lower[i];
    const next2 = lower.slice(i, i + 2);
    if (isAsciiVowel(ch)) {
      sawVowel = true;
      if (i === 0) {
        if (next2 === 'oo') { out += 'উ'; i += 2; continue; }
        if (next2 === 'ee' || next2 === 'ea') { out += 'ই'; i += 2; continue; }
        if (next2 === 'ai') { out += 'আই'; i += 2; continue; }
        if (next2 === 'au' || next2 === 'aw') { out += 'অ'; i += 2; continue; }
        if (next2 === 'ou') { out += 'আউ'; i += 2; continue; }
        const leadMap = { a: 'আ', e: 'এ', i: 'ই', o: 'ও', u: 'উ' };
        out += leadMap[ch] || '';
        i += 1;
        continue;
      }
      // Consecutive vowels in middle (not immediately after consonant)
      const standaloneMap = { a: 'য়া', e: 'য়ে', i: 'ই', o: 'ও', u: 'উ' };
      out += standaloneMap[ch] || '';
      i += 1;
      continue;
    }

    // Consonant or digraph
    let consBn = '';
    let consLen = 1;
    if (EN_DIGRAPH_BN[next2]) {
      consBn = EN_DIGRAPH_BN[next2];
      consLen = 2;
    } else if (EN_CLUSTERS_WITH_HASANTA.has(next2) && i + 2 < lower.length) {
      consBn = `${EN_CONSONANT_BN[ch]}\u09CD${EN_CONSONANT_BN[lower[i + 1]]}`;
      consLen = 2;
    } else if (ch === 'c' && /[eiy]/.test(lower[i + 1] || '')) {
      consBn = 'স';
    } else {
      consBn = EN_CONSONANT_BN[ch] || ch;
    }

    i += consLen;

    // Attach following vowel sign (matra) directly to consonant
    if (i < lower.length) {
      const rem2 = lower.slice(i, i + 2);
      const rem1 = lower[i];

      if (rem2 === 'ee' || rem2 === 'ea') {
        out += `${consBn}\u09C0`;
        i += 2;
        sawVowel = true;
        continue;
      }
      if (rem2 === 'oo') {
        out += `${consBn}\u09C2`;
        i += 2;
        sawVowel = true;
        continue;
      }
      if (rem2 === 'ai' || rem2 === 'ei') {
        out += `${consBn}\u09C7ই`;
        i += 2;
        sawVowel = true;
        continue;
      }
      if (rem2 === 'ay' || rem2 === 'ey') {
        out += `${consBn}\u09C7`;
        i += 2;
        sawVowel = true;
        continue;
      }
      if (rem2 === 'ou' || rem2 === 'ow') {
        out += `${consBn}\u09BEউ`;
        i += 2;
        sawVowel = true;
        continue;
      }
      if (rem2 === 'au' || rem2 === 'aw') {
        out += `${consBn}\u09BE`;
        i += 2;
        sawVowel = true;
        continue;
      }
      if (rem2 === 'oi' || rem2 === 'oy') {
        out += `${consBn}\u09DF`;
        i += 2;
        sawVowel = true;
        continue;
      }
      if (rem1 === 'y' && i === lower.length - 1) {
        out += sawVowel ? `${consBn}\u09BF` : `${consBn}\u09BEই`;
        i += 1;
        sawVowel = true;
        continue;
      }
      // Silent trailing 'e' on multi-syllable words (blue, line, care, store)
      if (rem1 === 'e' && i === lower.length - 1 && lower.length > 3 && sawVowel) {
        out += consBn;
        i += 1;
        continue;
      }

      const matraMap = { a: '\u09BE', e: '\u09C7', i: '\u09BF', o: '\u09CB', u: '\u09C1' };
      if (matraMap[rem1]) {
        out += `${consBn}${matraMap[rem1]}`;
        i += 1;
        sawVowel = true;
        continue;
      }
    }

    out += consBn;
  }

  return out;
};

/**
 * Phonetically transliterate an entire English phrase/name/address/product into Bengali script,
 * preserving punctuation, numbers, alphanumeric SKUs/model numbers, emails, URLs, and phones.
 */
export const englishToBanglaPhonetic = (text) => {
  if (!text || typeof text !== 'string') return text;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text.trim())) return text;
  if (/^(https?:\/\/|\/[a-z0-9/_-]*$)/i.test(text.trim())) return text;
  if (/^#?(INV|QT|PO|ORD|SKU|REQ|RFQ|MOV|TEST|BIN)-[A-Z0-9_-]+$/i.test(text.trim())) return text;
  if (/^\+?\d[\d\s\-()]{5,}$/.test(text.trim())) return text;

  // Handle common prefix M/S. or M/S cleanly
  const normalized = text.replace(/\bM\/S\.?/gi, 'মেসার্স');

  return normalized.replace(/[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*/g, (token) => {
    // Keep any alphanumeric model/tier code (5H40, 4EC-6.2Y, 1ST, 2ND, R-22) as-is
    if (/\d/.test(token)) {
      return token;
    }
    if (token.includes('-')) {
      return token
        .split('-')
        .map((part) => phoneticEnglishWordToBangla(part))
        .join('-');
    }
    return phoneticEnglishWordToBangla(token);
  });
};

const CODE_OR_NON_LOCALIZABLE_NUMBER_RE =
  /^#?(INV|QT|PO|ORD|SKU|REQ|RFQ|MOV|TEST|BIN)-[A-Z0-9_-]+$|^[^\s@]+@[^\s@]+\.[^\s@]+$|^(https?:\/\/|\/)|^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}(,\s+\d{4})?(\s*[·•]\s*.*)?$|^\+?\d[\d\s\-()]{5,}$/i;

/**
 * Convert displayed digits cleanly:
 * - targetLang === 'bn': currency amounts, standalone numbers/percentages, and Bangla-text numbers -> ০-৯
 *   while leaving model codes (5H40, 1ST, 4EC-6.2Y), dates, phones, invoice IDs, emails intact.
 * - targetLang === 'en' | 'obro': all ০-৯ -> 0-9.
 */
export const localizeDisplayDigits = (text, targetLang = 'bn') => {
  if (!text || typeof text !== 'string') return text;

  if (targetLang !== 'bn') {
    return text.replace(/[\u09E6-\u09EF]/g, (d) => BN_DIGITS[d] || d);
  }

  const trimmed = text.trim();
  if (CODE_OR_NON_LOCALIZABLE_NUMBER_RE.test(trimmed)) {
    return text;
  }

  // Convert standalone digit groups (not attached directly to ASCII letters or hyphens before/after ASCII letters)
  return text.replace(/(?<![A-Za-z0-9-/])([0-9]+(?:[.,][0-9]+)*%?)(?![A-Za-z0-9-/])/g, (num) =>
    num.replace(/[0-9]/g, (d) => EN_TO_BN_DIGITS[d] || d)
  );
};

/**
 * Strictly phonetic script transliteration for user/database entities (Customer names,
 * Company names, Addresses, Product/Part names, Machine models & specs).
 * NEVER invokes semantic translation or online APIs.
 */
export const transliterateEntityText = (text, targetLang = 'bn') => {
  if (!text || typeof text !== 'string') return text;
  const trimmed = text.trim();
  if (!trimmed) return text;

  if (targetLang === 'en' || targetLang === 'obro') {
    const romanized = /[\u0980-\u09FF]/.test(text)
      ? transliterateBanglaToAvro(text, { titleCase: true })
      : text;
    return localizeDisplayDigits(romanized, targetLang);
  }

  // targetLang === 'bn'
  const bnText = /[A-Za-z]/.test(text) ? englishToBanglaPhonetic(text) : text;
  return localizeDisplayDigits(bnText, 'bn');
};
