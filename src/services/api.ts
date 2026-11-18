import { Order, Product, Category, CategoryId, CompanySettings, PaymentVerificationStatus } from '../types';
import { mockProducts, categories } from '../data/mockProducts';

// Base URL for future Cloudflare Workers API backend
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const USE_MOCK = !API_BASE_URL;

// Local storage keys
const PRODUCTS_STORAGE_KEY = 'info_pos_custom_products';
const ORDERS_STORAGE_KEY = 'info_pos_orders';
const SETTINGS_STORAGE_KEY = 'info_pos_company_settings';

export const defaultCompanySettings: CompanySettings = {
  companyName: 'INFO POS Hardware',
  tagline: 'Premium POS Solutions & Retail Equipment',
  phoneNumber: '+855 (0) 23 999 888 / +855 (0) 12 345 678',
  telegramSupportUser: 'Skybalsupport',
  salesTelegramAccount: '@Skybalsupport',
  facebookUrl: 'https://facebook.com/infoposhardware',
  showroomAddress: 'Building 48, Blvd. Mao Tse Toung, Chamkarmon, Phnom Penh, Cambodia',
  workingHours: 'Monday – Saturday: 8:00 AM – 5:30 PM',
  khqrAccountName: 'INFO POS HARDWARE (USD)',
  khqrQrImageUrl: '',
  adminPin: '8888',
  authorizedTelegramUsernames: ['rith_shees', 'rith-shess', 'rithshees', 'Skybalsupport'],
};

function getStoredProducts(): Product[] {
  try {
    const raw = localStorage.getItem(PRODUCTS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
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
      const allProducts = getStoredProducts();
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
      let filtered = getStoredProducts();

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
      const products = getStoredProducts();
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
      const products = getStoredProducts();
      const newProduct: Product = {
        ...product,
        id: `prod_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      };
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
   * Submit an order
   */
  async submitOrder(orderPayload: Omit<Order, 'id' | 'orderNumber' | 'createdAt' | 'paymentVerificationStatus'>): Promise<Order> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 600));

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
      console.warn('Backend call failed, falling back to local storage:', e);
      // Fallback to local order creation
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
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 60));
      try {
        const orders: Order[] = JSON.parse(localStorage.getItem(ORDERS_STORAGE_KEY) || '[]');
        const idx = orders.findIndex((o) => o.id === orderId || o.orderNumber === orderId);
        if (idx !== -1) {
          orders[idx].paymentVerificationStatus = status;
          localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders));
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
        if (raw) return { ...defaultCompanySettings, ...JSON.parse(raw) };
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
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
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
