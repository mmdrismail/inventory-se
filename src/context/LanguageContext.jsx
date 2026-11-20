import React, { createContext, useContext, useState, useEffect } from 'react';
import { LANGUAGES, LANGUAGE_OPTIONS, TRANSLATIONS, getTranslation } from '../utils/translations';

const LanguageContext = createContext(null);

const STORAGE_LANG_KEY = 'stockline_global_language';

export const LanguageProvider = ({ children }) => {
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

  const t = (key, fallback = '') => {
    return getTranslation(key, language, fallback);
  };

  const currentOption = LANGUAGE_OPTIONS.find((opt) => opt.id === language) || LANGUAGE_OPTIONS[0];

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t,
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
      t: (key, fallback = '') => getTranslation(key, 'bn', fallback),
      currentOption: LANGUAGE_OPTIONS[0],
      options: LANGUAGE_OPTIONS,
    };
  }
  return context;
};
