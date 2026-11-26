import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppData } from '../../context/AppDataContext';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { Input, Select, Textarea } from '../../components/forms/FormControls';
import { EmptyState, Pagination } from '../../components/common/EmptyState';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { getUnitSelectOptions } from '../../utils/units';
import { exportToCSV } from '../../utils/csv';
import { QuickAddSupplierModal } from '../../components/suppliers/QuickAddSupplierModal';
import { LotBarcodePrintModal } from '../../components/products/LotBarcodePrintModal';
import { generateStickerPriceDisplay, calculateTierDefaults } from '../../utils/priceCipher';
import { useLanguage } from '../../context/LanguageContext';
import {
  Plus,
  Download,
  RefreshCw,
  Search,
  ShoppingCart,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowUpDown,
  Layers,
  Ship,
  MapPin,
  Boxes,
  Tag,
  Check,
  ChevronRight,
  Trash2,
  AlertCircle,
  Barcode,
  Printer,
  Wrench,
  KeyRound,
} from 'lucide-react';

export const PurchaseListPage = () => {
  const {
    purchases,
    lotPurchases,
    suppliers,
    receivePurchase,
    cancelPurchase,
    createLotPurchase,
    distributeLotToInventory,
    reloadState,
    confirmAction,
    settings,
    products,
  } = useAppData();

  const { t, language } = useLanguage();

  const [activeTab, setActiveTab] = useState('regular'); // 'regular' | 'lots'
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [sortField, setSortField] = useState('date');
  const [sortDirection, setSortDirection] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;
  const navigate = useNavigate();

  // Quick Add Supplier Modal state
  const [isAddSupplierOpen, setIsAddSupplierOpen] = useState(false);

  // Lot Barcode Print Modal state
  const [selectedLotForPrint, setSelectedLotForPrint] = useState(null);

  // New Lot Modal state
  const [isNewLotModalOpen, setIsNewLotModalOpen] = useState(false);
  const [autoRegisterInCatalog, setAutoRegisterInCatalog] = useState(true);
  const [openLabelPrintAfterSave, setOpenLabelPrintAfterSave] = useState(true);

  // Deduplicate suppliers list so no duplicate names ever appear
  const uniqueSuppliers = useMemo(() => {
    const map = new Map();
    (suppliers || []).forEach((s) => {
      const key = s.name?.trim().toLowerCase();
      if (key && !map.has(key)) {
        map.set(key, s);
      }
    });
    return Array.from(map.values());
  }, [suppliers]);

  const [newLotForm, setNewLotForm] = useState({
    lotNumber: `LOT-${new Date().getFullYear()}-${Math.floor(10 + Math.random() * 90)}`,
    lotName: '',
    sourceType: 'ship_scrap',
    sourceShip: '',
    supplierId: uniqueSuppliers[0]?.id || '',
    totalLotCost: '',
    transportCost: '0',
    laborDismantleCost: '0',
    otherExpenses: '0',
    notes: '',
  });

  const [lotItems, setLotItems] = useState([
    {
      partName: 'Bitzer 4EC Semi-Hermetic Compressor (কম্প্রেসার)',
      itemType: 'compressor',
      condition: 'reconditioned',
      brand: 'Bitzer',
      modelNumber: '4EC-4.2',
      quantity: 2,
      unit: 'unit',
      allocatedCost: 65000,
      targetSellingPrice: 110000,
      zone: 'Zone-A',
      aisle: '02',
      rack: '01',
      shelf: '1',
      bin: 'A',
    },
    {
      partName: 'Connecting Rod with Piston Complete (পিস্টন রড সেট)',
      itemType: 'parts',
      condition: 'original_oem',
      brand: 'Bitzer',
      modelNumber: '4EC-4.2',
      quantity: 12,
      unit: 'pc',
      allocatedCost: 4500,
      targetSellingPrice: 10000,
      zone: 'Zone-A',
      aisle: '02',
      rack: '04',
      shelf: '3',
      bin: 'B',
    },
  ]);

  // Map suppliers
  const supMap = useMemo(() => {
    const map = {};
    uniqueSuppliers.forEach((s) => (map[s.id] = s.name));
    return map;
  }, [uniqueSuppliers]);

  // Filtering & Sorting for regular purchases
  const filteredPurchases = useMemo(() => {
    return (purchases || [])
      .filter((p) => {
        const matchesSearch =
          !searchTerm ||
          p.referenceNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (supMap[p.supplierId] && supMap[p.supplierId].toLowerCase().includes(searchTerm.toLowerCase()));

        const matchesSupplier = !selectedSupplier || p.supplierId === selectedSupplier;
        const matchesStatus = !selectedStatus || p.status === selectedStatus;

        return matchesSearch && matchesSupplier && matchesStatus;
      })
      .sort((a, b) => {
        let valA = a[sortField];
        let valB = b[sortField];

        if (sortField === 'date') {
          valA = new Date(valA).getTime();
          valB = new Date(valB).getTime();
        }

        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
  }, [purchases, searchTerm, selectedSupplier, selectedStatus, sortField, sortDirection, supMap]);

  // Filtering for lot purchases
  const filteredLots = useMemo(() => {
    return (lotPurchases || []).filter((lot) => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        lot.lotNumber?.toLowerCase().includes(term) ||
        lot.lotName?.toLowerCase().includes(term) ||
        lot.sourceShip?.toLowerCase().includes(term)
      );
    });
  }, [lotPurchases, searchTerm]);

  // Pagination
  const paginatedPurchases = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredPurchases.slice(start, start + pageSize);
  }, [filteredPurchases, currentPage]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleReceive = (purchase) => {
    confirmAction({
      title: `Receive Purchase Order ${purchase.referenceNo}?`,
      message: `Receiving this order will automatically increase stock quantities for ${(purchase.items || []).length} item(s) and create inventory movement records.`,
      confirmText: 'Confirm Receipt & Update Stock',
      onConfirm: () => {
        receivePurchase(purchase.id, 'Purchasing Staff');
      },
    });
  };

  const handleCancel = (purchase) => {
    confirmAction({
      title: `Cancel Purchase Order ${purchase.referenceNo}?`,
      message: purchase.status === 'received'
        ? 'Warning: This purchase has already been received into stock. Cancelling it will safely reverse the added inventory quantities.'
        : 'Are you sure you want to cancel this draft purchase order?',
      confirmText: 'Cancel Purchase',
      isDestructive: true,
      onConfirm: () => {
        cancelPurchase(purchase.id, 'Admin');
      },
    });
  };

  const handleDistributeLot = (lot) => {
    confirmAction({
      title: `বাল্ক লট #${lot.lotNumber} ওয়্যারহাউজে বণ্টন করবেন?`,
      message: `এই লটের ${lot.items?.length || 0} ধরনের মালামাল সরাসরি একটিভ ইনভেন্টরি স্টক ও নির্দিষ্ট র‍্যাক/শেলফ লোকেশনে যুক্ত হবে।`,
      confirmText: 'বণ্টন নিশ্চিত করুন ও স্টক বৃদ্ধি করুন',
      onConfirm: () => {
        distributeLotToInventory(lot.id, 'Warehouse Master');
      },
    });
  };

  const handleAddLotItemRow = () => {
    setLotItems((prev) => [
      ...prev,
      {
        partName: '',
        itemType: 'parts',
        condition: 'reconditioned',
        brand: 'Bitzer',
        modelNumber: '',
        quantity: 1,
        unit: 'pc',
        allocatedCost: 0,
        staffPrice: 0,
        managerPrice: 0,
        targetSellingPrice: 0,
        priceCode: '',
        zone: 'Zone-A',
        aisle: '01',
        rack: '01',
        shelf: '1',
        bin: 'A',
      },
    ]);
  };

  const handleUpdateLotItem = (idx, field, val) => {
    setLotItems((prev) => {
      const copy = [...prev];
      const item = { ...copy[idx], [field]: val };
      if (field === 'allocatedCost') {
        const cost = Number(val) || 0;
        if (!item.staffPrice || Number(item.staffPrice) === 0) item.staffPrice = Math.round(cost * 1.3);
        if (!item.managerPrice || Number(item.managerPrice) === 0) item.managerPrice = Math.round(cost * 1.5);
        if (!item.targetSellingPrice || Number(item.targetSellingPrice) === 0) item.targetSellingPrice = Math.round(cost * 1.8);
      }
      copy[idx] = item;
      return copy;
    });
  };

  const handleRemoveLotItem = (idx) => {
    setLotItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleOpenLotLabelPreview = (itemIndex = null) => {
    const formattedItems = lotItems.map((it, idx) => {
      const zoneLetter = it.zone?.replace(/[^A-Za-z]/g, '').slice(-1) || 'A';
      const locCode = `${zoneLetter}-${String(it.aisle || '01').padStart(2, '0')}-${String(it.rack || '01').padStart(2, '0')}-${it.shelf || '1'}-${String(it.bin || 'A').toUpperCase()}`;
      const buy = Number(it.allocatedCost) || 0;
      const staff = Number(it.staffPrice) || Math.round(buy * 1.3);
      const mgr = Number(it.managerPrice) || Math.round(buy * 1.5);
      const cust = Number(it.targetSellingPrice) || Math.round(buy * 1.8);
      const code = generateStickerPriceDisplay({
        buyingPrice: buy,
        staffPrice: staff,
        managerPrice: mgr,
        customerPrice: cust,
        format: 'role_code',
      });
      return {
        partName: it.partName || `মালামাল #${idx + 1}`,
        itemType: it.itemType || 'parts',
        condition: it.condition || 'reconditioned',
        brand: it.brand || 'Bitzer',
        modelNumber: it.modelNumber || '',
        quantity: Number(it.quantity) || 1,
        unit: it.unit || 'pc',
        allocatedCost: buy,
        staffPrice: staff,
        managerPrice: mgr,
        targetSellingPrice: cust,
        customerPrice: cust,
        priceCode: code,
        warehouseLocation: {
          zone: it.zone || 'Zone-A',
          aisle: `Aisle-${String(it.aisle || '01').padStart(2, '0')}`,
          rack: `Rack-${String(it.rack || '01').padStart(2, '0')}`,
          shelf: `Shelf-${it.shelf || '1'}`,
          bin: `Bin-${String(it.bin || 'A').toUpperCase()}`,
          code: locCode,
        },
      };
    });

    const previewLot = {
      id: 'preview_lot_temp',
      lotNumber: newLotForm.lotNumber || 'LOT-2026-PREVIEW',
      lotName: newLotForm.lotName || 'নিলাম লট প্রিভিউ',
      sourceShip: newLotForm.sourceShip || 'MV Ocean Star',
      supplierId: newLotForm.supplierId,
      items: itemIndex !== null ? [formattedItems[itemIndex]] : formattedItems,
      purchaseDate: new Date().toISOString(),
    };

    setSelectedLotForPrint(previewLot);
  };

  const handleCreateLotSubmit = (e) => {
    e.preventDefault();
    if (!newLotForm.lotName.trim()) {
      alert('অনুগ্রহ করে লটের নাম লিখুন।');
      return;
    }
    const totalCost = Number(newLotForm.totalLotCost) || 0;
    if (totalCost <= 0) {
      alert('অনুগ্রহ করে সম্পূর্ণ লট কেনার মোট খরচ (টাকা) উল্লেখ করুন।');
      return;
    }

    const formattedItems = lotItems.map((it) => {
      const zoneLetter = it.zone?.replace(/[^A-Za-z]/g, '').slice(-1) || 'A';
      const locCode = `${zoneLetter}-${String(it.aisle || '01').padStart(2, '0')}-${String(it.rack || '01').padStart(2, '0')}-${it.shelf || '1'}-${String(it.bin || 'A').toUpperCase()}`;
      const buy = Number(it.allocatedCost) || 0;
      const staff = Number(it.staffPrice) || Math.round(buy * 1.3);
      const mgr = Number(it.managerPrice) || Math.round(buy * 1.5);
      const cust = Number(it.targetSellingPrice) || Math.round(buy * 1.8);
      const code = generateStickerPriceDisplay({
        buyingPrice: buy,
        staffPrice: staff,
        managerPrice: mgr,
        customerPrice: cust,
        format: 'role_code',
      });
      return {
        partName: it.partName || 'Machinery Equipment',
        itemType: it.itemType || 'parts',
        condition: it.condition || 'reconditioned',
        brand: it.brand || '',
        modelNumber: it.modelNumber || '',
        quantity: Number(it.quantity) || 1,
        unit: it.unit || 'pc',
        allocatedCost: buy,
        staffPrice: staff,
        managerPrice: mgr,
        targetSellingPrice: cust,
        customerPrice: cust,
        priceCode: code,
        warehouseLocation: {
          zone: it.zone,
          aisle: `Aisle-${String(it.aisle).padStart(2, '0')}`,
          rack: `Rack-${String(it.rack).padStart(2, '0')}`,
          shelf: `Shelf-${it.shelf}`,
          bin: `Bin-${String(it.bin).toUpperCase()}`,
          code: locCode,
        },
      };
    });

    const res = createLotPurchase({
      ...newLotForm,
      items: formattedItems,
      purchaseDate: new Date().toISOString(),
    });

    if (res.success && res.lot) {
      // Auto-register in product inventory if checked
      if (autoRegisterInCatalog) {
        distributeLotToInventory(res.lot.id, 'Warehouse Master');
      }

      // Open barcode stickers modal if checked
      if (openLabelPrintAfterSave) {
        setSelectedLotForPrint(res.lot);
      }
    }

    setIsNewLotModalOpen(false);
    setActiveTab('lots');
  };

  const handleExportCSV = () => {
    const dataToExport = filteredPurchases.map((p) => ({
      'Reference No': p.referenceNo,
      'Supplier': supMap[p.supplierId] || 'Direct',
      'Date': p.date,
      'Items Count': (p.items || []).length,
      'Subtotal': p.subtotal,
      'Total Amount': p.total,
      'Payment Status': p.paymentStatus,
      'Status': p.status,
    }));
    exportToCSV(dataToExport, `stockline_purchases_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const handlePrintRegularPurchaseBarcodes = (purchase) => {
    const printLot = {
      id: purchase.id,
      lotNumber: purchase.referenceNo || 'PO',
      lotName: `Purchase Order #${purchase.referenceNo}`,
      sourceShip: supMap[purchase.supplierId] || 'Supplier Consignment',
      items: (purchase.items || []).map((it, idx) => {
        const prod = products.find((pr) => pr.id === it.productId);
        const loc = prod?.warehouseLocation || {};
        const locCode = loc.code || (loc.rack ? `${loc.zone || 'A'}-${loc.rack}` : 'A-01-01-1-A');
        const cost = Number(it.unitCost) || Number(prod?.costPrice) || 0;
        const staff = Number(prod?.staffPrice) || Math.round(cost * 1.3);
        const mgr = Number(prod?.managerPrice) || Math.round(cost * 1.5);
        const cust = Number(prod?.sellingPrice) || Math.round(cost * 1.8);
        return {
          partName: it.productName || prod?.name || `Item #${idx + 1}`,
          brand: prod?.brand || 'Industrial',
          modelNumber: prod?.modelNumber || '',
          condition: prod?.condition || 'new',
          quantity: Number(it.quantity) || 1,
          unit: prod?.unit || 'pc',
          allocatedCost: cost,
          staffPrice: staff,
          managerPrice: mgr,
          targetSellingPrice: cust,
          customerPrice: cust,
          warehouseLocation: {
            code: locCode,
          },
        };
      }),
    };
    setSelectedLotForPrint(printLot);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {t('purchases_title', 'Procurement & Lot Purchases')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t('purchases_subtitle', 'আইটেমভিত্তিক পারচেজ অর্ডার এবং জাহাজ অকশন বাল্ক লট ডিসম্যাণ্টল ও র‍্যাক লোকেশন বণ্টন')}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" icon={RefreshCw} onClick={reloadState}>
            {t('btn_refresh', 'Refresh')}
          </Button>

          {activeTab === 'lots' ? (
            <Button
              variant="primary"
              size="sm"
              icon={Plus}
              onClick={() => setIsNewLotModalOpen(true)}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
            >
              {t('action_new_lot_entry', 'নতুন নিলাম লট এন্ট্রি')}
            </Button>
          ) : (
            <>
              <Button variant="outline" size="sm" icon={Download} onClick={handleExportCSV}>
                {t('btn_export_csv', 'Export CSV')}
              </Button>
              <Link to="/purchases/new">
                <Button variant="primary" size="sm" icon={Plus}>
                  {t('action_create_purchase', 'Create Purchase')}
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Primary Tab Switcher */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 w-fit">
        <button
          type="button"
          onClick={() => setActiveTab('regular')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'regular'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <ShoppingCart className="h-4 w-4 text-emerald-500" />
          <span>{t('tab_regular_purchases', 'নিয়মিত পারচেজ অর্ডার')} ({purchases?.length || 0})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('lots')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'lots'
              ? 'bg-amber-500 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Ship className="h-4 w-4" />
          <span>{t('tab_lot_purchases', 'জাহাজ নিলাম ও বাল্ক লট কেনা')} ({lotPurchases?.length || 0})</span>
        </button>
      </div>

      {/* ================= TAB 1: REGULAR PURCHASES ================= */}
      {activeTab === 'regular' && (
        <div className="space-y-4">
          {/* Filter and Search */}
          <Card className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              <div className="relative sm:col-span-2">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder={t('search_purchases_placeholder', 'Search by reference PO number or supplier name...')}
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div>
                <select
                  value={selectedSupplier}
                  onChange={(e) => {
                    setSelectedSupplier(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="">{t('all_suppliers', 'All Suppliers')}</option>
                  {uniqueSuppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  value={selectedStatus}
                  onChange={(e) => {
                    setSelectedStatus(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="">{t('all_order_statuses', 'All Order Statuses')}</option>
                  <option value="draft">Draft (Stock Not Added)</option>
                  <option value="received">{t('status_received', 'Received (Stock Added)')}</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>
          </Card>

          {/* Table Card */}
          <Card className="overflow-hidden">
            {filteredPurchases.length === 0 ? (
              <EmptyState
                title="No purchase orders found"
                description="Try modifying your filters or create a new purchase order."
                actionText="Create Purchase Order"
                onAction={() => navigate('/purchases/new')}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase text-[10px] tracking-wider select-none">
                    <tr>
                      <th className="py-3 px-4">{t('col_po_ref', 'PO Reference')}</th>
                      <th className="py-3 px-3">{t('col_supplier', 'Supplier')}</th>
                      <th
                        className="py-3 px-3 cursor-pointer hover:text-slate-800 dark:hover:text-slate-200"
                        onClick={() => handleSort('date')}
                      >
                        <div className="flex items-center gap-1">
                          <span>{t('col_date', 'Date')}</span>
                          <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </th>
                      <th className="py-3 px-3 text-center">{t('col_items', 'Items')}</th>
                      <th
                        className="py-3 px-3 text-right cursor-pointer hover:text-slate-800 dark:hover:text-slate-200"
                        onClick={() => handleSort('total')}
                      >
                        <div className="flex items-center justify-end gap-1">
                          <span>{t('col_total_amount', 'Total Amount')}</span>
                          <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </th>
                      <th className="py-3 px-3 text-center">{t('col_payment', 'Payment')}</th>
                      <th className="py-3 px-3 text-center">{t('col_status', 'Status')}</th>
                      <th className="py-3 px-4 text-right">{t('col_actions', 'Actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {paginatedPurchases.map((p) => (
                      <tr
                        key={p.id}
                        id={`purchase-item-${p.id}`}
                        data-item-id={p.id}
                        data-scroll-anchor={p.id}
                        className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-slate-100">
                          <Link to={`/purchases/${p.id}`} className="hover:text-emerald-600 transition-colors">
                            {p.referenceNo}
                          </Link>
                        </td>

                        <td className="py-3 px-3 text-slate-700 dark:text-slate-300 font-medium" data-transliterate={supMap[p.supplierId] ? 'true' : undefined}>
                          {supMap[p.supplierId] || 'Direct Supplier'}
                        </td>

                        <td className="py-3 px-3 text-slate-500 dark:text-slate-400">
                          {formatDate(p.date)}
                        </td>

                        <td className="py-3 px-3 text-center font-mono">
                          {(p.items || []).length}
                        </td>

                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                          {formatCurrency(p.total, settings.currency)}
                        </td>

                        <td className="py-3 px-3 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              p.paymentStatus === 'paid'
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                                : 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300'
                            }`}
                          >
                            {p.paymentStatus}
                          </span>
                        </td>

                        <td className="py-3 px-3 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              p.status === 'received'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                : p.status === 'cancelled'
                                ? 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                            }`}
                          >
                            {p.status === 'received' && <CheckCircle2 className="h-3 w-3" />}
                            {p.status === 'draft' && <Clock className="h-3 w-3" />}
                            {p.status === 'cancelled' && <XCircle className="h-3 w-3" />}
                            <span>{p.status === 'received' ? t('status_received', 'RECEIVED') : p.status}</span>
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {/* Barcode Sticker Print Button for Regular Purchase */}
                            <button
                              onClick={() => handlePrintRegularPurchaseBarcodes(p)}
                              title={t('action_print_barcodes', 'বারকোড স্টিকার প্রিন্ট')}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
                            >
                              <Barcode className="h-4 w-4" />
                            </button>

                            <Link to={`/purchases/${p.id}`} title="View Details">
                              <button className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                <Eye className="h-4 w-4" />
                              </button>
                            </Link>

                            {p.status === 'draft' && (
                              <button
                                onClick={() => handleReceive(p)}
                                title="Mark Received & Increase Stock"
                                className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors font-bold text-[11px] flex items-center gap-1"
                              >
                                <CheckCircle2 className="h-4 w-4" />
                                <span>Receive</span>
                              </button>
                            )}

                            {p.status !== 'cancelled' && (
                              <button
                                onClick={() => handleCancel(p)}
                                title="Cancel Order"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                              >
                                <XCircle className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <Pagination
              currentPage={currentPage}
              totalItems={filteredPurchases.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
            />
          </Card>
        </div>
      )}

      {/* ================= TAB 2: SHIP SCRAP & AUCTION LOTS ================= */}
      {activeTab === 'lots' && (
        <div className="space-y-6">
          {filteredLots.length === 0 ? (
            <Card className="p-12 text-center space-y-3">
              <Ship className="h-10 w-10 mx-auto text-amber-500 opacity-70" />
              <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">কোনো অকশন লট পাওয়া যায়নি</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                ভাটিয়ারী বা সীতাকুণ্ড শিপ ব্রেকিং ইয়ার্ড হতে ৫-১০ লাখ টাকায় পুরো জাহাজ লট ক্রয় করে তা আলাদা আলাদা পার্টসে ভাগ ও র‍্যাকে বণ্টন করুন।
              </p>
              <Button
                variant="primary"
                size="sm"
                icon={Plus}
                onClick={() => setIsNewLotModalOpen(true)}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
              >
                নতুন নিলাম লট এন্ট্রি দিন
              </Button>
            </Card>
          ) : (
            filteredLots.map((lot) => {
              const totalExtractedQty = (lot.items || []).reduce((acc, it) => acc + (Number(it.quantity) || 1), 0);
              const isDistributed = lot.status === 'distributed';

              return (
                <Card key={lot.id} className="overflow-hidden border border-slate-200 dark:border-slate-800 shadow-md">
                  {/* Lot Card Header */}
                  <div className="p-5 bg-gradient-to-r from-amber-50/70 via-slate-50 to-white dark:from-amber-950/20 dark:via-slate-900 dark:to-slate-900 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="px-2 py-0.5 rounded-lg bg-amber-500 text-white font-mono font-black text-xs">
                          {lot.lotNumber}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-800 text-white dark:bg-slate-700">
                          {lot.sourceType || 'Ship Scrap'}
                        </span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            isDistributed
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                          }`}
                        >
                          {isDistributed ? '✔ ওয়্যারহাউজে বণ্টন সম্পন্ন (Distributed)' : '⏳ চেকিং ও ডিসম্যাণ্টল চলছে (Intake)'}
                        </span>
                      </div>

                      <h3 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white" data-transliterate="true">
                        {lot.lotName}
                      </h3>
                      <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                        <span>জাহাজ / সূত্র: <strong className="text-slate-700 dark:text-slate-300" data-transliterate={lot.sourceShip ? 'true' : undefined}>{lot.sourceShip || 'Scrap Yard'}</strong></span>
                        <span>• ক্রয়ের তারিখ: {formatDate(lot.purchaseDate || lot.createdAt)}</span>
                      </p>
                    </div>

                    {/* Financial Summary & Actions */}
                    <div className="flex items-center gap-3 text-right flex-wrap">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">মোট ইনভেস্টমেন্ট</span>
                        <div className="text-xl font-black font-mono text-amber-600 dark:text-amber-400">
                          {formatCurrency(lot.netInvestedAmount || lot.totalLotCost, settings.currency)}
                        </div>
                        <span className="text-[10px] text-slate-400">
                          (মূল ক্রয়: {formatCurrency(lot.totalLotCost, settings.currency)})
                        </span>
                      </div>

                      {/* Barcode Sticker Print Button for entire lot */}
                      <Button
                        variant="outline"
                        size="sm"
                        icon={Barcode}
                        onClick={() => setSelectedLotForPrint(lot)}
                        className="border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:text-emerald-600 hover:border-emerald-500 font-bold"
                      >
                        বারকোড স্টিকার প্রিন্ট
                      </Button>

                      {!isDistributed ? (
                        <Button
                          variant="primary"
                          size="sm"
                          icon={Boxes}
                          onClick={() => handleDistributeLot(lot)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                        >
                          মালামাল বণ্টন ও স্টক যুক্ত করুন
                        </Button>
                      ) : (
                        <div className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                          <CheckCircle2 className="h-4 w-4" />
                          <span>স্টক ও র‍্যাকে অন্তর্ভুক্ত</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Lot Decomposed Items Table */}
                  <div className="p-4 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                      <span>এই লটের অধীনে আলাদা করা মালামাল ও পার্টসের তালিকা ({lot.items?.length || 0} ধরনের আইটেম, মোট {totalExtractedQty} পিস):</span>
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase text-[10px]">
                          <tr>
                            <th className="py-2.5 px-3">SL</th>
                            <th className="py-2.5 px-4">মালামাল / যন্ত্রাংশের নাম ও ব্র্যান্ড</th>
                            <th className="py-2.5 px-3">কন্ডিশন</th>
                            <th className="py-2.5 px-3 text-center">পরিমাণ</th>
                            <th className="py-2.5 px-3">নির্দিষ্ট র‍্যাক লোকেশন</th>
                            <th className="py-2.5 px-3 text-right">বরাদ্দকৃত কেনা খরচ</th>
                            <th className="py-2.5 px-3 text-right">টার্গেট বিক্রয় দর</th>
                            <th className="py-2.5 px-3 text-right">প্রত্যাশিত লাভ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {(lot.items || []).map((it, idx) => {
                            const qty = Number(it.quantity) || 1;
                            const cost = Number(it.allocatedCost) || 0;
                            const price = Number(it.targetSellingPrice) || 0;
                            const profit = (price - cost) * qty;
                            const locCode = it.warehouseLocation?.code || (it.warehouseLocation?.rack ? `${it.warehouseLocation.zone} ${it.warehouseLocation.rack}` : 'A-01-01');

                            return (
                              <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                                <td className="py-2.5 px-3 font-mono text-slate-400">{idx + 1}</td>
                                <td className="py-2.5 px-4 font-bold text-slate-900 dark:text-slate-100">
                                  <span data-transliterate="true">{it.partName}</span>
                                  {it.brand && (
                                    <span className="block text-[10px] text-slate-400 font-normal">
                                      Brand: <span data-transliterate="true">{it.brand}</span> {it.modelNumber ? `· Model: ${it.modelNumber}` : ''}
                                    </span>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 capitalize font-semibold text-slate-600 dark:text-slate-400">
                                  {it.condition?.replace('_', ' ')}
                                </td>
                                <td className="py-2.5 px-3 text-center font-mono font-bold">
                                  {qty} {it.unit || 'pc'}
                                </td>
                                <td className="py-2.5 px-3 font-mono font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  <span>{locCode}</span>
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono text-slate-600 dark:text-slate-400">
                                  {formatCurrency(cost, settings.currency)}
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                  {formatCurrency(price, settings.currency)}
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono font-bold text-purple-600 dark:text-purple-400">
                                  {formatCurrency(profit, settings.currency)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {lot.notes && (
                      <p className="text-[11px] text-slate-500 italic pt-1">
                        নোট: {lot.notes}
                      </p>
                    )}
                  </div>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* ================= MODAL: NEW AUCTION LOT INTAKE ================= */}
      <Modal
        isOpen={isNewLotModalOpen}
        onClose={() => setIsNewLotModalOpen(false)}
        title="নতুন জাহাজ অকশন ও বাল্ক লট এন্ট্রি (Auction Bulk Lot Intake)"
        description="সম্পূর্ণ লটের ক্রয়মূল্য, কম্প্রেসার, ইঞ্জিন ও পার্টস আলাদা করে র‍্যাক লোকেশন সেট করুন।"
        maxWidth="max-w-4xl"
      >
        <form onSubmit={handleCreateLotSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <Input
              label="লট নম্বর / কোড *"
              value={newLotForm.lotNumber}
              onChange={(e) => setNewLotForm({ ...newLotForm, lotNumber: e.target.value })}
              required
            />
            <div className="sm:col-span-2">
              <Input
                label="লটের বিবরণ / নাম *"
                value={newLotForm.lotName}
                onChange={(e) => setNewLotForm({ ...newLotForm, lotName: e.target.value })}
                placeholder="e.g. MV Ocean Star Auxiliary Engine & Cold Storage Bulk Scrap Lot"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <Input
              label="উৎস জাহাজ / শিপ ইয়ার্ড"
              value={newLotForm.sourceShip}
              onChange={(e) => setNewLotForm({ ...newLotForm, sourceShip: e.target.value })}
              placeholder="e.g. MV Ocean Star (Bhatiari Yard 4)"
            />

            {/* Supplier / Vendor with '+' Quick Add Button */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  সাপ্লায়ার / ভেন্ডর *
                </label>
                <button
                  type="button"
                  onClick={() => setIsAddSupplierOpen(true)}
                  className="inline-flex items-center gap-0.5 text-[11px] font-bold text-emerald-600 hover:text-emerald-700 hover:underline"
                >
                  <Plus className="h-3 w-3" />
                  <span>নতুন সাপ্লায়ার</span>
                </button>
              </div>
              <div className="flex items-center gap-1.5">
                <select
                  value={newLotForm.supplierId}
                  onChange={(e) => setNewLotForm({ ...newLotForm, supplierId: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  {uniqueSuppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.companyName && s.companyName !== s.name ? `(${s.companyName})` : ''}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setIsAddSupplierOpen(true)}
                  className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold shrink-0 shadow-xs transition-colors"
                  title="নতুন সাপ্লায়ার বা ভেন্ডর যুক্ত করুন"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            <Input
              label="লট কেনার মূল দর (টাকা) *"
              type="number"
              value={newLotForm.totalLotCost}
              onChange={(e) => setNewLotForm({ ...newLotForm, totalLotCost: e.target.value })}
              placeholder="500000"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
            <Input
              label="পরিবহন খরচ (টাকা)"
              type="number"
              value={newLotForm.transportCost}
              onChange={(e) => setNewLotForm({ ...newLotForm, transportCost: e.target.value })}
              placeholder="25000"
            />
            <Input
              label="লেবার ও কাটিং/ডিসম্যাণ্টল খরচ"
              type="number"
              value={newLotForm.laborDismantleCost}
              onChange={(e) => setNewLotForm({ ...newLotForm, laborDismantleCost: e.target.value })}
              placeholder="15000"
            />
            <Input
              label="অন্যান্য আনুষঙ্গিক খরচ"
              type="number"
              value={newLotForm.otherExpenses}
              onChange={(e) => setNewLotForm({ ...newLotForm, otherExpenses: e.target.value })}
              placeholder="10000"
            />
          </div>

          {/* Machinery, Compressor, Engine & Parts Intake Section */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Boxes className="h-4 w-4 text-emerald-600" />
                  <span>মালামাল, কম্প্রেসার, ইঞ্জিন ও পার্টস বণ্টন (Machinery & Parts Breakdown):</span>
                </span>
                <p className="text-[11px] text-slate-400">
                  লট থেকে প্রাপ্ত যেকোনো মেশিন বা পার্টসের নাম, কন্ডিশন, কেনা খরচ ও র‍্যাক লোকেশন সেট করুন
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                icon={Plus}
                onClick={handleAddLotItemRow}
                className="text-xs"
              >
                আরও মালামাল লাইন যোগ
              </Button>
            </div>

            <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
              {lotItems.map((it, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 space-y-2 text-xs shadow-xs"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                    {/* Item Type / Machinery Category */}
                    <div className="sm:col-span-3">
                      <label className="text-[10px] font-bold text-slate-400 block mb-0.5">মালের ধরন / ক্যাটাগরি</label>
                      <select
                        value={it.itemType || 'parts'}
                        onChange={(e) => handleUpdateLotItem(idx, 'itemType', e.target.value)}
                        className="w-full px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent font-bold text-emerald-700 dark:text-emerald-400 text-xs"
                      >
                        <option value="compressor">কম্প্রেসার ও চিলার (Compressor)</option>
                        <option value="engine">ইঞ্জিন ও জেনারেটর (Engine)</option>
                        <option value="parts">খুচরা যন্ত্রাংশ (Spare Parts)</option>
                        <option value="pump">পাম্প ও ভাল্ব (Pump & Valve)</option>
                        <option value="electrical">ইলেকট্রিক্যাল ও সেন্সর (Electrical)</option>
                        <option value="other">অন্যান্য মেশিনারিজ (Other Machine)</option>
                      </select>
                    </div>

                    {/* Part / Machine Name */}
                    <div className="sm:col-span-4">
                      <label className="text-[10px] font-bold text-slate-400 block mb-0.5">মালামাল বা পার্টসের নাম *</label>
                      <input
                        type="text"
                        value={it.partName}
                        onChange={(e) => handleUpdateLotItem(idx, 'partName', e.target.value)}
                        placeholder="যেমন: Bitzer 4EC Compressor, Piston Rod"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent font-bold"
                        required
                      />
                    </div>

                    {/* Brand */}
                    <div className="sm:col-span-2">
                      <label className="text-[10px] font-bold text-slate-400 block mb-0.5">ব্র্যান্ড</label>
                      <input
                        type="text"
                        value={it.brand}
                        onChange={(e) => handleUpdateLotItem(idx, 'brand', e.target.value)}
                        placeholder="e.g. Bitzer, Yanmar"
                        className="w-full px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent"
                      />
                    </div>

                    {/* Condition */}
                    <div className="sm:col-span-2">
                      <label className="text-[10px] font-bold text-slate-400 block mb-0.5">কন্ডিশন / গ্রেড</label>
                      <select
                        value={it.condition}
                        onChange={(e) => handleUpdateLotItem(idx, 'condition', e.target.value)}
                        className="w-full px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent font-medium"
                      >
                        <option value="reconditioned">Reconditioned (রিকন্ডিশন)</option>
                        <option value="original_oem">Original OEM (জেনুইন)</option>
                        <option value="std_overhaul">STD Overhaul (ওভারহল)</option>
                        <option value="new">Brand New (নতুন)</option>
                        <option value="used">Used (ব্যবহারযোগ্য)</option>
                      </select>
                    </div>

                    {/* Preview & Delete button */}
                    <div className="sm:col-span-1 flex justify-end items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleOpenLotLabelPreview(idx)}
                        className="p-1.5 text-slate-400 hover:text-emerald-600 transition-colors"
                        title="এই পণ্যের স্টিকার লেবেল প্রিভিউ দেখুন"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      {lotItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveLotItem(idx)}
                          className="p-1.5 text-slate-400 hover:text-red-600 transition-colors"
                          title="লাইন মুছে ফেলুন"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Qty & Location Line */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 pt-1 border-t border-slate-100 dark:border-slate-800 items-center">
                    <div className="sm:col-span-4">
                      <label className="text-[10px] text-slate-400 font-bold block mb-0.5">পরিমাণ (Qty) ও একক</label>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min="1"
                          value={it.quantity}
                          onChange={(e) => handleUpdateLotItem(idx, 'quantity', e.target.value)}
                          className="w-16 px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-transparent font-mono font-bold text-center"
                        />
                        <select
                          value={it.unit || 'pc'}
                          onChange={(e) => handleUpdateLotItem(idx, 'unit', e.target.value)}
                          className="w-24 px-1.5 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-[11px]"
                        >
                          {getUnitSelectOptions(
                            it.unit || 'pc',
                            language,
                            [{ value: 'unit', bn: 'ইউনিট (unit)', en: 'unit', obro: 'unit' }]
                          ).map((u) => (
                            <option key={u.value} value={u.value}>
                              {u.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="sm:col-span-5">
                      <label className="text-[10px] text-slate-400 font-bold block mb-0.5">র‍্যাক লোকেশন কোড (Zone-Aisle-Rack-Shelf-Bin)</label>
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={it.zone}
                          onChange={(e) => handleUpdateLotItem(idx, 'zone', e.target.value)}
                          placeholder="Zone-A"
                          className="w-14 px-1 py-1 rounded border border-slate-300 dark:border-slate-700 text-[10px] font-mono text-center"
                        />
                        <input
                          type="text"
                          value={it.rack}
                          onChange={(e) => handleUpdateLotItem(idx, 'rack', e.target.value)}
                          placeholder="04"
                          className="w-10 px-1 py-1 rounded border border-slate-300 dark:border-slate-700 text-[10px] font-mono text-center"
                        />
                        <input
                          type="text"
                          value={it.shelf}
                          onChange={(e) => handleUpdateLotItem(idx, 'shelf', e.target.value)}
                          placeholder="3"
                          className="w-8 px-1 py-1 rounded border border-slate-300 dark:border-slate-700 text-[10px] font-mono text-center"
                        />
                        <input
                          type="text"
                          value={it.bin}
                          onChange={(e) => handleUpdateLotItem(idx, 'bin', e.target.value)}
                          placeholder="B"
                          className="w-8 px-1 py-1 rounded border border-slate-300 dark:border-slate-700 text-[10px] font-mono text-center"
                        />
                      </div>
                    </div>

                    <div className="sm:col-span-3 flex justify-end">
                      <div className="text-right">
                        <span className="text-[9px] font-bold text-slate-400 block mb-0.5">স্টিকার গোপন কোড</span>
                        <span className="font-mono font-bold text-[10px] bg-slate-900 text-amber-300 px-2 py-0.5 rounded border border-amber-400/30">
                          {generateStickerPriceDisplay({
                            buyingPrice: it.allocatedCost,
                            staffPrice: it.staffPrice,
                            managerPrice: it.managerPrice,
                            customerPrice: it.targetSellingPrice,
                            format: 'role_code',
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 4-Tier Role Pricing Grid */}
                  <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-0.5">
                        ১. ক্রয় খরচ (Buying Cost)
                      </label>
                      <input
                        type="number"
                        value={it.allocatedCost}
                        onChange={(e) => handleUpdateLotItem(idx, 'allocatedCost', e.target.value)}
                        placeholder="4500"
                        className="w-full px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono font-semibold text-slate-800 dark:text-slate-200 text-xs"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-blue-600 dark:text-blue-400 block mb-0.5">
                        ২. স্টাফ দর (Staff Min Limit)
                      </label>
                      <input
                        type="number"
                        value={it.staffPrice || ''}
                        onChange={(e) => handleUpdateLotItem(idx, 'staffPrice', e.target.value)}
                        placeholder="6000"
                        className="w-full px-2 py-1 rounded border border-blue-300 dark:border-blue-700 bg-white dark:bg-slate-900 font-mono font-semibold text-blue-700 dark:text-blue-300 text-xs"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-purple-600 dark:text-purple-400 block mb-0.5">
                        ৩. ম্যানেজার দর (Manager Floor)
                      </label>
                      <input
                        type="number"
                        value={it.managerPrice || ''}
                        onChange={(e) => handleUpdateLotItem(idx, 'managerPrice', e.target.value)}
                        placeholder="8000"
                        className="w-full px-2 py-1 rounded border border-purple-300 dark:border-purple-700 bg-white dark:bg-slate-900 font-mono font-semibold text-purple-700 dark:text-purple-300 text-xs"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 block mb-0.5">
                        ৪. কাস্টমার দর (Customer Quote)
                      </label>
                      <input
                        type="number"
                        value={it.targetSellingPrice}
                        onChange={(e) => handleUpdateLotItem(idx, 'targetSellingPrice', e.target.value)}
                        placeholder="10000"
                        className="w-full px-2 py-1 rounded border border-emerald-400 dark:border-emerald-600 bg-white dark:bg-slate-900 font-mono font-bold text-emerald-600 dark:text-emerald-300 text-xs"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Automated Catalog & Barcode Print Checkbox Options with Live Preview */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3 text-xs">
            <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800 dark:text-slate-200 select-none">
              <input
                type="checkbox"
                checked={autoRegisterInCatalog}
                onChange={(e) => setAutoRegisterInCatalog(e.target.checked)}
                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
              />
              <span>স্বয়ংক্রিয়ভাবে প্রোডাক্ট ক্যাটালগে নতুন আইটেম হিসেবে যুক্ত ও স্টক বৃদ্ধি করুন (Auto-register in Product Catalog & Inventory)</span>
            </label>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-200 dark:border-slate-700/60">
              <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800 dark:text-slate-200 select-none">
                <input
                  type="checkbox"
                  checked={openLabelPrintAfterSave}
                  onChange={(e) => setOpenLabelPrintAfterSave(e.target.checked)}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                />
                <span>লট সেভ করার সাথে সাথে বারকোড ও র‍্যাক স্টিকার লেবেল প্রিন্ট করুন (Open Barcode & Rack Sticker Labels Print Preview)</span>
              </label>

              {/* Direct Live Preview Button */}
              <button
                type="button"
                onClick={() => handleOpenLotLabelPreview(null)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shrink-0 shadow-xs transition-colors self-start sm:self-center"
                title="লট সেভ করার আগেই স্টিকার কেমন আসবে লাইভ প্রিভিউ দেখুন"
              >
                <Eye className="h-3.5 w-3.5" />
                <span>লেবেল প্রিভিউ দেখুন (Live Preview)</span>
              </button>
            </div>

            {/* Instant mini live sticker preview card */}
            <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300">
                  <Tag className="h-3.5 w-3.5 text-emerald-600" />
                  <span>লাইভ স্টিকার প্রিভিউ স্যাম্পল (Live Sticker Sample):</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleOpenLotLabelPreview(null)}
                  className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 hover:underline flex items-center gap-1"
                >
                  <span>সব {lotItems.length} টি স্টিকারের ফুল প্রিভিউ ও প্রিন্ট মোডাল</span>
                  <ChevronRight className="h-3 w-3" />
                </button>
              </div>

              {/* Visual Thermal Sticker Tag */}
              <div className="max-w-xs mx-auto p-3 bg-white text-slate-900 rounded-lg border-2 border-dashed border-slate-400 shadow-md font-sans select-none">
                <div className="flex items-center justify-between border-b border-slate-900 pb-1 text-[9.5px] font-bold">
                  <span className="truncate max-w-[140px]">{settings.businessName || 'M/S. SHANTA REFRIGERATION'}</span>
                  <span className="px-1.5 py-0.2 rounded bg-slate-900 text-white font-mono uppercase text-[8.5px]">
                    {lotItems[0]?.brand || 'MACHINERY'}
                  </span>
                </div>

                <div className="font-extrabold text-xs mt-1.5 leading-snug line-clamp-1 text-slate-900">
                  {lotItems[0]?.partName || 'Connecting Rod with Piston (Sample)'}
                </div>

                <div className="text-[9px] text-slate-600 font-semibold mt-0.5 flex items-center gap-1">
                  <span className="uppercase">[{lotItems[0]?.condition || 'RECONDITIONED'}]</span>
                  {lotItems[0]?.modelNumber && <span>• Mod: {lotItems[0].modelNumber}</span>}
                  <span className="text-slate-400">• Lot #{newLotForm.lotNumber || 'LOT-2026-55'}</span>
                </div>

                <div className="my-1.5 text-center">
                  <div className="h-4 w-full flex items-end justify-center gap-[1.5px] bg-white">
                    {Array.from({ length: 28 }).map((_, i) => (
                      <div
                        key={i}
                        className="bg-black h-full"
                        style={{
                          width: i % 4 === 0 ? '2.2px' : i % 2 === 0 ? '1px' : '1.6px',
                        }}
                      />
                    ))}
                  </div>
                  <div className="font-mono text-[8.5px] font-bold tracking-widest text-slate-800 mt-0.5">
                    * {(newLotForm.lotNumber || '202655').replace(/\D/g, '') || '202655'}001 *
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-300">
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-slate-100 border border-slate-400 font-mono text-[8.5px] font-bold text-slate-800">
                    <MapPin className="h-2.5 w-2.5 text-slate-700" />
                    <span>LOC: {lotItems[0]?.zone?.replace(/[^A-Za-z]/g, '').slice(-1) || 'A'}-{String(lotItems[0]?.aisle || '01').padStart(2, '0')}-{String(lotItems[0]?.rack || '01').padStart(2, '0')}-{lotItems[0]?.shelf || '1'}-{String(lotItems[0]?.bin || 'A').toUpperCase()}</span>
                  </span>

                  <span className="font-mono font-bold text-[9px] bg-slate-900 text-amber-300 px-1.5 py-0.5 rounded tracking-tight border border-amber-400/30">
                    {generateStickerPriceDisplay({
                      buyingPrice: lotItems[0]?.allocatedCost || 0,
                      staffPrice: lotItems[0]?.staffPrice || 0,
                      managerPrice: lotItems[0]?.managerPrice || 0,
                      customerPrice: lotItems[0]?.targetSellingPrice || 0,
                      format: 'role_code',
                    })}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
            <Button variant="secondary" onClick={() => setIsNewLotModalOpen(false)}>
              বাতিল
            </Button>
            <Button type="submit" variant="primary" className="bg-amber-600 hover:bg-amber-700 text-white font-bold">
              লট সেভ করুন ও প্রসেস করুন
            </Button>
          </div>
        </form>
      </Modal>

      {/* Quick Add Supplier Modal */}
      <QuickAddSupplierModal
        isOpen={isAddSupplierOpen}
        onClose={() => setIsAddSupplierOpen(false)}
        onSuccess={(newSup) => {
          setNewLotForm((prev) => ({ ...prev, supplierId: newSup.id }));
        }}
      />

      {/* Lot Barcode Stickers Print Modal */}
      {selectedLotForPrint && (
        <LotBarcodePrintModal
          isOpen={!!selectedLotForPrint}
          onClose={() => setSelectedLotForPrint(null)}
          lot={selectedLotForPrint}
        />
      )}
    </div>
  );
};
