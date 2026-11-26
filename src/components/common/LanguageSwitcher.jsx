import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { Globe, Check, ChevronDown } from 'lucide-react';

export const LanguageSwitcher = ({ variant = 'default', showLabel = true }) => {
  const { language, setLanguage, currentOption, options } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block text-left" ref={dropdownRef} data-no-translate="true">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 hover:border-slate-300 dark:hover:border-slate-600 transition-all text-xs font-semibold shadow-sm select-none whitespace-nowrap shrink-0"
        title="ভাষা পরিবর্তন করুন / Switch Website Language"
        aria-label="Language Selector"
      >
        <span className="text-sm leading-none shrink-0">{currentOption.flag}</span>
        {showLabel && (
          <span className="hidden sm:inline font-bold whitespace-nowrap">
            {currentOption.label}
          </span>
        )}
        <ChevronDown className="h-3 w-3 text-slate-400 shrink-0" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-48 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
          <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            ওয়েবসাইটের ভাষা (Language)
          </div>
          <div className="p-1 space-y-0.5">
            {options.map((opt) => {
              const isSelected = opt.id === language;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setLanguage(opt.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                    isSelected
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 font-bold'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base leading-none">{opt.flag}</span>
                    <span>{opt.nativeName}</span>
                  </div>
                  {isSelected && <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
