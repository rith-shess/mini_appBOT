import { Order, Product, Category, CategoryId, CompanySettings, PaymentVerificationStatus, PaymentMethodsSettings, PaymentMethod, DeliveryMethodsSettings } from '../types';
import { mockProducts, categories } from '../data/mockProducts';
import { extractVideoFromText } from '../utils/video';

// Base URL for future Cloudflare Workers API backend
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const USE_MOCK = !API_BASE_URL;

// Local storage keys
const PRODUCTS_STORAGE_KEY = 'info_pos_custom_products';
const ORDERS_STORAGE_KEY = 'info_pos_orders';
const SETTINGS_STORAGE_KEY = 'info_pos_company_settings';

export const defaultPaymentMethods: PaymentMethodsSettings = {
  aba: {
    enabled: true,
    bankName: 'ABA Bank',
    accountName: 'INFO POS HARDWARE (USD)',
    accountNumber: '001 888 999 (USD)',
    qrImageUrl: '',
    instructions: 'Scan with ABA Mobile or transfer to account number',
  },
  bakong: {
    enabled: true,
    bankName: 'Bakong KHQR',
    accountName: 'INFO POS HARDWARE (USD)',
    accountNumber: 'infopos@bk (National KHQR)',
    qrImageUrl: '',
    instructions: 'Scan via any Bakong-supported banking app in Cambodia',
  },
  kb: {
    enabled: true,
    bankName: 'KB PRASAC Bank',
    accountName: 'INFO POS HARDWARE (USD)',
    accountNumber: '100 234 567 890 (USD)',
    qrImageUrl: '',
    instructions: 'Transfer via KB PRASAC / KB Mobile app',
  },
};

export const defaultDeliveryMethods: DeliveryMethodsSettings = {
  pickup: {
    id: 'pickup',
    name: 'Pick Up',
    subtitle: 'Store Branch Sophea Store',
    fee: 0,
    enabled: true,
  },
  vet: {
    id: 'vet',
    name: 'VET',
    subtitle: 'វីរៈប៊ុនថាំង',
    fee: 0,
    enabled: true,
  },
  jnt: {
    id: 'jnt',
    name: 'J&T EXPRESS',
    subtitle: 'J&T Express',
    fee: 0,
    enabled: true,
  },
};

export const defaultCompanySettings: CompanySettings = {
  companyName: 'INFO POS',
  headerBadge: 'PRO',
  logoUrl: '',
  tagline: 'Hardware Solutions',
  phoneNumber: '+855 (0) 23 999 888 / +855 (0) 12 345 678',
  telegramSupportUser: 'Skybalsupport',
  salesTelegramAccount: '@Skybalsupport',
  salesTelegramChatId: '1256184682',
  facebookUrl: 'https://facebook.com/infoposhardware',
  showroomAddress: 'Building 48, Blvd. Mao Tse Toung, Chamkarmon, Phnom Penh, Cambodia',
  workingHours: 'Monday – Saturday: 8:00 AM – 5:30 PM',
  khqrAccountName: 'INFO POS HARDWARE (USD)',
  khqrQrImageUrl: '',
  adminPin: '8888',
  authorizedTelegramUsernames: ['rith_shees', 'rith-shess', 'rithshees', 'rithilysm', 'Skybalsupport'],
  paymentMethods: defaultPaymentMethods,
  deliveryMethods: defaultDeliveryMethods,
};

// ---------- Shared product catalog (server-side, visible to every customer) ----------
type RemoteResult =
  | { status: 'ok'; products: Product[] }
  | { status: 'unconfigured' }
  | { status: 'unavailable' };

async function fetchRemoteProducts(): Promise<RemoteResult> {
  try {
    const res = await fetch('/api/products', { cache: 'no-store' });
    if (res.status === 503) return { status: 'unconfigured' };
    if (!res.ok) return { status: 'unavailable' };
    const json = await res.json();
    if (json && Array.isArray(json.products)) return { status: 'ok', products: json.products };
    return { status: 'unavailable' };
  } catch {
    return { status: 'unavailable' }; // e.g. local dev without /api
  }
}

async function remoteProductWrite(body: Record<string, unknown>): Promise<void> {
  const initData = typeof window !== 'undefined' ? window.Telegram?.WebApp?.initData || '' : '';
  const res = await fetch('/api/products', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, initData }),
  });
  if (!res.ok) {
    let msg = `Server error ${res.status}`;
    try { msg = (await res.json()).error || msg; } catch {}
    throw new Error(msg);
  }
}

