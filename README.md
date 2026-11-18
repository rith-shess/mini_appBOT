# INFO POS Hardware – Telegram Mini App (TMA)

A modern, mobile-first Telegram Mini App (TMA) for **INFO POS Hardware**, engineered with React 18, TypeScript, Vite, Tailwind CSS, and Lucide Icons.

---

## 🚀 Key Features

- **Mobile-First POS Hardware Catalog**:
  - Touch POS Machines (Dual-screen Windows & Android terminals)
  - Barcode Scanners (1D/2D QR wireless, omnidirectional, wearable ring scanners)
  - Receipt Printers (80mm & 58mm thermal printers with auto-cutter & kitchen buzzers)
  - Label Printers (Shipping waybill & barcode label printers)
  - Cash Drawers (Heavy-duty cold-rolled steel with RJ11 printer trigger)
  - Barcode Labels & Thermal Paper Rolls
  - POS Accessories (VFD customer displays, aluminum 360° stands)
- **Bilingual Support**:
  - Full **Khmer (ភាសាខ្មែរ)** & **English** translations.
  - One-tap language switcher with localStorage and Telegram user language detection.
- **Telegram Mini App Integration**:
  - Official Telegram Web Apps SDK script integration.
  - Automatic detection of Telegram environment vs browser fallback.
  - Telegram `expand()` to occupy full mobile viewport on Android & iOS.
  - Seamless support for native Telegram `BackButton` and `MainButton`.
  - Telegram user profile detection (`first_name`, `username`).
- **Complete Shopping Cart & Checkout Flow**:
  - Add to cart with real-time stepper (+ / -), subtotal, and free delivery calculation.
  - Customer info collection (Cambodia provinces dropdown, phone number, delivery address).
  - Payment method choices: Bakong KHQR / ABA Mobile, Bank Transfer, Cash on Delivery.
  - **Payment Proof Screenshot Upload**: Preview, replace, and remove capabilities.
  - **Payment Pending Verification Status**: Orders clearly remain "Pending Verification" until manually reviewed by sales staff.
  - Demo order generation (e.g. `POS-261117-4821`) with order confirmation review.
- **Future-Ready Architecture**:
  - Decoupled API service layer (`src/services/api.ts`) ready to connect to Cloudflare Workers, Cloudflare D1 (database), and Cloudflare R2 (image storage).

---

## 🛠️ Tech Stack

- **Framework**: React 18 + TypeScript
- **Bundler**: Vite 6
- **Styling**: Tailwind CSS 3
- **Icons**: Lucide React
- **Telegram WebApp SDK**: Official Telegram WebApp JavaScript API

---

## 📁 Project Structure

```
info-pos-tma/
├── public/                 # Static assets & icons
├── src/
│   ├── components/         # Reusable UI components
│   │   ├── common/         # Header, BottomNav, ProductCard
│   │   └── home/           # HeroBanner, CategoryPills, SearchBar
│   ├── data/               # Realistic POS hardware mock catalog
│   ├── hooks/              # Custom hooks (useTelegram, useCart, useTranslation)
│   ├── locales/            # English & Khmer translation dictionary
│   ├── pages/              # Main application screens
│   │   ├── HomePage.tsx
│   │   ├── CategoriesPage.tsx
│   │   ├── ProductDetailPage.tsx
│   │   ├── CartPage.tsx
│   │   ├── CheckoutPage.tsx
│   │   ├── OrderConfirmationPage.tsx
│   │   └── ContactPage.tsx
│   ├── services/           # API service layer (Cloudflare Workers ready)
│   ├── types/              # Reusable TypeScript interfaces (Product, Order, Customer, etc.)
│   ├── utils/              # Formatters & tailwind merge utilities
│   ├── App.tsx             # Root router & screen state manager
│   ├── index.css           # Tailwind directives & TMA touch styles
│   └── main.tsx            # Application entry point
├── index.html              # HTML shell with fonts & Telegram WebApp SDK
├── tailwind.config.js      # Custom theme colors (Navy & Brand Blue)
├── tsconfig.json           # Strict TypeScript configuration
└── vite.config.ts          # Vite build configuration
```

---

## 💻 Local Development

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Vite Dev Server
```bash
npm run dev
```
Open your browser at `http://localhost:5173`. The application automatically runs in **Browser Test Mode** with full interactivity, cart persistence, and simulated order submission.

### 3. Build for Production
```bash
npm run build
```

---

## 🤖 Telegram Bot & Mini App Setup (When Ready)

To attach this Mini App to your own new Telegram bot:

1. Open Telegram and start a chat with [@BotFather](https://t.me/BotFather).
2. Create a new bot:
   ```text
   /newbot
   Name: INFO POS Hardware
   Username: your_infopos_bot
   ```
3. Set up the Web App:
   ```text
   /newapp
   Select your bot
   Title: INFO POS Hardware
   Description: Premium POS Terminals, Scanners & Receipt Printers
   Upload a 640x360 app icon
   Web App URL: https://your-hosted-domain.pages.dev
   Short name: shop
   ```
4. Access the Mini App via `https://t.me/your_infopos_bot/shop` or set the bot menu button using `/setmenubutton`.
