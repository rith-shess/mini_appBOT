import React from 'react';
import {
  CheckCircle,
  Clock,
  ArrowRight,
  Send,
  ShieldCheck,
  Package,
  MapPin,
  CreditCard,
  Copy,
  Check,
} from 'lucide-react';
import { Order, ActiveScreen } from '../types';
import { formatUSD, formatDate } from '../utils/formatters';
import { useTranslation } from '../hooks/useTranslation';
import { useTelegram } from '../hooks/useTelegram';

interface OrderConfirmationPageProps {
  order: Order;
  onNavigate: (screen: ActiveScreen) => void;
}

export const OrderConfirmationPage: React.FC<OrderConfirmationPageProps> = ({
  order,
  onNavigate,
}) => {
  const { language, t } = useTranslation();
  const { triggerHaptic } = useTelegram();
  const [copied, setCopied] = React.useState(false);

  const handleCopyOrderNumber = () => {
    navigator.clipboard.writeText(order.orderNumber).then(() => {
      setCopied(true);
      triggerHaptic('light');
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="space-y-5 pb-28 pt-2">
      {/* Top Success Badge Banner */}
      <div className="bg-white rounded-3xl p-6 text-center border border-slate-200/80 shadow-card space-y-3">
        <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
          <CheckCircle className="w-9 h-9 stroke-[2.2px]" />
        </div>

        <h1 className="text-xl font-black text-navy-900 leading-tight">
          {t.orderConfirmation.title}
        </h1>

        {/* Order Number pill with copy */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-100 text-xs font-mono font-bold text-navy-900">
          <span>{order.orderNumber}</span>
          <button
            onClick={handleCopyOrderNumber}
            className="text-slate-400 hover:text-navy-900 transition-colors focus:outline-none"
            title="Copy order number"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        {/* Prominent Payment Verification Status Badge */}
        <div className="mt-2 p-3.5 rounded-2xl bg-amber-50/90 border border-amber-200 text-left space-y-1">
          <div className="flex items-center gap-1.5 text-amber-800 text-xs font-black uppercase tracking-wider">
            <Clock className="w-4 h-4 text-amber-600 animate-spin-slow" />
            <span>{t.orderConfirmation.pendingBadge}</span>
          </div>
          <p className="text-[11px] text-amber-900/80 leading-relaxed font-medium">
            {t.orderConfirmation.pendingNotice}
          </p>
        </div>
      </div>

      {/* Customer & Shipping Summary */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-subtle space-y-3 text-xs">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-brand-600" />
          <span>{t.orderConfirmation.shippingTo}</span>
        </h2>

        <div className="p-3 rounded-2xl bg-slate-50 space-y-1">
          <div className="font-bold text-navy-900 text-sm">{order.customer.fullName}</div>
          <div className="text-slate-600 font-mono">{order.customer.phoneNumber}</div>
          <div className="text-slate-600">
            {order.customer.detailedAddress}, {order.customer.provinceOrCity}
          </div>
          {order.customer.googleMapsUrl && (
            <div className="pt-1">
              <a
                href={order.customer.googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold hover:bg-emerald-100 transition-colors"
              >
                <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                <span>📍 View Delivery Pin in Google Maps</span>
              </a>
            </div>
          )}
          {order.customer.orderNotes && (
            <div className="text-slate-500 text-[11px] italic pt-1 border-t border-slate-200">
              Note: {order.customer.orderNotes}
            </div>
          )}
        </div>
      </div>

      {/* Hardware Items Summary */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-subtle space-y-3 text-xs">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <Package className="w-3.5 h-3.5 text-brand-600" />
          <span>{t.orderConfirmation.orderSummary}</span>
        </h2>

        <div className="divide-y divide-slate-100">
          {order.items.map(({ product, quantity }) => (
            <div key={product.id} className="py-2.5 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <span className="font-bold text-navy-900 block truncate">
                  {product.name[language] || product.name.en}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  Qty: {quantity} x {formatUSD(product.price)}
                </span>
              </div>
              <span className="font-bold text-navy-900 shrink-0">
                {formatUSD(product.price * quantity)}
              </span>
            </div>
          ))}
        </div>

        <div className="pt-2 border-t border-slate-200 space-y-1">
          <div className="flex justify-between text-slate-500">
            <span>{t.common.subtotal}</span>
            <span>{formatUSD(order.subtotal)}</span>
          </div>
          <div className="flex justify-between text-slate-500">
            <span>{t.common.deliveryFee}</span>
            <span className="text-emerald-600 font-semibold">{t.common.free}</span>
          </div>
          <div className="flex justify-between text-sm font-black text-navy-900 pt-1.5 border-t border-slate-100">
            <span>{t.common.total}</span>
            <span className="text-brand-700 text-base">{formatUSD(order.totalAmount)}</span>
          </div>
        </div>

        {/* Payment Proof Preview if present */}
        {order.paymentProofUrl && (
          <div className="pt-3 border-t border-slate-100">
            <span className="text-[11px] font-bold text-navy-900 block mb-1.5">
              Attached Payment Screenshot:
            </span>
            <div className="w-24 h-24 rounded-xl bg-slate-100 overflow-hidden border border-slate-200">
              <img
                src={order.paymentProofUrl}
                alt="Uploaded Payment Receipt"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        )}
      </div>

      {/* Support & Follow-up Actions */}
      <div className="space-y-2.5">
        <a
          href="https://t.me/InfoPOSMini_StoreBot"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full py-3.5 px-4 rounded-xl bg-[#229ED9] hover:bg-[#1E8EC4] text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 focus:outline-none"
        >
          <Send className="w-4 h-4" />
          <span>{t.orderConfirmation.reachTelegram}</span>
        </a>

        <button
          onClick={() => onNavigate('home')}
          className="w-full py-3 px-4 rounded-xl bg-white border border-slate-200 text-navy-900 text-xs font-bold hover:bg-slate-50 transition-colors shadow-xs active:scale-95 focus:outline-none"
        >
          {t.orderConfirmation.backToHome}
        </button>
      </div>
    </div>
  );
};