/** Shared list if available; otherwise the local list (defaults / dev mode). */
async function loadProducts(): Promise<Product[]> {
  const remote = await fetchRemoteProducts();
  if (remote.status === 'ok' && remote.products.length > 0) return remote.products;
  return getStoredProducts();
}

/**
 * Runs an admin write against the shared database.
 * Returns false when there is no /api (local dev) so the caller can fall back to localStorage.
 */
async function withSharedStore(write: () => Promise<void>): Promise<boolean> {
  const remote = await fetchRemoteProducts();
  if (remote.status === 'unavailable') return false;
  if (remote.status === 'unconfigured') {
    throw new Error('Shared database is not connected yet. Add Upstash Redis in Vercel > Storage, then redeploy.');
  }
  if (remote.products.length === 0) {
    // First time: copy current catalog (defaults + anything saved on this device) to the shared database
    await remoteProductWrite({ products: getStoredProducts() });
  }
  await write();
  return true;
}

function getStoredProducts(): Product[] {
  try {
    const raw = localStorage.getItem(PRODUCTS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') {
            delete (parsed as any).telegramBotToken;
          }
      if (Array.isArray(parsed) && parsed.length > 0) {
        let modified = false;
        parsed.forEach((p: Product) => {
          if (!p.videoUrl && p.description?.en) {
            const extracted = extractVideoFromText(p.description.en);
            if (extracted.videoUrl) {
              p.videoUrl = extracted.videoUrl;
              p.description.en = extracted.cleanedText;
              modified = true;
            }
          }
          if ((p.id === 'pos-d15-dual' || p.sku === 'POS-T156-D') && !p.videoUrl) {
            p.videoUrl = 'https://youtu.be/Xb6rdzqBuG0?si=FGlfvsYpiB8Xh2rk';
            modified = true;
          }
        });
        if (modified) {
          saveStoredProducts(parsed);
        }
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed reading stored products:', e);
  }
  // Initialize with mockProducts
  try {
    localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(mockProducts));
  } catch {}
  return [...mockProducts];
}

function saveStoredProducts(products: Product[]) {
  try {
    localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(products));
  } catch (e) {
    console.warn('Failed writing stored products:', e);
  }
}

export function formatPaymentMethodName(pm: PaymentMethod): string {
  if (pm === 'aba') return '1: ABA Bank';
  if (pm === 'bakong_khqr' || pm === 'aba_khqr') return '2: Bakong KHQR';
  if (pm === 'kb' || pm === 'bank_transfer') return '3: KB (KB PRASAC Bank)';
  return String(pm).toUpperCase().replace('_', ' ');
}

/**
 * Serverless Telegram Order Alert Sender
 * Dispatches order details and receipt to serverless /api/send-order
 */
export async function sendTelegramOrderAlert(order: Order, settings: CompanySettings): Promise<{ success: boolean; message?: string }> {
  try {
    const initData = typeof window !== 'undefined' ? window.Telegram?.WebApp?.initData || '' : '';
    const res = await fetch('/api/send-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        order,
        settings,
        initData,
      }),
    });
    const data = await res.json();
    return { success: Boolean(data?.ok), message: data?.error };
  } catch (err: any) {
    console.warn('Failed to send order alert via serverless endpoint:', err);
    return { success: false, message: err?.message || 'Network error reaching order alert endpoint' };
  }
}

/**
 * Serverless Telegram Customer Alert Sender
 * Dispatches verification status alert to serverless /api/send-customer-alert
 */
export async function sendCustomerTelegramAlert(
  order: Order,
  status: PaymentVerificationStatus,
  settings: CompanySettings
): Promise<boolean> {
  try {
    const initData = typeof window !== 'undefined' ? window.Telegram?.WebApp?.initData || '' : '';
    const res = await fetch('/api/send-customer-alert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        order,
        status,
        settings,
        initData,
      }),
    });
    const data = await res.json();
    return Boolean(data?.ok);
  } catch (err) {
    console.warn('Failed to send customer alert via serverless endpoint:', err);
    return false;
  }
}

export interface ProductFilterParams {
  categoryId?: CategoryId | 'all';
  searchQuery?: string;
  isFeatured?: boolean;
  isLatest?: boolean;
}

