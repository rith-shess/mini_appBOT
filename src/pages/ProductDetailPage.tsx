import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  ShieldCheck,
  Check,
  Plus,
  Minus,
  ShoppingBag,
  Zap,
  Star,
  PackageCheck,
  Share2,
} from 'lucide-react';
import { Product, ActiveScreen } from '../types';
import { formatUSD } from '../utils/formatters';
import { useTranslation } from '../hooks/useTranslation';
import { useCart } from '../hooks/useCart';
import { useTelegram } from '../hooks/useTelegram';

interface ProductDetailPageProps {
  product: Product;
  relatedProducts: Product[];
  onBack: () => void;
  onSelectProduct: (product: Product) => void;
  onNavigate: (screen: ActiveScreen) => void;
}

export const ProductDetailPage: React.FC<ProductDetailPageProps> = ({
  product,
  relatedProducts,
  onBack,
  onSelectProduct,
  onNavigate,
}) => {
  const { language, t } = useTranslation();
  const { addToCart } = useCart();
  const { webApp, isTelegram, triggerHaptic } = useTelegram();

  const [quantity, setQuantity] = useState(1);
  const [justAdded, setJustAdded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const productName = product.name[language] || product.name.en;
  const productDesc = product.description[language] || product.description.en;

  // Handle Telegram MainButton
  useEffect(() => {
    if (!webApp?.MainButton) return;

    try {
      webApp.MainButton.setText(
        `${t.common.addToCart} • ${formatUSD(product.price * quantity)}`
      );
      webApp.MainButton.show();
      webApp.MainButton.enable();

      const handleMainButtonClick = () => {
        addToCart(product, quantity);
        triggerHaptic('success');
        setJustAdded(true);
        setTimeout(() => setJustAdded(false), 1400);
      };

      webApp.MainButton.onClick(handleMainButtonClick);

      return () => {
        webApp.MainButton.offClick(handleMainButtonClick);
        webApp.MainButton.hide();
      };
    } catch (e) {
      console.warn('Telegram MainButton error:', e);
    }
  }, [webApp, product, quantity, t, addToCart, triggerHaptic]);

  const handleAddToCart = () => {
    addToCart(product, quantity);
    triggerHaptic('medium');
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1500);
  };

  const handleBuyNow = () => {
    addToCart(product, quantity);
    triggerHaptic('success');
    onNavigate('checkout');
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: productName,
        text: `${productName} - INFO POS Hardware ($${product.price})`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      triggerHaptic('light');
    }
  };

  return (
    <div className="space-y-5 pb-28">
      {/* Top action bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-navy-900 hover:bg-slate-50 transition-colors shadow-xs active:scale-95 focus:outline-none"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t.common.back}</span>
        </button>

        <button
          onClick={handleShare}
          className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-navy-900 hover:bg-slate-50 transition-colors shadow-xs active:scale-95 focus:outline-none"
          title="Share hardware"
        >
          <Share2 className="w-4 h-4" />
        </button>
      </div>

      {/* Product Image Stage */}
      <div className="relative aspect-[16/11] w-full rounded-3xl bg-slate-100 overflow-hidden border border-slate-200/80 shadow-card">
        <img
          src={
            imageError
              ? `https://placehold.co/800x600/0f172a/ffffff?text=${encodeURIComponent(product.sku)}`
              : product.imageUrl
          }
          alt={productName}
          onError={() => setImageError(true)}
          className="w-full h-full object-cover"
        />

        {/* Badges on image */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          <span className="px-2.5 py-1 rounded-lg bg-navy-900/90 backdrop-blur-md text-white text-xs font-mono font-bold tracking-wider shadow-sm">
            {product.sku}
          </span>
          {product.isFeatured && (
            <span className="px-2.5 py-0.5 rounded-md bg-brand-500 text-white text-[10px] font-bold uppercase tracking-wider shadow-xs">
              Top Hardware
            </span>
          )}
        </div>

        <div className="absolute bottom-3 right-3">
          {product.isAvailable ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500 text-white text-xs font-bold shadow-md">
              <PackageCheck className="w-3.5 h-3.5" />
              <span>{t.common.inStock} ({product.stockCount} units)</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500 text-white text-xs font-bold shadow-md">
              <span>{t.common.outOfStock}</span>
            </span>
          )}
        </div>
      </div>

      {/* Main Details Card */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-subtle space-y-4">
        {/* Title & Rating */}
        <div>
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
            <span className="text-brand-700 font-bold uppercase tracking-wider text-[11px]">
              {product.categoryId.replace('-', ' ')}
            </span>
            {product.rating && (
              <div className="flex items-center gap-1 text-amber-500 font-bold">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <span>{product.rating.toFixed(1)} / 5.0</span>
              </div>
            )}
          </div>

          <h1 className="text-lg sm:text-xl font-black text-navy-900 leading-snug">
            {productName}
          </h1>

          {/* Pricing Row */}
          <div className="mt-3 flex items-baseline gap-2.5 flex-wrap">
            <span className="text-2xl sm:text-3xl font-black text-navy-900 tracking-tight">
              {formatUSD(product.price)}
            </span>
            {product.originalPrice && product.originalPrice > product.price && (
              <span className="text-sm sm:text-base text-slate-400 line-through">
                {formatUSD(product.originalPrice)}
              </span>
            )}
            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
              Tax Included
            </span>
          </div>
        </div>

        {/* Warranty and Delivery Banner */}
        <div className="grid grid-cols-2 gap-2 p-3 rounded-2xl bg-slate-50 border border-slate-200/70 text-xs">
          <div className="flex items-center gap-2 text-slate-700">
            <ShieldCheck className="w-4 h-4 text-brand-600 shrink-0" />
            <span className="font-semibold">{product.warrantyPeriod || '1-Year Warranty'}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-700">
            <Zap className="w-4 h-4 text-amber-500 shrink-0" />
            <span className="font-semibold">Fast Delivery Nationwide</span>
          </div>
        </div>

        {/* Overview Description */}
        <div>
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
            {t.product.description}
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            {productDesc}
          </p>
        </div>

        {/* Specifications Table */}
        {product.specifications && product.specifications.length > 0 && (
          <div className="pt-2">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              {t.product.specifications}
            </h2>
            <div className="rounded-2xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
              {product.specifications.map((spec, idx) => (
                <div
                  key={idx}
                  className={`grid grid-cols-5 p-2.5 text-xs ${
                    idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'
                  }`}
                >
                  <span className="col-span-2 font-bold text-navy-900">
                    {spec.key[language] || spec.key.en}
                  </span>
                  <span className="col-span-3 text-slate-600">
                    {spec.value[language] || spec.value.en}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quantity Selector */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs font-bold text-navy-900">{t.product.selectQuantity}</span>
          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => {
                triggerHaptic('light');
                setQuantity((q) => Math.max(1, q - 1));
              }}
              disabled={quantity <= 1}
              className="w-8 h-8 rounded-lg bg-white text-navy-900 flex items-center justify-center font-bold shadow-xs disabled:opacity-40 focus:outline-none"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="w-8 text-center text-sm font-black text-navy-900">
              {quantity}
            </span>
            <button
              onClick={() => {
                triggerHaptic('light');
                setQuantity((q) => Math.min(product.stockCount, q + 1));
              }}
              disabled={quantity >= product.stockCount}
              className="w-8 h-8 rounded-lg bg-white text-navy-900 flex items-center justify-center font-bold shadow-xs disabled:opacity-40 focus:outline-none"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Action Buttons (Standard view fallback + fast checkout) */}
        <div className="pt-2 grid grid-cols-2 gap-2.5">
          <button
            onClick={handleAddToCart}
            disabled={!product.isAvailable}
            className={`py-3 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-95 focus:outline-none shadow-xs ${
              justAdded
                ? 'bg-emerald-600 text-white shadow-emerald-200'
                : 'bg-slate-100 hover:bg-slate-200 text-navy-900 border border-slate-200/80'
            }`}
          >
            {justAdded ? (
              <>
                <Check className="w-4 h-4 stroke-[2.5]" />
                <span>{t.common.addedToCart}</span>
              </>
            ) : (
              <>
                <ShoppingBag className="w-4 h-4" />
                <span>{t.common.addToCart}</span>
              </>
            )}
          </button>

          <button
            onClick={handleBuyNow}
            disabled={!product.isAvailable}
            className="py-3 px-4 rounded-xl bg-navy-900 hover:bg-navy-800 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-95 focus:outline-none shadow-md"
          >
            <Zap className="w-4 h-4 text-amber-400" />
            <span>{t.common.buyNow}</span>
          </button>
        </div>
      </div>

      {/* Related Products Section */}
      {relatedProducts && relatedProducts.length > 0 && (
        <section className="space-y-3 pt-2">
          <h2 className="text-sm font-bold text-navy-900 uppercase tracking-wide">
            {t.product.relatedProducts}
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {relatedProducts.slice(0, 2).map((rel) => (
              <div
                key={rel.id}
                onClick={() => {
                  onSelectProduct(rel);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="bg-white rounded-2xl p-3 border border-slate-200 shadow-xs cursor-pointer hover:border-brand-300 transition-all"
              >
                <div className="aspect-[4/3] rounded-xl bg-slate-100 overflow-hidden mb-2">
                  <img src={rel.imageUrl} alt={rel.name.en} className="w-full h-full object-cover" />
                </div>
                <h3 className="text-xs font-bold text-navy-900 truncate">
                  {rel.name[language] || rel.name.en}
                </h3>
                <span className="text-xs font-extrabold text-brand-600 mt-1 block">
                  {formatUSD(rel.price)}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
