import { storageService, STORAGE_KEYS } from './storageService';
import { apiClient } from './apiClient';
import { customerService } from './customerService';
import { INITIAL_QUOTATIONS } from '../data/seedData';

class QuotationService {
  getAll() {
    return storageService.getItem(STORAGE_KEYS.QUOTATIONS, INITIAL_QUOTATIONS);
  }

  getById(id) {
    const quotes = this.getAll();
    return quotes.find((q) => q.id === id || q._id === id || q.quotationNumber === id) || null;
  }

  create(data, preparedBy = 'Sales Executive') {
    const quotes = this.getAll();
    const count = quotes.length;
    const quotationNumber =
      data.quotationNumber?.trim() ||
      `QT-${new Date().getFullYear()}-${String(count + 541).padStart(4, '0')}`;

    const items = (data.items || []).map((it, idx) => {
      const qty = Number(it.quantity) || 1;
      const rate = Number(it.unitPrice || it.rate || it.price) || 0;
      const total = Number(it.lineTotal || it.amount || qty * rate) || 0;
      return {
        id: it.id || `qi-${Date.now()}-${idx}`,
        productId: it.productId || null,
        name: it.name || it.productName || 'Equipment Part',
        description: it.description || '',
        quantity: qty,
        unit: it.unit || 'pc',
        unitPrice: rate,
        lineTotal: total,
      };
    });

    const subtotal = items.reduce((sum, it) => sum + it.lineTotal, 0);
    const discount = Number(data.discount) || 0;
    const tax = Number(data.tax) || 0;
    const totalAmount = subtotal - discount + tax;

    // Auto-upsert customer if customer information provided
    let customerId = data.customerId;
    if (data.customerName && data.customerName.trim() && data.customerName !== 'Walk-in Retail Customer') {
      const cust = customerService.upsertCustomer({
        id: data.customerId,
        name: data.customerName,
        companyName: data.customerCompany,
        designationRole: data.customerRole,
        phone: data.customerPhone,
        email: data.customerEmail,
        address: data.customerAddress,
        location: data.customerLocation || data.customerAddress,
      });
      if (cust && cust.id) {
        customerId = cust.id;
      }
    }

    const newQuotation = {
      ...data,
      id: `quote-${Date.now()}`,
      quotationNumber,
      date: data.date || new Date().toISOString(),
      validUntil: data.validUntil || new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
      requisitionRef: data.requisitionRef?.trim() || '',
      customerId: customerId || null,
      customerName: data.customerName || 'Client Representative',
      customerCompany: data.customerCompany || '',
      customerRole: data.customerRole || 'owner',
      customerPhone: data.customerPhone || '',
      customerEmail: data.customerEmail || '',
      customerAddress: data.customerAddress || '',
      customerLocation: data.customerLocation || data.customerAddress || '',
      items,
      subtotal,
      discount,
      tax,
      totalAmount,
      status: data.status || 'draft', // 'draft', 'sent', 'approved', 'rejected', 'converted'
      termsAndConditions: data.termsAndConditions || '১. সকল মালামাল প্রাপ্যতা সাপেক্ষে সরবরাহ করা হইবে।\n২. ডেলিভারি সময়: কার্যাদেশ প্রাপ্তির ৩ কার্যদিবসের মধ্যে।\n৩. এই কোটেশনের মেয়াদ জারির তারিখ হইতে ১৫ দিন পর্যন্ত বৈধ।',
      notes: data.notes?.trim() || '',
      preparedBy,
      convertedSaleId: null,
      createdAt: new Date().toISOString(),
    };

    quotes.unshift(newQuotation);
    storageService.setItem(STORAGE_KEYS.QUOTATIONS, quotes);

    // Live sync to MongoDB Atlas
    apiClient.post('/quotations', {
      quotationNumber: newQuotation.quotationNumber,
      date: newQuotation.date,
      validUntil: newQuotation.validUntil,
      requisitionRef: newQuotation.requisitionRef,
      customerId: newQuotation.customerId,
      customerName: newQuotation.customerName,
      customerCompany: newQuotation.customerCompany,
      customerRole: newQuotation.customerRole,
      customerPhone: newQuotation.customerPhone,
      customerEmail: newQuotation.customerEmail,
      customerAddress: newQuotation.customerAddress,
      items: newQuotation.items,
      subtotal: newQuotation.subtotal,
      discount: newQuotation.discount,
      tax: newQuotation.tax,
      totalAmount: newQuotation.totalAmount,
      status: newQuotation.status,
      termsAndConditions: newQuotation.termsAndConditions,
      notes: newQuotation.notes,
    }).then((res) => {
      if (res?.data?._id) {
        const cur = storageService.getItem(STORAGE_KEYS.QUOTATIONS, []);
        const idx = cur.findIndex((q) => q.id === newQuotation.id);
        if (idx !== -1) {
          cur[idx].id = res.data._id;
          cur[idx]._id = res.data._id;
          storageService.setItem(STORAGE_KEYS.QUOTATIONS, cur);
        }
      }
    }).catch((err) => {
      console.warn('[MongoDB Quotation sync]:', err.message);
    });

    return { success: true, quotation: newQuotation };
  }

  update(id, updates) {
    const quotes = this.getAll();
    const index = quotes.findIndex((q) => q.id === id || q._id === id);
    if (index === -1) {
      return { success: false, message: 'Quotation not found.' };
    }

    quotes[index] = {
      ...quotes[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    storageService.setItem(STORAGE_KEYS.QUOTATIONS, quotes);

    apiClient.put(`/quotations/${id}`, updates).catch((err) => {
      console.warn('[MongoDB Quotation update notice]:', err.message);
    });

    return { success: true, quotation: quotes[index] };
  }

  remove(id) {
    const quotes = this.getAll();
    const quote = quotes.find((q) => q.id === id || q._id === id);
    if (!quote) {
      return { success: false, message: 'Quotation not found.' };
    }

    const filtered = quotes.filter((q) => q.id !== id && q._id !== id);
    storageService.setItem(STORAGE_KEYS.QUOTATIONS, filtered);

    apiClient.delete(`/quotations/${id}`).catch((err) => {
      console.warn('[MongoDB Quotation delete notice]:', err.message);
    });

    return { success: true, message: `Quotation ${quote.quotationNumber} removed.` };
  }
}

export const quotationService = new QuotationService();
