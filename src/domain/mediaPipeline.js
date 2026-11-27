/**
 * Zero-dependency client-side Media Pipeline:
 * 1) Canvas WebP Auto-Compression (1200px reference + 320px thumbnail)
 * 2) Content-addressable SHA-256 Deduplication Hash
 * 3) Direct Cloudinary CDN URL thumbnail transform
 * 4) Browser localStorage & IndexedDB capacity telemetry
 */

export const REFERENCE_IMAGE_TAGS = [
  { value: 'primary', bn: 'মূল ছবি (Front)', en: 'Primary / Front' },
  { value: 'part_number_stamp', bn: 'পার্ট নম্বর / সিল', en: 'Part Number Stamp' },
  { value: 'nameplate', bn: 'মেশিন নেমপ্লেট / স্পেক', en: 'Machine Nameplate' },
  { value: 'packaging', bn: 'প্যাকেজিং / বক্স', en: 'Box / Packaging' },
  { value: 'machine_diagram', bn: 'ডায়াগ্রাম / টেকনিক্যাল', en: 'Machine Diagram' },
  { value: 'other', bn: 'অন্যান্য রেফারেন্স', en: 'Other Reference' },
];

export const DEFAULT_FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1589710751893-f9a6770ad71b?w=500&auto=format&fit=crop&q=60';

export const formatBytes = (bytes = 0) => {
  const n = Math.max(0, Number(bytes) || 0);
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(2)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

export const buildCloudinaryThumbnailUrl = (url = '', width = 320) => {
  const str = String(url || '').trim();
  if (!str.includes('res.cloudinary.com') || !str.includes('/upload/')) return str;
  if (str.includes('/upload/w_')) return str;
  return str.replace('/upload/', `/upload/w_${width},c_limit,f_auto,q_auto/`);
};

export const blobToDataUrl = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to encode compressed image.'));
    reader.readAsDataURL(blob);
  });

export const computeBlobSha256 = async (blob) => {
  try {
    if (typeof crypto === 'undefined' || !crypto?.subtle || !blob?.arrayBuffer) return '';
    const buffer = await blob.arrayBuffer();
    const digest = await crypto.subtle.digest('SHA-256', buffer);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  } catch {
    return '';
  }
};

const loadImageElement = (fileOrBlob) =>
  new Promise((resolve, reject) => {
    if (typeof document === 'undefined') {
      reject(new Error('Image compression requires browser DOM canvas.'));
      return;
    }
    const url = URL.createObjectURL(fileOrBlob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Invalid or unsupported image file.'));
    };
    img.src = url;
  });

const canvasToBlob = (canvas, mimeType, quality) =>
  new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b), mimeType, quality);
  });

/**
 * Compresses any photo in browser to WebP reference + lightweight thumbnail before upload or storage.
 */
export const compressImageToWebP = async (
  file,
  { maxWidth = 1200, thumbWidth = 320, quality = 0.78 } = {}
) => {
  const img = await loadImageElement(file);
  const srcW = img.naturalWidth || img.width || 1;
  const srcH = img.naturalHeight || img.height || 1;

  const scale = srcW > maxWidth ? maxWidth / srcW : 1;
  const targetW = Math.max(1, Math.round(srcW * scale));
  const targetH = Math.max(1, Math.round(srcH * scale));

  const mainCanvas = document.createElement('canvas');
  mainCanvas.width = targetW;
  mainCanvas.height = targetH;
  const mainCtx = mainCanvas.getContext('2d');
  mainCtx.drawImage(img, 0, 0, targetW, targetH);

  let mainBlob = await canvasToBlob(mainCanvas, 'image/webp', quality);
  let mimeType = 'image/webp';
  if (!mainBlob || !mainBlob.type.includes('webp')) {
    mainBlob = await canvasToBlob(mainCanvas, 'image/jpeg', quality);
    mimeType = 'image/jpeg';
  }

  // Generate lightweight thumbnail
  const tScale = targetW > thumbWidth ? thumbWidth / targetW : 1;
  const thumbW = Math.max(1, Math.round(targetW * tScale));
  const thumbH = Math.max(1, Math.round(targetH * tScale));
  const thumbCanvas = document.createElement('canvas');
  thumbCanvas.width = thumbW;
  thumbCanvas.height = thumbH;
  thumbCanvas.getContext('2d').drawImage(mainCanvas, 0, 0, thumbW, thumbH);
  const thumbBlob = await canvasToBlob(thumbCanvas, mimeType, Math.min(0.72, quality));

  return {
    blob: mainBlob,
    thumbBlob: thumbBlob || mainBlob,
    mimeType,
    width: targetW,
    height: targetH,
    originalBytes: file?.size || mainBlob.size,
    compressedBytes: mainBlob.size,
    thumbBytes: (thumbBlob || mainBlob).size,
  };
};

/**
 * Measures actual UTF-16 byte consumption of StockLine keys in browser `localStorage` (~5 MB cap).
 */
export const measureLocalStorageUsage = (quotaBytes = 5 * 1024 * 1024) => {
  if (typeof localStorage === 'undefined') {
    return {
      usedBytes: 0,
      quotaBytes,
      usedPercent: 0,
      remainingBytes: quotaBytes,
      inlineImageKeys: 0,
      breakdown: [],
    };
  }

  let usedBytes = 0;
  let inlineImageKeys = 0;
  const breakdown = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;
    const val = localStorage.getItem(key) || '';
    const bytes = (key.length + val.length) * 2; // UTF-16 2 bytes per char in browser storage
    usedBytes += bytes;
    const hasInlineImg = val.includes('data:image/');
    if (hasInlineImg) inlineImageKeys += 1;
    if (key.startsWith('stockline_')) {
      breakdown.push({
        key: key.replace('stockline_demo_v1_', ''),
        bytes,
        hasInlineImg,
      });
    }
  }

  breakdown.sort((a, b) => b.bytes - a.bytes);
  const usedPercent = Math.min(100, Math.round((usedBytes / quotaBytes) * 10000) / 100);
  const remainingBytes = Math.max(0, quotaBytes - usedBytes);

  return {
    usedBytes,
    quotaBytes,
    usedPercent,
    remainingBytes,
    inlineImageKeys,
    breakdown,
  };
};

export const estimateRemainingCapacity = ({
  usedBytes = 0,
  quotaBytes = 1,
  avgItemBytes = 0,
  fallbackItemBytes = 90 * 1024,
} = {}) => {
  const safeQuota = Math.max(1, Number(quotaBytes) || 1);
  const safeUsed = Math.max(0, Number(usedBytes) || 0);
  const usedPercent = Math.min(100, Math.round((safeUsed / safeQuota) * 10000) / 100);
  const remainingBytes = Math.max(0, safeQuota - safeUsed);
  const unitBytes = avgItemBytes > 0 ? avgItemBytes : fallbackItemBytes;
  const estimatedRemainingCount = Math.floor(remainingBytes / Math.max(1, unitBytes));
  const alertLevel = usedPercent >= 85 ? 'critical' : usedPercent >= 70 ? 'warning' : 'safe';

  return {
    usedPercent,
    remainingBytes,
    estimatedRemainingCount,
    alertLevel,
  };
};
