import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { translationEngine } from '../../services/translationEngine';

/**
 * <T> or <Translate> Component
 * Automatically translates children or text prop using the universal Translation Engine.
 * Example:
 *   <T>Customer Storefront Orders</T>
 *   <T text="Save Preferences" />
 */
export const T = ({ children, text, fallback = '' }) => {
  const { language } = useLanguage();
  const rawText = text || (typeof children === 'string' ? children : '');
  const [translated, setTranslated] = useState(() =>
    translationEngine.translate(rawText, language, fallback)
  );

  useEffect(() => {
    setTranslated(translationEngine.translate(rawText, language, fallback));

    const unsubscribe = translationEngine.subscribe((key, newText, targetLang) => {
      if (
        translationEngine.normalizeKey(key) === translationEngine.normalizeKey(rawText) &&
        targetLang === language
      ) {
        setTranslated(newText);
      }
    });

    return unsubscribe;
  }, [rawText, language, fallback]);

  return <>{translated}</>;
};

export const Translate = T;
export default T;
