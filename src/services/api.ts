import { Order, Product, Category, CategoryId } from '../types';
import { mockProducts, categories } from '../data/mockProducts';

// Base URL for future Cloudflare Workers API backend
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const USE_MOCK = !API_BASE_URL;

// Local storage key for persisting submitted demo orders in browser / TMA session
const ORDERS_STORAGE_KEY = 'info_pos_orders';

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
      await new Promise((r) => setTimeout(r, 80));
      return categories.map((cat) => ({
        ...cat,
        itemCount: mockProducts.filter((p) => p.categoryId === cat.id).length,
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
      await new Promise((r) => setTimeout(r, 120));
      let filtered = [...mockProducts];

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
      await new Promise((r) => setTimeout(r, 60));
      const found = mockProducts.find((p) => p.id === id || p.sku.toLowerCase() === id.toLowerCase());
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
   * Submit an order with customer info and payment proof screenshot.
   * In future: uploads image to Cloudflare R2, records record in D1, sends alert to Telegram Bot API.
   * Current frontend MVP: stores in memory / localStorage with pending_verification status.
   */
  async submitOrder(orderPayload: Omit<Order, 'id' | 'orderNumber' | 'createdAt' | 'paymentVerificationStatus'>): Promise<Order> {
    if (USE_MOCK) {
      // Simulate network request to Cloudflare Worker
      await new Promise((r) => setTimeout(r, 900));

      const timestamp = new Date();
      const datePart = timestamp.toISOString().slice(2, 10).replace(/-/g, '');
      const randomPart = Math.floor(1000 + Math.random() * 9000);
      const generatedOrderNumber = `POS-${datePart}-${randomPart}`;

      const createdOrder: Order = {
        ...orderPayload,
        id: `ord_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        orderNumber: generatedOrderNumber,
        createdAt: timestamp.toISOString(),
        paymentVerificationStatus: 'pending_verification', // ALWAYS pending initially
      };

      try {
        const existing = JSON.parse(localStorage.getItem(ORDERS_STORAGE_KEY) || '[]');
        existing.unshift(createdOrder);
        localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(existing.slice(0, 20)));
      } catch (e) {
        console.warn('Unable to persist order to localStorage:', e);
      }

      return createdOrder;
    }

    // Backend endpoint call
    const response = await fetch(`${API_BASE_URL}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderPayload),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to submit order');
    }

    return response.json();
  },

  /**
   * Get an existing order by ID (for order lookup / confirmation)
   */
  async getOrderById(orderId: string): Promise<Order | null> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 50));
      try {
        const stored: Order[] = JSON.parse(localStorage.getItem(ORDERS_STORAGE_KEY) || '[]');
        const found = stored.find((o) => o.id === orderId || o.orderNumber === orderId);
        return found || null;
      } catch {
        return null;
      }
    }

    const response = await fetch(`${API_BASE_URL}/api/orders/${orderId}`);
    if (!response.ok) return null;
    return response.json();
  },
};
