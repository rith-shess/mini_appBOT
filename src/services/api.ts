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
  telegramBotToken: (import.meta as any).env?.VITE_TELEGRAM_BOT_TOKEN || '8327064995:AAHIdx3LgCYa-6Iog7fSFpMpO10pNK-yoZo',
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

function getStoredProducts(): Product[] {
  try {
    const raw = localStorage.getItem(PRODUCTS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
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
 * Direct Telegram Bot API Alert Sender
 * Can be called directly from frontend to send alerts to the sales team chat
 */
export async function sendTelegramOrderAlert(order: Order, settings: CompanySettings): Promise<{ success: boolean; message?: string }> {
  const token = settings.telegramBotToken || (import.meta as any).env?.VITE_TELEGRAM_BOT_TOKEN || '8327064995:AAHIdx3LgCYa-6Iog7fSFpMpO10pNK-yoZo';
  
  // Always send directly to verified sales chat ID for @Skybalsupport (1256184682)
  const chatIds: string[] = ['1256184682'];

  // Add any custom numeric chat ID if provided in settings
  if (settings.salesTelegramChatId && /^\d+$/.test(settings.salesTelegramChatId.trim())) {
    const customId = settings.salesTelegramChatId.trim();
    if (!chatIds.includes(customId)) {
      chatIds.push(customId);
    }
  }

  const itemsList = order.items
    .map((item) => `• ${item.quantity}x ${item.product.name.en} ($${(item.product.price * item.quantity).toFixed(2)})`)
    .join('\n');

  const customerTelegram = order.customer.telegramUsername ? ` (${order.customer.telegramUsername})` : '';
  const gpsInfo = order.customer.googleMapsUrl
    ? `\n🗺️ <b>GPS Map:</b> <a href="${order.customer.googleMapsUrl}">Open Google Maps</a>`
    : '';
  const deliveryInfo = order.deliveryMethod
    ? `🚚 <b>Delivery:</b> ${order.deliveryMethod} (${order.deliveryFee > 0 ? `$${order.deliveryFee.toFixed(2)}` : 'Free'})\n`
    : '';

  const captionText =
    `🔔 <b>NEW HARDWARE ORDER RECEIVED!</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `🔖 <b>Order ID:</b> <code>${order.orderNumber}</code>\n` +
    `👤 <b>Customer:</b> ${order.customer.fullName}${customerTelegram}\n` +
    `📱 <b>Phone:</b> <a href="tel:${order.customer.phoneNumber}">${order.customer.phoneNumber}</a>\n` +
    `${deliveryInfo}` +
    `📍 <b>Location:</b> ${order.customer.detailedAddress}, ${order.customer.provinceOrCity}${gpsInfo}\n` +
    `${order.customer.orderNotes ? `📝 <b>Note:</b> ${order.customer.orderNotes}\n` : ''}` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `🛒 <b>Hardware Items:</b>\n${itemsList}\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `💵 <b>Subtotal:</b> $${order.subtotal.toFixed(2)}\n` +
    `🚚 <b>Delivery Fee:</b> ${order.deliveryFee > 0 ? `$${order.deliveryFee.toFixed(2)}` : 'Free'}\n` +
    `💰 <b>Total Amount:</b> <b>$${order.totalAmount.toFixed(2)} USD</b>\n` +
    `💳 <b>Payment:</b> ${formatPaymentMethodName(order.paymentMethod)}\n` +
    `⚡ <b>Status:</b> ⏳ <b>Pending Verification</b>`;

  const inlineKeyboard: any[] = [
    [
      {
        text: '✅ Approve & Verify Payment',
        callback_data: `verify:${order.orderNumber}:${order.telegramUserId || ''}`,
      },
      {
        text: '❌ Reject Payment',
        callback_data: `reject:${order.orderNumber}:${order.telegramUserId || ''}`,
      },
    ],
  ];
  if (order.customer.googleMapsUrl) {
    inlineKeyboard.push([
      { text: '📍 Open Customer GPS in Google Maps', url: order.customer.googleMapsUrl },
    ]);
  }

  let anySuccess = false;

  for (const chatId of chatIds) {
    try {
      if (order.paymentProofUrl && order.paymentProofUrl.startsWith('data:image/')) {
        const matches = order.paymentProofUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          const mimeType = matches[1];
          const byteCharacters = atob(matches[2]);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: mimeType });

          const formData = new FormData();
          formData.append('chat_id', chatId);
          formData.append('caption', captionText);
          formData.append('parse_mode', 'HTML');
          formData.append('photo', blob, 'receipt.jpg');
          if (inlineKeyboard.length > 0) {
            formData.append('reply_markup', JSON.stringify({ inline_keyboard: inlineKeyboard }));
          }

          const res = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
            method: 'POST',
            body: formData,
          });
          const json = await res.json();
          if (json.ok) {
            anySuccess = true;
            continue;
          }
        }
      }

      // Text fallback
      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: captionText,
          parse_mode: 'HTML',
          reply_markup: inlineKeyboard.length > 0 ? { inline_keyboard: inlineKeyboard } : undefined,
        }),
      });
      const json = await res.json();
      if (json.ok) anySuccess = true;
    } catch (e) {
      console.warn(`Failed sending alert to ${chatId}:`, e);
    }
  }

  return { success: anySuccess };
}

