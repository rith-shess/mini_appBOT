import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/common/Header';
import { BottomNav } from './components/common/BottomNav';
import { HomePage } from './pages/HomePage';
import { CategoriesPage } from './pages/CategoriesPage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { CartPage } from './pages/CartPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { OrderConfirmationPage } from './pages/OrderConfirmationPage';
import { ContactPage } from './pages/ContactPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { ActiveScreen, CategoryId, Product, Order, CompanySettings } from './types';
import { apiService, defaultCompanySettings } from './services/api';
import { useTelegram } from './hooks/useTelegram';
import { useCart } from './hooks/useCart';

export const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<ActiveScreen>('home');
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<CategoryId | null>(null);
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);
  const [settings, setSettings] = useState<CompanySettings>(defaultCompanySettings);
  const [isLoading, setIsLoading] = useState(true);

  const { webApp, isTelegram, triggerHaptic } = useTelegram();
  const { totalItems } = useCart();

  // Load catalog data
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [cats, prods, loadedSettings] = await Promise.all([
        apiService.getCategories(),
        apiService.getProducts(),
        apiService.getSettings(),
      ]);
      setCategories(cats);
      setProducts(prods);
      if (loadedSettings) {
        setSettings(loadedSettings);
      }
    } catch (err) {
      console.error('Failed to load initial data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Telegram native BackButton support
  useEffect(() => {
    if (!webApp?.BackButton) return;

    try {
      const showBack = currentScreen !== 'home';
      if (showBack) {
        webApp.BackButton.show();
        const handleBack = () => {
          triggerHaptic('light');
          if (currentScreen === 'product-detail') {
            setCurrentScreen(selectedCategoryId ? 'categories' : 'home');
          } else if (currentScreen === 'checkout') {
            setCurrentScreen('cart');
          } else if (currentScreen === 'order-confirmation' || currentScreen === 'admin') {
            setCurrentScreen('home');
          } else {
            setCurrentScreen('home');
          }
        };
        webApp.BackButton.onClick(handleBack);
        return () => {
          webApp.BackButton.offClick(handleBack);
          webApp.BackButton.hide();
        };
      } else {
        webApp.BackButton.hide();
      }
    } catch (e) {
      console.warn('Telegram BackButton error:', e);
    }
  }, [webApp, currentScreen, selectedCategoryId, triggerHaptic]);

  const handleNavigate = (screen: ActiveScreen) => {
    setCurrentScreen(screen);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    setCurrentScreen('product-detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectCategory = (categoryId: CategoryId) => {
    setSelectedCategoryId(categoryId);
    setCurrentScreen('categories');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOrderSuccess = (order: Order) => {
    setCompletedOrder(order);
    setCurrentScreen('order-confirmation');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-navy-900">
      {/* Top sticky header */}
      <Header
        currentScreen={currentScreen}
        onNavigate={handleNavigate}
        settings={settings}
      />

      {/* Main Screen Content container */}
      <main className="flex-1 max-w-lg w-full mx-auto px-4 pt-4">
        {isLoading ? (
          <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-3">
            <div className="w-10 h-10 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin"></div>
            <p className="text-xs font-semibold text-slate-500">Loading INFO POS Hardware...</p>
          </div>
        ) : (
          <>
            {currentScreen === 'home' && (
              <HomePage
                categories={categories}
                products={products}
                onSelectProduct={handleSelectProduct}
                onSelectCategory={handleSelectCategory}
                onNavigate={handleNavigate}
              />
            )}

            {currentScreen === 'categories' && (
              <CategoriesPage
                categories={categories}
                products={products}
                selectedCategoryId={selectedCategoryId}
                onSelectProduct={handleSelectProduct}
                onCategoryChange={setSelectedCategoryId}
              />
            )}

            {currentScreen === 'product-detail' && selectedProduct && (
              <ProductDetailPage
                product={selectedProduct}
                relatedProducts={products.filter(
                  (p) => p.categoryId === selectedProduct.categoryId && p.id !== selectedProduct.id
                )}
                onBack={() => setCurrentScreen(selectedCategoryId ? 'categories' : 'home')}
                onSelectProduct={handleSelectProduct}
                onNavigate={handleNavigate}
              />
            )}

            {currentScreen === 'cart' && (
              <CartPage onNavigate={handleNavigate} />
            )}

            {currentScreen === 'checkout' && (
              <CheckoutPage
                onBack={() => setCurrentScreen('cart')}
                onOrderSuccess={handleOrderSuccess}
              />
            )}

            {currentScreen === 'order-confirmation' && completedOrder && (
              <OrderConfirmationPage
                order={completedOrder}
                onNavigate={handleNavigate}
              />
            )}

            {currentScreen === 'contact' && (
              <ContactPage />
            )}

            {currentScreen === 'admin' && (
              <AdminDashboardPage
                onBack={() => handleNavigate('home')}
                onNavigate={handleNavigate}
                onRefreshData={loadData}
              />
            )}
          </>
        )}
      </main>

      {/* Mobile-first bottom navigation bar (hidden in admin mode) */}
      {currentScreen !== 'admin' && (
        <BottomNav
          currentScreen={currentScreen}
          onNavigate={handleNavigate}
        />
      )}
    </div>
  );
};