export const apiService = {
  /**
   * Fetch categories list
   */
  async getCategories(): Promise<Category[]> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 60));
      const allProducts = await loadProducts();
      return categories.map((cat) => ({
        ...cat,
        itemCount: allProducts.filter((p) => p.categoryId === cat.id).length,
      }));
    }

    const response = await fetch(`${API_BASE_URL}/api/categories`);
    if (!response.ok) throw new Error('Failed to fetch categories');
    return response.json();
  },

  /**
   * Fetch products with optional filtering by category or query
   */
  async getProducts(params?: ProductFilterParams): Promise<Product[]> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 80));
      let filtered = await loadProducts();

      if (params?.categoryId && params.categoryId !== 'all') {
        filtered = filtered.filter((p) => p.categoryId === params.categoryId);
      }

      if (params?.isFeatured) {
        filtered = filtered.filter((p) => p.isFeatured);
      }

      if (params?.isLatest) {
        filtered = filtered.filter((p) => p.isLatest);
      }

      if (params?.searchQuery && params.searchQuery.trim()) {
        const q = params.searchQuery.toLowerCase().trim();
        filtered = filtered.filter(
          (p) =>
            p.name.en.toLowerCase().includes(q) ||
            p.name.km.toLowerCase().includes(q) ||
            p.sku.toLowerCase().includes(q) ||
            p.description.en.toLowerCase().includes(q) ||
            p.description.km.toLowerCase().includes(q)
        );
      }

      return filtered;
    }

    const queryParams = new URLSearchParams();
    if (params?.categoryId && params.categoryId !== 'all') queryParams.set('category', params.categoryId);
    if (params?.searchQuery) queryParams.set('q', params.searchQuery);
    if (params?.isFeatured) queryParams.set('featured', 'true');
    if (params?.isLatest) queryParams.set('latest', 'true');

    const response = await fetch(`${API_BASE_URL}/api/products?${queryParams.toString()}`);
    if (!response.ok) throw new Error('Failed to fetch products');
    return response.json();
  },

  /**
   * Fetch single product by id or sku
   */
  async getProductById(id: string): Promise<Product | null> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 40));
      const products = await loadProducts();
      const found = products.find((p) => p.id === id || p.sku.toLowerCase() === id.toLowerCase());
      return found || null;
    }

    const response = await fetch(`${API_BASE_URL}/api/products/${id}`);
    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error('Failed to fetch product details');
    }
    return response.json();
  },

  /**
   * Add a new product (Admin)
   */
  async addProduct(product: Omit<Product, 'id'>): Promise<Product> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 100));
      const newProduct: Product = {
        ...product,
        id: `prod_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      };
      if (await withSharedStore(() => remoteProductWrite({ product: newProduct }))) return newProduct;
      const products = getStoredProducts();
      products.unshift(newProduct);
      saveStoredProducts(products);
      return newProduct;
    }

    const res = await fetch(`${API_BASE_URL}/api/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(product),
    });
    return res.json();
  },

  /**
   * Update existing product (Admin)
   */
  async updateProduct(product: Product): Promise<Product> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 100));
      if (await withSharedStore(() => remoteProductWrite({ product }))) return product;
      const products = getStoredProducts();
      const idx = products.findIndex((p) => p.id === product.id);
      if (idx !== -1) {
        products[idx] = product;
        saveStoredProducts(products);
      }
      return product;
    }

    const res = await fetch(`${API_BASE_URL}/api/products/${product.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(product),
    });
    return res.json();
  },

  /**
   * Delete product (Admin)
   */
  async deleteProduct(productId: string): Promise<boolean> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 100));
      if (await withSharedStore(() => remoteProductWrite({ action: 'delete', id: productId }))) return true;
      const products = getStoredProducts();
      const filtered = products.filter((p) => p.id !== productId);
      saveStoredProducts(filtered);
      return true;
    }

    const res = await fetch(`${API_BASE_URL}/api/products/${productId}`, {
      method: 'DELETE',
    });
    return res.ok;
  },

  /**
   * Submit an order & notify Telegram
   */
  async submitOrder(orderPayload: Omit<Order, 'id' | 'orderNumber' | 'createdAt' | 'paymentVerificationStatus'>): Promise<Order> {
    const currentSettings = await this.getSettings();

    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 500));

      const timestamp = new Date();
      const datePart = timestamp.toISOString().slice(2, 10).replace(/-/g, '');
      const randomPart = Math.floor(1000 + Math.random() * 9000);
      const generatedOrderNumber = `POS-${datePart}-${randomPart}`;

      const createdOrder: Order = {
        ...orderPayload,
        id: `ord_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        orderNumber: generatedOrderNumber,
        createdAt: timestamp.toISOString(),
        paymentVerificationStatus: 'pending_verification',
      };

      try {
        const existing = JSON.parse(localStorage.getItem(ORDERS_STORAGE_KEY) || '[]');
        existing.unshift(createdOrder);
        localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(existing.slice(0, 50)));
      } catch (e) {
        console.warn('Unable to persist order to localStorage:', e);
      }

      // Send alert directly to Telegram Sales account / group!
      sendTelegramOrderAlert(createdOrder, currentSettings).catch((err) =>
        console.warn('Could not send Telegram notification:', err)
      );

      return createdOrder;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to submit order');
      }

      const backendOrder = await response.json();
      try {
        const existing = JSON.parse(localStorage.getItem(ORDERS_STORAGE_KEY) || '[]');
        existing.unshift(backendOrder);
        localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(existing.slice(0, 50)));
      } catch {}

      return backendOrder;
    } catch (e) {
      console.warn('Backend call failed, using client storage fallback:', e);
      const timestamp = new Date();
      const datePart = timestamp.toISOString().slice(2, 10).replace(/-/g, '');
      const randomPart = Math.floor(1000 + Math.random() * 9000);
      const fallbackOrder: Order = {
        ...orderPayload,
        id: `ord_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        orderNumber: `POS-${datePart}-${randomPart}`,
        createdAt: timestamp.toISOString(),
        paymentVerificationStatus: 'pending_verification',
      };
      try {
        const existing = JSON.parse(localStorage.getItem(ORDERS_STORAGE_KEY) || '[]');
        existing.unshift(fallbackOrder);
        localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(existing.slice(0, 50)));
      } catch {}

      sendTelegramOrderAlert(fallbackOrder, currentSettings).catch(() => {});
      return fallbackOrder;
    }
  },

  /**
   * Get all orders (for Admin & Customer history)
   */
  async getOrders(): Promise<Order[]> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 60));
      try {
        return JSON.parse(localStorage.getItem(ORDERS_STORAGE_KEY) || '[]');
      } catch {
        return [];
      }
    }
    const res = await fetch(`${API_BASE_URL}/api/orders`);
    return res.json();
  },

  /**
   * Update order verification status (Admin)
   */
  async updateOrderStatus(orderId: string, status: PaymentVerificationStatus): Promise<boolean> {
    const settings = await this.getSettings();

    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 60));
      try {
        const orders: Order[] = JSON.parse(localStorage.getItem(ORDERS_STORAGE_KEY) || '[]');
        const idx = orders.findIndex((o) => o.id === orderId || o.orderNumber === orderId);
        if (idx !== -1) {
          orders[idx].paymentVerificationStatus = status;
          localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders));

          // Alert customer on Telegram!
          sendCustomerTelegramAlert(orders[idx], status, settings).catch(() => {});
          return true;
        }
      } catch {}
      return false;
    }
    const res = await fetch(`${API_BASE_URL}/api/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    return res.ok;
  },

  /**
   * Get Company Settings
   */
  async getSettings(): Promise<CompanySettings> {
    if (USE_MOCK) {
      try {
        const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          return {
            ...defaultCompanySettings,
            ...parsed,
            paymentMethods: {
              ...defaultPaymentMethods,
              ...(parsed.paymentMethods || {}),
            },
            deliveryMethods: (() => {
              const dm = {
                ...defaultDeliveryMethods,
                ...(parsed.deliveryMethods || {}),
              };
              if (dm.vet && dm.vet.fee === 1.5) dm.vet.fee = 0;
              if (dm.jnt && dm.jnt.fee === 1.5) dm.jnt.fee = 0;
              return dm;
            })(),
          };
        }
      } catch {}
      return defaultCompanySettings;
    }
    const res = await fetch(`${API_BASE_URL}/api/settings`);
    return res.json();
  },

  /**
   * Update Company Settings (Admin)
   */
  async updateSettings(settings: CompanySettings): Promise<CompanySettings> {
    if (USE_MOCK) {
      try {
        const safeSettings = { ...settings };
        delete (safeSettings as any).telegramBotToken;
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(safeSettings));
      } catch {}
      return settings;
    }
    const res = await fetch(`${API_BASE_URL}/api/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    return res.json();
  },
};
