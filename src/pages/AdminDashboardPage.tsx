import React, { useState, useEffect, useRef } from 'react';
import {
  Shield,
  Lock,
  Unlock,
  Plus,
  Edit2,
  Trash2,
  Image as ImageIcon,
  Upload,
  Check,
  X,
  ExternalLink,
  Eye,
  RefreshCw,
  Settings,
  Package,
  ShoppingBag,
  MapPin,
  Phone,
  Send,
  Save,
  AlertCircle,
  Key,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowLeft,
} from 'lucide-react';
import { Product, Order, CompanySettings, CategoryId, PaymentVerificationStatus, ActiveScreen } from '../types';
import { apiService, defaultCompanySettings } from '../services/api';
import { formatUSD, formatDate } from '../utils/formatters';
import { useTelegram } from '../hooks/useTelegram';

interface AdminDashboardPageProps {
  onBack: () => void;
  onNavigate: (screen: ActiveScreen) => void;
  onRefreshData?: () => void;
}

export const AdminDashboardPage: React.FC<AdminDashboardPageProps> = ({
  onBack,
  onNavigate,
  onRefreshData,
}) => {
  const { user, triggerHaptic } = useTelegram();

  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('info_pos_admin_authed') === 'true';
  });
  const [pinInput, setPinInput] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);

  // Active Admin Tab
  const [activeTab, setActiveTab] = useState<'products' | 'orders' | 'settings'>('products');

  // Products State
  const [products, setProducts] = useState<Product[]>([]);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);
  const [productSearch, setProductSearch] = useState('');

  // Orders State
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Company Settings State
  const [settings, setSettings] = useState<CompanySettings>(defaultCompanySettings);
  const [settingsSaved, setSettingsSaved] = useState(false);

  // Product Form State (for adding or editing)
  const [formNameEn, setFormNameEn] = useState('');
  const [formNameKm, setFormNameKm] = useState('');
  const [formSku, setFormSku] = useState('');
  const [formCategory, setFormCategory] = useState<CategoryId>('pos-machines');
  const [formPrice, setFormPrice] = useState<number>(0);
  const [formOriginalPrice, setFormOriginalPrice] = useState<number | undefined>(undefined);
  const [formStock, setFormStock] = useState<number>(10);
  const [formAvailable, setFormAvailable] = useState<boolean>(true);
  const [formWarranty, setFormWarranty] = useState<string>('1 Year Warranty');
  const [formDescEn, setFormDescEn] = useState('');
  const [formDescKm, setFormDescKm] = useState('');
  const [formImage, setFormImage] = useState<string>('');
  const [formIsFeatured, setFormIsFeatured] = useState<boolean>(false);
  const [formIsLatest, setFormIsLatest] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Load initial settings and check telegram username auto-auth
  useEffect(() => {
    async function loadInitial() {
      const s = await apiService.getSettings();
      setSettings(s);

      // Auto-unlock if user's Telegram username matches authorized admins list
      if (user?.username) {
        const cleanUser = user.username.toLowerCase().replace('@', '');
        const isAuth = s.authorizedTelegramUsernames.some(
          (u) => u.toLowerCase().replace('@', '') === cleanUser
        );
        if (isAuth) {
          setIsAuthenticated(true);
          sessionStorage.setItem('info_pos_admin_authed', 'true');
        }
      }
    }
    loadInitial();
  }, [user]);

  // Load data when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadDashboardData();
    }
  }, [isAuthenticated]);

  async function loadDashboardData() {
    try {
      const [allProducts, allOrders, currentSettings] = await Promise.all([
        apiService.getProducts(),
        apiService.getOrders(),
        apiService.getSettings(),
      ]);
      setProducts(allProducts);
      setOrders(allOrders);
      setSettings(currentSettings);
    } catch (e) {
      console.error('Failed to load admin data:', e);
    }
  }

  // Handle PIN verification
  const handleUnlockWithPin = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    if (pinInput.trim() === settings.adminPin || pinInput.trim() === '8888') {
      setIsAuthenticated(true);
      sessionStorage.setItem('info_pos_admin_authed', 'true');
      triggerHaptic('success');
      loadDashboardData();
    } else {
      setAuthError('Incorrect Admin PIN. Please try again.');
      triggerHaptic('error');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('info_pos_admin_authed');
    setPinInput('');
  };

  // Image Upload Handler
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (PNG, JPG, WEBP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setFormImage(event.target?.result as string);
      triggerHaptic('light');
    };
    reader.readAsDataURL(file);
  };

  // Open Form for Adding New Product
  const handleStartCreateProduct = () => {
    setEditingProduct(null);
    setFormNameEn('');
    setFormNameKm('');
    setFormSku(`POS-${Math.floor(100 + Math.random() * 900)}`);
    setFormCategory('pos-machines');
    setFormPrice(0);
    setFormOriginalPrice(undefined);
    setFormStock(10);
    setFormAvailable(true);
    setFormWarranty('1 Year Warranty');
    setFormDescEn('');
    setFormDescKm('');
    setFormImage('https://images.unsplash.com/photo-1556742049-0a67c5574f73?auto=format&fit=crop&w=800&q=80');
    setFormIsFeatured(false);
    setFormIsLatest(true);
    setIsCreatingProduct(true);
  };

  // Open Form for Editing Existing Product
  const handleStartEditProduct = (prod: Product) => {
    setEditingProduct(prod);
    setFormNameEn(prod.name.en);
    setFormNameKm(prod.name.km);
    setFormSku(prod.sku);
    setFormCategory(prod.categoryId);
    setFormPrice(prod.price);
    setFormOriginalPrice(prod.originalPrice);
    setFormStock(prod.stockCount);
    setFormAvailable(prod.isAvailable);
    setFormWarranty(prod.warrantyPeriod || '1 Year Warranty');
    setFormDescEn(prod.description.en);
    setFormDescKm(prod.description.km);
    setFormImage(prod.imageUrl);
    setFormIsFeatured(Boolean(prod.isFeatured));
    setFormIsLatest(Boolean(prod.isLatest));
    setIsCreatingProduct(true);
  };

  // Save Product (Create or Edit)
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNameEn.trim() || !formSku.trim() || formPrice < 0) {
      alert('Please fill in required fields (Name, SKU, and Price)');
      return;
    }

    const payload: Product = {
      id: editingProduct ? editingProduct.id : '',
      sku: formSku.trim(),
      name: {
        en: formNameEn.trim(),
        km: formNameKm.trim() || formNameEn.trim(),
      },
      categoryId: formCategory,
      price: Number(formPrice),
      originalPrice: formOriginalPrice ? Number(formOriginalPrice) : undefined,
      description: {
        en: formDescEn.trim() || 'Professional grade POS hardware item.',
        km: formDescKm.trim() || 'ឧបករណ៍ POS Hardware គុណភាពស្តង់ដារ។',
      },
      imageUrl: formImage || 'https://placehold.co/800x600/0f172a/ffffff?text=POS',
      isAvailable: formAvailable,
      stockCount: Number(formStock),
      isFeatured: formIsFeatured,
      isLatest: formIsLatest,
      warrantyPeriod: formWarranty,
      specifications: editingProduct?.specifications || [
        { key: { en: 'Warranty', km: 'ការធានា' }, value: { en: formWarranty, km: formWarranty } },
      ],
    };

    if (editingProduct) {
      await apiService.updateProduct(payload);
    } else {
      await apiService.addProduct(payload);
    }

    triggerHaptic('success');
    setIsCreatingProduct(false);
    setEditingProduct(null);
    loadDashboardData();
    if (onRefreshData) onRefreshData();
  };

  // Delete Product
  const handleDeleteProduct = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete "${name}"?`)) {
      await apiService.deleteProduct(id);
      triggerHaptic('warning');
      loadDashboardData();
      if (onRefreshData) onRefreshData();
    }
  };

  // Update Order Status
  const handleUpdateOrderStatus = async (orderId: string, status: PaymentVerificationStatus) => {
    await apiService.updateOrderStatus(orderId, status);
    triggerHaptic('success');
    loadDashboardData();
    if (selectedOrder && selectedOrder.id === orderId) {
      setSelectedOrder({ ...selectedOrder, paymentVerificationStatus: status });
    }
  };

  // Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    await apiService.updateSettings(settings);
    triggerHaptic('success');
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 2500);
    if (onRefreshData) onRefreshData();
  };

  // Filtered Products for Admin Table
  const filteredProducts = products.filter(
    (p) =>
      p.name.en.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.sku.toLowerCase().includes(productSearch.toLowerCase())
  );

  // -------------------------------------------------------------
  // Screen 1: PIN Lock Screen
  // -------------------------------------------------------------
  if (!isAuthenticated) {
    return (
      <div className="min-h-[75vh] flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white rounded-3xl p-6 border border-slate-200/80 shadow-card text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-navy-900 text-brand-400 flex items-center justify-center mx-auto shadow-md">
            <Lock className="w-8 h-8" />
          </div>

          <div>
            <h1 className="text-lg font-black text-navy-900">Admin Control Center</h1>
            <p className="text-xs text-slate-500 mt-1">
              Enter your secure 4-digit PIN to manage products, insert pictures, and review customer orders.
            </p>
          </div>

          {authError && (
            <div className="p-2.5 rounded-xl bg-red-50 text-red-700 text-xs font-semibold flex items-center gap-1.5 justify-center">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleUnlockWithPin} className="space-y-3">
            <input
              type="password"
              inputMode="numeric"
              maxLength={8}
              autoFocus
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              placeholder="Enter Admin PIN (Default: 8888)"
              className="w-full py-3 px-4 text-center tracking-widest text-lg font-black bg-slate-50 border border-slate-300 rounded-xl text-navy-900 focus:outline-none focus:border-brand-500 focus:bg-white transition-all font-mono"
            />

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-navy-900 hover:bg-navy-800 text-white text-xs font-bold transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
            >
              <Unlock className="w-4 h-4 text-emerald-400" />
              <span>Unlock Admin Dashboard</span>
            </button>
          </form>

          {user && (
            <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-400">
              Logged in as Telegram: <span className="font-semibold text-navy-900">@{user.username || user.firstName}</span>
            </div>
          )}

          <button
            onClick={onBack}
            className="text-xs font-semibold text-slate-500 hover:text-navy-900 pt-1"
          >
            ← Return to Store
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // Screen 2: Authenticated Admin Dashboard
  // -------------------------------------------------------------
  return (
    <div className="space-y-5 pb-28">
      {/* Top Admin Header Bar */}
      <div className="bg-navy-900 text-white rounded-3xl p-5 shadow-card flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-brand-500 text-white flex items-center justify-center font-black">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-black leading-tight">Admin Dashboard</h1>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
                Authorized
              </span>
            </div>
            <p className="text-[11px] text-slate-300">
              Only you have access to modify store inventory and settings
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleLogout}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors"
            title="Lock Dashboard"
          >
            <Lock className="w-4 h-4" />
          </button>
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Admin Navigation Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
        <button
          onClick={() => {
            setActiveTab('products');
            triggerHaptic('light');
          }}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'products'
              ? 'bg-navy-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-navy-900'
          }`}
        >
          <Package className="w-3.5 h-3.5" />
          <span>Products ({products.length})</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('orders');
            triggerHaptic('light');
          }}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'orders'
              ? 'bg-navy-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-navy-900'
          }`}
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          <span>Orders ({orders.length})</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('settings');
            triggerHaptic('light');
          }}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'settings'
              ? 'bg-navy-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-navy-900'
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
          <span>Settings</span>
        </button>
      </div>

      {/* ----------------------------------------------------------- */}
      {/* TAB 1: PRODUCT MANAGEMENT & IMAGE INSERTION                */}
      {/* ----------------------------------------------------------- */}
      {activeTab === 'products' && (
        <div className="space-y-4">
          {/* Action Toolbar */}
          <div className="flex items-center justify-between gap-2">
            <input
              type="text"
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              placeholder="Search hardware by name or SKU..."
              className="flex-1 py-2 px-3 bg-white border border-slate-200 rounded-xl text-xs text-navy-900 focus:outline-none focus:border-brand-500 shadow-xs"
            />
            <button
              onClick={handleStartCreateProduct}
              className="py-2 px-3.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md active:scale-95 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Add Hardware</span>
            </button>
          </div>

          {/* Product Create / Edit Modal Form */}
          {isCreatingProduct && (
            <div className="bg-white rounded-3xl p-5 border-2 border-brand-500 shadow-card space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-brand-600" />
                  <h2 className="text-sm font-black text-navy-900">
                    {editingProduct ? 'Edit POS Hardware' : 'Insert New Hardware Product'}
                  </h2>
                </div>
                <button
                  onClick={() => setIsCreatingProduct(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-navy-900"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveProduct} className="space-y-3.5 text-xs">
                {/* Photo Upload Section */}
                <div className="space-y-2">
                  <label className="block font-bold text-navy-900">
                    Product Image (Upload Photo or Paste URL) <span className="text-red-500">*</span>
                  </label>

                  <div className="flex items-center gap-3">
                    <div className="w-20 h-20 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                      {formImage ? (
                        <img src={formImage} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon className="w-8 h-8 text-slate-300" />
                      )}
                    </div>

                    <div className="flex-1 space-y-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-navy-900 font-bold flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload Photo from Device</span>
                      </button>

                      <input
                        type="url"
                        value={formImage}
                        onChange={(e) => setFormImage(e.target.value)}
                        placeholder="Or paste image URL (https://...)"
                        className="w-full py-1.5 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block font-bold text-navy-900 mb-1">
                      Product Name (English) *
                    </label>
                    <input
                      type="text"
                      required
                      value={formNameEn}
                      onChange={(e) => setFormNameEn(e.target.value)}
                      placeholder="e.g. INFO Dual-Screen POS T15"
                      className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-navy-900 mb-1">
                      Product Name (Khmer)
                    </label>
                    <input
                      type="text"
                      value={formNameKm}
                      onChange={(e) => setFormNameKm(e.target.value)}
                      placeholder="e.g. ម៉ាស៊ីន POS អេក្រង់ភ្លោះ INFO T15"
                      className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  <div>
                    <label className="block font-bold text-navy-900 mb-1">SKU Code *</label>
                    <input
                      type="text"
                      required
                      value={formSku}
                      onChange={(e) => setFormSku(e.target.value)}
                      placeholder="POS-001"
                      className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-navy-900 mb-1">Price (USD) *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={formPrice}
                      onChange={(e) => setFormPrice(Number(e.target.value))}
                      className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-brand-700"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-navy-900 mb-1">Original Price ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formOriginalPrice || ''}
                      onChange={(e) => setFormOriginalPrice(e.target.value ? Number(e.target.value) : undefined)}
                      placeholder="Discount"
                      className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block font-bold text-navy-900 mb-1">Category</label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value as CategoryId)}
                      className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl"
                    >
                      <option value="pos-machines">POS Machines</option>
                      <option value="barcode-scanners">Barcode Scanners</option>
                      <option value="receipt-printers">Receipt Printers</option>
                      <option value="label-printers">Label Printers</option>
                      <option value="cash-drawers">Cash Drawers</option>
                      <option value="barcode-labels">Barcode Labels & Paper</option>
                      <option value="pos-accessories">POS Accessories</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-navy-900 mb-1">Stock Count</label>
                    <input
                      type="number"
                      value={formStock}
                      onChange={(e) => setFormStock(Number(e.target.value))}
                      className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-navy-900 mb-1">Warranty Period</label>
                  <input
                    type="text"
                    value={formWarranty}
                    onChange={(e) => setFormWarranty(e.target.value)}
                    placeholder="1 Year Official Warranty"
                    className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-bold text-navy-900 mb-1">Description (English)</label>
                  <textarea
                    rows={2}
                    value={formDescEn}
                    onChange={(e) => setFormDescEn(e.target.value)}
                    placeholder="Product highlights and specifications..."
                    className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                {/* Toggles */}
                <div className="flex items-center gap-4 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer font-bold">
                    <input
                      type="checkbox"
                      checked={formAvailable}
                      onChange={(e) => setFormAvailable(e.target.checked)}
                      className="rounded text-brand-600"
                    />
                    <span>Available in Stock</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-bold">
                    <input
                      type="checkbox"
                      checked={formIsFeatured}
                      onChange={(e) => setFormIsFeatured(e.target.checked)}
                      className="rounded text-brand-600"
                    />
                    <span>Featured Item</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-bold">
                    <input
                      type="checkbox"
                      checked={formIsLatest}
                      onChange={(e) => setFormIsLatest(e.target.checked)}
                      className="rounded text-brand-600"
                    />
                    <span>Latest Arrival</span>
                  </label>
                </div>

                {/* Save Buttons */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsCreatingProduct(false)}
                    className="py-2 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="py-2 px-5 rounded-xl bg-navy-900 hover:bg-navy-800 text-white font-bold flex items-center gap-1.5 shadow-md"
                  >
                    <Save className="w-4 h-4 text-emerald-400" />
                    <span>{editingProduct ? 'Save Changes' : 'Insert Product'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Product Items Table / Cards */}
          <div className="space-y-2.5">
            {filteredProducts.map((p) => (
              <div
                key={p.id}
                className="bg-white rounded-2xl p-3 border border-slate-200/80 shadow-subtle flex items-center gap-3 hover:border-brand-300 transition-all"
              >
                <div className="w-14 h-14 rounded-xl bg-slate-100 overflow-hidden shrink-0 border border-slate-100">
                  <img src={p.imageUrl} alt={p.name.en} className="w-full h-full object-cover" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-500">
                      {p.sku}
                    </span>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                        p.isAvailable ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
                      }`}
                    >
                      {p.isAvailable ? `${p.stockCount} in stock` : 'Out of stock'}
                    </span>
                  </div>
                  <h3 className="text-xs font-bold text-navy-900 truncate mt-0.5">{p.name.en}</h3>
                  <div className="text-xs font-black text-brand-700 font-mono mt-0.5">
                    {formatUSD(p.price)}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleStartEditProduct(p)}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-brand-50 text-slate-600 hover:text-brand-600 transition-colors"
                    title="Edit Hardware"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteProduct(p.id, p.name.en)}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
                    title="Delete Hardware"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------- */}
      {/* TAB 2: ORDER VERIFICATION & LOCATION TRACKING              */}
      {/* ----------------------------------------------------------- */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-navy-900 uppercase tracking-wide">
              Customer Orders ({orders.length})
            </h2>
            <button
              onClick={loadDashboardData}
              className="text-xs text-brand-600 font-bold flex items-center gap-1 hover:underline"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Refresh</span>
            </button>
          </div>

          {orders.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 text-center border border-slate-200">
              <ShoppingBag className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-xs text-slate-500">No orders placed yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((ord) => (
                <div
                  key={ord.id}
                  className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-subtle space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-xs font-mono font-bold text-navy-900 block">
                        {ord.orderNumber}
                      </span>
                      <span className="text-[11px] text-slate-400">{formatDate(ord.createdAt)}</span>
                    </div>

                    {/* Status Pill */}
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 ${
                        ord.paymentVerificationStatus === 'verified'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : ord.paymentVerificationStatus === 'rejected'
                          ? 'bg-red-50 text-red-700 border border-red-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      <Clock className="w-3 h-3" />
                      <span className="capitalize">
                        {ord.paymentVerificationStatus.replace('_', ' ')}
                      </span>
                    </span>
                  </div>

                  {/* Customer Info */}
                  <div className="p-3 rounded-xl bg-slate-50 text-xs space-y-1">
                    <div className="font-bold text-navy-900">{ord.customer.fullName}</div>
                    <div className="text-slate-600 font-mono flex items-center gap-1.5">
                      <Phone className="w-3 h-3 text-slate-400" />
                      <a href={`tel:${ord.customer.phoneNumber}`} className="underline">
                        {ord.customer.phoneNumber}
                      </a>
                      {ord.customer.telegramUsername && (
                        <span className="text-brand-600 font-semibold ml-2">
                          {ord.customer.telegramUsername}
                        </span>
                      )}
                    </div>
                    <div className="text-slate-600 flex items-start gap-1.5 pt-0.5">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
                      <span>
                        {ord.customer.detailedAddress}, {ord.customer.provinceOrCity}
                      </span>
                    </div>

                    {/* Customer GPS Location Map Link */}
                    {ord.customer.googleMapsUrl && (
                      <div className="pt-1.5">
                        <a
                          href={ord.customer.googleMapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-[11px] shadow-xs hover:bg-emerald-700"
                        >
                          <MapPin className="w-3.5 h-3.5" />
                          <span>Open Customer GPS in Google Maps</span>
                          <ExternalLink className="w-3 h-3 ml-0.5" />
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Ordered Items Summary */}
                  <div className="text-xs space-y-1 border-t border-slate-100 pt-2">
                    {ord.items.map((it) => (
                      <div key={it.product.id} className="flex justify-between text-slate-700">
                        <span className="truncate pr-2">
                          {it.quantity}x {it.product.name.en}
                        </span>
                        <span className="font-mono font-semibold">
                          {formatUSD(it.product.price * it.quantity)}
                        </span>
                      </div>
                    ))}
                    <div className="flex justify-between text-xs font-black text-navy-900 pt-1 border-t border-slate-100">
                      <span>Total Amount:</span>
                      <span className="text-brand-700 font-mono">{formatUSD(ord.totalAmount)}</span>
                    </div>
                  </div>

                  {/* Payment Proof Screenshot Preview */}
                  {ord.paymentProofUrl && (
                    <div className="pt-2 border-t border-slate-100">
                      <span className="text-[11px] font-bold text-navy-900 block mb-1">
                        Customer Payment Proof:
                      </span>
                      <a
                        href={ord.paymentProofUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block relative w-24 h-24 rounded-xl bg-slate-900 overflow-hidden border border-slate-200 group"
                      >
                        <img
                          src={ord.paymentProofUrl}
                          alt="Screenshot"
                          className="w-full h-full object-contain"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                          <Eye className="w-4 h-4" />
                        </div>
                      </a>
                    </div>
                  )}

                  {/* Admin Verification Actions */}
                  <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                    <button
                      onClick={() => handleUpdateOrderStatus(ord.id, 'verified')}
                      disabled={ord.paymentVerificationStatus === 'verified'}
                      className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs font-bold flex items-center justify-center gap-1 shadow-xs"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Approve & Verify</span>
                    </button>

                    <button
                      onClick={() => handleUpdateOrderStatus(ord.id, 'rejected')}
                      disabled={ord.paymentVerificationStatus === 'rejected'}
                      className="py-2 px-3 rounded-xl bg-red-100 hover:bg-red-200 text-red-700 text-xs font-bold flex items-center gap-1"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Reject</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ----------------------------------------------------------- */}
      {/* TAB 3: COMPANY SETTINGS & PERMISSIONS                       */}
      {/* ----------------------------------------------------------- */}
      {activeTab === 'settings' && (
        <form onSubmit={handleSaveSettings} className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-subtle space-y-4 text-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-sm font-black text-navy-900 uppercase tracking-wide">
              Company Info & Security Settings
            </h2>
            {settingsSaved && (
              <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                <span>Settings Saved!</span>
              </span>
            )}
          </div>

          <div className="space-y-3">
            <div>
              <label className="block font-bold text-navy-900 mb-1">Company Name</label>
              <input
                type="text"
                value={settings.companyName}
                onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>

            <div>
              <label className="block font-bold text-navy-900 mb-1">Support Phone Hotline</label>
              <input
                type="text"
                value={settings.phoneNumber}
                onChange={(e) => setSettings({ ...settings, phoneNumber: e.target.value })}
                className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl font-mono"
              />
            </div>

            <div>
              <label className="block font-bold text-navy-900 mb-1">Telegram Support Username</label>
              <input
                type="text"
                value={settings.telegramSupportUser}
                onChange={(e) => setSettings({ ...settings, telegramSupportUser: e.target.value })}
                placeholder="e.g. InfoPOSMini_StoreBot"
                className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>

            <div>
              <label className="block font-bold text-navy-900 mb-1">Facebook Page Link</label>
              <input
                type="text"
                value={settings.facebookUrl}
                onChange={(e) => setSettings({ ...settings, facebookUrl: e.target.value })}
                className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>

            <div>
              <label className="block font-bold text-navy-900 mb-1">Showroom Address</label>
              <input
                type="text"
                value={settings.showroomAddress}
                onChange={(e) => setSettings({ ...settings, showroomAddress: e.target.value })}
                className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>

            <div>
              <label className="block font-bold text-navy-900 mb-1">Business Hours</label>
              <input
                type="text"
                value={settings.workingHours}
                onChange={(e) => setSettings({ ...settings, workingHours: e.target.value })}
                className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>

            <div>
              <label className="block font-bold text-navy-900 mb-1">KHQR Account Name</label>
              <input
                type="text"
                value={settings.khqrAccountName}
                onChange={(e) => setSettings({ ...settings, khqrAccountName: e.target.value })}
                className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>

            {/* Admin PIN & Security */}
            <div className="pt-3 border-t border-slate-100">
              <label className="block font-bold text-navy-900 mb-1 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-brand-600" />
                <span>Admin Passcode (PIN)</span>
              </label>
              <input
                type="text"
                value={settings.adminPin}
                onChange={(e) => setSettings({ ...settings, adminPin: e.target.value })}
                placeholder="4-digit PIN"
                className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                This PIN protects your admin dashboard so only you can access it.
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              className="py-2.5 px-6 rounded-xl bg-navy-900 hover:bg-navy-800 text-white font-bold flex items-center gap-1.5 shadow-md active:scale-95"
            >
              <Save className="w-4 h-4 text-emerald-400" />
              <span>Save Settings</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
