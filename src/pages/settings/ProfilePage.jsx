import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAppData } from '../../context/AppDataContext';
import { useLanguage } from '../../context/LanguageContext';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/forms/FormControls';
import { User, Mail, Phone, Building, Shield, Save, CheckCircle2 } from 'lucide-react';

export const ProfilePage = () => {
  const { currentUser, role, updateProfile } = useAuth();
  const { addToast } = useAppData();
  const { language, t } = useLanguage();

  const l = (texts) => {
    if (language === 'en') return texts.en;
    if (language === 'obro') return texts.obro || `${texts.bn} (${texts.en})`;
    return texts.bn;
  };

  const [formData, setFormData] = useState({
    name: currentUser?.name || '',
    email: currentUser?.email || '',
    phone: currentUser?.phone || '+880 1711-000000',
    department: currentUser?.department || 'Operations',
    avatar: currentUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  });

  const [isSaving, setIsSaving] = useState(false);

  const avatarPresets = [
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  ];

  const handleSave = (e) => {
    e.preventDefault();
    setIsSaving(true);
    setTimeout(() => {
      updateProfile(formData);
      setIsSaving(false);
      addToast({
        title: l({ bn: 'প্রোফাইল সংরক্ষিত হয়েছে', en: 'Profile Updated', obro: 'Profile Updated' }),
        message: l({ bn: 'আপনার প্রোফাইলের তথ্য সফলভাবে আপডেট হয়েছে।', en: 'Your profile changes have been saved.', obro: 'Profile changes saved.' }),
      });
    }, 250);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          {l({ bn: 'আমার অ্যাকাউন্ট প্রোফাইল', en: 'My Account Profile', obro: 'My Account Profile' })}
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          {l({ bn: 'ব্যক্তিগত যোগাযোগের তথ্য এবং অবতার ছবি আপডেট করুন।', en: 'Update personal contact information and display avatar.', obro: 'Personal contact o display avatar update korun.' })}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{l({ bn: 'ব্যক্তিগত তথ্য', en: 'Personal Information', obro: 'Personal Information' })}</CardTitle>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSave} className="space-y-6">
            {/* Avatar Header */}
            <div className="flex flex-col sm:flex-row items-center gap-5 pb-6 border-b border-slate-100 dark:border-slate-800">
              <img
                src={formData.avatar}
                alt=""
                className="w-20 h-20 rounded-full object-cover border-2 border-emerald-500 shadow-md shrink-0"
              />
              <div className="space-y-2 text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {formData.name}
                  </h3>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                    {l({ bn: 'ভূমিকা: ', en: 'Role: ', obro: 'Role: ' })}{role}
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  {l({ bn: 'প্রিসেট ছবি নির্বাচন করুন অথবা নিজস্ব লিংক দিন:', en: 'Select an avatar preset or enter custom image link:', obro: 'Avatar preset select korun ba custom link din:' })}
                </p>
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  {avatarPresets.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setFormData((p) => ({ ...p, avatar: preset }))}
                      className={`w-8 h-8 rounded-full overflow-hidden border-2 transition-all ${
                        formData.avatar === preset ? 'border-emerald-500 scale-110 shadow-sm' : 'border-transparent opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img src={preset} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label={l({ bn: 'পূর্ণ নাম', en: 'Full Name', obro: 'Full Name' })}
                icon={User}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />

              <Input
                label={l({ bn: 'ইমেইল ঠিকানা', en: 'Email Address', obro: 'Email Address' })}
                icon={Mail}
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label={l({ bn: 'ফোন নম্বর', en: 'Phone Number', obro: 'Phone Number' })}
                icon={Phone}
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />

              <Input
                label={l({ bn: 'বিভাগ / দায়িত্ব', en: 'Department', obro: 'Department' })}
                icon={Building}
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              />
            </div>

            <Input
              label={l({ bn: 'কাস্টম অবতার ইউআরএল', en: 'Custom Avatar URL', obro: 'Custom Avatar URL' })}
              value={formData.avatar}
              onChange={(e) => setFormData({ ...formData, avatar: e.target.value })}
              placeholder="https://..."
            />

            <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button type="submit" variant="primary" icon={Save} isLoading={isSaving}>
                {l({ bn: 'প্রোফাইল সংরক্ষণ করুন', en: 'Save Profile', obro: 'Save Profile' })}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
