import React from 'react';
import { ArrowRight, Shield, Truck, Headset, Sparkles } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';

interface HeroBannerProps {
  onExplore: () => void;
  onContact: () => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({ onExplore, onContact }) => {
  const { t } = useTranslation();

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-navy-900 via-navy-850 to-brand-950 text-white p-5 sm:p-7 shadow-card">
      {/* Decorative background glows */}
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-brand-500/20 blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-48 h-48 rounded-full bg-brand-400/10 blur-2xl pointer-events-none"></div>

      <div className="relative z-10">
        {/* Top pill badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-500/20 border border-brand-400/30 text-brand-300 text-xs font-semibold mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          <span>{t.home.promoBadge}</span>
        </div>

        {/* Headline */}
        <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white leading-tight">
          {t.home.promoTitle}
        </h1>

        {/* Subtitle */}
        <p className="mt-2 text-xs sm:text-sm text-slate-300 max-w-md leading-relaxed font-normal">
          {t.home.promoSubtitle}
        </p>

        {/* CTAs */}
        <div className="mt-4 flex items-center gap-2.5 flex-wrap">
          <button
            onClick={onExplore}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold transition-all shadow-md active:scale-95 focus:outline-none"
          >
            <span>{t.home.exploreCatalog}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={onContact}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-semibold backdrop-blur-xs transition-colors focus:outline-none"
          >
            <Headset className="w-3.5 h-3.5 text-brand-300" />
            <span>{t.contact.hotline}</span>
          </button>
        </div>

        {/* Trust Badges */}
        <div className="mt-5 pt-4 border-t border-white/10 grid grid-cols-3 gap-2 text-center sm:text-left">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-1 sm:gap-2">
            <div className="p-1.5 rounded-lg bg-brand-500/15 text-brand-300">
              <Shield className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-white leading-none">
                {t.home.reasons.warranty}
              </div>
              <div className="text-[9px] text-slate-400 hidden sm:block mt-0.5">
                {t.home.reasons.warrantyDesc}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-1 sm:gap-2">
            <div className="p-1.5 rounded-lg bg-brand-500/15 text-brand-300">
              <Truck className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-white leading-none">
                {t.home.reasons.delivery}
              </div>
              <div className="text-[9px] text-slate-400 hidden sm:block mt-0.5">
                {t.home.reasons.deliveryDesc}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-1 sm:gap-2">
            <div className="p-1.5 rounded-lg bg-brand-500/15 text-brand-300">
              <Headset className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-white leading-none">
                {t.home.reasons.support}
              </div>
              <div className="text-[9px] text-slate-400 hidden sm:block mt-0.5">
                {t.home.reasons.supportDesc}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
