import React from 'react';
import { Card } from '../common/Card';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

export const KPICard = ({
  title,
  value,
  subtext,
  icon: Icon,
  variant = 'emerald',
  trend,
  trendType = 'up',
  onClick,
}) => {
  const variantStyles = {
    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 border-emerald-200/50 dark:border-emerald-800/50',
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 border-blue-200/50 dark:border-blue-800/50',
    purple: 'bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400 border-purple-200/50 dark:border-purple-800/50',
    amber: 'bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 border-amber-200/50 dark:border-amber-800/50',
    red: 'bg-red-50 text-red-600 dark:bg-red-950/60 dark:text-red-400 border-red-200/50 dark:border-red-800/50',
  };

  const valStr = String(value ?? '');
  const valueSizeClass =
    valStr.length >= 14
      ? 'text-base sm:text-lg'
      : valStr.length >= 10
        ? 'text-lg sm:text-xl'
        : 'text-xl sm:text-2xl';

  return (
    <Card
      onClick={onClick}
      className={`p-4 sm:p-5 relative min-w-0 transition-all duration-200 hover:shadow-md ${
        onClick ? 'cursor-pointer hover:border-emerald-400 dark:hover:border-emerald-600' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2.5">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider leading-snug min-w-0 flex-1">
          {title}
        </p>

        {Icon && (
          <div
            className={`p-2 rounded-xl border shrink-0 ${variantStyles[variant] || variantStyles.emerald}`}
          >
            <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
        )}
      </div>

      <h3
        className={`${valueSizeClass} font-bold text-slate-900 dark:text-slate-100 mt-1.5 tracking-tight tabular-nums leading-tight break-words`}
        title={valStr}
      >
        {value}
      </h3>

      {(subtext || trend) && (
        <div className="mt-3 flex items-center gap-2 text-xs">
          {trend && (
            <span
              className={`inline-flex items-center gap-0.5 font-semibold ${
                trendType === 'up'
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-red-600 dark:text-red-400'
              }`}
            >
              {trendType === 'up' ? (
                <ArrowUpRight className="h-3.5 w-3.5" />
              ) : (
                <ArrowDownRight className="h-3.5 w-3.5" />
              )}
              {trend}
            </span>
          )}
          {subtext && <span className="text-slate-400 dark:text-slate-500">{subtext}</span>}
        </div>
      )}
    </Card>
  );
};
