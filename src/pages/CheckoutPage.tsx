import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowLeft,
  Upload,
  Image as ImageIcon,
  Trash2,
  AlertTriangle,
  QrCode,
  CreditCard,
  Building2,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Info,
  MapPin,
  ExternalLink,
  Navigation,
  Copy,
  Check,
  Store,
  Truck,
} from 'lucide-react';
import { useCart } from '../hooks/useCart';
import { useTranslation } from '../hooks/useTranslation';
import { formatUSD } from '../utils/formatters';
import { useTelegram } from '../hooks/useTelegram';
import { apiService, defaultCompanySettings, defaultDeliveryMethods } from '../services/api';
import { PaymentMethod, Order, CompanySettings, DeliveryMethodId } from '../types';

interface CheckoutPageProps {
  onBack: () => void;
  onOrderSuccess: (order: Order) => void;
}

const CAMBODIA_PROVINCES = [
  'Phnom Penh',
  'Kandal',
  'Siem Reap',
  'Battambang',
  'Preah Sihanouk (Kompong Som)',
  'Kampot',
  'Kampong Cham',
  'Kampong Speu',
  'Kampong Chhnang',
  'Kampong Thom',
  'Kep',
  'Koh Kong',
  'Kratie',
  'Mondulkiri',
  'Odar Meanchey',
  'Pailin',
  'Preah Vihear',
  'Prey Veng',
  'Pursat',
  'Ratanakiri',
  'Stung Treng',
  'Svay Rieng',
  'Takeo',
  'Tboung Khmum',
  'Banteay Meanchey',
];

