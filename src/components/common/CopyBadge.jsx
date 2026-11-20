import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

/**
 * Click-to-copy badge for SKUs, Invoice numbers, and Warehouse Rack codes.
 */
export const CopyBadge = ({
  text,
  label,
  className = '',
  iconOnly = false,
  tooltipText = 'কপি করুন',
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e) => {
    e.stopPropagation();
    if (!text) return;
    try {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    }
  };

  if (iconOnly) {
    return (
      <button
        type="button"
        onClick={handleCopy}
        title={copied ? 'কপি সম্পন্ন!' : tooltipText}
        className={`inline-flex items-center justify-center p-1 rounded-md text-slate-400 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${className}`}
      >
        {copied ? (
          <Check className="h-3 w-3 text-emerald-500 animate-in zoom-in-75 duration-150" />
        ) : (
          <Copy className="h-3 w-3" />
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={copied ? 'কপি সম্পন্ন!' : tooltipText}
      className={`inline-flex items-center gap-1 font-mono text-[11px] font-semibold px-1.5 py-0.5 rounded border transition-all select-none ${
        copied
          ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700'
          : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-emerald-400 hover:text-emerald-600 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800 dark:hover:border-slate-700'
      } ${className}`}
    >
      <span>{label || text}</span>
      {copied ? (
        <Check className="h-2.5 w-2.5 text-emerald-500 shrink-0" />
      ) : (
        <Copy className="h-2.5 w-2.5 opacity-40 group-hover:opacity-100 shrink-0" />
      )}
    </button>
  );
};
