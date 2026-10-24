import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppData } from '../../context/AppDataContext';
import { Search, Package, Users2, Truck, ShoppingCart, Receipt, ClipboardList, X } from 'lucide-react';

export const GlobalSearchModal = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const { products, categories, suppliers, customers, purchases, sales, orders } = useAppData();
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        // Toggle or open
        if (isOpen) onClose();
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const q = query.trim().toLowerCase();

  // Search results
  const matchedProducts = q
    ? products.filter((p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)).slice(0, 4)
    : [];
  const matchedCustomers = q
    ? customers.filter((c) => c.name.toLowerCase().includes(q) || c.phone.includes(q)).slice(0, 3)
    : [];
  const matchedSuppliers = q
    ? suppliers.filter((s) => s.name.toLowerCase().includes(q) || s.companyName.toLowerCase().includes(q)).slice(0, 3)
    : [];
  const matchedPurchases = q
    ? purchases.filter((p) => p.referenceNo.toLowerCase().includes(q)).slice(0, 3)
    : [];
  const matchedSales = q
    ? sales.filter((s) => s.invoiceNo.toLowerCase().includes(q) || (s.customerName && s.customerName.toLowerCase().includes(q))).slice(0, 3)
    : [];
  const matchedOrders = q
    ? orders.filter((o) => o.orderNumber.toLowerCase().includes(q) || o.customerName.toLowerCase().includes(q)).slice(0, 3)
    : [];

  const hasResults =
    matchedProducts.length > 0 ||
    matchedCustomers.length > 0 ||
    matchedSuppliers.length > 0 ||
    matchedPurchases.length > 0 ||
    matchedSales.length > 0 ||
    matchedOrders.length > 0;

  const handleSelect = (url) => {
    onClose();
    setQuery('');
    navigate(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150">
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3 border-b border-slate-100 dark:border-slate-800 gap-3">
          <Search className="h-5 w-5 text-slate-400 shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products, SKUs, customers, invoices, orders... (Ctrl + K)"
            className="flex-1 bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded font-mono">
            ESC
          </span>
        </div>

        {/* Results Body */}
        <div className="max-h-96 overflow-y-auto p-2">
          {!q && (
            <div className="py-8 text-center text-xs text-slate-400">
              Type to quickly locate any product, invoice, customer, or transaction across StockLine.
            </div>
          )}

          {q && !hasResults && (
            <div className="py-8 text-center text-xs text-slate-400">
              No matching records found for "{query}".
            </div>
          )}

          {matchedProducts.length > 0 && (
            <div className="mb-3">
              <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Package className="h-3.5 w-3.5 text-emerald-500" />
                Products ({matchedProducts.length})
              </div>
              {matchedProducts.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleSelect(`/products/${p.id}`)}
                  className="w-full text-left flex items-center justify-between px-3 py-2 rounded-xl text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <img src={p.imageUrl} alt="" className="h-7 w-7 rounded object-cover" />
                    <div>
                      <div className="font-semibold text-slate-800 dark:text-slate-200">{p.name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">SKU: {p.sku} · Qty: {p.quantity}</div>
                    </div>
                  </div>
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">View</span>
                </button>
              ))}
            </div>
          )}

          {matchedCustomers.length > 0 && (
            <div className="mb-3">
              <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Users2 className="h-3.5 w-3.5 text-blue-500" />
                Customers
              </div>
              {matchedCustomers.map((c) => (
                <button
                  key={c.id}
                  onClick={() => handleSelect(`/customers/${c.id}`)}
                  className="w-full text-left flex items-center justify-between px-3 py-2 rounded-xl text-xs hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <div>
                    <div className="font-semibold text-slate-800 dark:text-slate-200">{c.name}</div>
                    <div className="text-[11px] text-slate-400">{c.email || c.phone}</div>
                  </div>
                  <span className="text-blue-500 font-semibold">Profile</span>
                </button>
              ))}
            </div>
          )}

          {matchedOrders.length > 0 && (
            <div className="mb-3">
              <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <ClipboardList className="h-3.5 w-3.5 text-purple-500" />
                Orders
              </div>
              {matchedOrders.map((o) => (
                <button
                  key={o.id}
                  onClick={() => handleSelect(`/orders/${o.id}`)}
                  className="w-full text-left flex items-center justify-between px-3 py-2 rounded-xl text-xs hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <div>
                    <div className="font-semibold text-slate-800 dark:text-slate-200">{o.orderNumber}</div>
                    <div className="text-[11px] text-slate-400">{o.customerName} · {o.status.toUpperCase()}</div>
                  </div>
                  <span className="text-purple-500 font-semibold">Details</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
