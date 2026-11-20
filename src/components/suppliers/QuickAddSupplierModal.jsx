import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input, Select, Textarea } from '../forms/FormControls';
import { useAppData } from '../../context/AppDataContext';
import { Truck, Save, Plus, Building2, Phone, MapPin, User } from 'lucide-react';

export const QuickAddSupplierModal = ({ isOpen, onClose, onSuccess }) => {
  const { addSupplier } = useAppData();
  const [formData, setFormData] = useState({
    name: '',
    companyName: '',
    phone: '',
    email: '',
    address: '',
    contactPerson: '',
    supplierType: 'ship_scrap', // 'ship_scrap' | 'importer' | 'wholesaler' | 'auction'
    notes: '',
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setErrors({ name: 'সাপ্লায়ার বা ভেন্ডরের নাম আবশ্যক।' });
      return;
    }

    setIsSubmitting(true);
    const newSup = {
      name: formData.name.trim(),
      companyName: formData.companyName.trim() || formData.name.trim(),
      phone: formData.phone.trim(),
      email: formData.email.trim(),
      address: formData.address.trim(),
      contactPerson: formData.contactPerson.trim(),
      notes: formData.notes.trim() || `Type: ${formData.supplierType}`,
      status: 'active',
    };

    const res = addSupplier(newSup);
    setIsSubmitting(false);

    if (res.success && res.supplier) {
      if (onSuccess) {
        onSuccess(res.supplier);
      }
      onClose();
      // Reset form
      setFormData({
        name: '',
        companyName: '',
        phone: '',
        email: '',
        address: '',
        contactPerson: '',
        supplierType: 'ship_scrap',
        notes: '',
      });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      zIndex="z-[60]"
      title="নতুন সাপ্লায়ার বা ভেন্ডর যুক্ত করুন (Quick Add Supplier)"
      description="নতুন সাপ্লায়ার বা শিপ ব্রেকিং অকশনিয়ার এন্ট্রি দিন। এটি সাথে সাথে পুরো সিস্টেমে আপডেট হবে।"
      maxWidth="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="সাপ্লায়ার / ভেন্ডর নাম *"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="e.g. Bhatiari Ship Scrap Yard"
            error={errors.name}
            required
            autoFocus
          />

          <Input
            label="কোম্পানি / প্রতিষ্ঠানের নাম"
            name="companyName"
            value={formData.companyName}
            onChange={handleChange}
            placeholder="e.g. M/S. Sitakunda Ship Breakers Ltd."
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="মোবাইল / ফোন নম্বর"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            placeholder="e.g. 01819-234567"
          />

          <Input
            label="যোগাযোগের দায়িত্বে (Contact Person)"
            name="contactPerson"
            value={formData.contactPerson}
            onChange={handleChange}
            placeholder="e.g. হাজী শামসুল আলম (ইয়ার্ড ইনচার্জ)"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Select
            label="সাপ্লায়ারের ধরন / ক্যাটাগরি"
            name="supplierType"
            value={formData.supplierType}
            onChange={handleChange}
            options={[
              { value: 'ship_scrap', label: 'জাহাজ ভাঙ্গা ও নিলাম ইয়ার্ড (Ship Breaking Yard)' },
              { value: 'importer', label: 'সরাসরি আমদানিকারক (Direct Importer)' },
              { value: 'wholesaler', label: 'পাইকারি মহাজন / স্টকিস্ট (Wholesale Stockist)' },
              { value: 'auction', label: 'অকশন লট সেলার (Bulk Auctioneer)' },
              { value: 'local_vendor', label: 'স্থানীয় খুচরা ভেন্ডর (Local Vendor)' },
            ]}
          />

          <Input
            label="ইমেইল (যদি থাকে)"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="e.g. yard@bhatiari-spares.com"
          />
        </div>

        <Input
          label="ইয়ার্ড বা অফিসের ঠিকানা"
          name="address"
          value={formData.address}
          onChange={handleChange}
          placeholder="e.g. ভাটিয়ারী ইয়ার্ড-৪, সীতাকুণ্ড মহাসড়ক, চট্টগ্রাম"
        />

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>
            বাতিল
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            icon={Save}
            isLoading={isSubmitting}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
          >
            সাপ্লায়ার সংরক্ষণ করুন
          </Button>
        </div>
      </form>
    </Modal>
  );
};
