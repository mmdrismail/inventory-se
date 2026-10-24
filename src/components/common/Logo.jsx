import React from 'react';
import { Link } from 'react-router-dom';
import { Package, Boxes } from 'lucide-react';

export const Logo = ({ to = '/', size = 'md', isWhite = false, showTagline = false }) => {
  const sizeClasses = {
    sm: 'h-7 w-7 text-emerald-500',
    md: 'h-8 w-8 text-emerald-500',
    lg: 'h-10 w-10 text-emerald-500',
  };

  const textClasses = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
  };

  const content = (
    <div className="flex items-center gap-2.5 group select-none">
      <div className="relative flex items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 p-2 text-white shadow-md shadow-emerald-500/20 transition-transform group-hover:scale-105">
        <Boxes className="h-5 w-5" />
      </div>
      <div className="flex flex-col">
        <div className={`font-bold tracking-tight leading-none ${textClasses[size]} ${isWhite ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
          Stock<span className="text-emerald-500">Line</span>
        </div>
        {showTagline && (
          <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-400 mt-0.5">
            Inventory SaaS
          </span>
        )}
      </div>
    </div>
  );

  if (to) {
    return <Link to={to} className="inline-block">{content}</Link>;
  }

  return content;
};
