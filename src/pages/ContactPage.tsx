import React from 'react';
import {
  Phone,
  Send,
  Facebook,
  MapPin,
  Clock,
  ShieldCheck,
  MessageCircle,
  HelpCircle,
  ExternalLink,
} from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';
import { useTelegram } from '../hooks/useTelegram';

export const ContactPage: React.FC = () => {
  const { t } = useTranslation();
  const { isTelegram, user, closeApp } = useTelegram();

  return (
    <div className="space-y-5 pb-28">
      {/* Header */}
      <div>
        <h1 className="text-xl font-black text-navy-900">{t.contact.title}</h1>
        <p className="text-xs text-slate-500 mt-0.5">{t.contact.subtitle}</p>
      </div>

      {/* Official Telegram Sales Channel (Primary action for TMA) */}
      <div className="bg-gradient-to-br from-[#229ED9] to-[#1778A8] rounded-3xl p-5 text-white shadow-card space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
            <Send className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-bold leading-tight">{t.contact.telegramSupport}</h2>
            <p className="text-[11px] text-white/80">Instant quotes & technician dispatch</p>
          </div>
        </div>

        <p className="text-xs text-white/90 leading-relaxed">
          Need hardware setup advice, Loyverse integration, or bulk order pricing? Reach our support team directly.
        </p>

        <a
          href="https://t.me/InfoPOSMini_StoreBot"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-[#1778A8] text-xs font-bold transition-all shadow-md active:scale-95 hover:bg-slate-50"
        >
          <span>{t.contact.sendMessage}</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* Contact Cards Grid */}
      <div className="space-y-3">
        {/* Phone Hotline */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-subtle flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
            <Phone className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {t.contact.hotline}
            </h3>
            <a
              href="tel:+85523999888"
              className="text-sm font-black text-navy-900 hover:text-brand-600 transition-colors block mt-0.5"
            >
              +855 (0) 23 999 888 / +855 (0) 12 345 678
            </a>
            <span className="text-[11px] text-slate-500 block mt-0.5">
              Sales, quotations & technical support
            </span>
          </div>
        </div>

        {/* Facebook Page */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-subtle flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Facebook className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {t.contact.facebookPage}
            </h3>
            <a
              href="https://facebook.com/infoposhardware"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-bold text-navy-900 hover:text-brand-600 transition-colors block mt-0.5"
            >
              fb.com/infoposhardware
            </a>
            <span className="text-[11px] text-slate-500 block mt-0.5">
              Product updates, demos & live videos
            </span>
          </div>
        </div>

        {/* Showroom Address */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-subtle flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <MapPin className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {t.contact.showroomAddress}
            </h3>
            <p className="text-xs font-semibold text-navy-900 mt-0.5 leading-snug">
              {t.contact.showroomValue}
            </p>
            <span className="text-[11px] text-slate-500 block mt-0.5">
              Visit our showroom to test touch screens, scanners & printers in person
            </span>
          </div>
        </div>

        {/* Working Hours */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-subtle flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {t.contact.workingHours}
            </h3>
            <p className="text-xs font-bold text-navy-900 mt-0.5">
              {t.contact.workingHoursValue}
            </p>
            <span className="text-[11px] text-emerald-600 font-semibold block mt-0.5">
              • Technical dispatch available 6 days a week
            </span>
          </div>
        </div>
      </div>

      {/* Telegram Session Box */}
      {isTelegram && (
        <div className="p-4 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-700">
            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
            <span>Running in Telegram WebApp</span>
          </div>
          <button
            onClick={closeApp}
            className="text-xs font-bold text-red-600 hover:underline focus:outline-none"
          >
            {t.telegram.closeApp}
          </button>
        </div>
      )}
    </div>
  );
};
