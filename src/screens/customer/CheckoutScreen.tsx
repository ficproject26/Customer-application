import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  StatusBar,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Icons from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCartStore, isCartableCategory } from '../../store/cartStore';
import { useOrderStore, Order } from '../../store/orderStore';
import { useToastStore } from '../../store/toastStore';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import { useTranslation } from '../../store/languageStore';
import { useNotificationStore } from '../../store/notificationStore';

export interface PromoCode {
  code: string;
  description: string;
  discountType: 'percent' | 'flat' | 'freeship';
  value: number;
  maxDiscount?: number;
  minOrder?: number;
}

export const AVAILABLE_PROMO_CODES: PromoCode[] = [
  {
    code: 'CONNECT10',
    description: '10% OFF up to ₹500 on all orders',
    discountType: 'percent',
    value: 10,
    maxDiscount: 500,
    minOrder: 300,
  },
  {
    code: 'WELCOME200',
    description: 'Flat ₹200 OFF on your order',
    discountType: 'flat',
    value: 200,
    minOrder: 500,
  },
  {
    code: 'FESTIVE15',
    description: '15% OFF up to ₹1,000 on festive items',
    discountType: 'percent',
    value: 15,
    maxDiscount: 1000,
    minOrder: 1000,
  },
  {
    code: 'FREESHIP',
    description: 'Free Express Delivery on all orders',
    discountType: 'freeship',
    value: 40,
    minOrder: 0,
  },
];
import { useAuthGuardStore } from '../../store/authGuardStore';
import { apiFetch } from '../../services/api';
import RazorpayModal, { RazorpayOrderDetails } from '../../components/RazorpayModal';
import { prepareRazorpayOrder, verifyRazorpayPayment } from '../../services/razorpayService';

const ADDRESSES_STORAGE_KEY = 'connect_app_customer_addresses';

export interface CustomerAddress {
  id: string;
  userId: string;
  label: 'Home' | 'Work' | 'Other';
  name: string;
  phone: string;
  house: string;
  street: string;
  landmark?: string;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
}

const DEFAULT_SAVED_ADDRESSES: CustomerAddress[] = [];

