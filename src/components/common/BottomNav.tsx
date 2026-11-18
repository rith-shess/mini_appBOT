import React from 'react';
import { Home, Grid, ShoppingBag, Headphones } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';
import { useCart } from '../../hooks/useCart';
import { useTelegram } from '../../hooks/useTelegram';
import { ActiveScreen } from '../../types';

interface BottomNavProps {
  currentScreen: ActiveScreen;
  onNavigate: (screen: ActiveScreen) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentScreen, onNavigate }) => {
  const { t } = useTranslation();
  const { totalItems } = useCart();
  const { triggerHaptic } = useTelegram();

  const handleNav = (screen: ActiveScreen) => {
    triggerHaptic('light');
    onNavigate(screen);
  };

  const navItems: { screen: ActiveScreen; label: string; icon: React.FC<{ className?: string }>; badge?: number }[] = [
    {
      screen: 'home',
      label: t.nav.home,
      icon: Home,
    },
    {
      screen: 'categories',
      label: t.nav.categories,
      icon: Grid,
    },
    {
      screen: 'cart',
      label: t.nav.cart,
      icon: ShoppingBag,
      badge: totalItems,
    },
    {
      screen: 'contact',
      label: t.nav.contact,
      icon: Headphones,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-slate-200/90 shadow-[0_-4px_20px_rgba(0,0,0,0.04)] pb-[env(safe-area-inset-bottom)]">
      <div className="max-w-lg mx-auto flex items-center justify-around px-2 py-1.5">
        {navItems.map((item) => {
          const isActive =
            currentScreen === item.screen ||
            (item.screen === 'cart' && currentScreen === 'checkout') ||
            (item.screen === 'categories' && currentScreen === 'product-detail');
          const Icon = item.icon;

          return (
            <button
              key={item.screen}
              onClick={() => handleNav(item.screen)}
              className={`relative flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all focus:outline-none ${
                isActive ? 'text-brand-600 scale-105 font-bold' : 'text-slate-500 hover:text-navy-900 font-medium'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'stroke-[2.5px]' : 'stroke-[1.8px]'}`} />
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-[17px] h-[17px] px-1 bg-brand-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center shadow-xs">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-1 leading-none">{item.label}</span>
              {isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-brand-600 mt-0.5"></span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
