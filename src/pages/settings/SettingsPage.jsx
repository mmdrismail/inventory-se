import React, { useState, useEffect } from 'react';
import { useAppData } from '../../context/AppDataContext';
import { useLanguage } from '../../context/LanguageContext';
import { storageService } from '../../services/storageService';
import { apiClient } from '../../services/apiClient';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Input, Select, Textarea } from '../../components/forms/FormControls';
import {
  Settings,
  Building,
  Coins,
  Boxes,
  Bell,
  Sun,
  Database,
  RotateCcw,
  Download,
  Upload,
  Save,
  CheckCircle2,
  Server,
  Activity,
  Terminal,
} from 'lucide-react';

export const SettingsPage = () => {
  const { settings, updateSettings, resetAllDemoData, confirmAction, addToast } = useAppData();
  const { language, t } = useLanguage();

  const l = (texts) => {
    if (language === 'en') return texts.en;
    if (language === 'obro') return texts.obro || `${texts.bn} (${texts.en})`;
    return texts.bn;
  };

  const [backendState, setBackendState] = useState({
    checking: true,
    isOnline: false,
    details: null,
  });

  const [formData, setFormData] = useState({
    businessName: settings.companyName || settings.businessName || 'মেসার্স শান্তা রেফ্রিজারেশন',
    businessNameEn: settings.companyNameEn || settings.businessNameEn || 'M/S. SHANTA REFRIGERATION',
    proprietor: settings.proprietor || 'মোঃ রুহুল আমিন (লিটন)',
    proprietorEn: settings.proprietorEn || 'Md. Ruhul Amin (Liton)',
    businessEmail: settings.companyEmail || settings.businessEmail || 'shanta.refrigeration@gmail.com',
    businessPhone: settings.companyPhone || settings.businessPhone || '01711-169875',
    address: settings.companyAddress || settings.address || '৪০৬, সি.ডি.এ মার্কেট (মসজিদের বিপরীতে), পাহাড়তলী, চট্টগ্রাম।',
    addressEn: settings.companyAddressEn || settings.addressEn || '406, C.D.A Market, Pahartali, Chattogram.',
    bin: settings.bin || 'BIN-001651149-0505',
    businessScope: settings.businessScope || '',
    businessScopeEn: settings.businessScopeEn || '',
    disclaimer: settings.disclaimer || '',
    disclaimerEn: settings.disclaimerEn || '',
    docLanguage: settings.docLanguage || 'bn',
    currency: settings.currency || 'BDT',
    defaultReorderLevel: String(settings.defaultReorderLevel || 10),
    theme: settings.theme || 'light',
    notificationsEnabled: settings.notificationsEnabled !== false,
    lowStockAlerts: settings.lowStockAlerts !== false,
    orderStockDeductionPolicy: settings.orderStockDeductionPolicy || 'on_confirm',
  });

  const [isSaving, setIsSaving] = useState(false);

  const checkBackendHealth = async () => {
    setBackendState((prev) => ({ ...prev, checking: true }));
    try {
      const res = await fetch('http://localhost:5000/api/health', {
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(2500),
      });
      if (res.ok) {
        const data = await res.json();
        setBackendState({ checking: false, isOnline: true, details: data });
      } else {
        setBackendState({ checking: false, isOnline: false, details: null });
      }
    } catch {
      setBackendState({ checking: false, isOnline: false, details: null });
    }
  };

  useEffect(() => {
    checkBackendHealth();
  }, []);

  const handleTestBackend = async () => {
    await checkBackendHealth();
    addToast({
      title: l({ bn: 'ব্যাকএন্ড স্ট্যাটাস যাচাই সম্পন্ন', en: 'Backend Checked', obro: 'Backend Checked' }),
      message: l({
        bn: 'সার্ভারের অবস্থা রিফ্রেশ করা হয়েছে। নিচের কার্ডে বিস্তারিত দেখুন।',
        en: 'Status refreshed. See MERN API status card below.',
        obro: 'Status refreshed. See MERN API status card below.',
      }),
      type: 'info',
    });
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSave = (e) => {
    e.preventDefault();
    setIsSaving(true);
    setTimeout(() => {
      updateSettings({
        ...formData,
        companyName: formData.businessName,
        companyNameEn: formData.businessNameEn,
        companyEmail: formData.businessEmail,
        companyPhone: formData.businessPhone,
        companyAddress: formData.address,
        companyAddressEn: formData.addressEn,
        defaultReorderLevel: Number(formData.defaultReorderLevel) || 10,
      });
      setIsSaving(false);
      addToast({
        title: l({ bn: 'সেটিংস সফলভাবে সংরক্ষিত', en: 'Settings Saved', obro: 'Settings Saved' }),
        message: l({
          bn: 'প্রতিষ্ঠানের বিবরণ ও স্টেশনারি ফরম্যাট সফলভাবে আপডেট করা হয়েছে।',
          en: 'Business profile and stationery preferences updated successfully.',
          obro: 'Business profile o settings update hoyeche.',
        }),
        type: 'success',
      });
    }, 250);
  };

  const handleResetData = () => {
    confirmAction({
      title: l({
        bn: 'সকল লোকাল ডেমো ডেটা রিসেট করবেন?',
        en: 'Reset All Local Demo Data?',
        obro: 'Shokol Demo Data Reset Korben?',
      }),
      message: l({
        bn: 'এটি সমস্ত পণ্য, সরবরাহকারী, গ্রাহক, লেনদেন ও সেটিংস আদি সীড ডেটায় ফিরিয়ে নিবে। নতুন যোগ করা ডেটা মুছে যাবে।',
        en: 'This will restore all products, suppliers, customers, categories, transactions, and settings back to pristine seed data. Any newly added records will be replaced.',
        obro: 'Eti shob product, supplier, customer o setting-ke seed data-te restore korbe.',
      }),
      confirmText: l({
        bn: 'হ্যাঁ, সম্পূর্ণ রিসেট করুন',
        en: 'Confirm Hard Reset',
        obro: 'Shob Reset Korun',
      }),
      isDestructive: true,
      onConfirm: () => {
        resetAllDemoData();
      },
    });
  };

  const handleExportBackup = () => {
    const jsonStr = storageService.exportAllData();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `stockline_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    addToast({
      title: l({ bn: 'ব্যাকআপ ডাউনলোড সম্পন্ন', en: 'Backup Exported', obro: 'Backup Exported' }),
      message: l({
        bn: 'সকল ডেমো ডেটা JSON ফাইল হিসেবে ডাউনলোড করা হয়েছে।',
        en: 'All demo data downloaded as JSON backup.',
        obro: 'Shob data JSON backup hishebe download hoyeche.',
      }),
    });
  };

  const handleImportBackup = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const success = storageService.importAllData(event.target.result);
        if (success) {
          window.location.reload();
        } else {
          alert('Failed to parse and import JSON backup file.');
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          {l({
            bn: 'সিস্টেম প্রেফারেন্স ও কনফিগারেশন',
            en: 'System Preferences & Configuration',
            obro: 'System Preferences & Configuration',
          })}
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          {l({
            bn: 'মুদ্রা ফরম্যাট, আঞ্চলিক তথ্য, স্টক হ্রাস নীতি এবং ডেটা ব্যাকআপ কাস্টমাইজ করুন।',
            en: 'Customize currency formatting, regional information, automated stock deduction policy, and backups.',
            obro: 'Currency formatting, regional totho, stock deduction policy ebong backup configure korun.',
          })}
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* 1. Business Profile */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-4 w-4 text-emerald-500" />
              <span>
                {l({
                  bn: 'প্রতিষ্ঠানের বিবরণ (বিজনেস প্রোফাইল)',
                  en: 'Business Profile',
                  obro: 'Business Profile (Protishthaner Totho)',
                })}
              </span>
            </CardTitle>
            <p className="text-xs text-slate-400">
              {l({
                bn: 'ক্যাশ মেমো, চালান ও প্রিন্টেবল ডকুমেন্টে প্রদর্শিত প্রাতিষ্ঠানিক তথ্য',
                en: 'Information displayed on printable receipts and invoices',
                obro: 'Printable receipts o invoice-e prodorshito totho',
              })}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label={l({
                  bn: 'প্রতিষ্ঠানের নাম (বাংলা)',
                  en: 'Company Name (Bangla)',
                  obro: 'Protishthaner Nam (Bangla)',
                })}
                name="businessName"
                value={formData.businessName}
                onChange={handleChange}
                helperText={l({
                  bn: 'ক্যাশ মেমো, চালান ও অফিশিয়াল প্যাডে প্রদর্শিত হবে',
                  en: 'Displayed on Bengali memos, chalans & export pads',
                  obro: 'Cash memo, chalan o pad-e show korbe',
                })}
                required
              />
              <Input
                label={l({
                  bn: 'প্রতিষ্ঠানের নাম (ইংরেজি)',
                  en: 'Company Name (English)',
                  obro: 'Company Name (English)',
                })}
                name="businessNameEn"
                value={formData.businessNameEn}
                onChange={handleChange}
                helperText={l({
                  bn: 'ইংরেজি ইনভয়েস ও কমার্শিয়াল প্যাডে প্রদর্শিত হবে',
                  en: 'Displayed in English invoices & export pads',
                  obro: 'English invoice o trade pad-e show korbe',
                })}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label={l({
                  bn: 'স্বত্বাধিকারী / প্রোপ্রাইটর (বাংলা)',
                  en: 'Proprietor Name (Bangla)',
                  obro: 'Shottadhikari / Proprietor (Bangla)',
                })}
                name="proprietor"
                value={formData.proprietor}
                onChange={handleChange}
                placeholder={l({
                  bn: 'যেমন: মোঃ রুহুল আমিন (লিটন)',
                  en: 'e.g. Md. Ruhul Amin (Liton)',
                  obro: 'Jemon: Md. Ruhul Amin (Liton)',
                })}
              />
              <Input
                label={l({
                  bn: 'স্বত্বাধিকারী / প্রোপ্রাইটর (ইংরেজি)',
                  en: 'Proprietor Name (English)',
                  obro: 'Proprietor Name (English)',
                })}
                name="proprietorEn"
                value={formData.proprietorEn}
                onChange={handleChange}
                placeholder="e.g. Md. Ruhul Amin (Liton)"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label={l({
                  bn: 'যোগাযোগের মোবাইল / ফোন',
                  en: 'Official Contact Phone',
                  obro: 'Mobile / Phone Number',
                })}
                name="businessPhone"
                value={formData.businessPhone}
                onChange={handleChange}
                required
              />
              <Input
                label={l({
                  bn: 'অফিসিয়াল ইমেইল',
                  en: 'Official Business Email',
                  obro: 'Official Email Address',
                })}
                type="email"
                name="businessEmail"
                value={formData.businessEmail}
                onChange={handleChange}
                required
              />
              <Input
                label={l({
                  bn: 'BIN / ভ্যাট নিবন্ধন নম্বর',
                  en: 'BIN / VAT Reg. Number',
                  obro: 'BIN / VAT Number',
                })}
                name="bin"
                value={formData.bin}
                onChange={handleChange}
                placeholder="BIN-001651149-0505"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label={l({
                  bn: 'প্রতিষ্ঠানের ঠিকানা (বাংলা)',
                  en: 'Facility Address (Bangla)',
                  obro: 'Protishthaner Thikana (Bangla)',
                })}
                name="address"
                value={formData.address}
                onChange={handleChange}
                required
              />
              <Input
                label={l({
                  bn: 'প্রতিষ্ঠানের ঠিকানা (ইংরেজি)',
                  en: 'Facility Address (English)',
                  obro: 'Facility Address (English)',
                })}
                name="addressEn"
                value={formData.addressEn}
                onChange={handleChange}
                placeholder="e.g. 406, C.D.A Market, Pahartali, Chattogram"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Textarea
                label={l({
                  bn: 'ব্যবসার বিবরণী ও পণ্যের পরিধি (বাংলা)',
                  en: 'Business Scope & Goods Description (Bangla)',
                  obro: 'Business Scope / Ponner Poridhi (Bangla)',
                })}
                name="businessScope"
                value={formData.businessScope}
                onChange={handleChange}
                rows={2}
                helperText={l({
                  bn: 'মেমোর হেডারের নিচে বক্স আকারে প্রদর্শিত হবে',
                  en: 'Appears below header on Bengali memos',
                  obro: 'Memo header-er niche box akare show korbe',
                })}
              />
              <Textarea
                label={l({
                  bn: 'ব্যবসার বিবরণী ও পণ্যের পরিধি (ইংরেজি)',
                  en: 'Business Scope & Goods Description (English)',
                  obro: 'Business Scope & Goods Description (English)',
                })}
                name="businessScopeEn"
                value={formData.businessScopeEn}
                onChange={handleChange}
                rows={2}
                helperText={l({
                  bn: 'ইংরেজি ট্রেড প্যাডে হেডারের নিচে প্রদর্শিত হবে',
                  en: 'Appears below header on English trade pads',
                  obro: 'English trade pad-e header-er niche show korbe',
                })}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label={l({
                  bn: 'বিক্রয় শর্ত ও নোটিশ (বাংলা)',
                  en: 'Sales Terms & Notice (Bangla)',
                  obro: 'Bikroy Shortho o Notice (Bangla)',
                })}
                name="disclaimer"
                value={formData.disclaimer}
                onChange={handleChange}
                placeholder={l({
                  bn: 'বিঃদ্রঃ উপরোক্ত মালামাল ভালো অবস্থায় বুঝিয়া পাইলাম।',
                  en: 'Notice: Received goods in good condition.',
                  obro: 'B:Dr: Uporokto mal bhalo obosthai bujhiya pailam.',
                })}
              />
              <Input
                label={l({
                  bn: 'রিটার্ন পলিসি ও ডিসক্লেইমার (ইংরেজি)',
                  en: 'Return Policy / Disclaimer (English)',
                  obro: 'Return Policy / Disclaimer (English)',
                })}
                name="disclaimerEn"
                value={formData.disclaimerEn}
                onChange={handleChange}
                placeholder="Notice: Received goods in good condition."
              />
            </div>

            <div className="pt-1">
              <Select
                label={l({
                  bn: 'ডিফল্ট প্রিন্ট ভাষা (Default Print Language)',
                  en: 'Default Document Print Language',
                  obro: 'Default Print Language',
                })}
                name="docLanguage"
                value={formData.docLanguage}
                onChange={handleChange}
                options={[
                  {
                    value: 'bn',
                    label: l({
                      bn: 'বাংলা (Bangla) - মেসার্স শান্তা রেফ্রিজারেশন',
                      en: 'Bangla - Bengali Stationery Format',
                      obro: 'Bangla (Bengali Memo Format)',
                    }),
                  },
                  {
                    value: 'en',
                    label: l({
                      bn: 'ইংরেজি (English) - Commercial Trade Invoice',
                      en: 'English - Commercial Trade Invoice',
                      obro: 'English (Commercial Trade Invoice)',
                    }),
                  },
                  {
                    value: 'bilingual',
                    label: l({
                      bn: 'উভয় ভাষা (Bilingual Bangla + English)',
                      en: 'Bilingual (Bangla + English)',
                      obro: 'Ubhoi Bhasha (Bilingual)',
                    }),
                  },
                ]}
                helperText={l({
                  bn: 'প্রিন্ট মোডালে যেকোনো সময় মাউসের এক ক্লিকেই ভাষা পরিবর্তন করা যাবে',
                  en: 'Can be toggled instantly with one click on print preview modal',
                  obro: 'Print modal-e je kono shomoy 1-click-e change kora jabe',
                })}
              />
            </div>
          </CardContent>
        </Card>

        {/* 2. Currency & Inventory Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Coins className="h-4 w-4 text-blue-500" />
              <span>
                {l({
                  bn: 'মুদ্রা ও ইনভেন্টরি সীমা (Currency & Inventory)',
                  en: 'Currency & Inventory Thresholds',
                  obro: 'Currency & Inventory Thresholds',
                })}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Select
                label={l({
                  bn: 'সিস্টেমের মুদ্রা (System Currency)',
                  en: 'System Currency',
                  obro: 'System Currency',
                })}
                name="currency"
                value={formData.currency}
                onChange={handleChange}
                options={[
                  { value: 'BDT', label: 'BDT (৳ Bangladeshi Taka)' },
                  { value: 'USD', label: 'USD ($ US Dollar)' },
                  { value: 'EUR', label: 'EUR (€ Euro)' },
                  { value: 'GBP', label: 'GBP (£ British Pound)' },
                  { value: 'INR', label: 'INR (₹ Indian Rupee)' },
                ]}
                helperText={l({
                  bn: 'সকল পিওএস টেবিল, ক্যাটালগ ও চার্টে প্রযোজ্য',
                  en: 'Applies across all POS tables, catalogs & charts',
                  obro: 'Shokol POS table, catalog o chart-e projojjo',
                })}
              />

              <Input
                label={l({
                  bn: 'ডিফল্ট লো-স্টক সতর্কবার্তা সীমা',
                  en: 'Default Low Stock Threshold',
                  obro: 'Default Low Stock Threshold',
                })}
                type="number"
                name="defaultReorderLevel"
                value={formData.defaultReorderLevel}
                onChange={handleChange}
                helperText={l({
                  bn: 'নতুন পণ্যের জন্য স্বয়ংক্রিয় নিরাপত্তা সীমা',
                  en: 'Fallback safety point for new items',
                  obro: 'Notun product-er jonno fallback safety point',
                })}
              />

              <Select
                label={l({
                  bn: 'অনলাইন অর্ডারে স্টক কর্তন নীতি',
                  en: 'Storefront Order Stock Deduction Policy',
                  obro: 'Online Order Stock Deduction Policy',
                })}
                name="orderStockDeductionPolicy"
                value={formData.orderStockDeductionPolicy}
                onChange={handleChange}
                options={[
                  {
                    value: 'on_confirm',
                    label: l({
                      bn: 'অর্ডার নিশ্চিতকরণের সাথে সাথে স্টক কাটবে',
                      en: 'Deduct once on Order Confirmation',
                      obro: 'Order Confirm hole stock katbe',
                    }),
                  },
                  {
                    value: 'on_complete',
                    label: l({
                      bn: 'অর্ডার সম্পূর্ণ ডেলিভারির সময় স্টক কাটবে',
                      en: 'Deduct once on Order Delivery',
                      obro: 'Order Delivery hole stock katbe',
                    }),
                  },
                ]}
                helperText={l({
                  bn: 'নিরাপদ স্টক রিজার্ভেশন পদ্ধতি নিশ্চিত করে',
                  en: 'Enforces safe reservation policy',
                  obro: 'Safe stock reservation policy nishchit kore',
                })}
              />
            </div>
          </CardContent>
        </Card>

        {/* 3. Notifications & Appearance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-amber-500" />
              <span>
                {l({
                  bn: 'অ্যালার্ট ও থিম ডিসপ্লে (Alerts & Appearance)',
                  en: 'Alerts & Appearance',
                  obro: 'Alerts & Theme Appearance',
                })}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label={l({
                  bn: 'থিম মোড (Theme Mode)',
                  en: 'Theme Mode',
                  obro: 'Theme Mode',
                })}
                name="theme"
                value={formData.theme}
                onChange={handleChange}
                options={[
                  {
                    value: 'light',
                    label: l({
                      bn: 'লাইট (পরিষ্কার ও উজ্জ্বল)',
                      en: 'Light Clean Minimalist',
                      obro: 'Light Clean Minimalist',
                    }),
                  },
                  {
                    value: 'dark',
                    label: l({
                      bn: 'ডার্ক (উচ্চ কনট্রাস্ট)',
                      en: 'Dark High Contrast',
                      obro: 'Dark High Contrast',
                    }),
                  },
                ]}
              />

              <div className="flex flex-col justify-center space-y-2 pt-2">
                <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    name="notificationsEnabled"
                    checked={formData.notificationsEnabled}
                    onChange={handleChange}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>
                    {l({
                      bn: 'উপরের নোটিফিকেশন বেল অ্যালার্ট চালু রাখুন',
                      en: 'Enable top notification bell alerts',
                      obro: 'Top notification bell alert chalu rakhun',
                    })}
                  </span>
                </label>

                <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    name="lowStockAlerts"
                    checked={formData.lowStockAlerts}
                    onChange={handleChange}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>
                    {l({
                      bn: 'ওভারভিউ উইজেটে লো-স্টক সতর্কবার্তা প্রদর্শন করুন',
                      en: 'Show low-stock warnings in overview widgets',
                      obro: 'Overview widget-e low-stock warning dekhaben',
                    })}
                  </span>
                </label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Save button */}
        <div className="flex justify-end">
          <Button type="submit" variant="primary" size="md" icon={Save} isLoading={isSaving}>
            {l({
              bn: 'সেটিংস সংরক্ষণ করুন',
              en: 'Save Preferences',
              obro: 'Settings Save Korun',
            })}
          </Button>
        </div>
      </form>

      {/* 4. MERN Backend API Diagnostics */}
      <Card className="border-emerald-200/60 dark:border-emerald-800/40">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-slate-900 dark:text-white flex items-center gap-2">
              <Server className="h-4 w-4 text-emerald-500" />
              <span>
                {l({
                  bn: 'মার্ন স্ট্যাক এপিআই সার্ভার (Express.js ও MongoDB)',
                  en: 'MERN Stack API Server (Express.js & MongoDB)',
                  obro: 'MERN Stack API Server (Express.js & MongoDB)',
                })}
              </span>
            </CardTitle>
            <Badge variant={backendState.isOnline ? 'emerald' : 'amber'} size="sm">
              <Activity className="h-3 w-3" />
              {backendState.checking
                ? l({ bn: 'যাচাই করা হচ্ছে...', en: 'Checking...', obro: 'Checking...' })
                : backendState.isOnline
                ? l({ bn: 'অনলাইন (পোর্ট ৫০০০)', en: 'Online (Port 5000)', obro: 'Online (Port 5000)' })
                : l({ bn: 'অফলাইন (লোকাল ফলব্যাক)', en: 'Offline (LocalStorage Fallback)', obro: 'Offline (Local Fallback)' })}
            </Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {l({
              bn: 'নোড.জেএস এক্সপ্রেস রেস্ট এপিআই ও মঙ্গোডিবি ব্যাকএন্ড সংযোগের রিয়েল-টাইম ডায়াগনস্টিক।',
              en: 'Real-time diagnostics for the Node.js Express REST API backend and MongoDB connection.',
              obro: 'Node.js Express REST API ebong MongoDB connection-er real-time diagnostic.',
            })}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800">
              <span className="text-slate-400 font-semibold block uppercase text-[10px]">
                {l({ bn: 'এপিআই বেস ইউআরএল', en: 'API Base URL', obro: 'API Base URL' })}
              </span>
              <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">http://localhost:5000/api</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800">
              <span className="text-slate-400 font-semibold block uppercase text-[10px]">
                {l({ bn: 'ডাটাবেজ ইঞ্জিন', en: 'Database Engine', obro: 'Database Engine' })}
              </span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {backendState.details?.database || 'MongoDB (Auto-detect)'}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800">
              <span className="text-slate-400 font-semibold block uppercase text-[10px]">
                {l({ bn: 'সার্ভার প্রসেস', en: 'Server Process', obro: 'Server Process' })}
              </span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {backendState.isOnline
                  ? l({
                      bn: `চলমান: ${Math.round(backendState.details?.uptime || 0)} সেকেন্ড`,
                      en: `Uptime: ${Math.round(backendState.details?.uptime || 0)}s`,
                      obro: `Uptime: ${Math.round(backendState.details?.uptime || 0)}s`,
                    })
                  : 'npm run server'}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Terminal className="h-4 w-4 text-emerald-600" />
              <span>
                {l({
                  bn: 'ব্যাকএন্ড চালু করতে কমান্ড লাইনে চালান: ',
                  en: 'Run in terminal to launch backend daemon: ',
                  obro: 'Backend start korte command chalaben: ',
                })}
                <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[11px]">npm run server</code>
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              icon={Activity}
              onClick={handleTestBackend}
              isLoading={backendState.checking}
            >
              {l({
                bn: 'এপিআই সংযোগ পরীক্ষা করুন',
                en: 'Test API Connection',
                obro: 'Test API Connection',
              })}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 5. LocalStorage Data Management & Seed Reset */}
      <Card className="border-red-200/50 dark:border-red-900/30">
        <CardHeader>
          <CardTitle className="text-slate-900 dark:text-white flex items-center gap-2">
            <Database className="h-4 w-4 text-red-500" />
            <span>
              {l({
                bn: 'ডেমো ডেটা ব্যবস্থাপনা (ব্যাকআপ ও রিসেট)',
                en: 'Demo Data Management (LocalStorage)',
                obro: 'Demo Data Babosthapona (Backup & Reset)',
              })}
            </span>
          </CardTitle>
          <p className="text-xs text-slate-400">
            {l({
              bn: 'সম্পূর্ণ ডেটাবেজের JSON ব্যাকআপ ডাউনলোড করুন অথবা আদি রূপের সীড ডেটায় পুনরুদ্ধার করুন।',
              en: 'Export complete JSON database backup or restore pristine laboratory seed records.',
              obro: 'Shompurno database-er JSON backup export korun ba seed data-te restore korun.',
            })}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" icon={Download} onClick={handleExportBackup}>
                {l({
                  bn: 'ব্যাকআপ এক্সপোর্ট (JSON)',
                  en: 'Export Backup (JSON)',
                  obro: 'Export Backup (JSON)',
                })}
              </Button>
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportBackup}
                  className="hidden"
                />
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors">
                  <Upload className="h-4 w-4" />
                  {l({
                    bn: 'ব্যাকআপ ইম্পোর্ট করুন',
                    en: 'Import Backup',
                    obro: 'Import Backup',
                  })}
                </span>
              </label>
            </div>

            <Button
              variant="danger"
              size="sm"
              icon={RotateCcw}
              onClick={handleResetData}
            >
              {l({
                bn: 'সকল ডেমো ডেটা রিসেট করুন',
                en: 'Reset All Demo Data',
                obro: 'Shokol Demo Data Reset Korun',
              })}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
