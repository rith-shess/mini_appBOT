import React from 'react';
import {
  Trash2,
  Plus,
  Minus,
  ShoppingBag,
  ArrowRight,
  ShieldCheck,
  Truck,
  RotateCcw,
} from 'lucide-react';
import { useCart } from '../hooks/useCart';
import { useTranslation } from '../hooks/useTranslation';
import { formatUSD } from '../utils/formatters';
import { useTelegram } from '../hooks/useTelegram';
import { ActiveScreen } from '../types';

interface CartPageProps {
  onNavigate: (screen: ActiveScreen) => void;
}

export const CartPage: React.FC<CartPageProps> = ({ onNavigate }) => {
  const { items, updateQuantity, removeFromCart, clearCart, subtotal, deliveryFee, totalAmount, totalItems } = useCart();
  const { language, t } = useTranslation();
  const { triggerHaptic } = useTelegram();

  if (items.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6 bg-white rounded-3xl border border-slate-200/80 shadow-subtle my-4">
        <div className="w-20 h-20 rounded-3xl bg-brand-50 text-brand-600 flex items-center justify-center mb-4">
          <ShoppingBag className="w-10 h-10 stroke-[1.5px]" />
        </div>
        <h2 className="text-xl font-black text-navy-900">{t.cart.emptyTitle}</h2>
        <p className="text-xs sm:text-sm text-slate-500 max-w-xs mt-2 leading-relaxed">
          {t.cart.emptySubtitle}
        </p>
        <button
          onClick={() => onNavigate('categories')}
          className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-navy-900 hover:bg-navy-800 text-white text-xs font-bold transition-all shadow-md active:scale-95 focus:outline-none"
        >
          <span>{t.cart.browseProducts}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-28">
      {/* Header & Clear */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-navy-900">{t.cart.title}</h1>
          <p className="text-xs text-slate-500">
            {totalItems} {totalItems === 1 ? 'item' : 'items'} in your cart
          </p>
        </div>
        <button
          onClick={() => {
            if (window.confirm('Clear all items from your cart?')) {
              clearCart();
              triggerHaptic('warning');
            }
          }}
          className="text-xs font-bold text-red-500 hover:text-red-600 flex items-center gap-1 focus:outline-none"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>{t.cart.clearCart}</span>
        </button>
      </div>

      {/* Cart Items List */}
      <div className="space-y-3">
        {items.map(({ product, quantity }) => {
          const name = product.name[language] || product.name.en;
          const lineTotal = product.price * quantity;

          return (
            <div
              key={product.id}
              className="bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-subtle flex gap-3.5 items-center"
            >
              {/* Product Thumbnail */}
              <div className="w-20 h-20 rounded-xl bg-slate-100 overflow-hidden shrink-0 border border-slate-100">
                <img
                  src={product.imageUrl}
                  alt={name}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Details & Controls */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-[10px] font-mono text-slate-400 block truncate">
                      {product.sku}
                    </span>
                    <h3 className="text-xs font-bold text-navy-900 line-clamp-1 leading-tight">
                      {name}
                    </h3>
                  </div>
                  <button
                    onClick={() => {
                      removeFromCart(product.id);
                      triggerHaptic('light');
                    }}
                    className="p-1.5 text-slate-400 hover:text-red-500 transition-colors focus:outline-none"
                    title={t.cart.itemRemoved}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="mt-2.5 flex items-center justify-between">
                  <div className="text-xs font-black text-navy-900">
                    {formatUSD(lineTotal)}
                    {quantity > 1 && (
                      <span className="text-[10px] text-slate-400 font-normal ml-1">
                        ({formatUSD(product.price)} ea)
                      </span>
                    )}
                  </div>

                  {/* Quantity Stepper */}
                  <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg">
                    <button
                      onClick={() => {
                        triggerHaptic('light');
                        updateQuantity(product.id, quantity - 1);
                      }}
                      className="w-6 h-6 rounded bg-white text-navy-900 flex items-center justify-center font-bold text-xs shadow-xs focus:outline-none"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-6 text-center text-xs font-bold text-navy-900">
                      {quantity}
                    </span>
                    <button
                      onClick={() => {
                        triggerHaptic('light');
                        updateQuantity(product.id, quantity + 1);
                      }}
                      className="w-6 h-6 rounded bg-white text-navy-900 flex items-center justify-center font-bold text-xs shadow-xs focus:outline-none"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Order Summary Card */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-subtle space-y-3">
        <h2 className="text-sm font-bold text-navy-900 uppercase tracking-wide">
          {t.cart.orderSummary}
        </h2>

        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between text-slate-600">
            <span>{t.common.subtotal}</span>
            <span className="font-semibold text-navy-900">{formatUSD(subtotal)}</span>
          </div>

          <div className="flex items-center justify-between text-slate-600">
            <span className="flex items-center gap-1">
              <span>{t.common.deliveryFee}</span>
              <Truck className="w-3.5 h-3.5 text-brand-600" />
            </span>
            <span className="font-semibold text-emerald-600 uppercase">
              {deliveryFee === 0 ? t.common.free : formatUSD(deliveryFee)}
            </span>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-sm font-black text-navy-900">
            <span>{t.common.total}</span>
            <span className="text-lg text-brand-700">{formatUSD(totalAmount)}</span>
          </div>
        </div>

        {/* Security badge */}
        <div className="pt-1 flex items-center gap-1.5 text-[11px] text-slate-500">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>1-Year Hardware Warranty & Manual Payment Verification Included</span>
        </div>

        {/* Proceed to checkout button */}
        <button
          onClick={() => {
            triggerHaptic('medium');
            onNavigate('checkout');
          }}
          className="w-full mt-2 py-3.5 px-4 rounded-xl bg-navy-900 hover:bg-navy-800 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 focus:outline-none"
        >
          <span>{t.cart.proceedToCheckout}</span>
          <ArrowRight className="w-4 h-4" />
        </button>

        <button
          onClick={() => onNavigate('categories')}
          className="w-full py-2.5 text-center text-xs font-bold text-slate-600 hover:text-navy-900 focus:outline-none"
        >
          Continue Shopping
        </button>
      </div>
    </div>
  );
};