export const CheckoutPage: React.FC<CheckoutPageProps> = ({ onBack, onOrderSuccess }) => {
  const { items, totalAmount, subtotal, deliveryFee, clearCart } = useCart();
  const { language, t } = useTranslation();
  const { user, triggerHaptic } = useTelegram();

  // Company & Payment Settings
  const [settings, setSettings] = useState<CompanySettings>(defaultCompanySettings);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Delivery Method (3 choices matching user specs: Pick Up, VET, J&T)
  const [deliveryMethodId, setDeliveryMethodId] = useState<DeliveryMethodId>('pickup');

  const deliveryMethods = settings.deliveryMethods || defaultDeliveryMethods;
  const pickupConfig = deliveryMethods.pickup || defaultDeliveryMethods.pickup;
  const vetConfig = deliveryMethods.vet || defaultDeliveryMethods.vet;
  const jntConfig = deliveryMethods.jnt || defaultDeliveryMethods.jnt;

  const activeDeliveryConfig = deliveryMethods[deliveryMethodId] || defaultDeliveryMethods[deliveryMethodId];
  const rawFee = activeDeliveryConfig?.fee ?? 0;
  const activeDeliveryFee = rawFee === 1.5 ? 0 : rawFee;
  const calculatedTotal = subtotal + activeDeliveryFee;

  useEffect(() => {
    apiService.getSettings().then((s) => setSettings(s));
  }, []);

  // Customer form state
  const [fullName, setFullName] = useState(
    user ? `${user.firstName}${user.lastName ? ' ' + user.lastName : ''}` : ''
  );
  const [phoneNumber, setPhoneNumber] = useState('');
  const [provinceOrCity, setProvinceOrCity] = useState('Phnom Penh');
  const [detailedAddress, setDetailedAddress] = useState('');
  const [orderNotes, setOrderNotes] = useState('');

  // Customer GPS Location State
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [locationSuccessMsg, setLocationSuccessMsg] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Payment method (1: ABA, 2: Bakong KHQR, 3: KB)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('aba');

  // Payment proof screenshot state
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [screenshotFileName, setScreenshotFileName] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleCopyText = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    triggerHaptic('light');
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Geolocation Handler
  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported on this browser/device.');
      return;
    }

    setIsLocating(true);
    setLocationError(null);
    triggerHaptic('medium');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setLatitude(lat);
        setLongitude(lng);
        setIsLocating(false);
        triggerHaptic('success');
        setLocationSuccessMsg(`GPS Pin captured: ${lat.toFixed(5)}, ${lng.toFixed(5)}`);

        // Update address field with GPS tag
        const gpsTag = `[GPS Pin: ${lat.toFixed(5)}, ${lng.toFixed(5)}]`;
        if (!detailedAddress.trim()) {
          setDetailedAddress(`Current Location ${gpsTag}`);
        } else if (!detailedAddress.includes('GPS Pin:')) {
          setDetailedAddress(`${detailedAddress} ${gpsTag}`);
        }
      },
      (error) => {
        setIsLocating(false);
        let msg = 'Unable to retrieve your current location.';
        if (error.code === error.PERMISSION_DENIED) {
          msg = 'Location access was denied. Please allow location access in your device settings.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          msg = 'Location signal unavailable. Please ensure GPS is enabled.';
        } else if (error.code === error.TIMEOUT) {
          msg = 'Location request timed out. Please try again.';
        }
        setLocationError(msg);
        triggerHaptic('error');
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 10000 }
    );
  };

  // File upload handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please select a valid image file (PNG, JPG, or WEBP)');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage('Image size exceeds 10MB limit');
      return;
    }

    setErrorMessage(null);
    setScreenshotFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      setScreenshotPreview(event.target?.result as string);
      triggerHaptic('light');
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setScreenshotPreview(null);
    setScreenshotFileName(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    triggerHaptic('light');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Form validations
    if (!fullName.trim()) {
      setErrorMessage('Please enter your full name');
      return;
    }

    if (!phoneNumber.trim() || phoneNumber.length < 8) {
      setErrorMessage('Please provide a valid phone number for order/delivery confirmation');
      return;
    }

    if (deliveryMethodId !== 'pickup' && !detailedAddress.trim()) {
      setErrorMessage('Please enter your destination street address or location for courier delivery');
      return;
    }

    // Require screenshot proof for transfer
    if (!screenshotPreview) {
      setErrorMessage(t.checkout.paymentProofRequiredWarning);
      return;
    }

    try {
      setIsSubmitting(true);
      triggerHaptic('medium');

      const createdOrder = await apiService.submitOrder({
        customer: {
          fullName: fullName.trim(),
          phoneNumber: phoneNumber.trim(),
          provinceOrCity: deliveryMethodId === 'pickup' ? 'Phnom Penh (Store Pickup)' : provinceOrCity,
          detailedAddress: detailedAddress.trim() || `${pickupConfig.name} - ${pickupConfig.subtitle}`,
          orderNotes: orderNotes.trim(),
          telegramUsername: user?.username ? `@${user.username}` : undefined,
          latitude: latitude || undefined,
          longitude: longitude || undefined,
          googleMapsUrl:
            latitude && longitude
              ? `https://www.google.com/maps?q=${latitude},${longitude}`
              : undefined,
        },
        items,
        subtotal,
        deliveryFee: activeDeliveryFee,
        deliveryMethod: `${activeDeliveryConfig.name} (${activeDeliveryConfig.subtitle})`,
        totalAmount: calculatedTotal,
        paymentMethod,
        paymentProofUrl: screenshotPreview || undefined,
        paymentProofFileName: screenshotFileName || undefined,
        telegramUserId: user ? String(user.id) : undefined,
      });

      // Clear the cart on successful submission
      clearCart();
      triggerHaptic('success');
      onOrderSuccess(createdOrder);
    } catch (err: any) {
      setErrorMessage(err.message || 'Unable to submit order. Please try again.');
      triggerHaptic('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-5 pb-32">
      {/* Top Bar */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 rounded-xl bg-white border border-slate-200 text-navy-900 hover:bg-slate-50 transition-colors shadow-xs active:scale-95 focus:outline-none"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-lg font-black text-navy-900">{t.checkout.title}</h1>
          <p className="text-xs text-slate-500">{t.checkout.subtitle}</p>
        </div>
      </div>

      {errorMessage && (
        <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-start gap-2 animate-in fade-in">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Step 1: Delivery Method (3 Choices: Pick Up, VET, J&T EXPRESS) */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-subtle space-y-3.5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-navy-900 uppercase tracking-wide flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-navy-900 text-white text-[10px] flex items-center justify-center font-bold">
                1
              </span>
              <span>Delivery Method</span>
            </h2>
            <span className="text-[11px] text-slate-500 font-semibold">3 Choices Available</span>
          </div>

          <div className="space-y-2.5">
            {/* 1. Pick Up */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setDeliveryMethodId('pickup');
              }}
              className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-center gap-3 ${
                deliveryMethodId === 'pickup'
                  ? 'border-sky-400 bg-sky-50/40 ring-2 ring-sky-200/70 shadow-sm'
                  : 'border-slate-200/90 bg-white hover:border-slate-300 hover:bg-slate-50/50'
              }`}
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-12 h-12 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-500 shrink-0 shadow-xs">
                  <Store className="w-6 h-6 stroke-[1.8]" />
                </div>
                <div className="min-w-0">
                  <div className="font-extrabold text-navy-900 text-sm sm:text-base leading-tight">
                    {pickupConfig.name}
                  </div>
                  <div className="text-xs text-slate-500 font-medium truncate mt-0.5">
                    {pickupConfig.subtitle}
                  </div>
                </div>
              </div>
            </button>

            {/* 2. VET */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setDeliveryMethodId('vet');
              }}
              className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-center gap-3 ${
                deliveryMethodId === 'vet'
                  ? 'border-sky-400 bg-sky-50/40 ring-2 ring-sky-200/70 shadow-sm'
                  : 'border-slate-200/90 bg-white hover:border-slate-300 hover:bg-slate-50/50'
              }`}
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-12 h-12 rounded-xl bg-[#E85D04] text-white flex flex-col items-center justify-center shrink-0 shadow-xs p-1">
                  <div className="border border-white/90 rounded px-1 text-[11px] font-black tracking-wider leading-tight">
                    VET
                  </div>
                  <div className="w-7 h-[2px] bg-white/90 mt-0.5 rounded-full" />
                </div>
                <div className="min-w-0">
                  <div className="font-extrabold text-navy-900 text-sm sm:text-base leading-tight">
                    {vetConfig.name}
                  </div>
                  <div className="text-xs text-slate-600 font-medium truncate mt-0.5">
                    {vetConfig.subtitle}
                  </div>
                </div>
              </div>
            </button>

            {/* 3. J&T EXPRESS */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setDeliveryMethodId('jnt');
              }}
              className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-center gap-3 ${
                deliveryMethodId === 'jnt'
                  ? 'border-sky-400 bg-sky-50/40 ring-2 ring-sky-200/70 shadow-sm'
                  : 'border-slate-200/90 bg-white hover:border-slate-300 hover:bg-slate-50/50'
              }`}
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-12 h-12 rounded-xl bg-[#E60012] text-white flex flex-col items-center justify-center shrink-0 shadow-xs p-1">
                  <span className="font-black italic text-xs tracking-tighter leading-none">J&T</span>
                  <span className="text-[7.5px] font-extrabold tracking-widest uppercase scale-90 leading-tight">EXPRESS</span>
                </div>
                <div className="min-w-0">
                  <div className="font-extrabold text-navy-900 text-sm sm:text-base leading-tight">
                    {jntConfig.name}
                  </div>
                  <div className="text-xs text-slate-500 font-medium truncate mt-0.5">
                    {jntConfig.subtitle}
                  </div>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Step 2: Customer Information Card */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-subtle space-y-4">
          <h2 className="text-sm font-bold text-navy-900 uppercase tracking-wide flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-full bg-navy-900 text-white text-[10px] flex items-center justify-center font-bold">
              2
            </span>
            <span>{t.checkout.customerInfo}</span>
          </h2>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-navy-900 mb-1">
                {t.checkout.fullName} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={t.checkout.fullNamePlaceholder}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-navy-900 focus:outline-none focus:border-brand-500 focus:bg-white transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-navy-900 mb-1">
                {t.checkout.phoneNumber} <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                required
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder={t.checkout.phoneNumberPlaceholder}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-navy-900 focus:outline-none focus:border-brand-500 focus:bg-white transition-all font-mono"
              />
            </div>

            {deliveryMethodId === 'pickup' ? (
              <div className="p-3.5 rounded-2xl bg-sky-50 border border-sky-200/80 text-sky-900 text-xs flex items-start gap-2.5">
                <Store className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-navy-900">{pickupConfig.name}: {pickupConfig.subtitle}</div>
                  <div className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                    Store pickup selected. Please provide your contact phone above so our branch staff can notify you when your hardware order is prepared.
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-bold text-navy-900 mb-1">
                    {t.checkout.deliveryLocation} <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={provinceOrCity}
                    onChange={(e) => setProvinceOrCity(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-navy-900 focus:outline-none focus:border-brand-500 focus:bg-white transition-all"
                  >
                    {CAMBODIA_PROVINCES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>

            {/* Detailed Address with GPS Location Helper */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-navy-900">
                  {t.checkout.detailedAddress} <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={handleGetCurrentLocation}
                  disabled={isLocating}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100 px-2 py-1 rounded-lg transition-colors focus:outline-none"
                >
                  <Navigation className={`w-3 h-3 ${isLocating ? 'animate-spin' : ''}`} />
                  <span>{isLocating ? 'Detecting GPS...' : '📍 Use Current Location'}</span>
                </button>
              </div>

              <input
                type="text"
                required
                value={detailedAddress}
                onChange={(e) => setDetailedAddress(e.target.value)}
                placeholder={t.checkout.detailedAddressPlaceholder}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-navy-900 focus:outline-none focus:border-brand-500 focus:bg-white transition-all"
              />

              {/* GPS Confirmation Pill */}
              {latitude && longitude && (
                <div className="mt-2 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] flex items-center justify-between animate-in fade-in">
                  <div className="flex items-center gap-1.5 truncate">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="font-mono truncate">
                      GPS: {latitude.toFixed(5)}, {longitude.toFixed(5)}
                    </span>
                  </div>
                  <a
                    href={`https://www.google.com/maps?q=${latitude},${longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold underline text-brand-700 flex items-center gap-1 shrink-0 ml-2"
                  >
                    <span>Check Map</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}

              {locationError && (
                <p className="mt-1.5 text-[11px] text-red-600 font-medium">{locationError}</p>
              )}
            </div>
            </>
            )}

            <div>
              <label className="block text-xs font-bold text-navy-900 mb-1">
                {t.checkout.orderNotes}
              </label>
              <textarea
                rows={2}
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                placeholder={t.checkout.orderNotesPlaceholder}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-navy-900 focus:outline-none focus:border-brand-500 focus:bg-white transition-all"
              />
            </div>
          </div>
        </div>

        {/* Step 3: Payment Method Selection */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-subtle space-y-4">
          <h2 className="text-sm font-bold text-navy-900 uppercase tracking-wide flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-full bg-navy-900 text-white text-[10px] flex items-center justify-center font-bold">
              3
            </span>
            <span>{t.checkout.paymentMethod}</span>
          </h2>

          <div className="space-y-2.5">
            {/* Method 1: ABA */}
            <label
              className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                paymentMethod === 'aba'
                  ? 'border-brand-500 bg-brand-50/50 shadow-xs'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <input
                type="radio"
                name="paymentMethod"
                checked={paymentMethod === 'aba'}
                onChange={() => setPaymentMethod('aba')}
                className="mt-1 text-brand-600 focus:ring-brand-500"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm text-navy-900">
                  <CreditCard className="w-4 h-4 text-cyan-600 shrink-0" />
                  <span>1: ABA (ABA Bank)</span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Transfer via ABA Mobile app or scan ABA QR code
                </p>
              </div>
            </label>

            {/* Method 2: Bakong KHQR */}
            <label
              className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                paymentMethod === 'bakong_khqr'
                  ? 'border-brand-500 bg-brand-50/50 shadow-xs'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <input
                type="radio"
                name="paymentMethod"
                checked={paymentMethod === 'bakong_khqr'}
                onChange={() => setPaymentMethod('bakong_khqr')}
                className="mt-1 text-brand-600 focus:ring-brand-500"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm text-navy-900">
                  <QrCode className="w-4 h-4 text-red-600 shrink-0" />
                  <span>2: Bakong KHQR</span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Scan standard KHQR with any Cambodia banking app
                </p>
              </div>
            </label>

            {/* Method 3: KB (KB PRASAC Bank) */}
            <label
              className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                paymentMethod === 'kb'
                  ? 'border-brand-500 bg-brand-50/50 shadow-xs'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <input
                type="radio"
                name="paymentMethod"
                checked={paymentMethod === 'kb'}
                onChange={() => setPaymentMethod('kb')}
                className="mt-1 text-brand-600 focus:ring-brand-500"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm text-navy-900">
                  <Building2 className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>3: KB (KB PRASAC Bank)</span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Transfer via KB PRASAC / KB Mobile app or scan QR
                </p>
              </div>
            </label>
          </div>

          {/* Dynamic Payment Details & QR Display Card */}
          {(() => {
            const currentMethod =
              paymentMethod === 'aba'
                ? {
                    key: 'aba',
                    name: settings.paymentMethods?.aba?.bankName || 'ABA Bank',
                    accountName: settings.paymentMethods?.aba?.accountName || 'INFO POS HARDWARE (USD)',
                    accountNumber: settings.paymentMethods?.aba?.accountNumber || '001 888 999 (USD)',
                    qrUrl: settings.paymentMethods?.aba?.qrImageUrl,
                    instructions: settings.paymentMethods?.aba?.instructions || 'Scan with ABA Mobile or transfer to account number',
                    badgeColor: 'bg-[#005f82] text-white',
                    cardBorder: 'border-[#005f82]/30',
                  }
                : paymentMethod === 'bakong_khqr'
                ? {
                    key: 'bakong',
                    name: settings.paymentMethods?.bakong?.bankName || 'Bakong KHQR',
                    accountName: settings.paymentMethods?.bakong?.accountName || 'INFO POS HARDWARE (USD)',
                    accountNumber: settings.paymentMethods?.bakong?.accountNumber || 'infopos@bk',
                    qrUrl: settings.paymentMethods?.bakong?.qrImageUrl,
                    instructions: settings.paymentMethods?.bakong?.instructions || 'Scan with any Bakong-enabled app in Cambodia',
                    badgeColor: 'bg-red-600 text-white',
                    cardBorder: 'border-red-300',
                  }
                : {
                    key: 'kb',
                    name: settings.paymentMethods?.kb?.bankName || 'KB PRASAC Bank',
                    accountName: settings.paymentMethods?.kb?.accountName || 'INFO POS HARDWARE (USD)',
                    accountNumber: settings.paymentMethods?.kb?.accountNumber || '100 234 567 890 (USD)',
                    qrUrl: settings.paymentMethods?.kb?.qrImageUrl,
                    instructions: settings.paymentMethods?.kb?.instructions || 'Transfer via KB PRASAC / KB Mobile app or scan QR',
                    badgeColor: 'bg-amber-600 text-white',
                    cardBorder: 'border-amber-300',
                  };

            return (
              <div className={`p-4 rounded-2xl bg-white border-2 ${currentMethod.cardBorder} shadow-sm space-y-3 animate-in fade-in`}>
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black ${currentMethod.badgeColor}`}>
                      {currentMethod.name}
                    </span>
                    <span className="text-xs font-bold text-navy-900 truncate">
                      {currentMethod.accountName}
                    </span>
                  </div>
                  <span className="text-xs font-black text-brand-700 font-mono">
                    {formatUSD(totalAmount)}
                  </span>
                </div>

                {/* QR Code Container */}
                <div className="flex flex-col items-center justify-center p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                  {currentMethod.qrUrl ? (
                    <div className="w-44 h-44 rounded-xl overflow-hidden bg-white p-2 border border-slate-200 shadow-xs flex items-center justify-center">
                      <img
                        src={currentMethod.qrUrl}
                        alt={`${currentMethod.name} QR Code`}
                        className="w-full h-full object-contain"
                      />
                    </div>
                  ) : (
                    <div className="w-40 h-40 bg-navy-900 rounded-xl p-3 flex flex-col items-center justify-center text-white shadow-xs">
                      <QrCode className="w-24 h-24 text-white" />
                      <span className="text-[10px] font-bold mt-1 text-slate-300 uppercase">
                        {currentMethod.name}
                      </span>
                    </div>
                  )}

                  <div className="mt-2.5 flex items-center justify-center gap-2">
                    <span className="text-xs font-mono font-bold text-navy-900 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                      {currentMethod.accountNumber}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyText(currentMethod.accountNumber, currentMethod.key)}
                      className="px-2 py-1 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 text-[10px] font-bold flex items-center gap-1 transition-colors"
                      title="Copy account number"
                    >
                      {copiedField === currentMethod.key ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span className="text-emerald-700 font-bold">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>

                  <p className="text-[11px] text-slate-500 mt-1.5 font-medium">
                    {currentMethod.instructions}
                  </p>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Step 3: Payment Proof Upload Section */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-subtle space-y-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold text-navy-900 uppercase tracking-wide flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-navy-900 text-white text-[10px] flex items-center justify-center font-bold">
                    3
                  </span>
                  <span>{t.checkout.paymentProofSection}</span>
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  {t.checkout.paymentProofSubtitle}
                </p>
              </div>

              {/* Status pill showing Pending Verification */}
              <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold flex items-center gap-1 shrink-0">
                <Clock className="w-3 h-3 text-amber-600" />
                <span>{t.common.pending}</span>
              </span>
            </div>

            {/* Hidden native input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />

            {/* Upload Box / Image Preview */}
            {!screenshotPreview ? (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-8 px-4 rounded-2xl border-2 border-dashed border-slate-300 hover:border-brand-500 bg-slate-50 hover:bg-brand-50/20 text-center transition-all focus:outline-none flex flex-col items-center justify-center group"
              >
                <div className="w-12 h-12 rounded-2xl bg-white text-slate-400 group-hover:text-brand-600 flex items-center justify-center shadow-xs mb-2 transition-colors">
                  <Upload className="w-6 h-6 stroke-[1.8px]" />
                </div>
                <span className="text-xs font-bold text-navy-900 group-hover:text-brand-600 transition-colors">
                  {t.checkout.uploadPrompt}
                </span>
                <span className="text-[11px] text-slate-400 mt-1">
                  {t.checkout.uploadSupport}
                </span>
              </button>
            ) : (
              <div className="rounded-2xl border border-slate-200 overflow-hidden bg-slate-50 p-3 space-y-3">
                <div className="relative aspect-[3/2] w-full rounded-xl bg-slate-900 overflow-hidden flex items-center justify-center">
                  <img
                    src={screenshotPreview}
                    alt="Payment Screenshot Preview"
                    className="max-h-full max-w-full object-contain"
                  />
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-navy-900/80 backdrop-blur-xs text-white text-[10px] font-mono">
                    {screenshotFileName || 'payment_receipt.png'}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1 focus:outline-none"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>{t.checkout.replaceImage}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="text-xs font-bold text-red-500 hover:text-red-600 flex items-center gap-1 focus:outline-none"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{t.checkout.removeImage}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Crucial Verification Notice Requirement */}
            <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200/80 text-amber-800 text-[11px] flex items-start gap-2">
              <Info className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
              <p className="leading-snug">{t.checkout.paymentVerificationNotice}</p>
            </div>
          </div>

        {/* Step 4: Final Order Summary Review */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-subtle space-y-3">
          <h2 className="text-sm font-bold text-navy-900 uppercase tracking-wide">
            {t.cart.orderSummary} ({items.length} {items.length === 1 ? 'item' : 'items'})
          </h2>

          <div className="space-y-1.5 divide-y divide-slate-100 max-h-48 overflow-y-auto">
            {items.map(({ product, quantity }) => (
              <div key={product.id} className="pt-1.5 flex items-center justify-between text-xs">
                <span className="text-slate-700 truncate pr-2">
                  {quantity}x {product.name[language] || product.name.en}
                </span>
                <span className="font-semibold text-navy-900 shrink-0">
                  {formatUSD(product.price * quantity)}
                </span>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-slate-100 space-y-1 text-xs">
            <div className="flex justify-between text-slate-500">
              <span>{t.common.subtotal}</span>
              <span>{formatUSD(subtotal)}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span className="flex items-center gap-1">
                <span>{t.common.deliveryFee}</span>
                <span className="text-[10px] text-slate-400">({activeDeliveryConfig.name})</span>
              </span>
              <span className={activeDeliveryFee === 0 ? "text-emerald-600 font-semibold" : "text-navy-900 font-bold font-mono"}>
                {activeDeliveryFee === 0 ? '$0.00' : formatUSD(activeDeliveryFee)}
              </span>
            </div>
            <div className="flex justify-between text-sm font-black text-navy-900 pt-1 border-t border-slate-100">
              <span>{t.common.total}</span>
              <span className="text-base text-brand-700">{formatUSD(calculatedTotal)}</span>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-3 py-3.5 px-4 rounded-xl bg-navy-900 hover:bg-navy-800 disabled:bg-slate-400 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 focus:outline-none"
          >
            {isSubmitting ? (
              <span>{t.checkout.submitting}</span>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>{t.checkout.submitOrder}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
