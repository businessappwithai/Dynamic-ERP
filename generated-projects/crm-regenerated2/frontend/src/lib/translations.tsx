import React, { type ReactNode, createContext, useContext } from 'react';

const translations = {
  en: {
    'common.dashboard': 'Dashboard',
    'common.logout': 'Logout',
    'common.login': 'Login',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.create': 'Create',
    'common.search': 'Search',
    'common.loading': 'Loading...',
    'common.error': 'An error occurred',
    'common.success': 'Operation successful',
  },
};

interface TranslationContextType {
  t: (key: string) => string;
  locale: string;
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

interface TranslationProviderProps {
  children: ReactNode;
  locale?: string;
}

export function TranslationProvider({ children, locale = 'en' }: TranslationProviderProps) {
  const t = (key: string): string => {
    const keys = key.split('.');
    let value: any = translations[locale as keyof typeof translations] || translations.en;
    for (const k of keys) {
      value = value?.[k];
    }
    return value || key;
  };
  return (
    <TranslationContext.Provider value={{ t, locale }}>
      {children}
    </TranslationContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(TranslationContext);
  if (!context) throw new Error('useTranslation must be used within TranslationProvider');
  return context;
}

// Standalone translate for use outside of components (e.g. mutation callbacks)
export function translate(key: string, params?: Record<string, string>): string {
  const parts = key.split('.');
  let value: any = translations.en;
  for (const part of parts) {
    value = value?.[part];
  }
  let result = typeof value === 'string' ? value : key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      result = result.replace(`{${k}}`, v);
    }
  }
  return result;
}
