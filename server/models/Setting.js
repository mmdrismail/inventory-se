const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema(
  {
    companyName: {
      type: String,
      default: 'মেসার্স শান্তা রেফ্রিজারেশন',
    },
    companyNameEn: {
      type: String,
      default: 'M/S. SHANTA REFRIGERATION',
    },
    proprietor: {
      type: String,
      default: 'মোঃ রুহুল আমিন (লিটন)',
    },
    proprietorEn: {
      type: String,
      default: 'Md. Ruhul Amin (Liton)',
    },
    companyEmail: {
      type: String,
      default: 'shanta.refrigeration@gmail.com',
    },
    companyPhone: {
      type: String,
      default: '01711-169875',
    },
    companyAddress: {
      type: String,
      default: '৪০৬, সি.ডি.এ মার্কেট (মসজিদের বিপরীতে), পাহাড়তলী, চট্টগ্রাম।',
    },
    companyAddressEn: {
      type: String,
      default: '406, C.D.A Market (Opposite to Mosque), Pahartali, Chattogram.',
    },
    bin: {
      type: String,
      default: 'BIN-001651149-0505',
    },
    businessScope: {
      type: String,
      default: 'এখানে সকল প্রকারের রেফ্রিজারেশন কোল্ড স্টোর, এয়ার কন্ডিশন, মেশিন ও যন্ত্রাংশ, আইস প্ল্যান্ট, চিলার প্ল্যান্ট R-12, R-22, R-502a, R-134a, R-407a, R-404a ইত্যাদি গ্যাস, কম্প্রেসার ওয়েল, পিস্টন ও এ্যামোনিয়া কম্প্রেসারের খুচরা যন্ত্রাংশ ক্রয় ও বিক্রয় করা হয়।',
    },
    businessScopeEn: {
      type: String,
      default: 'Dealers & suppliers of all types of refrigeration cold storage, air conditioning equipment & parts, ice plant, chiller plant, R-12, R-22, R-502a, R-134a, R-407a, R-404a gases, compressor oil, piston and ammonia compressor spare parts.',
    },
    disclaimer: {
      type: String,
      default: 'বিঃদ্রঃ উপরোক্ত মালামাল ভালো অবস্থায় বুঝিয়া পাইলাম। বিক্রিত মাল ফেরত নেওয়া হয় না।',
    },
    disclaimerEn: {
      type: String,
      default: 'Note: Received goods in good condition. Sold goods are non-refundable.',
    },
    docLanguage: {
      type: String,
      enum: ['bn', 'en', 'bilingual'],
      default: 'bn',
    },
    currency: {
      type: String,
      default: 'BDT',
    },
    currencySymbol: {
      type: String,
      default: '৳',
    },
    taxRate: {
      type: Number,
      default: 0,
    },
    defaultReorderThreshold: {
      type: Number,
      default: 10,
    },
    theme: {
      type: String,
      enum: ['light', 'dark', 'system'],
      default: 'light',
    },
    // Hierarchical Cloud Media & Quota Monitor Config (Cloudinary Free CDN + MongoDB Atlas Quota)
    cloudinaryCloudName: {
      type: String,
      default: '',
      trim: true,
    },
    cloudinaryUploadPreset: {
      type: String,
      default: '',
      trim: true,
    },
    cloudinaryDefaultFolder: {
      type: String,
      default: 'stockline/products',
      trim: true,
    },
    mediaMaxWidthPx: {
      type: Number,
      default: 1200,
    },
    mediaQuality: {
      type: Number,
      default: 0.78,
    },
    mongoQuotaMb: {
      type: Number,
      default: 512,
    },
    cloudMediaQuotaMb: {
      type: Number,
      default: 1024,
    },
    cloudMonthlyCreditsLimit: {
      type: Number,
      default: 25,
    },
  },
  { timestamps: true, strict: false }
);

module.exports = mongoose.model('Setting', settingSchema);
