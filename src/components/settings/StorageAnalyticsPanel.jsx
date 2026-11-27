import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../common/Card';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { Input } from '../forms/FormControls';
import { mediaService } from '../../services/mediaService';
import { formatBytes } from '../../domain/mediaPipeline';
import {
  HardDrive,
  Cloud,
  Database,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Image as ImageIcon,
  Save,
  Info,
} from 'lucide-react';

const getBarColor = (pct) => {
  if (pct >= 85) return 'bg-red-500';
  if (pct >= 70) return 'bg-amber-500';
  return 'bg-emerald-500';
};

const getStatusBadge = (pct, l) => {
  if (pct >= 85) {
    return (
      <Badge variant="red" size="sm">
        {l({ bn: 'সতর্কতা: প্রায় পূর্ণ!', en: 'Critical (>85%)' })}
      </Badge>
    );
  }
  if (pct >= 70) {
    return (
      <Badge variant="amber" size="sm">
        {l({ bn: 'নজরদারি (৭০%+)', en: 'Caution (>70%)' })}
      </Badge>
    );
  }
  return (
    <Badge variant="emerald" size="sm">
      {l({ bn: 'স্বাভাবিক (Safe)', en: 'Healthy' })}
    </Badge>
  );
};

export const StorageAnalyticsPanel = ({ settings = {}, products = [], onSaveCloudConfig, language = 'bn' }) => {
  const l = (texts) => {
    if (language === 'en') return texts.en;
    return texts.bn;
  };

  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [draftEdits, setDraftEdits] = useState({});

  const cloudForm = {
    cloudinaryCloudName: draftEdits.cloudinaryCloudName ?? settings.cloudinaryCloudName ?? '',
    cloudinaryUploadPreset: draftEdits.cloudinaryUploadPreset ?? settings.cloudinaryUploadPreset ?? '',
    cloudinaryDefaultFolder: draftEdits.cloudinaryDefaultFolder ?? settings.cloudinaryDefaultFolder ?? 'stockline/products',
    mediaMaxWidthPx: draftEdits.mediaMaxWidthPx ?? String(settings.mediaMaxWidthPx || 1200),
    mediaQuality: draftEdits.mediaQuality ?? String(settings.mediaQuality || 0.78),
    mongoQuotaMb: draftEdits.mongoQuotaMb ?? String(settings.mongoQuotaMb || 512),
    cloudMediaQuotaMb: draftEdits.cloudMediaQuotaMb ?? String(settings.cloudMediaQuotaMb || 1024),
  };

  const loadAnalytics = async () => {
    setLoading(true);
    const data = await mediaService.fetchStorageAnalytics({ settings, products });
    setAnalytics(data);
    setLoading(false);
  };

  useEffect(() => {
    let active = true;
    mediaService.fetchStorageAnalytics({ settings, products }).then((data) => {
      if (!active) return;
      setAnalytics(data);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [settings, products]);

  const handleSaveCloudSettings = (e) => {
    e.preventDefault();
    if (typeof onSaveCloudConfig === 'function') {
      onSaveCloudConfig({
        cloudinaryCloudName: cloudForm.cloudinaryCloudName.trim(),
        cloudinaryUploadPreset: cloudForm.cloudinaryUploadPreset.trim(),
        cloudinaryDefaultFolder: cloudForm.cloudinaryDefaultFolder.trim() || 'stockline/products',
        mediaMaxWidthPx: Math.max(400, Number(cloudForm.mediaMaxWidthPx) || 1200),
        mediaQuality: Math.min(0.95, Math.max(0.45, Number(cloudForm.mediaQuality) || 0.78)),
        mongoQuotaMb: Math.max(50, Number(cloudForm.mongoQuotaMb) || 512),
        cloudMediaQuotaMb: Math.max(50, Number(cloudForm.cloudMediaQuotaMb) || 1024),
      });
    }
    setDraftEdits({});
    setTimeout(loadAnalytics, 350);
  };

  const mongo = analytics?.mongodb;
  const media = analytics?.media;
  const localStat = analytics?.browserLocalStorage;

  return (
    <div className="space-y-6">
      {/* 1. Storage Usage & Overflow Early-Warning Monitor */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-slate-900 dark:text-white flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-indigo-600" />
              <span>
                {l({
                  bn: 'স্টোরেজ ব্যবহার ও ওভারফ্লো পূর্বাভাস (Storage & Capacity Monitor)',
                  en: 'Live Storage Analytics & Overflow Early-Warning',
                })}
              </span>
            </CardTitle>
            <p className="text-xs text-slate-400 mt-0.5">
              {l({
                bn: 'MongoDB Atlas, Cloud Media (ছবি) এবং Browser Storage কোথায় কতটুকু জায়গা বাকি ও আরও কত এন্ট্রি করা যাবে তার হিসাব।',
                en: 'Track exact MongoDB Atlas, Cloud Media, and browser localStorage capacity before any overflow occurs.',
              })}
            </p>
          </div>
          <Button variant="outline" size="sm" icon={RefreshCw} onClick={loadAnalytics} isLoading={loading}>
            {l({ bn: 'হিসাব রিফ্রেশ করুন', en: 'Refresh Usage' })}
          </Button>
        </CardHeader>

        <CardContent className="space-y-5">
          {/* Early Warning Alerts */}
          {Array.isArray(analytics?.alerts) && analytics.alerts.length > 0 && (
            <div className="space-y-2">
              {analytics.alerts.map((al, i) => (
                <div
                  key={i}
                  className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                    al.level === 'critical'
                      ? 'bg-red-50 border-red-200 text-red-700 dark:bg-red-950/30 dark:border-red-900 dark:text-red-300'
                      : al.level === 'warning'
                      ? 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/30 dark:border-amber-900 dark:text-amber-300'
                      : 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-950/30 dark:border-indigo-900 dark:text-indigo-300'
                  }`}
                >
                  {al.level === 'info' ? (
                    <Info className="h-4 w-4 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  )}
                  <span>{al.message}</span>
                </div>
              ))}
            </div>
          )}

          {/* 3 Main Capacity Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Card 1: MongoDB Atlas */}
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 space-y-3 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 font-bold text-xs text-slate-900 dark:text-slate-100">
                  <Database className="h-4 w-4 text-emerald-600" />
                  <span>MongoDB Atlas (`{analytics?.databaseName || 'stockline_db'}`)</span>
                </div>
                {mongo ? getStatusBadge(mongo.usedPercent, l) : <Badge variant="slate" size="sm">Offline</Badge>}
              </div>

              {mongo ? (
                <>
                  <div className="flex items-baseline justify-between text-xs">
                    <span className="font-mono font-black text-base text-slate-900 dark:text-white tabular-nums">
                      {formatBytes(mongo.totalDbBytes)}
                    </span>
                    <span className="text-slate-500 font-mono">
                      / {mongo.quotaMb} MB ({mongo.usedPercent}%)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full transition-all ${getBarColor(mongo.usedPercent)}`}
                      style={{ width: `${Math.max(2, Math.min(100, mongo.usedPercent))}%` }}
                    />
                  </div>
                  <div className="text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
                    <div>মোট ডকুমেন্ট: <strong>{mongo.totalRecords?.toLocaleString()}</strong> টি</div>
                    <div className="text-emerald-700 dark:text-emerald-400 font-semibold">
                      আরও আনুমানিক ~{mongo.estimatedMoreProducts?.toLocaleString()} টি প্রোডাক্ট বা{' '}
                      ~{mongo.estimatedMoreRecords?.toLocaleString()} টি রেকর্ড এন্ট্রি সম্ভব
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-[11px] text-slate-500">
                  লাইভ MongoDB সার্ভার (`:5000`) সংযুক্ত না থাকায় শুধু লোকাল ও মিডিয়া হিসাব দেখানো হচ্ছে।
                </p>
              )}
            </div>

            {/* Card 2: Cloud Media & Reference Photos */}
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 space-y-3 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 font-bold text-xs text-slate-900 dark:text-slate-100">
                  <ImageIcon className="h-4 w-4 text-indigo-600" />
                  <span>প্রোডাক্ট ছবি (Media Vault + CDN)</span>
                </div>
                {media ? getStatusBadge(media.usedPercent, l) : null}
              </div>

              {media && (
                <>
                  <div className="flex items-baseline justify-between text-xs">
                    <span className="font-mono font-black text-base text-slate-900 dark:text-white tabular-nums">
                      {formatBytes(media.totalCompressedBytes)}
                    </span>
                    <span className="text-slate-500 font-mono">
                      / {media.quotaMb} MB ({media.usedPercent}%)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full transition-all ${getBarColor(media.usedPercent)}`}
                      style={{ width: `${Math.max(2, Math.min(100, media.usedPercent))}%` }}
                    />
                  </div>
                  <div className="text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
                    <div>
                      নিবন্ধিত ছবি: <strong>{media.totalAssets}</strong> টি (গড় ~{formatBytes(media.avgImageBytes)})
                      {media.bytesSaved > 0 && (
                        <span className="text-emerald-600 font-semibold"> · WebP সাশ্রয়: {formatBytes(media.bytesSaved)}</span>
                      )}
                    </div>
                    <div className="text-indigo-700 dark:text-indigo-400 font-semibold">
                      আরও আনুমানিক ~{media.estimatedMoreImages?.toLocaleString()} টি WebP ছবি রাখা যাবে
                      {media.dedupeReuses > 0 ? ` (${media.dedupeReuses}টি ডুপ্লিকেট সেভ হয়েছে)` : ''}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Card 3: Browser LocalStorage & Cache */}
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 space-y-3 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 font-bold text-xs text-slate-900 dark:text-slate-100">
                  <HardDrive className="h-4 w-4 text-amber-600" />
                  <span>Browser `localStorage` (~5 MB সীমা)</span>
                </div>
                {localStat ? getStatusBadge(localStat.usedPercent, l) : null}
              </div>

              {localStat && (
                <>
                  <div className="flex items-baseline justify-between text-xs">
                    <span className="font-mono font-black text-base text-slate-900 dark:text-white tabular-nums">
                      {formatBytes(localStat.usedBytes)}
                    </span>
                    <span className="text-slate-500 font-mono">
                      / 5.00 MB ({localStat.usedPercent}%)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full transition-all ${getBarColor(localStat.usedPercent)}`}
                      style={{ width: `${Math.max(2, Math.min(100, localStat.usedPercent))}%` }}
                    />
                  </div>
                  <div className="text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
                    <div>ফাঁকা স্পেস: <strong>{formatBytes(localStat.remainingBytes)}</strong></div>
                    {analytics?.browserIndexedDb?.quota && (
                      <div className="text-slate-500">
                        Browser Quota: {formatBytes(analytics.browserIndexedDb.usage || 0)} / {formatBytes(analytics.browserIndexedDb.quota)}
                      </div>
                    )}
                    {localStat.inlineImageKeys > 0 && (
                      <div className="text-amber-600 font-semibold">
                        সতর্কতা: ব্রাউজার স্টোরেজে ইনলাইন ছবি শনাক্ত হয়েছে—Cloudinary ব্যবহার করলে জায়গা খালি থাকবে।
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Collection-wise Breakdown Table */}
          {mongo?.collections?.length > 0 && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500">
                    <th className="py-2 px-3">ডাটাবেজ কালেকশন</th>
                    <th className="py-2 px-3 text-right">মোট রেকর্ড</th>
                    <th className="py-2 px-3 text-right">গড় সাইজ/রেকর্ড</th>
                    <th className="py-2 px-3 text-right">আনুমানিক স্পেস</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {mongo.collections
                    .filter((c) => c.count > 0 || ['products', 'mediaAssets', 'sales', 'quotations', 'priceCatalog'].includes(c.key))
                    .map((col) => (
                      <tr key={col.key} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                        <td className="py-2 px-3 font-medium text-slate-800 dark:text-slate-200">{col.label}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold tabular-nums">{col.count}</td>
                        <td className="py-2 px-3 text-right font-mono text-slate-500 tabular-nums">
                          {col.count > 0 ? formatBytes(col.avgDocBytes) : '-'}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-semibold text-indigo-600 dark:text-indigo-400 tabular-nums">
                          {formatBytes(col.estimatedTotalBytes)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2. Cloudinary Free Tier & Compression Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-slate-900 dark:text-white flex items-center gap-2">
            <Cloud className="h-4 w-4 text-emerald-600" />
            <span>
              {l({
                bn: 'ক্লাউড মিডিয়া ও ইমেজ কম্প্রেশন সেটিংস (Cloudinary Free CDN)',
                en: 'Cloud Media CDN & Compression Config (Cloudinary)',
              })}
            </span>
          </CardTitle>
          <p className="text-xs text-slate-400">
            ফ্রি Cloudinary একাউন্টের Cloud Name ও Unsigned Upload Preset দিলে সব প্রোডাক্টের ছবি অটো WebP হয়ে সরাসরি ক্লাউড CDN-এ সেভ হবে—GitHub Pages লাইভ সাইট ও মোবাইল সব জায়গায় কাজ করবে।
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveCloudSettings} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="Cloudinary Cloud Name"
                value={cloudForm.cloudinaryCloudName}
                onChange={(e) => setDraftEdits((p) => ({ ...p, cloudinaryCloudName: e.target.value }))}
                placeholder="e.g. demo-shop-cloud"
              />
              <Input
                label="Unsigned Upload Preset"
                value={cloudForm.cloudinaryUploadPreset}
                onChange={(e) => setDraftEdits((p) => ({ ...p, cloudinaryUploadPreset: e.target.value }))}
                placeholder="e.g. stockline_unsigned"
              />
              <Input
                label="Default Cloud Folder"
                value={cloudForm.cloudinaryDefaultFolder}
                onChange={(e) => setDraftEdits((p) => ({ ...p, cloudinaryDefaultFolder: e.target.value }))}
                placeholder="stockline/products"
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Input
                label="Max Image Width (px)"
                type="number"
                min="400"
                max="2400"
                value={cloudForm.mediaMaxWidthPx}
                onChange={(e) => setDraftEdits((p) => ({ ...p, mediaMaxWidthPx: e.target.value }))}
              />
              <Input
                label="WebP Quality (0.5 - 0.92)"
                type="number"
                step="0.02"
                min="0.45"
                max="0.95"
                value={cloudForm.mediaQuality}
                onChange={(e) => setDraftEdits((p) => ({ ...p, mediaQuality: e.target.value }))}
              />
              <Input
                label="MongoDB Quota (MB)"
                type="number"
                min="50"
                value={cloudForm.mongoQuotaMb}
                onChange={(e) => setDraftEdits((p) => ({ ...p, mongoQuotaMb: e.target.value }))}
              />
              <Input
                label="Media Quota (MB)"
                type="number"
                min="50"
                value={cloudForm.cloudMediaQuotaMb}
                onChange={(e) => setDraftEdits((p) => ({ ...p, cloudMediaQuotaMb: e.target.value }))}
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
              <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                {cloudForm.cloudinaryCloudName && cloudForm.cloudinaryUploadPreset ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>Cloudinary কনফিগার করা আছে — প্রোডাক্ট ছবি সরাসরি CDN-এ আপলোড হবে।</span>
                  </>
                ) : (
                  <span>টিপস: Cloudinary সেটিংসে `Settings → Upload → Upload Presets → Add unsigned preset` করে নামটি এখানে বসান।</span>
                )}
              </div>
              <Button type="submit" variant="primary" size="sm" icon={Save}>
                মিডিয়া ও কোটা সেটিংস সেভ করুন
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
