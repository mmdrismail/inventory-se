import React, { useState, useRef } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { formatCurrency } from '../../utils/formatters';
import { useAppData } from '../../context/AppDataContext';
import { Printer, QrCode, Barcode, MapPin, Tag, Copy, Check } from 'lucide-react';

export const BarcodeLabelModal = ({ isOpen, onClose, product, selectedVariant = null }) => {
  const { settings } = useAppData();
  const [labelSize, setLabelSize] = useState('50x30'); // '50x30' (Standard Thermal), '100x50' (Large Machinery), 'a4_sheet' (24-up A4)
  const [printCopies, setPrintCopies] = useState(1);
  const [copied, setCopied] = useState(false);
  const printAreaRef = useRef(null);

  if (!product) return null;

  const itemToPrint = selectedVariant ? {
    ...product,
    name: `${product.name} [${selectedVariant.name}]`,
    sku: selectedVariant.sku || product.sku,
    sellingPrice: selectedVariant.sellingPrice || product.sellingPrice,
    condition: selectedVariant.condition || product.condition,
    location: selectedVariant.location || product.warehouseLocation?.code,
  } : {
    ...product,
    location: product.warehouseLocation?.code || (product.warehouseLocation?.rack ? `${product.warehouseLocation.zone || ''} ${product.warehouseLocation.rack}` : 'GENERAL'),
  };

  const barcodeNumber = product.barcode || product.sku?.replace(/\D/g, '').padEnd(12, '0') || '894100123456';
  const qrData = JSON.stringify({
    name: itemToPrint.name,
    sku: itemToPrint.sku,
    brand: product.brand || '',
    model: product.modelNumber || '',
    cond: itemToPrint.condition || 'new',
    loc: itemToPrint.location,
    price: itemToPrint.sellingPrice,
  });

  const getConditionLabel = (c) => {
    switch (c) {
      case 'original_oem': return 'ORIGINAL OEM (জেনুইন)';
      case 'reconditioned': return 'RECONDITIONED (রিকন্ডিশন)';
      case 'std_overhaul': return 'STD OVERHAUL (ওভারহল)';
      case 'used': return 'USED (ব্যবহারযোগ্য)';
      case 'new': default: return 'BRAND NEW (নতুন)';
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(barcodeNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDirectPrint = () => {
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Barcode Label - ${itemToPrint.sku}</title>
        <style>
          @page {
            size: ${labelSize === 'a4_sheet' ? 'A4' : labelSize === '100x50' ? '100mm 50mm' : '50mm 30mm'};
            margin: 2mm;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            margin: 0;
            padding: 0;
            color: #000;
            background: #fff;
            -webkit-print-color-adjust: exact;
          }
          .label-card {
            border: 1px dashed #444;
            padding: 4px 6px;
            box-sizing: border-box;
            width: ${labelSize === '100x50' ? '96mm' : labelSize === 'a4_sheet' ? '65mm' : '48mm'};
            height: ${labelSize === '100x50' ? '46mm' : labelSize === 'a4_sheet' ? '35mm' : '28mm'};
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            page-break-inside: avoid;
            margin-bottom: 3mm;
          }
          .label-header {
            display: flex;
            justify-content: space-between;
            align-items: baseline;
            border-bottom: 1px solid #000;
            padding-bottom: 2px;
            font-size: 8px;
            font-weight: bold;
          }
          .label-title {
            font-size: ${labelSize === '100x50' ? '12px' : '9px'};
            font-weight: 800;
            line-height: 1.1;
            margin: 2px 0;
            max-height: 2.3em;
            overflow: hidden;
          }
          .label-grid {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 4px;
          }
          .barcode-bars {
            height: ${labelSize === '100x50' ? '28px' : '18px'};
            width: 100%;
            display: flex;
            align-items: flex-end;
            justify-content: center;
            gap: 1.5px;
          }
          .barcode-line {
            background-color: #000;
            height: 100%;
          }
          .barcode-text {
            font-family: monospace;
            font-size: 8px;
            text-align: center;
            letter-spacing: 1px;
            font-weight: bold;
          }
          .loc-tag {
            background: #eee;
            border: 1px solid #000;
            padding: 1px 3px;
            font-size: 7.5px;
            font-weight: bold;
            font-family: monospace;
          }
          .price-tag {
            font-size: ${labelSize === '100x50' ? '14px' : '10.5px'};
            font-weight: 900;
            font-family: monospace;
          }
          .sheet-container {
            display: flex;
            flex-wrap: wrap;
            gap: 4mm;
          }
        </style>
      </head>
      <body>
        <div class="${labelSize === 'a4_sheet' ? 'sheet-container' : ''}">
          ${Array.from({ length: printCopies }).map(() => `
            <div class="label-card">
              <div class="label-header">
                <span>${settings.businessName || 'M/S. SHANTA REFRIGERATION'}</span>
                <span>${itemToPrint.brand || 'GENUINE'}</span>
              </div>
              <div class="label-title">${itemToPrint.name}</div>
              <div style="font-size: 7.5px; font-weight: 600; color: #333;">
                [${getConditionLabel(itemToPrint.condition)}]
                ${product.modelNumber ? `· Mod: ${product.modelNumber}` : ''}
              </div>
              <div class="barcode-bars">
                ${Array.from({ length: 32 }).map((_, i) => `<div class="barcode-line" style="width: ${(i % 3 === 0 || i % 7 === 0) ? '2.5px' : '1.2px'};"></div>`).join('')}
              </div>
              <div class="barcode-text">* ${barcodeNumber} *</div>
              <div class="label-grid">
                <span class="loc-tag">📍 LOC: ${itemToPrint.location}</span>
                <span class="price-tag">৳${(Math.round(((Number(itemToPrint.sellingPrice) || 0) + Number.EPSILON) * 100) / 100).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</span>
              </div>
            </div>
          `).join('')}
        </div>
        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() { window.close(); }, 500);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="বারকোড ও কিউআর লেবেল প্রিন্টার (Thermal Barcode Label Engine)"
      description="আন্তর্জাতিক সুপারশপ ও ওয়্যারহাউজ স্ট্যান্ডার্ড স্টিকার এবং র‍্যাক লোকেশন ট্যাগ প্রিন্ট করুন।"
      maxWidth="max-w-2xl"
    >
      <div className="space-y-4">
        {/* Controls Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700 dark:text-slate-300">স্টিকার সাইজ:</span>
            <select
              value={labelSize}
              onChange={(e) => setLabelSize(e.target.value)}
              className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 font-semibold text-slate-800 dark:text-slate-200 focus:outline-none"
            >
              <option value="50x30">50 x 30 mm (স্ট্যান্ডার্ড থার্মাল লেবেল)</option>
              <option value="100x50">100 x 50 mm (হেভি মেশিনারিজ ও পার্টস)</option>
              <option value="a4_sheet">A4 স্টিকার শিট (মাল্টিপল কপি)</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700 dark:text-slate-300">কপি সংখ্যা:</span>
            <input
              type="number"
              min="1"
              max="100"
              value={printCopies}
              onChange={(e) => setPrintCopies(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-16 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 font-bold text-center text-slate-800 dark:text-slate-200 focus:outline-none"
            />
          </div>
        </div>

        {/* Live Sticker Preview Card */}
        <div className="p-6 bg-slate-100 dark:bg-slate-950 rounded-2xl flex items-center justify-center">
          <div
            ref={printAreaRef}
            className="bg-white text-slate-900 rounded-lg border-2 border-dashed border-slate-400 p-4 shadow-xl select-none"
            style={{
              width: labelSize === '100x50' ? '380px' : '300px',
              minHeight: labelSize === '100x50' ? '190px' : '170px',
            }}
          >
            {/* Header: Company & Brand */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-1 text-[11px] font-bold">
              <span className="truncate max-w-[170px]">{settings.businessName || 'M/S. SHANTA REFRIGERATION'}</span>
              <span className="px-1.5 py-0.2 rounded bg-slate-900 text-white font-mono uppercase text-[9px]">
                {product.brand || 'GENUINE'}
              </span>
            </div>

            {/* Product Title */}
            <h3 className="font-extrabold text-xs sm:text-sm mt-1.5 leading-snug line-clamp-2 text-slate-900">
              {itemToPrint.name}
            </h3>

            {/* Condition & Model */}
            <div className="text-[10px] text-slate-600 font-semibold mt-0.5 flex items-center gap-1.5">
              <span>{getConditionLabel(itemToPrint.condition)}</span>
              {product.modelNumber && <span>• Mod: {product.modelNumber}</span>}
            </div>

            {/* Barcode Visualization (1D) */}
            <div className="my-2 text-center">
              <div className="h-7 w-full flex items-end justify-center gap-[2px] bg-white px-2">
                {Array.from({ length: 38 }).map((_, i) => (
                  <div
                    key={i}
                    className="bg-black h-full"
                    style={{
                      width: i % 4 === 0 ? '3px' : i % 2 === 0 ? '1.5px' : '2px',
                    }}
                  />
                ))}
              </div>
              <div className="font-mono text-[10px] font-bold tracking-widest text-slate-800 mt-0.5">
                * {barcodeNumber} *
              </div>
            </div>

            {/* Footer: Location & Price */}
            <div className="flex items-center justify-between pt-1 border-t border-slate-300 mt-1">
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 border border-slate-400 font-mono text-[10px] font-bold text-slate-800">
                <MapPin className="h-3 w-3 text-slate-700" />
                <span>LOC: {itemToPrint.location}</span>
              </span>

              <span className="font-mono font-black text-sm text-slate-950">
                {formatCurrency(itemToPrint.sellingPrice, settings.currency)}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={handleCopyCode}
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          >
            {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
            <span>{copied ? 'বারকোড নম্বর কপি হয়েছে!' : 'বারকোড নম্বর কপি'}</span>
          </button>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              বন্ধ করুন
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={Printer}
              onClick={handleDirectPrint}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              প্রিন্ট দিন ({printCopies} কপি)
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
