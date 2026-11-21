import React, { useState } from 'react';
import { ShoppingCart, Check, Star, ShieldCheck } from 'lucide-react';
import { Product } from '../../types';
import { formatUSD } from '../../utils/formatters';
import { useTranslation } from '../../hooks/useTranslation';
import { useCart } from '../../hooks/useCart';
import { useTelegram } from '../../hooks/useTelegram';

interface ProductCardProps {
  product: Product;
  onSelect: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onSelect }) => {
  const { language, t } = useTranslation();
  const { addToCart } = useCart();
  const { triggerHaptic } = useTelegram();
  const [justAdded, setJustAdded] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const productName = product.name[language] || product.name.en;

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    addToCart(product, 1);
    triggerHaptic('medium');
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1400);
  };

  return (
    <div
      onClick={() => onSelect(product)}
      className="group bg-white rounded-2xl border border-slate-200/80 shadow-subtle hover:shadow-card hover:border-brand-300 transition-all duration-200 overflow-hidden flex flex-col cursor-pointer active:scale-[0.985]"
    >
      {/* Product Image Container */}
      <div className="relative aspect-[4/3] w-full bg-gradient-to-b from-slate-100 to-slate-200/50 overflow-hidden">
        {/* Placeholder skeleton before load */}
        {!imageLoaded && !imageError && (
          <div className="absolute inset-0 bg-slate-200 animate-pulse"></div>
        )}

        <img
          src={
            imageError
              ? `https://placehold.co/600x450/0f172a/ffffff?text=${encodeURIComponent(product.sku)}`
              : product.imageUrl
          }
          alt={productName}
          loading="lazy"
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageError(true)}
          className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ${
            imageLoaded || imageError ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {/* Top Badges */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 items-start">
          {product.isFeatured && (
            <span className="px-2 py-0.5 rounded-md bg-navy-900/90 backdrop-blur-xs text-white text-[10px] font-bold tracking-wider uppercase shadow-xs">
              Featured
            </span>
          )}
          {product.isLatest && (
            <span className="px-2 py-0.5 rounded-md bg-brand-600 text-white text-[10px] font-bold tracking-wider uppercase shadow-xs">
              New
            </span>
          )}
        </div>

        {/* Stock status pill */}
        <div className="absolute bottom-2 right-2">
          {product.isAvailable ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/95 backdrop-blur-xs text-emerald-700 text-[10px] font-semibold shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              {t.common.inStock}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/95 backdrop-blur-xs text-red-600 text-[10px] font-semibold shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
              {t.common.outOfStock}
            </span>
          )}
        </div>
      </div>

      {/* Product Content Details */}
      <div className="p-3.5 flex-1 flex flex-col justify-between">
        <div>
          {/* SKU & Warranty */}
          <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
            <span className="font-mono font-medium text-slate-400">{product.sku}</span>
            {product.warrantyPeriod && (
              <span className="flex items-center gap-0.5 text-brand-700 text-[10px] font-semibold">
                <ShieldCheck className="w-3 h-3" />
                {product.warrantyPeriod}
              </span>
            )}
          </div>

          {/* Product Name */}
          <h3 className="text-sm font-bold text-navy-900 leading-snug line-clamp-2 group-hover:text-brand-600 transition-colors">
            {productName}
          </h3>

          {/* Rating */}
          {product.rating && (
            <div className="flex items-center gap-1 mt-1 text-[11px] text-amber-500 font-semibold">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span>{product.rating.toFixed(1)}</span>
            </div>
          )}
        </div>

        {/* Price & Action Button */}
        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-1.5">
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-1.5 truncate">
              <span className="text-base font-extrabold text-navy-900 tracking-tight">
                {formatUSD(product.price)}
              </span>
              {product.originalPrice && product.originalPrice > product.price && (
                <span className="text-[11px] text-slate-400 line-through">
                  {formatUSD(product.originalPrice)}
                </span>
              )}
            </div>
            <span className="text-[10px] text-slate-400 block font-medium truncate">USD Cash / KHQR</span>
          </div>

          {/* Compact Cart Button */}
          <button
            onClick={handleQuickAdd}
            disabled={!product.isAvailable}
            className={`w-7.5 h-7.5 rounded-lg flex items-center justify-center transition-all focus:outline-none active:scale-90 shrink-0 ${
              justAdded
                ? 'bg-emerald-600 text-white'
                : !product.isAvailable
                ? 'bg-slate-100 text-slate-300 border border-slate-200 cursor-not-allowed'
                : 'bg-brand-50 hover:bg-brand-600 text-brand-600 hover:text-white border border-brand-200/90 hover:border-brand-600'
            }`}
            title={t.common.addToCart}
          >
            {justAdded ? (
              <Check className="w-3.5 h-3.5 stroke-[2.5] animate-in zoom-in-75" />
            ) : (
              <ShoppingCart className="w-3.5 h-3.5 stroke-[2]" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
