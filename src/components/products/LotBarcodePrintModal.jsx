import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { formatCurrency } from '../../utils/formatters';
import { useAppData } from '../../context/AppDataContext';
import { generateStickerPriceDisplay } from '../../utils/priceCipher';
import { Printer, Barcode, MapPin, Tag, Check, Boxes, Layers, ShieldAlert, KeyRound } from 'lucide-react';

export const LotBarcodePrintModal = ({ isOpen, onClose, lot }) => {
  const { settings } = useAppData();
  const [labelSize, setLabelSize] = useState('50x30'); // '50x30' (Standard), '100x50' (Machinery), 'a4_sheet'
  const [copiesPerItem, setCopiesPerItem] = useState(1);
  const [selectedItemIndex, setSelectedItemIndex] = useState('all'); // 'all' or index
  const [priceDisplayMode, setPriceDisplayMode] = useState('role_code'); // 'role_code', 'letter_cipher', 'cust_with_code', 'customer_only', 'no_price'

  if (!lot) return null;

  const itemsToPrint = selectedItemIndex === 'all'
    ? (lot.items || [])
    : [(lot.items || [])[parseInt(selectedItemIndex)]].filter(Boolean);

  const getConditionLabel = (c) => {
    switch (c) {
      case 'original_oem': return 'ORIGINAL OEM';
      case 'reconditioned': return 'RECONDITIONED';
      case 'std_overhaul': return 'STD OVERHAUL';
      case 'used': return 'USED';
      case 'new': default: return 'BRAND NEW';
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=850,height=650');
    if (!printWindow) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Lot Barcode Stickers - #${lot.lotNumber}</title>
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
            border: 1px dashed #333;
            padding: 4px 6px;
            box-sizing: border-box;
            width: ${labelSize === '100x50' ? '96mm' : labelSize === 'a4_sheet' ? '65mm' : '48mm'};
            height: ${labelSize === '100x50' ? '46mm' : labelSize === 'a4_sheet' ? '35mm' : '28mm'};
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            page-break-inside: avoid;
            margin-bottom: 2mm;
            float: ${labelSize === 'a4_sheet' ? 'left' : 'none'};
            margin-right: ${labelSize === 'a4_sheet' ? '2mm' : '0'};
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
            height: ${labelSize === '100x50' ? '24px' : '16px'};
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
            font-size: 7.5px;
            text-align: center;
            letter-spacing: 0.5px;
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
            font-size: ${labelSize === '100x50' ? '11px' : '8.5px'};
            font-weight: 900;
            font-family: monospace;
            background: #eee;
            border: 1px solid #111;
            padding: 1px 3px;
            border-radius: 2px;
            letter-spacing: 0.2px;
            white-space: nowrap;
          }
          .sheet-container {
            display: flex;
            flex-wrap: wrap;
            gap: 3mm;
          }
        </style>
      </head>
      <body>
        <div class="${labelSize === 'a4_sheet' ? 'sheet-container' : ''}">
          ${itemsToPrint.flatMap((it, idx) => {
            const locCode = it.warehouseLocation?.code || (it.warehouseLocation?.rack ? `${it.warehouseLocation.zone} ${it.warehouseLocation.rack}` : 'A-01-01');
            const codeNum = `${lot.lotNumber.replace(/\D/g, '')}${String(idx + 1).padStart(3, '0')}`;
            const priceText = generateStickerPriceDisplay({
              buyingPrice: it.allocatedCost || it.costPrice || 0,
              staffPrice: it.staffPrice || 0,
              managerPrice: it.managerPrice || 0,
              customerPrice: it.targetSellingPrice || it.customerPrice || it.sellingPrice || 0,
              format: priceDisplayMode,
              currencySymbol: settings.currency || '৳',
            });

            return Array.from({ length: copiesPerItem }).map(() => `
              <div class="label-card">
                <div class="label-header">
                  <span>${settings.businessName || 'M/S. SHANTA REFRIGERATION'}</span>
                  <span>${it.brand || 'MACHINERY'}</span>
                </div>
                <div class="label-title">${it.partName || it.name}</div>
                <div style="font-size: 7px; font-weight: 600; color: #333;">
                  [${getConditionLabel(it.condition)}]
                  ${it.modelNumber ? `· Mod: ${it.modelNumber}` : ''}
                  · Lot #${lot.lotNumber}
                </div>
                <div class="barcode-bars">
                  ${Array.from({ length: 32 }).map((_, i) => `<div class="barcode-line" style="width: ${(i % 3 === 0 || i % 7 === 0) ? '2.5px' : '1.2px'};"></div>`).join('')}
                </div>
                <div class="barcode-text">* ${codeNum} *</div>
                <div class="label-grid">
                  <span class="loc-tag">📍 LOC: ${locCode}</span>
                  <span class="price-tag">${priceText}</span>
                </div>
              </div>
            `);
          }).join('')}
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
      zIndex="z-[60]"
      title={`বাল্ক লট বারকোড ও র‍্যাক স্টিকার প্রিন্টার (Lot #${lot.lotNumber})`}
      description="লট থেকে প্রাপ্ত সকল কম্প্রেসার, ইঞ্জিন ও স্পেয়ার পার্টসের জন্য থার্মাল স্টিকার লেবেল প্রিন্ট করুন।"
      maxWidth="max-w-3xl"
    >
      <div className="space-y-4 text-xs">
        {/* Controls Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700 dark:text-slate-300">স্টিকার ফরম্যাট:</span>
            <select
              value={labelSize}
              onChange={(e) => setLabelSize(e.target.value)}
              className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1 font-semibold text-slate-800 dark:text-slate-200"
            >
              <option value="50x30">50 x 30 mm (রোল থার্মাল স্টিকার)</option>
              <option value="100x50">100 x 50 mm (হেভি ইকুইপমেন্ট ও বক্স ট্যাগ)</option>
              <option value="a4_sheet">A4 স্টিকার শিট (২৪-আপ গ্রিড)</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700 dark:text-slate-300">কোন মালামাল:</span>
            <select
              value={selectedItemIndex}
              onChange={(e) => setSelectedItemIndex(e.target.value)}
              className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1 font-semibold text-slate-800 dark:text-slate-200"
            >
              <option value="all">লটের সকল আইটেম (সব {lot.items?.length || 0} টি)</option>
              {(lot.items || []).map((it, idx) => (
                <option key={idx} value={String(idx)}>
                  {idx + 1}. {it.partName} ({it.quantity} {it.unit || 'pc'})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700 dark:text-slate-300">প্রতিটির কপি:</span>
            <input
              type="number"
              min="1"
              max="50"
              value={copiesPerItem}
              onChange={(e) => setCopiesPerItem(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-14 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 font-bold text-center text-slate-800 dark:text-slate-200"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
              <KeyRound className="h-3.5 w-3.5 text-amber-500" />
              <span>মূল্য প্রদর্শন মোড:</span>
            </span>
            <select
              value={priceDisplayMode}
              onChange={(e) => setPriceDisplayMode(e.target.value)}
              className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 font-bold text-emerald-700 dark:text-emerald-400"
            >
              <option value="role_code">গোপন রোল কোড (B-Buy / S-Staff / M-Mgr / C-Cust)</option>
              <option value="letter_cipher">সিক্রেট লেটার সাইফার (BLACKSMITH Cipher)</option>
              <option value="cust_with_code">কাস্টমার দর + সিক্রেট কস্ট কোড</option>
              <option value="customer_only">শুধুমাত্র কাস্টমার দর (Plain Customer Price)</option>
              <option value="no_price">মূল্য সম্পূর্ণ গোপন (No Price)</option>
            </select>
          </div>
        </div>

        {/* Live Sticker Grid Preview */}
        <div className="p-4 bg-slate-100 dark:bg-slate-950 rounded-2xl max-h-96 overflow-y-auto space-y-3">
          <div className="text-[11px] font-bold text-slate-500 flex items-center justify-between px-1">
            <span>প্রিন্ট প্রিভিউ ({itemsToPrint.length * copiesPerItem} টি স্টিকার জেনারেট হবে):</span>
            <span className="font-mono text-emerald-600">Lot: #{lot.lotNumber}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {itemsToPrint.map((it, idx) => {
              const locCode = it.warehouseLocation?.code || (it.warehouseLocation?.rack ? `${it.warehouseLocation.zone} ${it.warehouseLocation.rack}` : 'A-01-01');
              const codeNum = `${lot.lotNumber.replace(/\D/g, '')}${String(idx + 1).padStart(3, '0')}`;
              const priceText = generateStickerPriceDisplay({
                buyingPrice: it.allocatedCost || it.costPrice || 0,
                staffPrice: it.staffPrice || 0,
                managerPrice: it.managerPrice || 0,
                customerPrice: it.targetSellingPrice || it.customerPrice || it.sellingPrice || 0,
                format: priceDisplayMode,
                currencySymbol: settings.currency || '৳',
              });

              return (
                <div
                  key={idx}
                  className="bg-white text-slate-900 rounded-lg border-2 border-dashed border-slate-400 p-3 shadow-md select-none"
                >
                  <div className="flex items-center justify-between border-b border-slate-800 pb-1 text-[10px] font-bold">
                    <span className="truncate max-w-[140px]">{settings.businessName || 'M/S. SHANTA REFRIGERATION'}</span>
                    <span className="px-1 py-0.2 rounded bg-slate-900 text-white font-mono uppercase text-[9px]">
                      {it.brand || 'MACHINERY'}
                    </span>
                  </div>

                  <h4 className="font-extrabold text-xs mt-1 leading-snug line-clamp-1 text-slate-900">
                    {it.partName}
                  </h4>

                  <div className="text-[9.5px] text-slate-600 font-semibold mt-0.5 flex items-center gap-1">
                    <span>[{getConditionLabel(it.condition)}]</span>
                    {it.modelNumber && <span>• Mod: {it.modelNumber}</span>}
                    <span className="text-slate-400">• Lot #{lot.lotNumber}</span>
                  </div>

                  <div className="my-1.5 text-center">
                    <div className="h-5 w-full flex items-end justify-center gap-[2px] bg-white px-2">
                      {Array.from({ length: 30 }).map((_, i) => (
                        <div
                          key={i}
                          className="bg-black h-full"
                          style={{
                            width: i % 4 === 0 ? '2.5px' : i % 2 === 0 ? '1.2px' : '1.8px',
                          }}
                        />
                      ))}
                    </div>
                    <div className="font-mono text-[9px] font-bold tracking-widest text-slate-800 mt-0.5">
                      * {codeNum} *
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-300">
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-slate-100 border border-slate-400 font-mono text-[9px] font-bold text-slate-800">
                      <MapPin className="h-2.5 w-2.5 text-slate-700" />
                      <span>LOC: {locCode}</span>
                    </span>

                    <span className="font-mono font-bold text-[9px] bg-slate-900 text-amber-300 px-1.5 py-0.5 rounded tracking-tight border border-amber-400/30">
                      {priceText}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2">
          <span className="text-slate-500 text-[11px]">
            থার্মাল প্রিন্টার (যেমন: Xprinter, Zebra, TSC) অথবা যেকোনো A4 প্রিন্টারে প্রিন্ট করুন।
          </span>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              বন্ধ করুন
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={Printer}
              onClick={handlePrint}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            >
              প্রিন্ট দিন ({itemsToPrint.length * copiesPerItem} লেবেল)
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
