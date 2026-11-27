import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAppData } from '../../context/AppDataContext';
import { mediaService } from '../../services/mediaService';
import {
  REFERENCE_IMAGE_TAGS,
  formatBytes,
  DEFAULT_FALLBACK_IMAGE,
} from '../../domain/mediaPipeline';
import {
  Upload,
  Camera,
  Link2,
  Image as ImageIcon,
  Star,
  Trash2,
  Sparkles,
  CheckCircle2,
  Cloud,
  AlertTriangle,
  Plus,
} from 'lucide-react';

/**
 * Modular Multi-Reference Product Photo Manager:
 * - Browser-side WebP auto-compression (saves ~85-97% bytes)
 * - SHA-256 deduplication check (reuses identical photos across parts without extra storage)
 * - Direct Cloudinary CDN upload when configured (or compact <25KB dev WebP preview + external URL)
 * - Hierarchical Reference Tags (Primary, Part No Stamp, Nameplate, Packaging, Diagram)
 */
export const ProductMediaManager = ({
  imageUrl = '',
  images = [],
  onChange,
  sku = '',
  categoryId = null,
  machineModelId = null,
  productId = null,
}) => {
  const { settings, addToast } = useAppData();
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ done: 0, total: 0 });
  const [selectedTag, setSelectedTag] = useState('primary');
  const [urlInput, setUrlInput] = useState('');
  const [showUrlBar, setShowUrlBar] = useState(false);

  const isCloudinaryReady = Boolean(
    settings?.cloudinaryCloudName?.trim() && settings?.cloudinaryUploadPreset?.trim()
  );

  // Build normalized gallery list combining legacy `imageUrl` + multi-ref `images[]`
  const normalizedGallery = (() => {
    const list = Array.isArray(images) ? images.filter((im) => im && im.url) : [];
    if (list.length === 0 && imageUrl && imageUrl.trim()) {
      return [
        {
          url: imageUrl.trim(),
          thumbnailUrl: imageUrl.trim(),
          tag: 'primary',
          caption: '',
          provider: imageUrl.includes('res.cloudinary.com')
            ? 'cloudinary'
            : imageUrl.startsWith('data:image/')
            ? 'inline_webp'
            : 'external_url',
          isPrimary: true,
        },
      ];
    }
    return list;
  })();

  const emitGalleryChange = (nextGallery) => {
    if (typeof onChange !== 'function') return;
    const cleaned = nextGallery.map((im, idx) => ({
      ...im,
      isPrimary: im.isPrimary || idx === 0 ? (nextGallery.some((x) => x.isPrimary) ? Boolean(im.isPrimary) : idx === 0) : false,
    }));
    const primary = cleaned.find((im) => im.isPrimary) || cleaned[0] || null;
    onChange({
      imageUrl: primary?.url || '',
      thumbnailUrl: primary?.thumbnailUrl || primary?.url || '',
      images: cleaned,
    });
  };

  const handleFilesSelected = async (fileList) => {
    const files = Array.from(fileList || []).filter((f) => f && f.type?.startsWith('image/'));
    if (files.length === 0) return;

    setIsUploading(true);
    setUploadProgress({ done: 0, total: files.length });

    const nextGallery = [...normalizedGallery];
    let dedupeHits = 0;
    let totalSavedBytes = 0;

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const tagForItem =
          nextGallery.length === 0 && i === 0 ? 'primary' : selectedTag === 'primary' && nextGallery.length > 0 ? 'front' : selectedTag;

        const uploaded = await mediaService.processAndUploadFile(file, {
          settings,
          tag: tagForItem,
          caption: file.name.replace(/\.[^.]+$/, ''),
          categoryId: categoryId || null,
          machineModelId: machineModelId || null,
          productId: productId || null,
          sku,
        });

        if (uploaded.deduplicated) dedupeHits += 1;
        if (uploaded.originalBytes > uploaded.compressedBytes) {
          totalSavedBytes += uploaded.originalBytes - uploaded.compressedBytes;
        }

        const existsInList = nextGallery.some((x) => x.url === uploaded.url);
        if (!existsInList) {
          nextGallery.push({
            mediaAssetId: uploaded.mediaAssetId,
            url: uploaded.url,
            thumbnailUrl: uploaded.thumbnailUrl,
            tag: uploaded.tag,
            caption: uploaded.caption,
            sha256: uploaded.sha256,
            provider: uploaded.provider,
            publicId: uploaded.publicId,
            originalBytes: uploaded.originalBytes,
            compressedBytes: uploaded.compressedBytes,
            width: uploaded.width,
            height: uploaded.height,
            isPrimary: nextGallery.length === 0,
          });
        }
        setUploadProgress({ done: i + 1, total: files.length });
      }

      emitGalleryChange(nextGallery);

      addToast({
        title: 'রেফারেন্স ছবি যুক্ত হয়েছে',
        message: `${files.length}টি ছবি WebP-তে প্রসেস সম্পন্ন (${formatBytes(totalSavedBytes)} সাশ্রয়${
          dedupeHits > 0 ? `, ${dedupeHits}টি ডুপ্লিকেট পুনর্ব্যবহৃত` : ''
        })।`,
        type: 'success',
      });
    } catch (err) {
      addToast({
        title: 'Image Upload Error',
        message: err.message || 'ছবি প্রসেস বা আপলোড করতে সমস্যা হয়েছে।',
        type: 'error',
      });
    } finally {
      setIsUploading(false);
      setUploadProgress({ done: 0, total: 0 });
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';
    }
  };

  const handleAddExternalUrl = async () => {
    if (!urlInput.trim()) return;
    try {
      const reg = await mediaService.registerExternalUrl(urlInput.trim(), {
        tag: normalizedGallery.length === 0 ? 'primary' : selectedTag,
        categoryId,
        machineModelId,
        productId,
      });
      const next = [
        ...normalizedGallery,
        {
          ...reg,
          isPrimary: normalizedGallery.length === 0,
        },
      ];
      emitGalleryChange(next);
      setUrlInput('');
      setShowUrlBar(false);
      addToast({ title: 'Image URL Added', message: 'External image link added to product references.' });
    } catch (err) {
      addToast({ title: 'Invalid URL', message: err.message, type: 'error' });
    }
  };

  const handleSetPrimary = (idx) => {
    const next = normalizedGallery.map((im, i) => ({
      ...im,
      isPrimary: i === idx,
    }));
    emitGalleryChange(next);
  };

  const handleUpdateMeta = (idx, field, val) => {
    const next = normalizedGallery.map((im, i) => (i === idx ? { ...im, [field]: val } : im));
    emitGalleryChange(next);
  };

  const handleRemoveImage = (idx) => {
    const next = normalizedGallery.filter((_, i) => i !== idx);
    if (next.length > 0 && !next.some((im) => im.isPrimary)) {
      next[0] = { ...next[0], isPrimary: true };
    }
    emitGalleryChange(next);
  };

  return (
    <div className="space-y-4 pt-3 border-t border-slate-100 dark:border-slate-800">
      {/* Header & Storage Mode Status */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
            <ImageIcon className="h-4 w-4 text-emerald-600" />
            <span>প্রোডাক্ট রেফারেন্স ছবি ও গ্যালারি (Auto-WebP + Multi-Photo Reference)</span>
          </h4>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            ফোনের ক্যামেরা বা গ্যালারি থেকে একসাথে অনেক ছবি দিলে অটো কমপ্রেস হয়ে হালকা WebP-তে সেভ হবে।
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isCloudinaryReady ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800">
              <Cloud className="h-3.5 w-3.5" />
              Cloudinary CDN যুক্ত (URL মোড)
            </span>
          ) : (
            <Link
              to="/settings"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800 hover:underline"
              title="Set Cloudinary Free Cloud Name in Settings for zero-DB-bloat image hosting"
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              Dev Preview মোড (Settings-এ Cloudinary দিন)
            </Link>
          )}
        </div>
      </div>

      {/* Upload Toolbar + Dropzone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (e.dataTransfer?.files?.length) {
            handleFilesSelected(e.dataTransfer.files);
          }
        }}
        className="p-4 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/40 space-y-3"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-semibold text-slate-700 dark:text-slate-200"
              title="Default reference tag for newly uploaded images"
            >
              {REFERENCE_IMAGE_TAGS.map((tg) => (
                <option key={tg.value} value={tg.value}>
                  ট্যাগ: {tg.bn}
                </option>
              ))}
            </select>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => handleFilesSelected(e.target.files)}
              className="hidden"
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => handleFilesSelected(e.target.files)}
              className="hidden"
            />

            <button
              type="button"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs disabled:opacity-50"
            >
              <Upload className="h-3.5 w-3.5" />
              <span>গ্যালারি / ফোল্ডার থেকে ছবি (Multi)</span>
            </button>

            <button
              type="button"
              disabled={isUploading}
              onClick={() => cameraInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs disabled:opacity-50"
            >
              <Camera className="h-3.5 w-3.5" />
              <span>ক্যামেরা দিয়ে তুলুন</span>
            </button>

            <button
              type="button"
              onClick={() => setShowUrlBar((s) => !s)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Link2 className="h-3.5 w-3.5" />
              <span>ওয়েব URL দিন</span>
            </button>
          </div>

          {isUploading && (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400">
              <Sparkles className="h-3.5 w-3.5 animate-spin" />
              কমপ্রেস ও আপলোড হচ্ছে: {uploadProgress.done}/{uploadProgress.total}
            </span>
          )}
        </div>

        {showUrlBar && (
          <div className="flex flex-col sm:flex-row gap-2 pt-1">
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://example.com/compressor-valve.webp"
              className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
            />
            <button
              type="button"
              onClick={handleAddExternalUrl}
              className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-emerald-600 text-white text-xs font-bold"
            >
              <Plus className="h-3.5 w-3.5" />
              লিঙ্ক যোগ করুন
            </button>
          </div>
        )}

        <p className="text-[11px] text-slate-400 text-center sm:text-left">
          একাধিক ছবি ড্র্যাগ করে এখানে ছাড়ুন — স্বয়ংক্রিয় WebP কম্প্রেশন ও SHA-256 ডুপ্লিকেট চেক চালু আছে।
        </p>
      </div>

      {/* Uploaded Reference Images Grid */}
      {normalizedGallery.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {normalizedGallery.map((im, idx) => {
            const savedPct =
              im.originalBytes > 0 && im.compressedBytes > 0 && im.originalBytes > im.compressedBytes
                ? Math.round(((im.originalBytes - im.compressedBytes) / im.originalBytes) * 100)
                : 0;
            return (
              <div
                key={`${im.url.slice(0, 40)}-${idx}`}
                className={`p-2.5 rounded-2xl border bg-white dark:bg-slate-900 flex flex-col gap-2 shadow-xs ${
                  im.isPrimary
                    ? 'border-emerald-400 ring-1 ring-emerald-500/20'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="relative h-32 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800">
                  <img
                    src={im.thumbnailUrl || im.url}
                    alt={im.caption || 'Reference'}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = DEFAULT_FALLBACK_IMAGE;
                    }}
                  />
                  <div className="absolute top-1.5 left-1.5 flex flex-wrap gap-1">
                    {im.isPrimary && (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[10px] font-bold inline-flex items-center gap-0.5 shadow-xs">
                        <CheckCircle2 className="h-2.5 w-2.5" />
                        মূল ছবি
                      </span>
                    )}
                    {im.compressedBytes > 0 && (
                      <span className="px-1.5 py-0.5 rounded-md bg-slate-900/75 text-white text-[10px] font-mono">
                        {formatBytes(im.compressedBytes)}
                        {savedPct > 0 ? ` (-${savedPct}%)` : ''}
                      </span>
                    )}
                  </div>

                  <div className="absolute top-1.5 right-1.5 flex items-center gap-1">
                    {!im.isPrimary && (
                      <button
                        type="button"
                        onClick={() => handleSetPrimary(idx)}
                        className="p-1 rounded-lg bg-white/90 text-amber-600 hover:bg-amber-50 shadow-xs"
                        title="মূল ছবি হিসেবে সেট করুন (Set Primary)"
                      >
                        <Star className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(idx)}
                      className="p-1 rounded-lg bg-white/90 text-red-600 hover:bg-red-50 shadow-xs"
                      title="ছবি সরান"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <select
                  value={im.tag || 'other'}
                  onChange={(e) => handleUpdateMeta(idx, 'tag', e.target.value)}
                  className="w-full px-2 py-1 text-[11px] rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 font-semibold"
                >
                  {REFERENCE_IMAGE_TAGS.map((tg) => (
                    <option key={tg.value} value={tg.value}>
                      {tg.bn} ({tg.en})
                    </option>
                  ))}
                </select>

                <input
                  type="text"
                  value={im.caption || ''}
                  onChange={(e) => handleUpdateMeta(idx, 'caption', e.target.value)}
                  placeholder="ক্যাপশন / পার্টস নোট (যেমন: 4EC Nameplate)"
                  className="w-full px-2 py-1 text-[11px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