const parsePrice = (priceVal: any): number => {
  if (typeof priceVal === 'number') return priceVal;
  if (!priceVal) return 0;
  const str = String(priceVal);
  const match = str.match(/[\d,]+(?:\.\d+)?/);
  if (!match) return 0;
  const cleaned = match[0].replace(/,/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : Math.round(num);
};

const formatAddressSummary = (addr: CustomerAddress): string => {
  if (!addr) return 'Home Address';
  const parts = [addr.house, addr.street, addr.city, addr.pincode].filter(Boolean);
  return `${addr.label || 'Home'} — ${parts.join(', ')}`;
};

export default function CheckoutScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const route = useRoute();
  const showToast = useToastStore((state) => state.showToast);
  const currentUser = useAuthStore((state) => state.currentUser);
  const colors = useThemeStore((state) => state.colors);
  const isDark = useThemeStore((state) => state.isDark);
  const isLight = !isDark;

  const cartItems = useCartStore((state) => state.cartItems);
  const addToCart = useCartStore((state) => state.addToCart);
  const setCartItems = useCartStore((state) => state.setCartItems);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeFromCart = useCartStore((state) => state.removeFromCart);
  const clearCart = useCartStore((state) => state.clearCart);
  const loadAllOrders = useOrderStore((state) => state.loadAllOrders);

  // Razorpay Test Mode State
  const [razorpayModalVisible, setRazorpayModalVisible] = useState(false);
  const [razorpayOrder, setRazorpayOrder] = useState<RazorpayOrderDetails | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

const EMPTY_GUEST_ADDRESS: CustomerAddress = {
  id: 'guest_addr',
  userId: 'guest_user',
  label: 'Home',
  name: 'Guest User',
  phone: '',
  house: '',
  street: '',
  city: 'Bengaluru',
  state: 'Karnataka',
  pincode: '',
  isDefault: true,
};

  // Address Selector & Management State
  const [savedAddresses, setSavedAddresses] = useState<CustomerAddress[]>(DEFAULT_SAVED_ADDRESSES);
  const [selectedAddressObj, setSelectedAddressObj] = useState<CustomerAddress>(EMPTY_GUEST_ADDRESS);
  const [tempSelectedAddressId, setTempSelectedAddressId] = useState<string>(EMPTY_GUEST_ADDRESS.id);
  const [addressSelectorVisible, setAddressSelectorVisible] = useState(false);
  
  // Add / Edit Address Form State
  const [addressFormVisible, setAddressFormVisible] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [formLabel, setFormLabel] = useState<'Home' | 'Work' | 'Other'>('Home');
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formHouse, setFormHouse] = useState('');
  const [formStreet, setFormStreet] = useState('');
  const [formLandmark, setFormLandmark] = useState('');
  const [formCity, setFormCity] = useState('');
  const [formState, setFormState] = useState('');
  const [formPincode, setFormPincode] = useState('');
  const [formIsDefault, setFormIsDefault] = useState(false);
  const [isSubmittingAddress, setIsSubmittingAddress] = useState(false);

  // Helper to persist addresses
  const persistAddresses = async (list: CustomerAddress[]) => {
    try {
      const isGuestMode = !currentUser || currentUser.isGuest || (currentUser.name || '').toLowerCase().includes('guest');
      const uId = currentUser?.id || 'guest_user';
      const storageKey = isGuestMode ? 'connect_guest_addresses' : `connect_user_addresses_${uId}`;
      await AsyncStorage.setItem(storageKey, JSON.stringify(list));
    } catch (e) {
      console.warn('[CheckoutScreen] Failed to persist addresses:', e);
    }
  };

  // Load Saved Addresses from AsyncStorage
  const loadSavedAddresses = useCallback(async () => {
    const isGuestMode = !currentUser || currentUser.isGuest || (currentUser.name || '').toLowerCase().includes('guest');
    const uId = currentUser?.id || 'guest_user';
    const storageKey = isGuestMode ? 'connect_guest_addresses' : `connect_user_addresses_${uId}`;

    let hasLocal = false;
    try {
      const saved = await AsyncStorage.getItem(storageKey);
      if (saved) {
        const parsed: CustomerAddress[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          hasLocal = true;
          setSavedAddresses(parsed);
          const def = parsed.find((a) => a.isDefault) || parsed[0];
          setSelectedAddressObj(def);
          setTempSelectedAddressId(def.id);
        }
      }
    } catch (e) {
      console.warn('Failed to load saved addresses:', e);
    }

    if (isGuestMode) {
      if (!hasLocal) {
        setSavedAddresses([]);
        setSelectedAddressObj(EMPTY_GUEST_ADDRESS);
        setTempSelectedAddressId(EMPTY_GUEST_ADDRESS.id);
      }
      return;
    }

    if (!hasLocal && currentUser?.address) {
      const regAddr: CustomerAddress = {
        id: `addr_reg_${currentUser.id}`,
        userId: currentUser.id,
        label: 'Home',
        name: currentUser.name,
        phone: currentUser.phone || '',
        house: currentUser.address.house || currentUser.address.address || '',
        street: currentUser.address.street || currentUser.address.city || 'Bengaluru',
        city: currentUser.address.city || 'Bengaluru',
        state: currentUser.address.state || 'Karnataka',
        pincode: currentUser.address.pincode || '560034',
        isDefault: true,
      };
      setSavedAddresses([regAddr]);
      setSelectedAddressObj(regAddr);
      setTempSelectedAddressId(regAddr.id);
      persistAddresses([regAddr]);
      hasLocal = true;
    } else if (!hasLocal) {
      setSavedAddresses([]);
      setSelectedAddressObj(EMPTY_GUEST_ADDRESS);
      setTempSelectedAddressId(EMPTY_GUEST_ADDRESS.id);
    }

    // Fetch from backend asynchronously without overwriting existing local addresses
    try {
      const res = await apiFetch(`/customer/addresses?userId=${encodeURIComponent(uId)}`);
      if (res && res.status === 'success' && Array.isArray(res.data) && res.data.length > 0) {
        if (!hasLocal) {
          setSavedAddresses(res.data);
          const defaultAddr = res.data.find((a: CustomerAddress) => a.isDefault) || res.data[0];
          setSelectedAddressObj(defaultAddr);
          setTempSelectedAddressId(defaultAddr.id);
          persistAddresses(res.data);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch customer addresses from server:', err);
    }
  }, [currentUser]);

  useFocusEffect(
    useCallback(() => {
      loadSavedAddresses();
    }, [loadSavedAddresses])
  );

  // Sync route params (direct item or custom item lists) into cartStore
  useEffect(() => {
    const params = (route.params as any) || {};
    const directItem = params.item;
    const paramItems = params.items || params.cartItems;

    if (directItem && (directItem.name || directItem.title)) {
      if (isCartableCategory(directItem.category, directItem.name || directItem.title)) {
        const qty = directItem.quantity || params.quantity || 1;
        const priceStr = typeof directItem.price === 'number' ? `₹${directItem.price}` : String(directItem.price || '₹499');
        const origPrice = directItem.originalPrice || directItem.mrp;
        setCartItems([
          {
            id: directItem.id || `direct_${Date.now()}`,
            name: directItem.name || directItem.title,
            price: priceStr,
            originalPrice: origPrice,
            mrp: origPrice,
            category: directItem.category || 'Product',
            quantity: qty,
            image: directItem.image || directItem.img || 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=400&auto=format&fit=crop&q=80',
          },
        ]);
      }
    } else if (Array.isArray(paramItems) && paramItems.length > 0) {
      const validItems = paramItems
        .filter((pi: any) => pi && (pi.name || pi.title) && isCartableCategory(pi.category, pi.name || pi.title))
        .map((pi: any) => ({
          id: pi.id || `item_${Math.random()}`,
          name: pi.name || pi.title,
          price: typeof pi.price === 'number' ? `₹${pi.price}` : String(pi.price || '₹499'),
          originalPrice: pi.originalPrice || pi.mrp,
          mrp: pi.mrp || pi.originalPrice,
          category: pi.category || 'Product',
          quantity: pi.quantity || 1,
          image: pi.image || pi.img || 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=400&auto=format&fit=crop&q=80',
        }));
      setCartItems(validItems);
    }
  }, [route.params, setCartItems]);

  const [selectedPayment, setSelectedPayment] = useState('UPI');

  // Promo Code State
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<PromoCode | null>(null);

  const totalQtyCount = cartItems.reduce((acc, i) => acc + (i.quantity || 1), 0);

  const subtotal = cartItems.reduce((acc, i) => {
    const p = parsePrice(i.price);
    return acc + (p * (i.quantity || 1));
  }, 0);

  const totalOriginalPrice = cartItems.reduce((acc, i) => {
    const orig = parsePrice(i.originalPrice || i.mrp);
    const p = parsePrice(i.price);
    const effectiveOrig = orig && orig >= p ? orig : p;
    return acc + (effectiveOrig * (i.quantity || 1));
  }, 0);

  const isMember = Boolean(
    currentUser?.membership &&
    (currentUser.membership as string) !== 'Free' &&
    (currentUser.membership as string) !== 'Regular'
  );
  const memberDiscount = isMember && subtotal > 0 ? Math.round(subtotal * 0.05) : 0;

  const promoDiscount = useMemo(() => {
    if (!appliedPromo) return 0;
    if (appliedPromo.discountType === 'percent') {
      const calc = Math.round((subtotal * appliedPromo.value) / 100);
      return appliedPromo.maxDiscount ? Math.min(calc, appliedPromo.maxDiscount) : calc;
    }
    if (appliedPromo.discountType === 'flat') {
      return Math.min(subtotal, appliedPromo.value);
    }
    return 0;
  }, [appliedPromo, subtotal]);

  const deliveryFee = (appliedPromo?.discountType === 'freeship' || subtotal > 1000 || subtotal === 0) ? 0 : 40;
  const totalDiscount = memberDiscount + promoDiscount;
  const discount = totalDiscount;
  const totalAmount = Math.max(0, subtotal - totalDiscount + deliveryFee);

  const handleApplyPromo = (codeToApply?: string) => {
    const targetCode = (codeToApply || promoCodeInput).trim().toUpperCase();
    if (!targetCode) {
      showToast('Please enter a promo code');
      return;
    }

    const found = AVAILABLE_PROMO_CODES.find((p) => p.code === targetCode);
    if (!found) {
      showToast(`Invalid code "${targetCode}". Try CONNECT10 or WELCOME200`);
      return;
    }

    if (found.minOrder && subtotal < found.minOrder) {
      showToast(`Minimum order for ${found.code} is ₹${found.minOrder}`);
      return;
    }

    setAppliedPromo(found);
    setPromoCodeInput(found.code);
    showToast(`Promo code ${found.code} applied! 🎉`);
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoCodeInput('');
    showToast('Promo code removed');
  };

  const handleDecrement = (id: string, currentQty: number) => {
    if (currentQty <= 1) {
      removeFromCart(id);
      showToast('Item removed from checkout');
    } else {
      updateQuantity(id, currentQty - 1);
    }
  };

  const handleIncrement = (id: string, currentQty: number) => {
    updateQuantity(id, currentQty + 1);
  };

  // Open Address Selection Sheet
  const handleOpenAddressSelector = () => {
    setTempSelectedAddressId(selectedAddressObj?.id || savedAddresses[0]?.id || '');
    setAddressSelectorVisible(true);
  };

  // Confirm Address Selection
  const handleConfirmAddressSelection = () => {
    const chosen = savedAddresses.find((a) => a.id === tempSelectedAddressId);
    if (chosen) {
      setSelectedAddressObj(chosen);
      showToast(`Delivering to ${chosen.label} (${chosen.name})`);

      const isGuestMode = !currentUser || currentUser.isGuest || (currentUser.name || '').toLowerCase().includes('guest');
      if (!isGuestMode) {
        useAuthStore.getState().updateProfile({
          address: {
            address: `${chosen.house ? chosen.house + ', ' : ''}${chosen.street}`,
            city: chosen.city,
            state: chosen.state,
            pincode: chosen.pincode,
          },
        }).catch(() => {});
      }
    }
    setAddressSelectorVisible(false);
  };

  // Open Form to Add New Address
  const handleOpenAddAddressForm = () => {
    setEditingAddressId(null);
    setFormLabel('Home');
    setFormName(currentUser?.name || '');
    setFormPhone(currentUser?.phone || '');
    setFormHouse('');
    setFormStreet('');
    setFormLandmark('');
    setFormCity('Bengaluru');
    setFormState('Karnataka');
    setFormPincode('560034');
    setFormIsDefault(savedAddresses.length === 0);
    setAddressFormVisible(true);
  };

  // Open Form to Edit Existing Address
  const handleOpenEditAddressForm = (addr: CustomerAddress) => {
    setEditingAddressId(addr.id);
    setFormLabel(addr.label);
    setFormName(addr.name);
    setFormPhone(addr.phone);
    setFormHouse(addr.house);
    setFormStreet(addr.street);
    setFormLandmark(addr.landmark || '');
    setFormCity(addr.city);
    setFormState(addr.state);
    setFormPincode(addr.pincode);
    setFormIsDefault(addr.isDefault);
    setAddressFormVisible(true);
  };

  // Delete Address
  const handleDeleteAddress = (addrId: string) => {
    Alert.alert(
      'Delete Address',
      'Are you sure you want to remove this delivery address?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const updated = savedAddresses.filter((a) => a.id !== addrId);
            setSavedAddresses(updated);
            await persistAddresses(updated);

            if (selectedAddressObj?.id === addrId) {
              const fallback = updated[0] || EMPTY_GUEST_ADDRESS;
              setSelectedAddressObj(fallback);
              setTempSelectedAddressId(fallback.id);
            }

            // Sync backend
            try {
              const uId = currentUser?.id || 'guest_user';
              apiFetch(`/customer/addresses/${addrId}?userId=${encodeURIComponent(uId)}`, {
                method: 'DELETE',
              }).catch(() => {});
            } catch {}
            showToast('Address removed');
          },
        },
      ]
    );
  };

  // Save Address (Add or Edit)
  const handleSaveAddress = async () => {
    if (!formName.trim()) {
      Alert.alert('Validation Error', 'Please enter recipient full name.');
      return;
    }
    if (!formPhone.trim() || formPhone.trim().length < 10) {
      Alert.alert('Validation Error', 'Please enter a valid 10-digit mobile number.');
      return;
    }
    if (!formHouse.trim()) {
      Alert.alert('Validation Error', 'Please enter house/flat/building details.');
      return;
    }
    if (!formStreet.trim()) {
      Alert.alert('Validation Error', 'Please enter street/area/locality.');
      return;
    }
    if (!formCity.trim()) {
      Alert.alert('Validation Error', 'Please enter city.');
      return;
    }
    if (!formState.trim()) {
      Alert.alert('Validation Error', 'Please enter state.');
      return;
    }
    if (!formPincode.trim() || !/^\d{6}$/.test(formPincode.trim())) {
      Alert.alert('Validation Error', 'Please enter a valid 6-digit PIN code.');
      return;
    }

    setIsSubmittingAddress(true);
    const uId = currentUser?.id || 'guest_user';
    const payload: CustomerAddress = {
      id: editingAddressId || `addr_${Date.now()}`,
      userId: uId,
      label: formLabel,
      name: formName.trim(),
      phone: formPhone.trim(),
      house: formHouse.trim(),
      street: formStreet.trim(),
      landmark: formLandmark.trim(),
      city: formCity.trim(),
      state: formState.trim(),
      pincode: formPincode.trim(),
      isDefault: formIsDefault || savedAddresses.length === 0,
    };

    let updatedList: CustomerAddress[];
    if (editingAddressId) {
      updatedList = savedAddresses.map((a) => {
        if (a.id === editingAddressId) {
          return payload;
        }
        if (payload.isDefault) {
          return { ...a, isDefault: false };
        }
        return a;
      });
    } else {
      updatedList = payload.isDefault
        ? [payload, ...savedAddresses.map((a) => ({ ...a, isDefault: false }))]
        : [...savedAddresses, payload];
    }

    setSavedAddresses(updatedList);
    setSelectedAddressObj(payload);
    setTempSelectedAddressId(payload.id);
    await persistAddresses(updatedList);

    // Sync active user address globally in authStore if default or single address
    if (payload.isDefault || updatedList.length === 1) {
      useAuthStore.getState().updateProfile({
        address: {
          address: `${payload.house ? payload.house + ', ' : ''}${payload.street}`,
          city: payload.city,
          state: payload.state,
          pincode: payload.pincode,
        },
      });
    }

    // Sync backend
    try {
      apiFetch('/customer/addresses', {
        method: editingAddressId ? 'PUT' : 'POST',
        body: payload,
      }).catch(() => {});
    } catch {}

    setIsSubmittingAddress(false);
    setAddressFormVisible(false);
    showToast(editingAddressId ? 'Address updated' : 'New address saved');
  };

  const handlePlaceOrder = () => {
    if (!selectedAddressObj || !selectedAddressObj.street) {
      Alert.alert('Delivery Address Required', 'Please select or add a delivery address to place your order.');
      return;
    }

    const formattedAddress = formatAddressSummary(selectedAddressObj);
    const orderId = `ORD-${Date.now().toString().slice(-6)}`;

    const orderItems = [...cartItems];

    const resolvedOrderCategory =
      cartItems.find((i) => i.category && i.category.toLowerCase().includes('daily'))?.category ||
      cartItems.find((i) => i.category && i.category !== 'Products')?.category ||
      cartItems[0]?.category ||
      'Daily Needs';

    if (selectedPayment === 'COD') {
      const formattedItems = cartItems.map((i) => {
        const itemPrice = parsePrice(i.price);
        const itemOrig = parsePrice(i.originalPrice || i.mrp) || itemPrice;
        return {
          name: i.name,
          quantity: i.quantity || 1,
          price: itemPrice,
          originalPrice: itemOrig,
          mrp: itemOrig,
          category: i.category || resolvedOrderCategory,
          image: i.image || '',
        };
      });

      const newOrder: Order = {
        id: orderId,
        order_number: orderId,
        vendor_id: (cartItems[0] as any)?.vendorId || 'v1',
        vendor_name: (cartItems[0] as any)?.vendorName || 'Connect Store',
        category: resolvedOrderCategory as any,
        order_type: 'order',
        customer_name: currentUser?.name || 'Guest User',
        customer_phone: currentUser?.phone || '',
        customer_address: formattedAddress,
        customer_latitude: 12.9716,
        customer_longitude: 77.6412,
        product_details: cartItems.map((i) => `${i.name} (x${i.quantity})`).join(', '),
        items: formattedItems,
        item_count: totalQtyCount,
        listing_price: totalOriginalPrice,
        original_amount: totalOriginalPrice,
        mrp_amount: totalOriginalPrice,
        selling_price: subtotal,
        platform_fee: 10,
        coupon_code: appliedPromo?.code || '',
        coupon_discount: promoDiscount || 0,
        member_discount: memberDiscount || 0,
        delivery_fee: deliveryFee,
        discount: discount,
        amount: totalAmount,
        finalAmount: totalAmount,
        status: 'Order Received',
        payment_method: 'Cash on Delivery (COD)',
        payment_status: 'Pending',
        created_at: new Date().toISOString(),
        image: cartItems[0]?.image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500',
      };

      // 1. Instantly record order in local store
      useOrderStore.getState().addLocalOrder(newOrder);

      // Notification Center Dispatch
      useNotificationStore.getState().addNotification({
        title: 'Order Placed Successfully! 🛍️',
        body: `Your order #${orderId} (${cartItems[0]?.name || 'Items'}${cartItems.length > 1 ? ` +${cartItems.length - 1} more` : ''}) has been placed. Payment via Cash on Delivery.`,
        icon: 'Package',
        category: 'order',
        actionLabel: 'View Order',
        actionType: 'order',
        orderType: 'order',
        orderId: orderId,
        targetScreen: 'Orders',
        targetParams: { activeTab: 'my orders', category: resolvedOrderCategory, orderId },
      });

      // 2. Clear cart and notify
      clearCart();
      showToast('Order Placed Successfully! 🎉');

      // 3. Navigate to Confirmation Screen
      navigation.navigate('BookingConfirmation', {
        bookingId: orderId,
        items: orderItems,
        totalAmount,
        paymentMethod: 'Cash on Delivery (COD)',
        address: formattedAddress,
        type: 'product',
      });

      // 4. Background DB persistence
      apiFetch('/orders', {
        method: 'POST',
        body: {
          id: orderId,
          order_number: orderId,
          vendor_id: (cartItems[0] as any)?.vendorId || 'v1',
          customer_name: currentUser?.name || 'Guest User',
          memberName: currentUser?.name || 'Guest User',
          customer_phone: currentUser?.phone || '',
          customerPhone: currentUser?.phone || '',
          customer_address: formattedAddress,
          customerAddress: formattedAddress,
          customer_latitude: 12.9716,
          customer_longitude: 77.6412,
          product_details: cartItems.map((i) => `${i.name} (x${i.quantity})`).join(', '),
          items: formattedItems,
          image: cartItems[0]?.image || '',
          listing_price: totalOriginalPrice,
          original_amount: totalOriginalPrice,
          mrp_amount: totalOriginalPrice,
          selling_price: subtotal,
          platform_fee: 10,
          coupon_code: appliedPromo?.code || '',
          coupon_discount: promoDiscount || 0,
          member_discount: memberDiscount || 0,
          delivery_fee: deliveryFee,
          discount: discount,
          finalAmount: totalAmount,
          amount: totalAmount,
          order_type: 'order',
          type: 'Order',
          category: resolvedOrderCategory,
          status: 'Pending',
          payment_method: 'Cash on Delivery (COD)',
          payment_status: 'Pending',
        },
      }).catch((err) => console.warn('Background COD order sync notice:', err));

      return;
    }

    // Razorpay Online Payment Flow (UPI / Card / NetBanking)
    prepareRazorpayOrder({
      amount: totalAmount,
      planType: 'checkout',
      planName: `Checkout Order (${totalQtyCount} item${totalQtyCount > 1 ? 's' : ''})`,
      priceText: `₹${totalAmount.toLocaleString('en-IN')}`,
      userId: currentUser?.id || 'guest_user',
      onOrderReady: (ord) => {
        setRazorpayOrder(ord);
        setRazorpayModalVisible(true);
      },
    });
  };

  const handleRazorpaySuccess = async (paymentResult: {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  }) => {
    setRazorpayModalVisible(false);
    setIsProcessingPayment(true);

    const formattedAddress = formatAddressSummary(selectedAddressObj);
    const confirmedOrderId = paymentResult.razorpay_order_id || `ORD-${Date.now().toString().slice(-6)}`;

    const resolvedOrderCategory =
      cartItems.find((i) => {
        const c = (i.category || '').toLowerCase();
        return c.includes('daily') || c.includes('grocery');
      })?.category ||
      (cartItems.some((i) => {
        const n = (i.name || '').toLowerCase();
        return /\b(milk|lays|curd|bread|eggs?|butter|chips|paneer|biscuit|biscuits|tea|coffee|atta|rice|dal|sugar|oil)\b/i.test(n);
      }) ? 'Daily Needs' : null) ||
      cartItems.find((i) => i.category && i.category !== 'Products')?.category ||
      cartItems[0]?.category ||
      'Products';

    const formattedItems = cartItems.map((i) => {
      const itemPrice = parsePrice(i.price);
      const itemOrig = parsePrice(i.originalPrice || i.mrp) || itemPrice;
      return {
        name: i.name,
        quantity: i.quantity || 1,
        price: itemPrice,
        originalPrice: itemOrig,
        mrp: itemOrig,
        category: i.category || resolvedOrderCategory,
        image: i.image || '',
      };
    });

    const newOrder: Order = {
      id: confirmedOrderId,
      order_number: confirmedOrderId,
      vendor_id: (cartItems[0] as any)?.vendorId || 'v1',
      vendor_name: (cartItems[0] as any)?.vendorName || 'Connect Store',
      category: resolvedOrderCategory as any,
      order_type: 'order',
      customer_name: currentUser?.name || 'Guest User',
      customer_phone: currentUser?.phone || '',
      customer_address: formattedAddress,
      customer_latitude: 12.9716,
      customer_longitude: 77.6412,
      product_details: cartItems.map((i) => `${i.name} (x${i.quantity})`).join(', '),
      items: formattedItems,
      item_count: totalQtyCount,
      listing_price: totalOriginalPrice,
      original_amount: totalOriginalPrice,
      mrp_amount: totalOriginalPrice,
      selling_price: subtotal,
      platform_fee: 10,
      coupon_code: appliedPromo?.code || '',
      coupon_discount: promoDiscount || 0,
      member_discount: memberDiscount || 0,
      delivery_fee: deliveryFee,
      discount: discount,
      amount: totalAmount,
      finalAmount: totalAmount,
      status: 'Order Received',
      payment_method: `Razorpay (${selectedPayment})`,
      payment_status: 'Paid',
      created_at: new Date().toISOString(),
      image: cartItems[0]?.image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500',
    };

    // 1. Instantly record in local store
    useOrderStore.getState().addLocalOrder(newOrder);

    // Notification Center Dispatch
    useNotificationStore.getState().addNotification({
      title: 'Payment Complete & Order Placed! 🛍️',
      body: `Payment of ₹${totalAmount.toLocaleString('en-IN')} verified. Order #${confirmedOrderId} (${cartItems[0]?.name || 'Items'}${cartItems.length > 1 ? ` +${cartItems.length - 1} more` : ''}) is confirmed and being prepared!`,
      icon: 'PackageCheck',
      category: 'order',
      actionLabel: 'View Order',
      actionType: 'order',
      orderType: 'order',
      orderId: confirmedOrderId,
      targetScreen: 'Orders',
      targetParams: { activeTab: 'my orders', category: resolvedOrderCategory, orderId: confirmedOrderId },
    });

    const orderItems = [...cartItems];
    clearCart();
    showToast('Payment Verified & Order Placed! 🎉');

    // 2. Navigate immediately to confirmation
    navigation.navigate('BookingConfirmation', {
      bookingId: confirmedOrderId,
      items: orderItems,
      totalAmount,
      paymentMethod: `Razorpay (${selectedPayment})`,
      address: formattedAddress,
      type: 'product',
    });

    try {
      // 3. Persistent backend order creation for Vendor notification & DB storage
      await apiFetch('/orders', {
        method: 'POST',
        body: {
          id: confirmedOrderId,
          order_number: confirmedOrderId,
          vendor_id: (cartItems[0] as any)?.vendorId || 'v1',
          customer_name: currentUser?.name || 'Customer User',
          memberName: currentUser?.name || 'Customer User',
          customer_phone: currentUser?.phone || '',
          customerPhone: currentUser?.phone || '',
          customer_address: formattedAddress,
          customerAddress: formattedAddress,
          customer_latitude: 12.9716,
          customer_longitude: 77.6412,
          product_details: orderItems.map((i) => `${i.name} (x${i.quantity || 1})`).join(', '),
          items: formattedItems,
          image: (orderItems[0] as any)?.image || '',
          listing_price: totalOriginalPrice,
          original_amount: totalOriginalPrice,
          mrp_amount: totalOriginalPrice,
          selling_price: subtotal,
          platform_fee: 10,
          coupon_code: appliedPromo?.code || '',
          coupon_discount: promoDiscount || 0,
          member_discount: memberDiscount || 0,
          delivery_fee: deliveryFee,
          discount: discount,
          finalAmount: totalAmount,
          amount: totalAmount,
          order_type: 'order',
          type: 'Order',
          category: resolvedOrderCategory,
          status: 'Pending',
          payment_method: `Razorpay (${selectedPayment})`,
          payment_status: 'Paid',
          razorpay_payment_id: paymentResult.razorpay_payment_id,
          razorpay_order_id: paymentResult.razorpay_order_id,
        },
      });

      // 4. Background server-side verification logging
      apiFetch('/razorpay/verify-payment', {
        method: 'POST',
        body: {
          ...paymentResult,
          planType: 'checkout',
          userId: currentUser?.id || 'guest_user',
          items: orderItems,
          totalAmount,
          address: formattedAddress,
        },
      }).catch((err) => console.warn('Background Razorpay checkout verify notice:', err));
    } finally {
      setIsProcessingPayment(false);
      setRazorpayOrder(null);
    }
  };

  const handleRazorpayCancel = () => {
    setRazorpayModalVisible(false);
    setRazorpayOrder(null);
    showToast('Payment Cancelled');
  };

  const getAddressIcon = (label: string) => {
    switch (label) {
      case 'Work':
        return <Icons.Briefcase color={isLight ? '#172033' : '#F4C400'} size={16} />;
      case 'Other':
        return <Icons.MapPin color={isLight ? '#172033' : '#F4C400'} size={16} />;
      default:
        return <Icons.Home color={isLight ? '#172033' : '#F4C400'} size={16} />;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.headerBackground} />
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top, height: 56 + insets.top, backgroundColor: colors.headerBackground, borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()}>
          <Icons.ChevronLeft color={colors.text} size={22} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('Checkout')}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 110, padding: 16 }} showsVerticalScrollIndicator={false}>
        {/* Delivery Address Card */}
        <Text style={[styles.sectionHeading, { color: colors.textSecondary }]}>{t('Delivery Address')}</Text>
        <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder }]}>
          <View style={styles.cardRow}>
            <View style={[styles.iconCircle, { backgroundColor: isLight ? '#F3F4F6' : '#1E293B' }]}>
              {getAddressIcon(selectedAddressObj?.label || 'Home')}
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>{t('deliver_to')} ({selectedAddressObj?.label || 'Home'})</Text>
                {selectedAddressObj?.isDefault && (
                  <View style={styles.defaultTagPill}>
                    <Text style={styles.defaultTagText}>Default</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.recipientHeader, { color: colors.text }]}>
                {selectedAddressObj?.name || 'User'} {selectedAddressObj?.phone ? `• ${selectedAddressObj.phone}` : ''}
              </Text>
              <Text style={[styles.cardSub, { color: colors.textSecondary }]}>
                {selectedAddressObj?.house ? `${selectedAddressObj.house}, ` : ''}
                {selectedAddressObj?.street || 'Select delivery address'}
                {selectedAddressObj?.landmark ? `, Near ${selectedAddressObj.landmark}` : ''}
                {'\n'}
                {selectedAddressObj?.city || 'Bengaluru'}, {selectedAddressObj?.state || 'Karnataka'} - {selectedAddressObj?.pincode || '560034'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.changeBtnTouch}
              activeOpacity={0.7}
              onPress={handleOpenAddressSelector}
            >
              <Text style={styles.changeBtn}>Change</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Order Items Summary */}
        <Text style={[styles.sectionHeading, { color: colors.textSecondary }]}>ORDER ITEMS ({totalQtyCount})</Text>
        {cartItems.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder }]}>
            <Icons.ShoppingBag color={colors.textSecondary} size={40} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Your cart is empty</Text>
            <Text style={[styles.emptySub, { color: colors.textSecondary }]}>Add products or services to proceed with checkout.</Text>
            <TouchableOpacity style={styles.browseBtn} onPress={() => navigation.navigate('Home')}>
              <Text style={styles.browseBtnText}>Browse Products & Services</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder }]}>
            {cartItems.map((item, idx) => {
              const itemUnitPrice = parsePrice(item.price);
              const itemTotal = itemUnitPrice * (item.quantity || 1);
              const fallbackImage = 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=400&auto=format&fit=crop&q=80';
              const itemImg = item.image || fallbackImage;

              return (
                <View key={item.id || idx} style={[styles.itemRow, { borderBottomColor: colors.border }, idx === cartItems.length - 1 && { borderBottomWidth: 0 }]}>
                  <Image source={{ uri: itemImg }} style={[styles.itemImg, { backgroundColor: isLight ? '#F3F4F6' : '#1E293B' }]} />
                  <View style={styles.itemInfo}>
                    <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
                    <Text style={[styles.itemCategory, { color: colors.textSecondary }]}>{item.category || 'Product'}</Text>
                    {(item.vehicleNumber || (item as any).vehicleRegNo || (item as any).busNumber) ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2, marginBottom: 2 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isLight ? '#FEF3C7' : 'rgba(245, 158, 11, 0.15)', paddingHorizontal: 5, paddingVertical: 1.5, borderRadius: 5, borderWidth: 1, borderColor: isLight ? '#FDE68A' : 'rgba(245, 158, 11, 0.3)' }}>
                          <Icons.ShieldCheck size={9} color="#D97706" style={{ marginRight: 3 }} />
                          <Text style={{ fontSize: 9.5, fontWeight: '800', color: isLight ? '#92400E' : '#FCD34D' }}>
                            Reg: {item.vehicleNumber || (item as any).vehicleRegNo || (item as any).busNumber}
                          </Text>
                        </View>
                      </View>
                    ) : null}
                    <Text style={[styles.itemUnitPrice, { color: colors.textSecondary }]}>₹{itemUnitPrice.toLocaleString('en-IN')} each</Text>
                  </View>

                  <View style={styles.qtyCol}>
                    <View style={[styles.qtyBox, { borderColor: colors.border, backgroundColor: isLight ? '#F8FAFC' : '#1E293B' }]}>
                      <TouchableOpacity style={styles.qtyBtn} onPress={() => handleDecrement(item.id, item.quantity || 1)}>
                        <Icons.Minus color={colors.text} size={13} />
                      </TouchableOpacity>
                      <Text style={[styles.qtyText, { color: colors.text }]}>{item.quantity || 1}</Text>
                      <TouchableOpacity style={styles.qtyBtn} onPress={() => handleIncrement(item.id, item.quantity || 1)}>
                        <Icons.Plus color={colors.text} size={13} />
                      </TouchableOpacity>
                    </View>
                    <Text style={[styles.itemTotal, { color: colors.text }]}>₹{itemTotal.toLocaleString('en-IN')}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Offers & Promo Code Section */}
        <Text style={[styles.sectionHeading, { color: colors.textSecondary }]}>OFFERS & PROMO CODE</Text>
        <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder }]}>
          {appliedPromo ? (
            <View style={[styles.appliedPromoCard, { backgroundColor: isLight ? '#F0FDF4' : 'rgba(22, 163, 74, 0.12)', borderColor: isLight ? '#BBF7D0' : 'rgba(22, 163, 74, 0.3)' }]}>
              <View style={styles.appliedPromoLeft}>
                <Icons.Tag color="#16A34A" size={18} />
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={[styles.appliedCodeText, { color: isLight ? '#15803D' : '#4ADE80' }]}>{appliedPromo.code}</Text>
                    <View style={styles.appliedBadge}>
                      <Text style={styles.appliedBadgeText}>APPLIED</Text>
                    </View>
                  </View>
                  <Text style={[styles.appliedDescText, { color: colors.textSecondary }]}>
                    {appliedPromo.description}
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={handleRemovePromo} style={styles.removePromoBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Icons.X color="#EF4444" size={18} />
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              <View style={[styles.promoInputRow, { borderColor: colors.border, backgroundColor: isLight ? '#F8FAFC' : '#1E293B' }]}>
                <Icons.Tag color={colors.textSecondary} size={16} style={{ marginLeft: 10 }} />
                <TextInput
                  style={[styles.promoTextInput, { color: colors.text }]}
                  placeholder="Enter Promo Code (e.g. CONNECT10)"
                  placeholderTextColor={colors.textSecondary}
                  value={promoCodeInput}
                  onChangeText={(txt) => setPromoCodeInput(txt.toUpperCase())}
                  autoCapitalize="characters"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  style={[styles.applyPromoBtn, !promoCodeInput.trim() && { opacity: 0.5 }]}
                  onPress={() => handleApplyPromo()}
                  disabled={!promoCodeInput.trim()}
                >
                  <Text style={styles.applyPromoBtnText}>APPLY</Text>
                </TouchableOpacity>
              </View>

              {/* Available Coupons Chips */}
              <Text style={[styles.availableCouponsLabel, { color: colors.textSecondary }]}>AVAILABLE COUPONS</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                {AVAILABLE_PROMO_CODES.map((promo) => (
                  <TouchableOpacity
                    key={promo.code}
                    style={[styles.couponChip, { borderColor: isLight ? '#FCD34D' : '#F5B800', backgroundColor: isLight ? '#FEFCE8' : 'rgba(245, 184, 0, 0.12)' }]}
                    activeOpacity={0.8}
                    onPress={() => handleApplyPromo(promo.code)}
                  >
                    <Icons.Ticket color="#D97706" size={13} />
                    <Text style={styles.couponChipCode}>{promo.code}</Text>
                    <Text style={[styles.couponChipAction, { color: colors.primary }]}>Apply</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        {/* Payment Method Selection */}
        <Text style={[styles.sectionHeading, { color: colors.textSecondary }]}>Payment Method</Text>
        <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder }]}>
          {[
            { id: 'UPI', label: 'Google Pay / PhonePe / BHIM UPI', icon: 'Smartphone' },
            { id: 'CARD', label: 'Credit / Debit Card', icon: 'CreditCard' },
            { id: 'NETBANKING', label: 'Net Banking', icon: 'Building' },
            { id: 'COD', label: 'Cash on Delivery', icon: 'Banknote' },
          ].map((pm) => {
            const IconComp = (Icons as any)[pm.icon] || (Icons as any)[`${pm.icon}2`] || Icons.CreditCard;
            const isSelected = selectedPayment === pm.id;
            return (
              <TouchableOpacity
                key={pm.id}
                style={[
                  styles.pmRow,
                  { borderColor: colors.border },
                  isSelected && { backgroundColor: isLight ? 'rgba(244, 196, 0, 0.12)' : 'rgba(244, 196, 0, 0.18)' },
                ]}
                onPress={() => setSelectedPayment(pm.id)}
              >
                <IconComp color={isSelected ? (isLight ? '#172033' : '#F4C400') : colors.textSecondary} size={18} />
                <Text style={[styles.pmText, { color: colors.textSecondary }, isSelected && { color: colors.text, fontWeight: 'bold' }]}>
                  {pm.label}
                </Text>
                <View style={[styles.radio, { borderColor: colors.border }, isSelected && styles.radioActive]}>
                  {isSelected && <View style={styles.radioDot} />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Price Summary */}
        <Text style={[styles.sectionHeading, { color: colors.textSecondary }]}>Price Summary</Text>
        <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder }]}>
          <View style={styles.billRow}>
            <Text style={[styles.billLabel, { color: colors.textSecondary }]}>Item Subtotal</Text>
            <Text style={[styles.billVal, { color: colors.text }]}>₹{subtotal.toLocaleString('en-IN')}</Text>
          </View>
          <View style={styles.billRow}>
            <Text style={[styles.billLabel, { color: colors.textSecondary }]}>Member Discount</Text>
            <Text style={[styles.billVal, { color: '#16A34A' }]}>-₹{memberDiscount.toLocaleString('en-IN')}</Text>
          </View>
          {appliedPromo && promoDiscount > 0 && (
            <View style={styles.billRow}>
              <Text style={[styles.billLabel, { color: colors.textSecondary }]}>Promo Code ({appliedPromo.code})</Text>
              <Text style={[styles.billVal, { color: '#16A34A' }]}>-₹{promoDiscount.toLocaleString('en-IN')}</Text>
            </View>
          )}
          {appliedPromo?.discountType === 'freeship' && (
            <View style={styles.billRow}>
              <Text style={[styles.billLabel, { color: colors.textSecondary }]}>Promo Discount (FREESHIP)</Text>
              <Text style={[styles.billVal, { color: '#16A34A' }]}>Free Delivery</Text>
            </View>
          )}
          <View style={styles.billRow}>
            <Text style={[styles.billLabel, { color: colors.textSecondary }]}>Delivery Fee</Text>
            <Text style={[styles.billVal, { color: colors.text }]}>{deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}</Text>
          </View>
          <View style={[styles.billRow, styles.totalRow, { borderTopColor: colors.border }]}>
            <Text style={[styles.totalLabel, { color: colors.text }]}>Total Payable</Text>
            <Text style={[styles.totalVal, { color: isLight ? '#0F172A' : '#F4C400' }]}>₹{totalAmount.toLocaleString('en-IN')}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Sticky Action Bar */}
      <View style={[styles.bottomBar, { backgroundColor: colors.headerBackground, borderTopColor: colors.border, paddingBottom: Math.max(insets.bottom, 12) }]}>
        <View style={styles.priceSummary}>
          <Text style={[styles.bottomTotalLabel, { color: colors.textSecondary }]}>Total Amount</Text>
          <Text style={[styles.bottomTotalVal, { color: isLight ? '#0F172A' : '#F4C400' }]}>₹{totalAmount.toLocaleString('en-IN')}</Text>
        </View>
        <TouchableOpacity
          style={[styles.placeOrderBtn, (cartItems.length === 0 || isProcessingPayment) && { opacity: 0.5 }]}
          activeOpacity={0.85}
          onPress={handlePlaceOrder}
          disabled={cartItems.length === 0 || isProcessingPayment}
        >
          {isProcessingPayment ? (
            <ActivityIndicator color="#0F172A" size="small" />
          ) : (
            <Text style={styles.placeOrderText}>Place Order →</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Address Selection Bottom Sheet Modal */}
      <Modal
        visible={addressSelectorVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setAddressSelectorVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setAddressSelectorVisible(false)}
          />
          <View style={[styles.bottomSheetContainer, { backgroundColor: colors.cardBackground, paddingBottom: Math.max(insets.bottom, 16) }]}>
            {/* Sheet Handle */}
            <View style={styles.sheetHandleContainer}>
              <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
            </View>

            {/* Sheet Header */}
            <View style={styles.sheetHeader}>
              <View>
                <Text style={[styles.sheetTitle, { color: colors.text }]}>Select Delivery Address</Text>
                <Text style={[styles.sheetSubtitle, { color: colors.textSecondary }]}>Choose where you want your order delivered</Text>
              </View>
              <TouchableOpacity
                style={[styles.sheetCloseBtn, { backgroundColor: isLight ? '#F1F5F9' : '#1E293B' }]}
                onPress={() => setAddressSelectorVisible(false)}
              >
                <Icons.X color={colors.text} size={18} />
              </TouchableOpacity>
            </View>

            {/* Address List */}
            <ScrollView style={styles.addressListScroll} showsVerticalScrollIndicator={false}>
              {savedAddresses.map((addr) => {
                const isSelected = tempSelectedAddressId === addr.id;
                return (
                  <TouchableOpacity
                    key={addr.id}
                    style={[
                      styles.addressCardOption,
                      { borderColor: colors.border, backgroundColor: isLight ? '#F8FAFC' : '#1E293B' },
                      isSelected && { borderColor: '#F4C400', backgroundColor: isLight ? 'rgba(244, 196, 0, 0.08)' : 'rgba(244, 196, 0, 0.15)' },
                    ]}
                    activeOpacity={0.8}
                    onPress={() => setTempSelectedAddressId(addr.id)}
                  >
                    <View style={styles.addressOptionHeader}>
                      <View style={styles.addressOptionLeft}>
                        <View style={[styles.radio, { borderColor: colors.border }, isSelected && styles.radioActive]}>
                          {isSelected && <View style={styles.radioDot} />}
                        </View>
                        <View style={[styles.labelBadge, { backgroundColor: isLight ? '#E2E8F0' : '#334155' }]}>
                          {getAddressIcon(addr.label)}
                          <Text style={[styles.labelBadgeText, { color: colors.text }]}>{addr.label}</Text>
                        </View>
                        {addr.isDefault && (
                          <View style={styles.defaultBadge}>
                            <Text style={styles.defaultBadgeText}>Default</Text>
                          </View>
                        )}
                      </View>

                      {/* Actions: Edit & Delete */}
                      <View style={styles.addressActionButtons}>
                        <TouchableOpacity
                          style={styles.iconActionBtn}
                          onPress={() => handleOpenEditAddressForm(addr)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Icons.Edit2 color={colors.textSecondary} size={15} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.iconActionBtn}
                          onPress={() => handleDeleteAddress(addr.id)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Icons.Trash2 color="#EF4444" size={15} />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Address Body */}
                    <View style={styles.addressDetailsContainer}>
                      <Text style={[styles.addressRecipient, { color: colors.text }]}>
                        {addr.name} <Text style={{ color: colors.textSecondary, fontWeight: 'normal' }}>({addr.phone})</Text>
                      </Text>
                      <Text style={[styles.addressTextFull, { color: colors.textSecondary }]}>
                        {addr.house ? `${addr.house}, ` : ''}
                        {addr.street}
                        {addr.landmark ? `, Near ${addr.landmark}` : ''}
                        {'\n'}
                        {addr.city}, {addr.state} - <Text style={{ fontWeight: 'bold', color: colors.text }}>{addr.pincode}</Text>
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}

              {/* Add New Address Button */}
              <TouchableOpacity
                style={[styles.addNewAddressBtn, { borderColor: '#F4C400', backgroundColor: isLight ? '#FFFDF0' : 'rgba(244, 196, 0, 0.08)' }]}
                activeOpacity={0.7}
                onPress={handleOpenAddAddressForm}
              >
                <Icons.PlusCircle color="#F4C400" size={18} />
                <Text style={styles.addNewAddressText}>+ Add New Address</Text>
              </TouchableOpacity>
            </ScrollView>

            {/* Bottom Actions */}
            <View style={[styles.sheetFooter, { borderTopColor: colors.border }]}>
              <TouchableOpacity
                style={styles.confirmAddressBtn}
                activeOpacity={0.85}
                onPress={handleConfirmAddressSelection}
              >
                <Text style={styles.confirmAddressBtnText}>Use This Address</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add / Edit Address Form Modal */}
      <Modal
        visible={addressFormVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setAddressFormVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setAddressFormVisible(false)}
          />
          <View style={[styles.formSheetContainer, { backgroundColor: colors.cardBackground, paddingBottom: Math.max(insets.bottom, 16) }]}>
            {/* Sheet Handle */}
            <View style={styles.sheetHandleContainer}>
              <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
            </View>

            {/* Form Header */}
            <View style={styles.sheetHeader}>
              <View>
                <Text style={[styles.sheetTitle, { color: colors.text }]}>
                  {editingAddressId ? 'Edit Address' : 'Add New Address'}
                </Text>
                <Text style={[styles.sheetSubtitle, { color: colors.textSecondary }]}>
                  Enter delivery and contact details
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.sheetCloseBtn, { backgroundColor: isLight ? '#F1F5F9' : '#1E293B' }]}
                onPress={() => setAddressFormVisible(false)}
              >
                <Icons.X color={colors.text} size={18} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formScrollView} showsVerticalScrollIndicator={false}>
              {/* Address Type Selector */}
              <Text style={[styles.formFieldLabel, { color: colors.textSecondary }]}>ADDRESS TYPE</Text>
              <View style={styles.typeRow}>
                {(['Home', 'Work', 'Other'] as const).map((type) => {
                  const isSelected = formLabel === type;
                  return (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.typePill,
                        { borderColor: colors.border, backgroundColor: isLight ? '#F8FAFC' : '#1E293B' },
                        isSelected && { borderColor: '#F4C400', backgroundColor: '#F4C400' },
                      ]}
                      onPress={() => setFormLabel(type)}
                    >
                      {type === 'Home' && <Icons.Home color={isSelected ? '#0F172A' : colors.textSecondary} size={15} />}
                      {type === 'Work' && <Icons.Briefcase color={isSelected ? '#0F172A' : colors.textSecondary} size={15} />}
                      {type === 'Other' && <Icons.MapPin color={isSelected ? '#0F172A' : colors.textSecondary} size={15} />}
                      <Text style={[styles.typePillText, { color: colors.text }, isSelected && { color: '#0F172A', fontWeight: 'bold' }]}>
                        {type}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Name & Phone */}
              <View style={styles.formRow}>
                <View style={styles.formCol}>
                  <Text style={[styles.formFieldLabel, { color: colors.textSecondary }]}>CONTACT NAME *</Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: isLight ? '#F8FAFC' : '#1E293B', color: colors.text, borderColor: colors.border }]}
                    placeholder="Full Name"
                    placeholderTextColor={colors.textSecondary}
                    value={formName}
                    onChangeText={setFormName}
                  />
                </View>
                <View style={styles.formCol}>
                  <Text style={[styles.formFieldLabel, { color: colors.textSecondary }]}>PHONE NUMBER *</Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: isLight ? '#F8FAFC' : '#1E293B', color: colors.text, borderColor: colors.border }]}
                    placeholder="10-digit mobile"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="phone-pad"
                    value={formPhone}
                    onChangeText={setFormPhone}
                  />
                </View>
              </View>

              {/* House / Flat */}
              <Text style={[styles.formFieldLabel, { color: colors.textSecondary }]}>FLAT / HOUSE NO. / BUILDING *</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: isLight ? '#F8FAFC' : '#1E293B', color: colors.text, borderColor: colors.border }]}
                placeholder="e.g. Flat 301, Tower B, Lotus Apartments"
                placeholderTextColor={colors.textSecondary}
                value={formHouse}
                onChangeText={setFormHouse}
              />

              {/* Street / Area */}
              <Text style={[styles.formFieldLabel, { color: colors.textSecondary }]}>STREET / AREA / LOCALITY *</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: isLight ? '#F8FAFC' : '#1E293B', color: colors.text, borderColor: colors.border }]}
                placeholder="e.g. 5th Main, Koramangala 4th Block"
                placeholderTextColor={colors.textSecondary}
                value={formStreet}
                onChangeText={setFormStreet}
              />

              {/* Landmark */}
              <Text style={[styles.formFieldLabel, { color: colors.textSecondary }]}>LANDMARK (OPTIONAL)</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: isLight ? '#F8FAFC' : '#1E293B', color: colors.text, borderColor: colors.border }]}
                placeholder="e.g. Near Sony World Signal / Opposite Metro"
                placeholderTextColor={colors.textSecondary}
                value={formLandmark}
                onChangeText={setFormLandmark}
              />

              {/* City & State & Pincode */}
              <View style={styles.formRow}>
                <View style={[styles.formCol, { flex: 1.2 }]}>
                  <Text style={[styles.formFieldLabel, { color: colors.textSecondary }]}>CITY *</Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: isLight ? '#F8FAFC' : '#1E293B', color: colors.text, borderColor: colors.border }]}
                    placeholder="City"
                    placeholderTextColor={colors.textSecondary}
                    value={formCity}
                    onChangeText={setFormCity}
                  />
                </View>
                <View style={[styles.formCol, { flex: 1.2 }]}>
                  <Text style={[styles.formFieldLabel, { color: colors.textSecondary }]}>STATE *</Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: isLight ? '#F8FAFC' : '#1E293B', color: colors.text, borderColor: colors.border }]}
                    placeholder="State"
                    placeholderTextColor={colors.textSecondary}
                    value={formState}
                    onChangeText={setFormState}
                  />
                </View>
                <View style={[styles.formCol, { flex: 1 }]}>
                  <Text style={[styles.formFieldLabel, { color: colors.textSecondary }]}>PINCODE *</Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: isLight ? '#F8FAFC' : '#1E293B', color: colors.text, borderColor: colors.border }]}
                    placeholder="6 digits"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="number-pad"
                    maxLength={6}
                    value={formPincode}
                    onChangeText={setFormPincode}
                  />
                </View>
              </View>

              {/* Default Address Checkbox */}
              <TouchableOpacity
                style={styles.defaultCheckRow}
                activeOpacity={0.8}
                onPress={() => setFormIsDefault(!formIsDefault)}
              >
                <View style={[styles.checkbox, { borderColor: colors.border }, formIsDefault && styles.checkboxActive]}>
                  {formIsDefault && <Icons.Check color="#0F172A" size={12} />}
                </View>
                <Text style={[styles.defaultCheckText, { color: colors.text }]}>Make this my default delivery address</Text>
              </TouchableOpacity>
            </ScrollView>

            {/* Save Button */}
            <View style={[styles.sheetFooter, { borderTopColor: colors.border }]}>
              <TouchableOpacity
                style={[styles.confirmAddressBtn, isSubmittingAddress && { opacity: 0.6 }]}
                activeOpacity={0.85}
                onPress={handleSaveAddress}
                disabled={isSubmittingAddress}
              >
                {isSubmittingAddress ? (
                  <ActivityIndicator color="#0F172A" size="small" />
                ) : (
                  <Text style={styles.confirmAddressBtnText}>
                    {editingAddressId ? 'Save & Update Address' : 'Save & Deliver Here'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Razorpay Test Mode Checkout Modal */}
      <RazorpayModal
        visible={razorpayModalVisible}
        orderData={razorpayOrder}
        userInfo={{
          name: currentUser?.name || 'Guest User',
          email: currentUser?.email || 'guest@connectapp.com',
          phone: currentUser?.phone || '',
        }}
        merchantName="Forge India Connect"
        onSuccess={handleRazorpaySuccess}
        onCancel={handleRazorpayCancel}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  headerBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: 'bold' },
  sectionHeading: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 14, marginBottom: 8 },
  card: { borderWidth: 1, borderRadius: 16, padding: 14, marginBottom: 4 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconCircle: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 11, fontWeight: '600' },
  recipientHeader: { fontSize: 13, fontWeight: 'bold', marginTop: 2 },
  cardSub: { fontSize: 12, marginTop: 2, lineHeight: 16 },
  changeBtnTouch: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, backgroundColor: 'rgba(244, 196, 0, 0.12)' },
  changeBtn: { fontSize: 12, fontWeight: 'bold', color: '#D97706' },
  defaultTagPill: { backgroundColor: '#10B981', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 },
  defaultTagText: { color: '#FFFFFF', fontSize: 9, fontWeight: 'bold' },
  emptyCard: { borderWidth: 1, borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 4 },
  emptyTitle: { fontSize: 16, fontWeight: 'bold', marginTop: 12 },
  emptySub: { fontSize: 12, textAlign: 'center', marginTop: 4, marginBottom: 16 },
  browseBtn: { backgroundColor: '#F4C400', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 20 },
  browseBtnText: { color: '#0F172A', fontSize: 12, fontWeight: 'bold' },
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1 },
  itemImg: { width: 48, height: 48, borderRadius: 8 },
  itemInfo: { flex: 1, marginLeft: 12, paddingRight: 8 },
  itemName: { fontSize: 13, fontWeight: 'bold' },
  itemCategory: { fontSize: 11, marginTop: 1 },
  itemUnitPrice: { fontSize: 11.5, marginTop: 2 },
  qtyCol: { alignItems: 'flex-end', gap: 6 },
  qtyBox: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  qtyBtn: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  qtyText: { fontSize: 13, fontWeight: 'bold', minWidth: 16, textAlign: 'center' },
  itemTotal: { fontSize: 13, fontWeight: 'bold' },
  pmRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 10, borderRadius: 10, gap: 10, marginBottom: 4 },
  pmText: { flex: 1, fontSize: 12.5 },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  radioActive: { borderColor: '#F4C400', backgroundColor: '#F4C400' },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#0F172A' },
  billRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  billLabel: { fontSize: 12.5 },
  billVal: { fontSize: 12.5, fontWeight: 'bold' },
  totalRow: { borderTopWidth: 1, paddingTop: 8, marginTop: 4 },
  totalLabel: { fontSize: 14, fontWeight: 'bold' },
  totalVal: { fontSize: 18, fontWeight: '900' },
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0, borderTopWidth: 1, paddingHorizontal: 16, paddingTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', elevation: 10
  },
  priceSummary: { flex: 1 },
  bottomTotalLabel: { fontSize: 10 },
  bottomTotalVal: { fontSize: 18, fontWeight: '900' },
  placeOrderBtn: { backgroundColor: '#F4C400', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12 },
  placeOrderText: { color: '#0F172A', fontSize: 13, fontWeight: 'bold' },

  // Bottom Sheet Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  bottomSheetContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '82%',
    paddingTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 20,
  },
  formSheetContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 20,
  },
  sheetHandleContainer: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  sheetHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: 'bold',
  },
  sheetSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  sheetCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressListScroll: {
    paddingHorizontal: 16,
    maxHeight: 380,
  },
  addressCardOption: {
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  addressOptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  addressOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  labelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  labelBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  defaultBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  defaultBadgeText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: 'bold',
  },
  addressActionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconActionBtn: {
    padding: 4,
  },
  addressDetailsContainer: {
    paddingLeft: 26,
  },
  addressRecipient: {
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  addressTextFull: {
    fontSize: 12,
    lineHeight: 17,
  },
  addNewAddressBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 4,
    marginBottom: 16,
  },
  addNewAddressText: {
    fontSize: 13.5,
    fontWeight: 'bold',
    color: '#D97706',
  },
  sheetFooter: {
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  confirmAddressBtn: {
    backgroundColor: '#F4C400',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmAddressBtnText: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: 'bold',
  },

  // Form Styles
  formScrollView: {
    paddingHorizontal: 16,
    maxHeight: 460,
  },
  formFieldLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginTop: 12,
    marginBottom: 6,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 4,
  },
  typePill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 9,
  },
  typePillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  formRow: {
    flexDirection: 'row',
    gap: 10,
  },
  formCol: {
    flex: 1,
  },
  formInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
  },
  defaultCheckRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
    marginBottom: 20,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: '#F4C400',
    borderColor: '#F4C400',
  },
  defaultCheckText: {
    fontSize: 12.5,
  },

  // Promo Code Styles
  appliedPromoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  appliedPromoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  appliedCodeText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  appliedBadge: {
    backgroundColor: '#16A34A',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  appliedBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  appliedDescText: {
    fontSize: 11,
    marginTop: 2,
  },
  removePromoBtn: {
    padding: 4,
  },
  promoInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    height: 44,
  },
  promoTextInput: {
    flex: 1,
    paddingHorizontal: 8,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  applyPromoBtn: {
    backgroundColor: '#F5B800',
    height: '100%',
    paddingHorizontal: 16,
    borderTopRightRadius: 9,
    borderBottomRightRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyPromoBtnText: {
    color: '#0F172A',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  availableCouponsLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginTop: 12,
  },
  couponChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 8,
  },
  couponChipCode: {
    fontSize: 12,
    fontWeight: '800',
    color: '#D97706',
  },
  couponChipAction: {
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 2,
  },
});
