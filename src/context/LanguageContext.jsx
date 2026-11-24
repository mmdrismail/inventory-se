import React, { createContext, useContext, useState, useEffect } from 'react';
import { LANGUAGES, LANGUAGE_OPTIONS } from '../utils/translations';
import { translationEngine } from '../services/translationEngine';

const LanguageContext = createContext(null);

const STORAGE_LANG_KEY = 'stockline_global_language';

export const LanguageProvider = ({ children }) => {
  const [, setTick] = useState(0);

  const [language, setLanguageState] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_LANG_KEY);
      if (saved && (saved === LANGUAGES.BN || saved === LANGUAGES.EN || saved === LANGUAGES.OBRO)) {
        return saved;
      }
    } catch {}
    return LANGUAGES.BN; // Default to Bangla as requested
  });

  const setLanguage = (newLang) => {
    if (newLang === LANGUAGES.BN || newLang === LANGUAGES.EN || newLang === LANGUAGES.OBRO) {
      setLanguageState(newLang);
      try {
        localStorage.setItem(STORAGE_LANG_KEY, newLang);
        document.documentElement.lang = newLang === 'en' ? 'en' : 'bn';
      } catch {}
    }
  };

  useEffect(() => {
    try {
      document.documentElement.lang = language === 'en' ? 'en' : 'bn';
    } catch {}
  }, [language]);

  // Subscribe to background online translation engine updates
  useEffect(() => {
    const unsubscribe = translationEngine.subscribe(() => {
      setTick((prev) => prev + 1);
    });
    return unsubscribe;
  }, []);

  /**
   * Universal translation helper:
   * Accepts:
   * - A natural English string: t("System Preferences & Configuration") -> "সিস্টেম প্রেফারেন্স ও কনফিগারেশন"
   * - A translation key ID: t("nav_overview") -> "ড্যাশবোর্ড"
   * - An object: t({ bn: "...", en: "...", obro: "..." })
   */
  const t = (input, fallback = '') => {
    return translationEngine.translate(input, language, fallback);
  };

  /**
   * Multi-language object selector convenience helper
   */
  const l = (texts) => {
    if (!texts || typeof texts !== 'object') return texts;
    if (language === 'en') return texts.en || texts.bn;
    if (language === 'obro') return texts.obro || `${texts.bn} (${texts.en})`;
    return texts.bn || texts.en;
  };

  const currentOption = LANGUAGE_OPTIONS.find((opt) => opt.id === language) || LANGUAGE_OPTIONS[0];

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t,
        l,
        translate: (text, targetLang = language, fallback = '') =>
          translationEngine.translate(text, targetLang, fallback),
        translationEngine,
        currentOption,
        options: LANGUAGE_OPTIONS,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    // Fallback if rendered outside provider
    return {
      language: LANGUAGES.BN,
      setLanguage: () => {},
      t: (input, fallback = '') => translationEngine.translate(input, 'bn', fallback),
      l: (texts) => (texts && typeof texts === 'object' ? texts.bn || texts.en : texts),
      translate: (text, targetLang = 'bn', fallback = '') =>
        translationEngine.translate(text, targetLang, fallback),
      translationEngine,
      currentOption: LANGUAGE_OPTIONS[0],
      options: LANGUAGE_OPTIONS,
    };
  }
  return context;
};

