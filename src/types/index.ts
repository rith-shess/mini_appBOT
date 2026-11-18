export type CategoryId =
  | 'pos-machines'
  | 'barcode-scanners'
  | 'receipt-printers'
  | 'label-printers'
  | 'cash-drawers'
  | 'barcode-labels'
  | 'pos-accessories';

export interface Category {
  id: CategoryId;
  name: {
    en: string;
    km: string;
  };
  description: {
    en: string;
    km: string;
  };
  iconName: string;
  itemCount?: number;
}

export interface ProductSpecification {
  key: {
    en: string;
    km: string;
  };
  value: {
    en: string;
    km: string;
  };
}

export interface Product {
  id: string;
  sku: string;
  name: {
    en: string;
    km: string;
  };
  categoryId: CategoryId;
  price: number; // in USD
  originalPrice?: number;
  description: {
    en: string;
    km: string;
  };
  specifications: ProductSpecification[];
  imageUrl: string;
  isAvailable: boolean;
  stockCount: number;
  isFeatured?: boolean;
  isLatest?: boolean;
  rating?: number;
  warrantyPeriod?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface CustomerInfo {
  fullName: string;
  phoneNumber: string;
  provinceOrCity: string;
  detailedAddress: string;
  orderNotes?: string;
  telegramUsername?: string;
  latitude?: number;
  longitude?: number;
  googleMapsUrl?: string;
}

export type PaymentMethod = 'aba_khqr' | 'bank_transfer' | 'cash_on_delivery';

export type PaymentVerificationStatus = 'pending_verification' | 'verified' | 'rejected';

export interface Order {
  id: string;
  orderNumber: string;
  customer: CustomerInfo;
  items: CartItem[];
  subtotal: number;
  deliveryFee: number;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  paymentProofUrl?: string; // Base64 preview or R2 URL in future
  paymentProofFileName?: string;
  paymentVerificationStatus: PaymentVerificationStatus;
  createdAt: string;
  telegramUserId?: string;
  notes?: string;
}

export interface CompanySettings {
  companyName: string;
  tagline: string;
  phoneNumber: string;
  telegramSupportUser: string;
  facebookUrl: string;
  showroomAddress: string;
  workingHours: string;
  khqrAccountName: string;
  khqrQrImageUrl?: string;
  adminPin: string;
  authorizedTelegramUsernames: string[];
}

export type Language = 'en' | 'km';

export type ActiveScreen =
  | 'home'
  | 'categories'
  | 'product-detail'
  | 'cart'
  | 'checkout'
  | 'order-confirmation'
  | 'contact'
  | 'admin';
