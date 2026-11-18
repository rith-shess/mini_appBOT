import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import { translations } from '../locales/translations';
import { Language } from '../types';

interface TranslationContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: typeof translations.en;
}

const TranslationContext = createContext<TranslationContextType | null>(null);

const STORAGE_KEY = 'info_pos_lang';

export function TranslationProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as Language;
      if (saved === 'en' || saved === 'km') return saved;
      // Check telegram user language or browser language
      if (typeof window !== 'undefined') {
        const tgLang = window.Telegram?.WebApp?.initDataUnsafe?.user?.language_code;
        if (tgLang === 'km') return 'km';
        if (navigator.language.startsWith('km')) return 'km';
      }
    } catch {
      // fallback
    }
    return 'en';
  });

  const setLanguage = useCallback((newLang: Language) => {
    setLanguageState(newLang);
    try {
      localStorage.setItem(STORAGE_KEY, newLang);
    } catch (e) {
      console.warn('Could not save language to localStorage:', e);
    }
  }, []);

  const t = translations[language] || translations.en;

  return (
    <TranslationContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </TranslationContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(TranslationContext);
  if (!context) {
    throw new Error('useTranslation must be used within a TranslationProvider');
  }
  return context;
}
