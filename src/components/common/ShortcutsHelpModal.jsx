import React from 'react';
import { Modal } from './Modal';
import { useLanguage } from '../../context/LanguageContext';
import { Command, Keyboard, Search, Moon, Globe, Barcode, Printer, Sparkles } from 'lucide-react';

export const ShortcutsHelpModal = ({ isOpen, onClose }) => {
  const { t } = useLanguage();

  const shortcutGroups = [
    {
      title: 'সাধারণ নেভিগেশন ও সার্চ (General & Search)',
      items: [
        { keys: ['Ctrl', 'K'], desc: 'গ্লোবাল ওমনি সার্চ ও পার্টস লুকআপ (Omni Search)' },
        { keys: ['Esc'], desc: 'যেকোনো মোডাল, ড্রয়ার বা পপ-আপ বন্ধ করা' },
        { keys: ['?'], desc: 'কীবোর্ড শর্টকাট সহায়তা নির্দেশিকা খোলা' },
      ],
    },
    {
      title: 'সিস্টেম ও ডিসপ্লে (System & Display)',
      items: [
        { keys: ['Ctrl', 'Shift', 'D'], desc: 'ডার্ক ও লাইট থিম টগল (Dark/Light Mode)' },
        { keys: ['Ctrl', 'Shift', 'L'], desc: 'ভাষা পরিবর্তন (বাংলা ⇄ English ⇄ Avro)' },
      ],
    },
    {
      title: 'বারকোড স্ক্যানার ও ইনভয়েসিং (Scanner & POS)',
      items: [
        { keys: ['Enter'], desc: 'বারকোড স্ক্যান শেষে পণ্য লাইনে স্বয়ংক্রিয় যোগ' },
        { keys: ['Ctrl', 'P'], desc: 'বর্তমান ইনভয়েস, চালান বা প্যাড লাইভ প্রিন্ট' },
      ],
    },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="কীবোর্ড শর্টকাট গাইড (Enterprise Keyboard Shortcuts)"
      description="দ্রুত কাজ করার জন্য মাউস ছাড়া সরাসরি কীবোর্ড কমান্ড ব্যবহার করুন।"
      maxWidth="max-w-xl"
    >
      <div className="space-y-4 text-xs">
        {shortcutGroups.map((group, gIdx) => (
          <div key={gIdx} className="space-y-2">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              {group.title}
            </h4>
            <div className="space-y-1.5 bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
              {group.items.map((it, idx) => (
                <div key={idx} className="flex items-center justify-between py-1">
                  <span className="text-slate-700 dark:text-slate-300 font-medium">
                    {it.desc}
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    {it.keys.map((k, kIdx) => (
                      <kbd
                        key={kIdx}
                        className="px-2 py-1 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs font-mono font-bold text-[11px] text-slate-800 dark:text-slate-200"
                      >
                        {k}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
          <Sparkles className="h-4 w-4 shrink-0 text-emerald-600" />
          <span className="text-[11px] leading-relaxed">
            টিপস: যেকোনো পেজ থেকে সরাসরি <kbd className="px-1 py-0.5 bg-white dark:bg-slate-800 rounded border text-[10px] font-mono">Ctrl+K</kbd> চেপে পার্টস, কম্প্রেসার মডেল বা কাস্টমার খুঁজুন।
          </span>
        </div>
      </div>
    </Modal>
  );
};
