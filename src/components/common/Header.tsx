import React from 'react';
import { ShoppingBag, Globe, ShieldCheck } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';
import { useCart } from '../../hooks/useCart';
import { useTelegram } from '../../hooks/useTelegram';
import { ActiveScreen, CompanySettings } from '../../types';

interface HeaderProps {
  onNavigate: (screen: ActiveScreen) => void;
  currentScreen: ActiveScreen;
  settings?: CompanySettings;
}

export const Header: React.FC<HeaderProps> = ({ onNavigate, currentScreen, settings }) => {
  const { language, setLanguage, t } = useTranslation();
  const { totalItems } = useCart();
  const { isTelegram, user } = useTelegram();

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'km' : 'en');
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs transition-all">
      {/* Top micro bar for Telegram status info */}
      <div className="bg-navy-900 text-white text-[11px] px-3.5 py-1 flex items-center justify-between font-medium">
        <div className="flex items-center gap-1.5 truncate">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="text-slate-300 truncate">
            {isTelegram
              ? `${t.telegram.tmaBadge} ${user ? `• @${user.username || user.firstName}` : ''}`
              : `${t.telegram.browserModeBadge} • ${settings?.companyName || 'INFO POS'}`}
          </span>
        </div>
        <div className="flex items-center gap-2 text-slate-300">
          <button
            onClick={() => window.location.assign('/admin')}
            className="flex items-center gap-1 text-[10px] text-brand-300 hover:text-white font-bold tracking-wider hover:underline focus:outline-none"
          >
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            <span>ADMIN</span>
          </button>
          <span className="text-slate-600">|</span>
          <span className="text-slate-400 font-semibold tracking-wide">PHNOM PENH</span>
        </div>
      </div>

      {/* Main navigation bar */}
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
        {/* Brand Logo & Name */}
        <button
          onClick={() => onNavigate('home')}
          className="flex items-center gap-2.5 text-left group focus:outline-none min-w-0"
        >
          {settings?.logoUrl ? (
            <div className="w-9 h-9 rounded-xl overflow-hidden bg-white border border-slate-200 shadow-md shadow-navy-900/10 flex items-center justify-center shrink-0 p-0.5 group-hover:scale-105 transition-transform">
              <img
                src={settings.logoUrl}
                alt={settings.companyName || 'Store Logo'}
                className="w-full h-full object-contain rounded-lg"
              />
            </div>
          ) : (
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-navy-900 via-navy-800 to-brand-600 flex items-center justify-center text-white font-black text-lg shadow-md shadow-navy-900/10 group-hover:scale-105 transition-transform shrink-0">
              <span className="tracking-tighter">
                {settings?.companyName ? settings.companyName.trim().slice(0, 2).toUpperCase() : 'IP'}
              </span>
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-extrabold text-navy-900 text-base tracking-tight leading-none group-hover:text-brand-600 transition-colors truncate max-w-[150px] sm:max-w-xs">
                {settings?.companyName || 'INFO POS'}
              </span>
              {settings?.headerBadge !== '' && (
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full bg-brand-50 text-brand-700 border border-brand-200 shrink-0">
                  {settings?.headerBadge || 'PRO'}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 font-medium leading-tight line-clamp-1 truncate">
              {settings?.tagline || 'Hardware Solutions'}
            </p>
          </div>
        </button>

        {/* Right side controls: Language switcher, Admin trigger & Cart pill */}
        <div className="flex items-center gap-2">
          {/* Admin shortcut */}
          <button
            onClick={() => onNavigate('admin')}
            title="Admin Dashboard (Private Access)"
            className={`p-1.5 sm:px-2 sm:py-1.5 rounded-lg border text-xs font-bold transition-all focus:outline-none active:scale-95 flex items-center gap-1 ${
              currentScreen === 'admin'
                ? 'bg-navy-900 text-white border-navy-900 shadow-xs'
                : 'bg-slate-50/80 hover:bg-slate-100 text-slate-700 border-slate-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-brand-600" />
            <span className="hidden sm:inline">Admin</span>
          </button>

          {/* Language Switcher */}
          <button
            onClick={toggleLanguage}
            title={language === 'en' ? 'ប្តូរទៅភាសាខ្មែរ' : 'Switch to English'}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 bg-slate-50/80 hover:bg-slate-100 text-xs font-semibold text-navy-900 transition-colors focus:outline-none active:scale-95"
          >
            <Globe className="w-3.5 h-3.5 text-brand-600" />
            <span>{language === 'en' ? 'ខ្មែរ (KM)' : 'English (EN)'}</span>
          </button>

          {/* Cart Icon Button */}
          <button
            onClick={() => onNavigate('cart')}
            className="relative p-2 rounded-lg bg-navy-900 text-white hover:bg-navy-800 transition-all focus:outline-none active:scale-95 shadow-xs"
            aria-label="Shopping Cart"
          >
            <ShoppingBag className="w-4 h-4" />
            {totalItems > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-[20px] px-1 bg-brand-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm animate-in zoom-in-50">
                {totalItems > 99 ? '99+' : totalItems}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