/**
 * Direct Telegram Bot API Alert to the Customer when Order is Verified / Rejected
 */
export async function sendCustomerTelegramAlert(
  order: Order,
  status: PaymentVerificationStatus,
  settings: CompanySettings
): Promise<boolean> {
  const token = settings.telegramBotToken || (import.meta as any).env?.VITE_TELEGRAM_BOT_TOKEN || '8327064995:AAHIdx3LgCYa-6Iog7fSFpMpO10pNK-yoZo';
  
  let targetChatId = order.telegramUserId;
  if (!targetChatId && order.customer.telegramUsername) {
    const cleanUser = order.customer.telegramUsername.replace('@', '').toLowerCase();
    if (cleanUser === 'rithilysm' || cleanUser === 'rith_shees') targetChatId = '1275900952';
    if (cleanUser === 'skybalsupport') targetChatId = '1256184682';
  }

  if (!token || !targetChatId) return false;

  const isApproval = status === 'verified';
  let customerMessage = '';

  if (isApproval) {
    customerMessage =
      `🎉 <b>PAYMENT CONFIRMED & APPROVED!</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `Dear <b>${order.customer.fullName}</b>,\n\n` +
      `Your payment for Order <code>#${order.orderNumber}</code> ($${order.totalAmount.toFixed(2)} USD) has been <b>VERIFIED & APPROVED</b> by INFO POS Hardware! ✅\n\n` +
      `📦 Your hardware order is being prepared for immediate dispatch to:\n` +
      `📍 <i>${order.customer.detailedAddress}, ${order.customer.provinceOrCity}</i>\n\n` +
      `📞 Hotline: <b>${settings.phoneNumber}</b>\n\n` +
      `Thank you for shopping with INFO POS Hardware!`;
  } else {
    customerMessage =
      `⚠️ <b>PAYMENT VERIFICATION NOTICE</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `Dear <b>${order.customer.fullName}</b>,\n\n` +
      `Our sales team reviewed Order <code>#${order.orderNumber}</code> but could <b>not verify</b> your payment transfer receipt. ❌\n\n` +
      `Please contact our sales team directly at @${settings.telegramSupportUser.replace('@', '')} or call <b>${settings.phoneNumber}</b>.`;
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: targetChatId,
        text: customerMessage,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: '🛒 Open Store',
                web_app: { url: 'https://mini-app-bot-eight.vercel.app/' },
              },
            ],
          ],
        },
      }),
    });
    const json = await res.json();
    return json.ok;
  } catch {
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
