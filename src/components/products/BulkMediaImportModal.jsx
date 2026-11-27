import React, { useState, useMemo, useRef } from 'react';
import { useAppData } from '../../context/AppDataContext';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { mediaService } from '../../services/mediaService';
import { formatBytes } from '../../domain/mediaPipeline';
import { Upload, CheckCircle2, AlertCircle, Sparkles, Images } from 'lucide-react';

/**
 * Bulk Photo-to-Product Auto Mapper:
 * Select dozens/hundreds of photos named after SKUs or Product Names (e.g. `VP-4EC.jpg`).
 * Automatically matches each file -> compresses to WebP -> deduplicates SHA-256 -> links cleanly to Product.
 */
export const BulkMediaImportModal = ({ isOpen, onClose }) => {
  const { products, updateProduct, settings, addToast } = useAppData();
  const fileRef = useRef(null);

  const [queuedRows, setQueuedRows] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });

  const findBestProductMatch = useMemo(() => {
    return (filename) => {
      const base = String(filename || '')
        .replace(/\.[^.]+$/, '')
        .replace(/[-_](\d+|front|back|box|tag)$/i, '')
        .trim()
        .toLowerCase();
      if (!base) return null;

      return (
        products.find((p) => (p.sku || '').trim().toLowerCase() === base) ||
        products.find((p) => (p.oemPartNumber || '').trim().toLowerCase() === base) ||
        products.find((p) => base.includes((p.sku || '').trim().toLowerCase()) && (p.sku || '').length >= 3) ||
        products.find((p) => (p.name || '').trim().toLowerCase() === base) ||
        null
      );
    };
  }, [products]);

  const handleFilesPick = (fileList) => {
    const files = Array.from(fileList || []).filter((f) => f?.type?.startsWith('image/'));
    if (files.length === 0) return;

    const mapped = files.map((file, idx) => {
      const match = findBestProductMatch(file.name);
      return {
        uid: `bulk-${Date.now()}-${idx}`,
        file,
        filename: file.name,
        originalBytes: file.size,
        targetProductId: match ? String(match.id || match._id) : '',
        status: 'pending',
      };
    });
    setQueuedRows(mapped);
  };

  const handleRunBulkUpload = async () => {
    const readyRows = queuedRows.filter((r) => r.targetProductId && r.status !== 'done');
    if (readyRows.length === 0) {
      addToast({ title: 'No Matched Photos', message: 'কমপক্ষে একটি ছবির সাথে প্রোডাক্ট সিলেক্ট করুন।', type: 'warning' });
      return;
    }

    setIsProcessing(true);
    setProgress({ done: 0, total: readyRows.length });

    let completedCount = 0;
    const groupedUpdates = new Map();

    for (const row of readyRows) {
      try {
        const prod = products.find((p) => String(p.id || p._id) === String(row.targetProductId));
        if (!prod) continue;

        const uploaded = await mediaService.processAndUploadFile(row.file, {
          settings,
          tag: 'primary',
          caption: row.filename.replace(/\.[^.]+$/, ''),
          categoryId: prod.categoryId || null,
          machineModelId: prod.primaryMachineModelId || null,
          productId: prod.id || prod._id,
          sku: prod.sku,
        });

        const pid = String(prod.id || prod._id);
        if (!groupedUpdates.has(pid)) {
          const existingList = Array.isArray(prod.images)
            ? [...prod.images]
            : prod.imageUrl
            ? [{ url: prod.imageUrl, thumbnailUrl: prod.thumbnailUrl || prod.imageUrl, tag: 'primary', isPrimary: true }]
            : [];
          groupedUpdates.set(pid, existingList);
        }

        const list = groupedUpdates.get(pid);
        if (!list.some((x) => x.url === uploaded.url)) {
          list.push({
            mediaAssetId: uploaded.mediaAssetId,
            url: uploaded.url,
            thumbnailUrl: uploaded.thumbnailUrl,
            tag: list.length === 0 ? 'primary' : 'other',
            caption: uploaded.caption,
            sha256: uploaded.sha256,
            provider: uploaded.provider,
            publicId: uploaded.publicId,
            originalBytes: uploaded.originalBytes,
            compressedBytes: uploaded.compressedBytes,
            width: uploaded.width,
            height: uploaded.height,
            isPrimary: list.length === 0,
          });
        }

        row.status = 'done';
      } catch {
        row.status = 'error';
      }
      completedCount += 1;
      setProgress({ done: completedCount, total: readyRows.length });
      setQueuedRows((prev) => [...prev]);
    }

    for (const [pid, imgs] of groupedUpdates.entries()) {
      const primary = imgs.find((im) => im.isPrimary) || imgs[0];
      updateProduct(pid, {
        imageUrl: primary?.url || '',
        thumbnailUrl: primary?.thumbnailUrl || primary?.url || '',
        images: imgs,
      });
    }

    setIsProcessing(false);
    addToast({
      title: 'Bulk Photo Linking Complete',
      message: `${groupedUpdates.size}টি প্রোডাক্টে মোট ${completedCount}টি ছবি যুক্ত সম্পন্ন হয়েছে।`,
      type: 'success',
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Bulk Product Photo Auto-Mapper (SKU / নাম অনুযায়ী একসাথে অনেক ছবি)"
      maxWidth="max-w-3xl"
    >
      <div className="space-y-4">
        <div className="p-4 rounded-2xl border-2 border-dashed border-indigo-200 dark:border-indigo-800 bg-indigo-50/40 dark:bg-indigo-950/20 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1">
            <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <Images className="h-4 w-4 text-indigo-600" />
              ফাইলের নাম প্রোডাক্টের `SKU` বা `Name`-এর মতো রাখলে অটো ম্যাচ হবে
            </div>
            <p className="text-[11px] text-slate-500">
              সব ছবি স্বয়ংক্রিয়ভাবে WebP-তে কমপ্রেস ও SHA-256 ডুপ্লিকেট চেক হয়ে যুক্ত হবে।
            </p>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => handleFilesPick(e.target.files)}
            className="hidden"
          />
          <Button variant="primary" size="sm" icon={Upload} onClick={() => fileRef.current?.click()}>
            ছবির ফোল্ডার / ফাইল সিলেক্ট করুন
          </Button>
        </div>

        {queuedRows.length > 0 && (
          <div className="max-h-72 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {queuedRows.map((row, idx) => (
              <div key={row.uid} className="p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="min-w-0 flex items-center gap-2">
                  {row.status === 'done' ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  ) : row.status === 'error' ? (
                    <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">{row.filename}</div>
                    <div className="text-[10px] text-slate-400">{formatBytes(row.originalBytes)}</div>
                  </div>
                </div>

                <select
                  value={row.targetProductId}
                  disabled={isProcessing || row.status === 'done'}
                  onChange={(e) => {
                    const val = e.target.value;
                    setQueuedRows((prev) => prev.map((r, i) => (i === idx ? { ...r, targetProductId: val } : r)));
                  }}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 max-w-xs text-[11px] font-medium"
                >
                  <option value="">-- ম্যাচ করা যায়নি (প্রোডাক্ট সিলেক্ট করুন) --</option>
                  {products.map((p) => (
                    <option key={p.id || p._id} value={p.id || p._id}>
                      [{p.sku}] {p.name}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="text-xs text-slate-500">
            {isProcessing
              ? `প্রসেসিং চলছে: ${progress.done}/${progress.total}`
              : queuedRows.length > 0
              ? `ম্যাচড: ${queuedRows.filter((r) => r.targetProductId).length} / ${queuedRows.length}টি ছবি`
              : 'ফাইল সিলেক্ট করলে প্রিভিউ তালিকা এখানে দেখাবে।'}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={onClose}>
              বন্ধ করুন
            </Button>
            <Button
              variant="primary"
              size="sm"
              isLoading={isProcessing}
              disabled={queuedRows.filter((r) => r.targetProductId).length === 0}
              onClick={handleRunBulkUpload}
            >
              কমপ্রেস ও প্রোডাক্টে লিঙ্ক করুন
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
