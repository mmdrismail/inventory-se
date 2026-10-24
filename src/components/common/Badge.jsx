import React from 'react';
import { getStockStatus } from '../../utils/formatters';
import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

export const Badge = ({ children, variant = 'slate', size = 'md', className = '' }) => {
  const variantMap = {
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60',
    amber: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60',
    red: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800/60',
    blue: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/60',
    purple: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/60',
    slate: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
  };

  const sizeMap = {
    sm: 'text-[11px] px-2 py-0.5 font-medium',
    md: 'text-xs px-2.5 py-1 font-medium',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border ${variantMap[variant] || variantMap.slate} ${sizeMap[size]} ${className}`}
    >
      {children}
    </span>
  );
};

export const StockBadge = ({ quantity, reorderLevel = 10, showIcon = true }) => {
  const { label, status, color } = getStockStatus(quantity, reorderLevel);

  const icons = {
    emerald: <CheckCircle2 className="h-3 w-3 shrink-0" />,
    amber: <AlertTriangle className="h-3 w-3 shrink-0" />,
    red: <XCircle className="h-3 w-3 shrink-0" />,
  };

  return (
    <Badge variant={color}>
      {showIcon && icons[color]}
      <span>{label}</span>
      <span className="opacity-75 font-mono text-[10px]">({quantity})</span>
    </Badge>
  );
};
