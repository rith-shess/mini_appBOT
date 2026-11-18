import React, { useState } from 'react';
import {
  Monitor,
  Scan,
  Printer,
  Tag,
  Layers,
  FileText,
  Wrench,
  ChevronRight,
  ArrowLeft,
} from 'lucide-react';
import { Category, CategoryId, Product } from '../types';
import { ProductCard } from '../components/common/ProductCard';
import { useTranslation } from '../hooks/useTranslation';

interface CategoriesPageProps {
  categories: Category[];
  products: Product[];
  selectedCategoryId?: CategoryId | null;
  onSelectProduct: (product: Product) => void;
  onCategoryChange?: (categoryId: CategoryId | null) => void;
}

const iconMap: Record<string, React.FC<{ className?: string }>> = {
  Monitor,
  Scan,
  Printer,
  Tag,
  Layers,
  FileText,
  Wrench,
};

export const CategoriesPage: React.FC<CategoriesPageProps> = ({
  categories,
  products,
  selectedCategoryId: initialCategory = null,
  onSelectProduct,
}) => {
  const { language, t } = useTranslation();
  const [activeCategory, setActiveCategory] = useState<CategoryId | null>(initialCategory);

  const selectedCategoryObj = categories.find((c) => c.id === activeCategory);

  const filteredProducts = activeCategory
    ? products.filter((p) => p.categoryId === activeCategory)
    : products;

  return (
    <div className="space-y-5 pb-24">
      {/* Category Header */}
      {activeCategory && selectedCategoryObj ? (
        <div>
          <button
            onClick={() => setActiveCategory(null)}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-600 hover:text-brand-700 mb-2 focus:outline-none"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{t.categories.allProducts}</span>
          </button>
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-subtle flex items-start justify-between">
            <div>
              <h1 className="text-lg font-black text-navy-900 leading-tight">
                {selectedCategoryObj.name[language] || selectedCategoryObj.name.en}
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                {selectedCategoryObj.description[language] || selectedCategoryObj.description.en}
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-brand-50 text-brand-700 text-xs font-bold shrink-0">
              {filteredProducts.length} items
            </span>
          </div>
        </div>
      ) : (
        <div>
          <h1 className="text-xl font-black text-navy-900">{t.categories.title}</h1>
          <p className="text-xs text-slate-500 mt-0.5">{t.categories.subtitle}</p>
        </div>
      )}

      {/* When no specific category is selected, show category cards list */}
      {!activeCategory ? (
        <div className="space-y-2.5">
          {categories.map((category) => {
            const Icon = iconMap[category.iconName] || Monitor;
            const categoryName = category.name[language] || category.name.en;
            const categoryDesc = category.description[language] || category.description.en;
            const count = products.filter((p) => p.categoryId === category.id).length;

            return (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className="w-full text-left bg-white rounded-2xl p-4 border border-slate-200/80 hover:border-brand-400 hover:shadow-card transition-all flex items-center justify-between gap-3 group active:scale-[0.99] focus:outline-none"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-brand-50 group-hover:bg-brand-600 text-brand-600 group-hover:text-white flex items-center justify-center shrink-0 transition-colors shadow-xs">
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-sm font-bold text-navy-900 group-hover:text-brand-600 transition-colors truncate">
                      {categoryName}
                    </h2>
                    <p className="text-xs text-slate-500 truncate mt-0.5">
                      {categoryDesc}
                    </p>
                    <span className="text-[11px] font-semibold text-brand-700 mt-1 inline-block">
                      {count} {count === 1 ? 'Hardware item' : 'Hardware items'}
                    </span>
                  </div>
                </div>
                <div className="p-1 rounded-full text-slate-400 group-hover:text-brand-600 group-hover:translate-x-0.5 transition-all">
                  <ChevronRight className="w-5 h-5" />
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        /* Products Grid for the chosen Category */
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onSelect={onSelectProduct}
            />
          ))}
        </div>
      )}
    </div>
  );
};
