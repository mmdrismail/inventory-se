import React, { useState, useEffect } from 'react';
import { useAppData } from '../../context/AppDataContext';
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
      title: 'Backend Checked',
      message: 'Status refreshed. See MERN API status card below.',
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
        title: 'Settings Saved',
        message: 'Business profile and stationery preferences updated successfully.',
        type: 'success',
      });
    }, 250);
  };

  const handleResetData = () => {
    confirmAction({
      title: 'Reset All Local Demo Data?',
      message: 'This will restore all products, suppliers, customers, categories, transactions, and settings back to pristine seed data. Any newly added records will be replaced.',
      confirmText: 'Confirm Hard Reset',
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
    addToast({ title: 'Backup Exported', message: 'All demo data downloaded as JSON backup.' });
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
          System Preferences & Configuration
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Customize currency formatting, regional information, automated stock deduction policy, and backups.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* 1. Business Profile */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-4 w-4 text-emerald-500" />
              <span>Business Profile</span>
            </CardTitle>
            <p className="text-xs text-slate-400">
              Information displayed on printable receipts and invoices
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="প্রতিষ্ঠানের নাম (বাংলা)"
                name="businessName"
                value={formData.businessName}
                onChange={handleChange}
                helperText="ক্যাশ মেমো, চালান ও অফিশিয়াল প্যাডে প্রদর্শিত হবে"
                required
              />
              <Input
                label="Company Name (English)"
                name="businessNameEn"
                value={formData.businessNameEn}
                onChange={handleChange}
                helperText="Displayed in English invoices & export pads"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="স্বত্বাধিকারী / প্রোপ্রাইটর (বাংলা)"
                name="proprietor"
                value={formData.proprietor}
                onChange={handleChange}
                placeholder="যেমন: মোঃ রুহুল আমিন (লিটন)"
              />
              <Input
                label="Proprietor Name (English)"
                name="proprietorEn"
                value={formData.proprietorEn}
                onChange={handleChange}
                placeholder="e.g. Md. Ruhul Amin (Liton)"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="যোগাযোগের মোবাইল / ফোন"
                name="businessPhone"
                value={formData.businessPhone}
                onChange={handleChange}
                required
              />
              <Input
                label="অফিসিয়াল ইমেইল"
                type="email"
                name="businessEmail"
                value={formData.businessEmail}
                onChange={handleChange}
                required
              />
              <Input
                label="BIN / ভ্যাট নিবন্ধন নম্বর"
                name="bin"
                value={formData.bin}
                onChange={handleChange}
                placeholder="BIN-001651149-0505"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="প্রতিষ্ঠানের ঠিকানা (বাংলা)"
                name="address"
                value={formData.address}
                onChange={handleChange}
                required
              />
              <Input
                label="Facility Address (English)"
                name="addressEn"
                value={formData.addressEn}
                onChange={handleChange}
                placeholder="e.g. 406, C.D.A Market, Pahartali, Chattogram"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Textarea
                label="ব্যবসার বিবরণী ও পণ্যের পরিধি (বাংলা)"
                name="businessScope"
                value={formData.businessScope}
                onChange={handleChange}
                rows={2}
                helperText="মেমোর হেডারের নিচে বক্স আকারে প্রদর্শিত হবে"
              />
              <Textarea
                label="Business Scope & Goods Description (English)"
                name="businessScopeEn"
                value={formData.businessScopeEn}
                onChange={handleChange}
                rows={2}
                helperText="Appears below header on English trade pads"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="বিক্রয় শর্ত ও নোটিশ (বাংলা)"
                name="disclaimer"
                value={formData.disclaimer}
                onChange={handleChange}
                placeholder="বিঃদ্রঃ উপরোক্ত মালামাল ভালো অবস্থায় বুঝিয়া পাইলাম।"
              />
              <Input
                label="Return Policy / Disclaimer (English)"
                name="disclaimerEn"
                value={formData.disclaimerEn}
                onChange={handleChange}
                placeholder="Notice: Received goods in good condition."
              />
            </div>

            <div className="pt-1">
              <Select
                label="ডিফল্ট ডকুমেন্ট ভাষা (Default Print Language)"
                name="docLanguage"
                value={formData.docLanguage}
                onChange={handleChange}
                options={[
                  { value: 'bn', label: 'বাংলা (Bangla) - মেসার্স শান্তা রেফ্রিজারেশন' },
                  { value: 'en', label: 'English - Commercial Trade Invoice' },
                  { value: 'bilingual', label: 'উভয় ভাষা (Bilingual Bangla + English)' },
                ]}
                helperText="প্রিন্ট মোডালে যেকোনো সময় মাউসের এক ক্লিকেই ভাষা পরিবর্তন করা যাবে"
              />
            </div>
          </CardContent>
        </Card>

        {/* 2. Currency & Inventory Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Coins className="h-4 w-4 text-blue-500" />
              <span>Currency & Inventory Thresholds</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Select
                label="System Currency"
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
                helperText="Applies across all POS tables, catalogs & charts"
              />

              <Input
                label="Default Low Stock Threshold"
                type="number"
                name="defaultReorderLevel"
                value={formData.defaultReorderLevel}
                onChange={handleChange}
                helperText="Fallback safety point for new items"
              />

              <Select
                label="Storefront Order Stock Deduction Policy"
                name="orderStockDeductionPolicy"
                value={formData.orderStockDeductionPolicy}
                onChange={handleChange}
                options={[
                  { value: 'on_confirm', label: 'Deduct once on Order Confirmation' },
                  { value: 'on_complete', label: 'Deduct once on Order Delivery' },
                ]}
                helperText="Enforces safe reservation policy"
              />
            </div>
          </CardContent>
        </Card>

        {/* 3. Notifications & Appearance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-amber-500" />
              <span>Alerts & Appearance</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Theme Mode"
                name="theme"
                value={formData.theme}
                onChange={handleChange}
                options={[
                  { value: 'light', label: 'Light Clean Minimalist' },
                  { value: 'dark', label: 'Dark High Contrast' },
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
                  <span>Enable top notification bell alerts</span>
                </label>

                <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    name="lowStockAlerts"
                    checked={formData.lowStockAlerts}
                    onChange={handleChange}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Show low-stock warnings in overview widgets</span>
                </label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Save button */}
        <div className="flex justify-end">
          <Button type="submit" variant="primary" size="md" icon={Save} isLoading={isSaving}>
            Save Preferences
          </Button>
        </div>
      </form>

      {/* 4. MERN Backend API Diagnostics */}
      <Card className="border-emerald-200/60 dark:border-emerald-800/40">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-slate-900 dark:text-white flex items-center gap-2">
              <Server className="h-4 w-4 text-emerald-500" />
              <span>MERN Stack API Server (Express.js & MongoDB)</span>
            </CardTitle>
            <Badge variant={backendState.isOnline ? 'emerald' : 'amber'} size="sm">
              <Activity className="h-3 w-3" />
              {backendState.checking
                ? 'Checking...'
                : backendState.isOnline
                ? 'Online (Port 5000)'
                : 'Offline (LocalStorage Fallback)'}
            </Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Real-time diagnostics for the Node.js Express REST API backend and MongoDB connection.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800">
              <span className="text-slate-400 font-semibold block uppercase text-[10px]">API Base URL</span>
              <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">http://localhost:5000/api</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800">
              <span className="text-slate-400 font-semibold block uppercase text-[10px]">Database Engine</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {backendState.details?.database || 'MongoDB (Auto-detect)'}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800">
              <span className="text-slate-400 font-semibold block uppercase text-[10px]">Server Process</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {backendState.isOnline ? `Uptime: ${Math.round(backendState.details?.uptime || 0)}s` : 'npm run server'}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Terminal className="h-4 w-4 text-emerald-600" />
              <span>Run <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[11px]">npm run server</code> to launch backend daemon</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              icon={Activity}
              onClick={handleTestBackend}
              isLoading={backendState.checking}
            >
              Test API Connection
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 5. LocalStorage Data Management & Seed Reset */}
      <Card className="border-red-200/50 dark:border-red-900/30">
        <CardHeader>
          <CardTitle className="text-slate-900 dark:text-white flex items-center gap-2">
            <Database className="h-4 w-4 text-red-500" />
            <span>Demo Data Management (LocalStorage)</span>
          </CardTitle>
          <p className="text-xs text-slate-400">
            Export complete JSON database backup or restore pristine laboratory seed records.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" icon={Download} onClick={handleExportBackup}>
                Export Backup (JSON)
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
                  Import Backup
                </span>
              </label>
            </div>

            <Button
              variant="danger"
              size="sm"
              icon={RotateCcw}
              onClick={handleResetData}
            >
              Reset All Demo Data
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
