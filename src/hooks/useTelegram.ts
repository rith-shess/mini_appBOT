import { useEffect, useState, useCallback, useMemo } from 'react';

// Declarations for Telegram WebApp SDK
declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        initData: string;
        initDataUnsafe: {
          query_id?: string;
          user?: {
            id: number;
            first_name: string;
            last_name?: string;
            username?: string;
            language_code?: string;
            is_premium?: boolean;
          };
          auth_date?: string;
          hash?: string;
          start_param?: string;
        };
        version: string;
        platform: string;
        colorScheme: 'light' | 'dark';
        themeParams: {
          bg_color?: string;
          text_color?: string;
          hint_color?: string;
          link_color?: string;
          button_color?: string;
          button_text_color?: string;
          secondary_bg_color?: string;
        };
        isExpanded: boolean;
        viewportHeight: number;
        viewportStableHeight: number;
        headerColor?: string;
        backgroundColor?: string;
        ready: () => void;
        expand: () => void;
        close: () => void;
        setHeaderColor?: (color: string) => void;
        setBackgroundColor?: (color: string) => void;
        MainButton: {
          text: string;
          color: string;
          textColor: string;
          isVisible: boolean;
          isActive: boolean;
          isProgressVisible: boolean;
          setText: (text: string) => void;
          onClick: (callback: () => void) => void;
          offClick: (callback: () => void) => void;
          show: () => void;
          hide: () => void;
          enable: () => void;
          disable: () => void;
          showProgress: (leaveActive?: boolean) => void;
          hideProgress: () => void;
          setParams: (params: { text?: string; color?: string; text_color?: string; is_active?: boolean; is_visible?: boolean }) => void;
        };
        BackButton: {
          isVisible: boolean;
          onClick: (callback: () => void) => void;
          offClick: (callback: () => void) => void;
          show: () => void;
          hide: () => void;
        };
        HapticFeedback?: {
          impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
          notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
          selectionChanged: () => void;
        };
        openLink?: (url: string, options?: { try_instant_view?: boolean }) => void;
        openTelegramLink?: (url: string) => void;
      };
    };
  }
}

export interface TelegramUser {
  id: number;
  firstName: string;
  lastName?: string;
  username?: string;
  languageCode?: string;
}

export function useTelegram() {
  const [isTelegram, setIsTelegram] = useState<boolean>(false);
  const [user, setUser] = useState<TelegramUser | null>(null);
  const [colorScheme, setColorScheme] = useState<'light' | 'dark'>('light');

  // Safely retrieve webApp
  const webApp = useMemo(() => {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      return window.Telegram.WebApp;
    }
    return null;
  }, []);

  useEffect(() => {
    if (!webApp) {
      setIsTelegram(false);
      return;
    }

    try {
      // Notify Telegram that the Mini App is ready
      webApp.ready();

      // Expand Mini App to take full available screen space on mobile
      webApp.expand();

      // Check if actually running inside Telegram environment
      const hasInitData = Boolean(webApp.initData || (webApp.initDataUnsafe && Object.keys(webApp.initDataUnsafe).length > 0));
      const platformIsTelegram = Boolean(webApp.platform && webApp.platform !== 'unknown');
      
      const insideTg = hasInitData || platformIsTelegram;
      setIsTelegram(insideTg);

      if (webApp.initDataUnsafe?.user) {
        const u = webApp.initDataUnsafe.user;
        setUser({
          id: u.id,
          firstName: u.first_name,
          lastName: u.last_name,
          username: u.username,
          languageCode: u.language_code,
        });
      }

      if (webApp.colorScheme) {
        setColorScheme(webApp.colorScheme);
      }

      // Set header color to match navy branding
      if (webApp.setHeaderColor) {
        webApp.setHeaderColor('#0f172a');
      }
      if (webApp.setBackgroundColor) {
        webApp.setBackgroundColor('#f8fafc');
      }
    } catch (err) {
      console.warn('Telegram WebApp initialization error or running in standalone browser:', err);
      setIsTelegram(false);
    }
  }, [webApp]);

  const triggerHaptic = useCallback((type: 'light' | 'medium' | 'success' | 'warning' | 'error' = 'light') => {
    try {
      if (!webApp?.HapticFeedback) return;
      if (type === 'light' || type === 'medium') {
        webApp.HapticFeedback.impactOccurred(type);
      } else {
        webApp.HapticFeedback.notificationOccurred(type);
      }
    } catch {
      // Silently ignore when not supported
    }
  }, [webApp]);

  const closeApp = useCallback(() => {
    if (webApp) {
      webApp.close();
    }
  }, [webApp]);

  return {
    webApp,
    initData: webApp?.initData || '',
    isTelegram,
    user,
    colorScheme,
    triggerHaptic,
    closeApp,
  };
}
