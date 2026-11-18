import React, { useState } from 'react';
import { ArrowRight, Sparkles, Flame, Clock } from 'lucide-react';
import { HeroBanner } from '../components/home/HeroBanner';
import { CategoryPills } from '../components/home/CategoryPills';
import { SearchBar } from '../components/home/SearchBar';
import { ProductCard } from '../components/common/ProductCard';
import { Category, CategoryId, Product, ActiveScreen } from '../types';
import { useTranslation } from '../hooks/useTranslation';

interface HomePageProps {
  categories: Category[];
  products: Product[];
  onSelectProduct: (product: Product) => void;
  onSelectCategory: (categoryId: CategoryId) => void;
  onNavigate: (screen: ActiveScreen) => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  categories,
  products,
  onSelectProduct,
  onSelectCategory,
  onNavigate,
}) => {
  const { t } = useTranslation();
  const [selectedCategory, setSelectedCategory] = useState<CategoryId | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter products based on search & category pill
  const filteredProducts = products.filter((product) => {
    const matchesCategory =
      selectedCategory === 'all' || product.categoryId === selectedCategory;

    const matchesSearch =
      !searchQuery.trim() ||
      product.name.en.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.name.km.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description.en.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesCategory && matchesSearch;
  });

  const featuredProducts = products.filter((p) => p.isFeatured);
  const latestProducts = products.filter((p) => p.isLatest);

  const isFiltering = selectedCategory !== 'all' || searchQuery.trim().length > 0;

  return (
    <div className="space-y-6 pb-24">
      {/* Search Bar */}
      <div className="pt-1">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          resultCount={filteredProducts.length}
        />
      </div>

      {/* When user is actively searching or filtering, show direct results */}
      {isFiltering ? (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-navy-900">
              {selectedCategory === 'all'
                ? `Search Results (${filteredProducts.length})`
                : `${categories.find((c) => c.id === selectedCategory)?.name.en || 'Category'} (${filteredProducts.length})`}
            </h2>
            <button
              onClick={() => {
                setSelectedCategory('all');
                setSearchQuery('');
              }}
              className="text-xs text-brand-600 font-semibold hover:underline"
            >
              Reset Filters
            </button>
          </div>

          {/* Category Filter Pills */}
          <CategoryPills
            categories={categories}
            selectedCategoryId={selectedCategory}
            onSelectCategory={setSelectedCategory}
          />

          {filteredProducts.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center border border-slate-200">
              <p className="text-slate-500 text-sm">No POS hardware matches your search query.</p>
              <button
                onClick={() => {
                  setSelectedCategory('all');
                  setSearchQuery('');
                }}
                className="mt-3 px-4 py-2 rounded-xl bg-navy-900 text-white text-xs font-semibold"
              >
                Clear Filters
              </button>
            </div>
          ) : (
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
        </section>
      ) : (
        <>
          {/* Hero Promotional Banner */}
          <HeroBanner
            onExplore={() => onNavigate('categories')}
            onContact={() => onNavigate('contact')}
          />

          {/* Quick Categories Bar */}
          <section className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-navy-900 uppercase tracking-wide">
                {t.home.popularCategories}
              </h2>
              <button
                onClick={() => onNavigate('categories')}
                className="text-xs text-brand-600 font-bold flex items-center gap-1 hover:underline"
              >
                <span>{t.common.viewAll}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <CategoryPills
              categories={categories}
              selectedCategoryId={selectedCategory}
              onSelectCategory={(catId) => {
                if (catId === 'all') {
                  onNavigate('categories');
                } else {
                  onSelectCategory(catId);
                }
              }}
            />
          </section>

          {/* Featured Hardware Section */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-amber-500 fill-amber-500" />
                <h2 className="text-base font-extrabold text-navy-900">
                  {t.home.featuredProducts}
                </h2>
              </div>
              <span className="text-xs text-slate-400 font-medium">Top Rated</span>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {featuredProducts.slice(0, 4).map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onSelect={onSelectProduct}
                />
              ))}
            </div>
          </section>

          {/* Latest Arrivals Section */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-brand-600" />
                <h2 className="text-base font-extrabold text-navy-900">
                  {t.home.latestArrivals}
                </h2>
              </div>
              <button
                onClick={() => onNavigate('categories')}
                className="text-xs text-brand-600 font-semibold hover:underline"
              >
                {t.common.viewAll}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {latestProducts.slice(0, 4).map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onSelect={onSelectProduct}
                />
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
};
