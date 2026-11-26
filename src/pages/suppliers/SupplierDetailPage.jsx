import React, { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAppData } from '../../context/AppDataContext';
import { useLanguage } from '../../context/LanguageContext';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { BackLink } from '../../components/common/BackLink';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { ArrowLeft, Truck, Mail, Phone, MapPin, ShoppingCart, Eye, Plus } from 'lucide-react';

export const SupplierDetailPage = () => {
  const { id } = useParams();
  const { suppliers, purchases, settings } = useAppData();
  const { language, t } = useLanguage();

  const l = (texts) => {
    if (language === 'en') return texts.en;
    if (language === 'obro') return texts.obro || `${texts.bn} (${texts.en})`;
    return texts.bn;
  };

  const supplier = suppliers.find((s) => s.id === id);

  const supplierPurchases = useMemo(() => {
    return purchases.filter((p) => p.supplierId === id);
  }, [purchases, id]);

  const totalSpent = useMemo(() => {
    return supplierPurchases
      .filter((p) => p.status === 'received')
      .reduce((sum, p) => sum + (Number(p.total) || 0), 0);
  }, [supplierPurchases]);

  if (!supplier) {
    return (
      <div className="py-12 text-center space-y-4">
        <h2 className="text-xl font-bold">{l({ bn: 'সরবরাহকারী পাওয়া যায়নি', en: 'Supplier Not Found', obro: 'Supplier Not Found' })}</h2>
        <Link to="/suppliers">
          <Button variant="primary">{l({ bn: 'সরবরাহকারী তালিকায় ফিরুন', en: 'Return to Supplier Directory', obro: 'Supplier Directory-te Ferot Jan' })}</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div className="flex items-center justify-between">
        <BackLink to="/suppliers">
          {l({ bn: 'সরবরাহকারী তালিকায় ফিরে যান', en: 'Back to Suppliers', obro: 'Back to Suppliers' })}
        </BackLink>

        <Link to="/purchases/new">
          <Button variant="primary" size="sm" icon={Plus}>
            {l({ bn: 'নতুন ক্রয় অর্ডার (PO)', en: 'Create Purchase Order', obro: 'Create Purchase Order' })}
          </Button>
        </Link>
      </div>

      {/* Supplier Profile Card */}
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-200/50 dark:border-blue-800/50">
              <Truck className="h-7 w-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white" data-transliterate="true">
                  {supplier.name}
                </h1>
                <Badge variant={supplier.status === 'active' ? 'emerald' : 'slate'} size="sm">
                  {supplier.status === 'active'
                    ? l({ bn: 'সক্রিয়', en: 'ACTIVE', obro: 'ACTIVE' })
                    : l({ bn: 'নিষ্ক্রিয়', en: 'INACTIVE', obro: 'INACTIVE' })}
                </Badge>
              </div>
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mt-0.5" data-transliterate="true">
                {supplier.companyName}
              </p>
              {supplier.notes && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 max-w-xl" data-transliterate="true">
                  {supplier.notes}
                </p>
              )}
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="flex sm:flex-col items-end gap-2 text-right">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                {l({ bn: 'মোট ক্রয় ব্যয়', en: 'Total Spend', obro: 'Total Spend' })}
              </span>
              <span className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                {formatCurrency(totalSpent, settings.currency)}
              </span>
            </div>
            <div className="text-xs text-slate-500">
              {supplierPurchases.length} {l({ bn: 'টি পারচেজ অর্ডার', en: 'purchase order(s)', obro: 'PO' })}
            </div>
          </div>
        </div>

        {/* Contact details row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 mt-6 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
            <Mail className="h-4 w-4 text-slate-400 shrink-0" />
            <span>{supplier.email || l({ bn: 'ইমেইল নিবন্ধিত নেই', en: 'No email registered', obro: 'No email' })}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
            <Phone className="h-4 w-4 text-slate-400 shrink-0" />
            <span>{supplier.phone || l({ bn: 'ফোন নিবন্ধিত নেই', en: 'No phone registered', obro: 'No phone' })}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
            <MapPin className="h-4 w-4 text-slate-400 shrink-0" />
            <span className="truncate">{supplier.address || l({ bn: 'ঠিকানা নিবন্ধিত নেই', en: 'No address registered', obro: 'No address' })}</span>
          </div>
        </div>
      </Card>

      {/* Associated Purchase Orders Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-emerald-500" />
              <span>{l({ bn: 'পণ্য ক্রয় ও সরবরাহের ইতিহাস', en: 'Purchase Orders & Intake History', obro: 'Purchase Orders & Intake History' })}</span>
            </CardTitle>
            <p className="text-xs text-slate-400 mt-0.5">
              {supplier.name} {l({ bn: '-এর নিকট জারিকৃত অতীতের ক্রয় অর্ডারসমূহ', en: '- historical purchase orders', obro: '- historical purchase orders' })}
            </p>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-y border-slate-200 dark:border-slate-800 text-slate-500 uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-4">{l({ bn: 'পিও রেফারেন্স', en: 'PO Reference', obro: 'PO Reference' })}</th>
                  <th className="py-2.5 px-3">{l({ bn: 'তারিখ', en: 'Date', obro: 'Date' })}</th>
                  <th className="py-2.5 px-3 text-center">{l({ bn: 'আইটেম', en: 'Items', obro: 'Items' })}</th>
                  <th className="py-2.5 px-3 text-right">{l({ bn: 'মোট মূল্য', en: 'Order Total', obro: 'Order Total' })}</th>
                  <th className="py-2.5 px-3 text-center">{l({ bn: 'পেমেন্ট', en: 'Payment', obro: 'Payment' })}</th>
                  <th className="py-2.5 px-3 text-center">{l({ bn: 'অবস্থা', en: 'Status', obro: 'Status' })}</th>
                  <th className="py-2.5 px-4 text-right">{l({ bn: 'অ্যাকশন', en: 'Action', obro: 'Action' })}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {supplierPurchases.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-8 text-center text-slate-400">
                      {l({
                        bn: 'এই সরবরাহকারীর জন্য এখনও কোনো ক্রয় অর্ডার তৈরি করা হয়নি।',
                        en: 'No purchase orders recorded for this supplier yet.',
                        obro: 'Kono purchase order record hoyni.',
                      })}
                    </td>
                  </tr>
                ) : (
                  supplierPurchases.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="py-2.5 px-4 font-mono font-semibold text-emerald-600">
                        <Link to={`/purchases/${p.id}`} className="hover:underline">
                          {p.referenceNo}
                        </Link>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
                        {formatDate(p.date)}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono">
                        {(p.items || []).length}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                        {formatCurrency(p.total, settings.currency)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            p.paymentStatus === 'paid'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                              : 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300'
                          }`}
                        >
                          {p.paymentStatus === 'paid'
                            ? l({ bn: 'পরিশোধিত', en: 'PAID', obro: 'PAID' })
                            : l({ bn: 'বকেয়া', en: 'PENDING', obro: 'PENDING' })}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            p.status === 'received'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : p.status === 'cancelled'
                              ? 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300'
                              : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                          }`}
                        >
                          {p.status === 'received'
                            ? l({ bn: 'গৃহীত', en: 'RECEIVED', obro: 'RECEIVED' })
                            : p.status === 'cancelled'
                            ? l({ bn: 'বাতিল', en: 'CANCELLED', obro: 'CANCELLED' })
                            : p.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <Link to={`/purchases/${p.id}`}>
                          <button className="p-1 rounded-lg text-slate-400 hover:text-emerald-600">
                            <Eye className="h-4 w-4" />
                          </button>
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
