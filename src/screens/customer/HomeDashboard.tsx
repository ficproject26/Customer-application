import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Pressable, Image, useWindowDimensions, Alert, Animated, Modal, TextInput, Dimensions, RefreshControl, PermissionsAndroid, Platform, ActivityIndicator, Linking, BackHandler, StatusBar } from 'react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import {
  setupVoiceListeners,
  cleanupVoiceListeners,
  startVoiceRecording,
  stopVoiceRecording,
} from '../../utils/safeVoice';



import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { CustomerStackParamList } from '../../navigation/AppNavigator';
import { useAuthStore, isUserAuthenticated } from '../../store/authStore';
import GlassCard from '../../components/GlassCard';
import { useUIStore } from '../../store/uiStore';
import MembershipCard from '../../components/MembershipCard';
import * as Icons from 'lucide-react-native';
import Svg, { Rect, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { getRecommendedProducts, normalizeMainCategoryName } from '../../services/categoryService';
import { useOrderStore } from '../../store/orderStore';
import { apiFetch, resolveImageUrl } from '../../services/api';
import { useCartStore, isCartableCategory } from '../../store/cartStore';
import CartModal from '../../components/CartModal';
import TravelSearchModal from '../../components/TravelSearchModal';
import { TravelSearchParams } from './travelData';
import { useWishlistStore } from '../../store/wishlistStore';
import WishlistModal from '../../components/WishlistModal';
import { useThemeStore } from '../../store/themeStore';
import { useBannerStore } from '../../store/bannerStore';
import VendorBannerModal from '../../components/VendorBannerModal';
import ProductCard from '../../components/ProductCard';
import { useToastStore } from '../../store/toastStore';
import { useActivityStore } from '../../store/activityStore';
import { useLanguageStore, LANGUAGES_LIST, useTranslation } from '../../store/languageStore';
import { useLocationStore, INDIAN_STATES_AND_CITIES } from '../../store/locationStore';
import { useNotificationStore } from '../../store/notificationStore';
import { getRelevantProductImage } from '../../utils/productImages';
import { openRespectivePage } from '../../utils/navigationHelpers';
import { useAuthGuardStore } from '../../store/authGuardStore';
import { useProductStore } from '../../store/productStore';
import { socketService } from '../../services/socket';

const { width, height } = Dimensions.get('window');

type HomeDashboardProp = StackNavigationProp<CustomerStackParamList, 'CustomerTabs'>;

const SkeletonCard = React.memo(({ isLightActive }: { isLightActive: boolean }) => (
  <View
    style={{
      width: 160,
      marginRight: 12,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: isLightActive ? '#F1EAD8' : 'rgba(255, 255, 255, 0.1)',
      backgroundColor: isLightActive ? '#FFFFFF' : 'rgba(13, 22, 54, 0.65)',
      padding: 10,
    }}
  >
    <View
      style={{
        width: '100%',
        height: 112,
        borderRadius: 10,
        backgroundColor: isLightActive ? '#F1F5F9' : 'rgba(255, 255, 255, 0.08)',
        marginBottom: 8,
      }}
    />
    <View
      style={{
        width: '75%',
        height: 12,
        borderRadius: 4,
        backgroundColor: isLightActive ? '#E2E8F0' : 'rgba(255, 255, 255, 0.12)',
        marginBottom: 6,
      }}
    />
    <View
      style={{
        width: '45%',
        height: 10,
        borderRadius: 4,
        backgroundColor: isLightActive ? '#F1F5F9' : 'rgba(255, 255, 255, 0.08)',
        marginBottom: 8,
      }}
    />
    <View
      style={{
        width: '50%',
        height: 14,
        borderRadius: 4,
        backgroundColor: isLightActive ? '#E2E8F0' : 'rgba(255, 255, 255, 0.12)',
      }}
    />
  </View>
));

const SkeletonGridCard = React.memo(({ isLightActive, cardWidth }: { isLightActive: boolean; cardWidth: number }) => (
  <View
    style={{
      width: cardWidth,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: isLightActive ? '#F1EAD8' : 'rgba(255, 255, 255, 0.1)',
      backgroundColor: isLightActive ? '#FFFFFF' : 'rgba(13, 22, 54, 0.65)',
      padding: 10,
      marginBottom: 12,
    }}
  >
    <View
      style={{
        width: '100%',
        height: 120,
        borderRadius: 10,
        backgroundColor: isLightActive ? '#F1F5F9' : 'rgba(255, 255, 255, 0.08)',
        marginBottom: 10,
      }}
    />
    <View
      style={{
        width: '80%',
        height: 12,
        borderRadius: 4,
        backgroundColor: isLightActive ? '#E2E8F0' : 'rgba(255, 255, 255, 0.12)',
        marginBottom: 6,
      }}
    />
    <View
      style={{
        width: '50%',
        height: 14,
        borderRadius: 4,
        backgroundColor: isLightActive ? '#E2E8F0' : 'rgba(255, 255, 255, 0.12)',
      }}
    />
  </View>
));

const DISCOVERY_CATEGORIES = [
  { name: 'All', icon: 'LayoutGrid', color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
  { name: 'Services', icon: 'Wrench', color: '#0284C7', bg: '#F0F9FF', border: '#BAE6FD' },
  { name: 'Products', icon: 'ShoppingBag', color: '#EA580C', bg: '#FFF7ED', border: '#FED7AA' },
  { name: 'Daily Needs', icon: 'Store', color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
  { name: 'Food', icon: 'UtensilsCrossed', color: '#E11D48', bg: '#FFF1F2', border: '#FECDD3' },
  { name: 'Stay', icon: 'Hotel', color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
  { name: 'Travel', icon: 'Compass', color: '#D97706', bg: '#FEF3C7', border: '#FDE68A' },
  { name: 'Jobs', icon: 'Briefcase', color: '#0D9488', bg: '#F0FDFA', border: '#99F6E4' },
];


function isLightColor(colorStr?: string): boolean {
  if (!colorStr) return true;
  const hex = colorStr.replace('#', '').trim();
  if (hex.length === 3) {
    const r = parseInt(hex[0] + hex[0], 16);
    const g = parseInt(hex[1] + hex[1], 16);
    const b = parseInt(hex[2] + hex[2], 16);
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.5;
  }
  if (hex.length === 6) {
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.5;
  }
  return true;
}

function getBannerTheme(bgColor?: string) {
  const isLight = isLightColor(bgColor || '#FFF1C7');

  if (isLight) {
    return {
      isLight: true,
      titleColor: '#0F172A', // Dark Navy for maximum contrast on light backgrounds
      subtitleColor: '#334155', // Slate gray for subtitle
      categoryTagColor: '#92400E', // Dark amber category tag
      tagIconColor: '#D97706',
      badgeBg: 'rgba(15, 23, 42, 0.08)',
      badgeBorder: 'rgba(15, 23, 42, 0.15)',
      badgeTextColor: '#0F172A',
      btnBg: '#0F172A', // Dark CTA button for contrast
      btnTextColor: '#FFFFFF',
      btnIconColor: '#F5B800',
    };
  } else {
    return {
      isLight: false,
      titleColor: '#FFFFFF', // Crisp white for dark backgrounds
      subtitleColor: 'rgba(255, 255, 255, 0.85)',
      categoryTagColor: '#F59E0B',
      tagIconColor: '#F59E0B',
      badgeBg: 'rgba(255, 255, 255, 0.15)',
      badgeBorder: 'rgba(255, 255, 255, 0.25)',
      badgeTextColor: '#FFFFFF',
      btnBg: '#F5B800', // Gold CTA button for dark backgrounds
      btnTextColor: '#0F172A',
      btnIconColor: '#0F172A',
    };
  }
}

export default function HomeDashboard() {
  const { width } = useWindowDimensions();
  const navigation = useNavigation<HomeDashboardProp>();
  const insets = useSafeAreaInsets();

  // Auth Store Hooks
  const currentUser = useAuthStore((state) => state.currentUser);
  const isGuestUser = !currentUser || currentUser.isGuest || currentUser.id === 'guest_user' || Boolean(currentUser.name && currentUser.name.toLowerCase().includes('guest'));
  const logout = useAuthStore((state) => state.logout);
  const pendingProduct = useAuthStore((state) => state.pendingPurchaseProduct);
  const setPendingProduct = useAuthStore((state) => state.setPendingPurchaseProduct);
  const displayName = isGuestUser ? 'Guest User' : currentUser?.name || 'Connect Member';

  // Cart Store Hooks
  const [isCartVisible, setIsCartVisible] = useState(false);
  const cartItems = useCartStore((state) => state.cartItems);
  const addToCart = useCartStore((state) => state.addToCart);
  const showToast = useToastStore((state) => state.showToast);
  const totalCartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  // Wishlist Store Hooks
  const [isWishlistVisible, setIsWishlistVisible] = useState(false);
  const wishlistItems = useWishlistStore((state) => state.wishlistItems);
  const toggleWishlist = useWishlistStore((state) => state.toggleWishlist);

  // Modals & UI States
  const [isPartnersModalVisible, setIsPartnersModalVisible] = useState(false);
  const [partnerCatFilter, setPartnerCatFilter] = useState('All');
  const [isOffersModalVisible, setIsOffersModalVisible] = useState(false);
  const [isVendorBannerModalOpen, setIsVendorBannerModalOpen] = useState(false);
  const [isNotifDropdownOpen, setIsNotifDropdownOpen] = useState(false);
  const [activeBannerIndex, setActiveBannerIndex] = useState(0);
  const bannerScrollViewRef = useRef<ScrollView>(null);

  // Notification Store Hooks
  const notifications = useNotificationStore((state) => state.notifications);
  const unreadNotifCount = useNotificationStore((state) => state.unreadCount);
  const markAsRead = useNotificationStore((state) => state.markAsRead);
  const markAllAsRead = useNotificationStore((state) => state.markAllAsRead);

  // Dynamic Banners
  const banners = useBannerStore((state) => state.banners);

  // Live Catalog Data from Persistent productStore (0ms hydration from AsyncStorage)
  const dbProducts = useProductStore((state) => state.products);
  const isProductsLoading = useProductStore((state) => state.isLoading);
  const hasLoadedInitial = useProductStore((state) => state.hasLoadedInitial);
  const [dbVendors, setDbVendors] = useState<any[]>([]);
  const [dbOffers, setDbOffers] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Theme Store Hooks
  const themeMode = useThemeStore((state) => state.themeMode);
  const setThemeMode = useThemeStore((state) => state.setThemeMode);
  const colors = useThemeStore((state) => state.colors);
  const isDark = useThemeStore((state) => state.isDark);
  const isLightActive = !isDark;
  const activeContentColor = isLightActive ? '#FFFFFF' : '#050B1E';

  // Sidebar Menu State & Animations
  const isSidebarOpen = useUIStore((state) => state.isSidebarOpen);
  const setIsSidebarOpen = useUIStore((state) => state.setIsSidebarOpen);
  const slideAnim = useRef(new Animated.Value(-width * 0.85)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [headerHeight, setHeaderHeight] = useState(0);

  // Universal Search & Voice Search State
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isTravelSearchModalVisible, setIsTravelSearchModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [capturedImageUri, setCapturedImageUri] = useState<string | null>(null);
  const [isVisualSearching, setIsVisualSearching] = useState(false);
  const voiceTimeoutRef = useRef<any>(null);
  const searchInputRef = useRef<TextInput>(null);

  // In-search waveform animations
  const wave1 = useRef(new Animated.Value(6)).current;
  const wave2 = useRef(new Animated.Value(14)).current;
  const wave3 = useRef(new Animated.Value(10)).current;
  const wave4 = useRef(new Animated.Value(18)).current;
  const micGlowAnim = useRef(new Animated.Value(1)).current;

  // Language & Location Store Hooks
  const { t, currentLanguage, setLanguage } = useTranslation();
  const [isSidebarLanguageView, setIsSidebarLanguageView] = useState(false);

  const selectedState = useLocationStore((state) => state.selectedState);
  const selectedCity = useLocationStore((state) => state.selectedCity);
  const isCurrentLocation = useLocationStore((state) => state.isCurrentLocation);
  const setLocation = useLocationStore((state) => state.setLocation);
  const getDisplayLocation = useLocationStore((state) => state.getDisplayLocation);
  const [isSidebarLocationView, setIsSidebarLocationView] = useState(false);
  const [locationSearchQuery, setLocationSearchQuery] = useState('');
  const [expandedStateName, setExpandedStateName] = useState<string | null>('Karnataka');

  // Android hardware back button handler for sidebar
  useEffect(() => {
    if (!isSidebarOpen) return;
    const backAction = () => {
      if (isSidebarLanguageView) {
        setIsSidebarLanguageView(false);
        return true;
      }
      if (isSidebarLocationView) {
        setIsSidebarLocationView(false);
        return true;
      }
      setIsSidebarOpen(false);
      return true;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [isSidebarOpen, isSidebarLanguageView, isSidebarLocationView, setIsSidebarOpen]);

  const loadHomeData = useCallback(async (force = false) => {
    try {
      await useProductStore.getState().loadAllCatalogData(force);
      // Fetch live exclusive offers from backend
      try {
        const offRes: any = await apiFetch('/admin/public/exclusive-offers', { skipCache: force });
        const offList = Array.isArray(offRes) ? offRes : (Array.isArray(offRes?.data) ? offRes.data : []);
        if (Array.isArray(offList)) {
          setDbOffers(offList);
        }
      } catch (e) {}
    } catch (err) {
      console.warn('[HomeDashboard] Error loading catalog data:', err);
    }
  }, []);

  // Subscribe to real-time updates for Admin Banners, Offers & Categories
  useEffect(() => {
    const handleOffers = () => loadHomeData(true);
    const handleBanners = () => useBannerStore.getState().loadBanners(true);
    const handleCategories = () => useProductStore.getState().loadCategoryHierarchy(true);

    socketService.on('offers:updated', handleOffers);
    socketService.on('banners:updated', handleBanners);
    socketService.on('categories:updated', handleCategories);

    return () => {
      socketService.off('offers:updated', handleOffers);
      socketService.off('banners:updated', handleBanners);
      socketService.off('categories:updated', handleCategories);
    };
  }, [loadHomeData]);

  // Auto-refresh silently in background with SWR freshness check (no duplicate hits on tab switch)
  useFocusEffect(
    useCallback(() => {
      loadHomeData(false);
    }, [loadHomeData])
  );

  // Banner Auto-slide every 4 seconds (pauses when user holds touch down)
  const [isBannerPaused, setIsBannerPaused] = useState(false);

  useEffect(() => {
    const count = banners?.length || 0;
    if (count === 0 || isBannerPaused) return;

    const timer = setInterval(() => {
      setActiveBannerIndex((prevIndex) => {
        const nextIndex = (prevIndex + 1) % count;
        bannerScrollViewRef.current?.scrollTo({
          x: nextIndex * width,
          animated: true,
        });
        return nextIndex;
      });
    }, 4000);

    return () => clearInterval(timer);
  }, [width, banners?.length, isBannerPaused]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        loadHomeData(true),
        useOrderStore.getState().loadAllOrders(true),
      ]);
    } catch {
      // Fallback
    } finally {
      setRefreshing(false);
    }
  }, [loadHomeData]);

  // Sidebar animation effect (Opens smoothly from LEFT)
  useEffect(() => {
    if (isSidebarOpen) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -width * 0.85,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isSidebarOpen, slideAnim, fadeAnim, width]);


  // Subtle in-search listening waveform animation loop
  useEffect(() => {
    let waveAnim: Animated.CompositeAnimation | null = null;
    if (isListening) {
      waveAnim = Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.timing(wave1, { toValue: 18, duration: 250, useNativeDriver: false }),
            Animated.timing(wave1, { toValue: 6, duration: 250, useNativeDriver: false }),
          ]),
          Animated.sequence([
            Animated.timing(wave2, { toValue: 8, duration: 200, useNativeDriver: false }),
            Animated.timing(wave2, { toValue: 22, duration: 200, useNativeDriver: false }),
          ]),
          Animated.sequence([
            Animated.timing(wave3, { toValue: 24, duration: 300, useNativeDriver: false }),
            Animated.timing(wave3, { toValue: 8, duration: 300, useNativeDriver: false }),
          ]),
          Animated.sequence([
            Animated.timing(wave4, { toValue: 8, duration: 220, useNativeDriver: false }),
            Animated.timing(wave4, { toValue: 20, duration: 220, useNativeDriver: false }),
          ]),
          Animated.sequence([
            Animated.timing(micGlowAnim, { toValue: 1.2, duration: 400, useNativeDriver: true }),
            Animated.timing(micGlowAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
          ]),
        ])
      );
      waveAnim.start();
    } else {
      wave1.setValue(6);
      wave2.setValue(14);
      wave3.setValue(10);
      wave4.setValue(18);
      micGlowAnim.setValue(1);
    }
    return () => {
      if (waveAnim) waveAnim.stop();
    };
  }, [isListening, wave1, wave2, wave3, wave4, micGlowAnim]);

  // Register real Android Speech Recognition Listeners
  useEffect(() => {
    let resultTimer: any = null;

    function onSpeechPartialResults(e: any) {
      const partialText = Array.isArray(e?.value) ? e.value[0] : (typeof e?.value === 'string' ? e.value : '');
      if (partialText) {
        setSearchQuery(partialText);
      }
    }

    function onSpeechResults(e: any) {
      const text = Array.isArray(e?.value) ? e.value[0] : (typeof e?.value === 'string' ? e.value : (e?.results?.[0] || ''));
      if (text) {
        setSearchQuery(text);
        showToast(`Voice recognized: "${text}"`);
        useActivityStore.getState().recordSearch(text);

        if (resultTimer) clearTimeout(resultTimer);
        resultTimer = setTimeout(() => {
          setIsListening(false);
          if (voiceTimeoutRef.current) {
            clearTimeout(voiceTimeoutRef.current);
            voiceTimeoutRef.current = null;
          }
        }, 800);
      }
    }

    function onSpeechError(e: any) {
      const errCode = e?.error?.code || e?.error?.message || e?.error;
      console.warn('[VoiceSearch] Speech error:', errCode);

      // Non-fatal error code 7 (no match yet), keep listening window active
      if (String(errCode) === '7' || String(errCode).includes('7')) {
        return;
      }

      if (voiceTimeoutRef.current) {
        clearTimeout(voiceTimeoutRef.current);
        voiceTimeoutRef.current = null;
      }
      setIsListening(false);
      showToast("Couldn't hear speech clearly. Type to search.");
      setTimeout(() => searchInputRef.current?.focus(), 200);
    }

    function onSpeechEnd() {
      // Speech chunk ended; let full 7s window or speech results handle closure
    }

    setupVoiceListeners({
      onSpeechPartialResults,
      onSpeechResults,
      onSpeechError,
      onSpeechEnd,
    });

    return () => {
      if (resultTimer) clearTimeout(resultTimer);
      if (voiceTimeoutRef.current) {
        clearTimeout(voiceTimeoutRef.current);
      }
      cleanupVoiceListeners();
    };
  }, [showToast]);

  // Voice Listening Controller
  const stopVoiceListening = useCallback(async () => {
    if (voiceTimeoutRef.current) {
      clearTimeout(voiceTimeoutRef.current);
      voiceTimeoutRef.current = null;
    }
    try {
      await stopVoiceRecording();
    } catch (e) {
      console.warn('Voice stop error:', e);
    } finally {
      setIsListening(false);
    }
  }, []);

  const startVoiceListening = useCallback(async () => {
    setIsListening(true);
    setSearchQuery('');
    showToast('Listening... Speak now 🎙️');

    if (voiceTimeoutRef.current) {
      clearTimeout(voiceTimeoutRef.current);
    }

    // Safety timeout: 7 seconds active listening window
    voiceTimeoutRef.current = setTimeout(() => {
      stopVoiceRecording().catch(() => {});
      setIsListening(false);
      showToast('Listening complete. Type or speak again.');
      setTimeout(() => searchInputRef.current?.focus(), 200);
    }, 7000);

    try {
      await startVoiceRecording('en-IN');
    } catch (err: any) {
      console.warn('Voice start warning:', err);
    }
  }, [showToast]);

  // Microphone Permission & Voice Search Handler
  const handleMicPress = async (e?: any) => {
    if (e && typeof e.stopPropagation === 'function') {
      e.stopPropagation();
    }

    if (isListening) {
      stopVoiceListening();
      return;
    }

    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: 'Microphone Permission Required',
            message: 'Connect Mobile app needs microphone access for Voice Search.',
            buttonPositive: 'Allow',
            buttonNegative: 'Cancel',
          }
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert(
            'Microphone Permission Required',
            'Please grant microphone permission in device settings to use Voice Search.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: () => Linking.openSettings() },
            ]
          );
          return;
        }
      } catch (err: any) {
        console.warn('Microphone permission request error:', err);
        showToast('Microphone permission request failed');
        return;
      }
    }

    setIsSearchOpen(true);
    startVoiceListening();
  };

  // Camera Permission & Visual Search Handler
  const handleCameraPress = async (e?: any) => {
    if (e && typeof e.stopPropagation === 'function') {
      e.stopPropagation();
    }

    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: 'Camera Permission Required',
            message: 'Connect Mobile app needs camera access for Visual Product Search.',
            buttonPositive: 'Allow',
            buttonNegative: 'Cancel',
          }
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert(
            'Camera Permission Required',
            'Please grant camera permission in device settings to use Visual Search.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: () => Linking.openSettings() },
            ]
          );
          return;
        }
      } catch (err: any) {
        console.warn('Camera permission request error:', err);
        Alert.alert('Camera Error', 'Could not request camera permission.');
        return;
      }
    }

    Alert.alert(
      'Visual Product Search',
      'Take a picture of an item or service to search visually:',
      [
        { text: 'Take Photo (Camera)', onPress: handleTakePhoto },
        { text: 'Choose from Gallery', onPress: handleChooseGallery },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  // Native Device Camera Capture Flow
  const handleTakePhoto = async () => {
    try {
      const result = await launchCamera({
        mediaType: 'photo',
        quality: 0.8,
        saveToPhotos: false,
        cameraType: 'back',
      });

      if (result.didCancel) return;
      if (result.errorCode) {
        if (result.errorCode === 'others' && result.errorMessage?.toLowerCase().includes('permission')) {
          Alert.alert(
            'Camera Permission Required',
            'Camera access is needed to capture photos for visual search.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: () => Linking.openSettings() },
            ]
          );
        } else {
          Alert.alert('Camera Error', result.errorMessage || 'Failed to launch camera.');
        }
        return;
      }

      if (result.assets && result.assets[0]?.uri) {
        const uri = result.assets[0].uri;
        setCapturedImageUri(uri);
        setIsSearchOpen(true);
        performVisualSearch(uri);
      }
    } catch (err: any) {
      console.warn('Camera capture error:', err);
      Alert.alert('Camera Error', err?.message || 'Failed to launch native device camera.');
    }
  };

  // Native Device Gallery Selection Flow
  const handleChooseGallery = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
        selectionLimit: 1,
      });

      if (result.didCancel) return;
      if (result.errorCode) {
        Alert.alert('Gallery Error', result.errorMessage || 'Failed to pick image from gallery.');
        return;
      }

      if (result.assets && result.assets[0]?.uri) {
        const uri = result.assets[0].uri;
        setCapturedImageUri(uri);
        setIsSearchOpen(true);
        performVisualSearch(uri);
      }
    } catch (err: any) {
      console.warn('Gallery pick error:', err);
      Alert.alert('Gallery Error', err?.message || 'Failed to open photo gallery.');
    }
  };

  // Visual Search Query Execution
  const performVisualSearch = (uri: string) => {
    setIsVisualSearching(true);
    setTimeout(() => {
      setIsVisualSearching(false);
      const detectedTerm = 'Bose';
      setSearchQuery(detectedTerm);
      useActivityStore.getState().recordSearch(`Visual Search: ${detectedTerm}`);
      setIsSearchOpen(true);
    }, 1200);
  };


  // Format MongoDB Product to ProductCard schema

  const formatCardItem = (item: any) => {
    const numPrice = typeof item.price === 'number' ? `₹${item.price.toLocaleString('en-IN')}` : (item.price || '₹499');
    const numMrp = typeof item.mrp === 'number' ? `₹${item.mrp.toLocaleString('en-IN')}` : (item.originalPrice || undefined);
    const rawImg = item.image || item.img || item.photo || item.imageUrl || (Array.isArray(item.images) && item.images[0]) || '';
    const itemImg = resolveImageUrl(rawImg) || 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=300&auto=format&fit=crop&q=80';
    return {
      id: item._id || item.id || `prod_${item.name}`,
      name: item.name,
      spec: item.brand || item.seller?.name || item.subcategory || item.desc || '',
      price: numPrice,
      originalPrice: numMrp,
      discount: item.mrp && item.price ? `${Math.round(((item.mrp - item.price) / item.mrp) * 100)}% OFF` : (item.discount || undefined),
      rating: item.rating ? String(item.rating) : '4.6',
      ratingCount: item.ratingCount || '1.2k',
      image: itemImg,
      img: itemImg,
      category: item.mainCategory || item.subNavbarCategory || item.category || 'Product',
      subcategory: item.subcategory,
      assured: Boolean(item.isAssured || item.assured),
      actionType: item.actionType,
    };
  };

  // Curated Recommended products across Food, Stay, Daily Needs, Products, Services, Travel
  const recommendedItems = useMemo(() => getRecommendedProducts(dbProducts), [dbProducts]);

  // Dynamic category showcases from live backend items
  const productsList = useMemo(() => {
    return dbProducts.filter((p) => normalizeMainCategoryName(p.mainCategory || p.subNavbarCategory) === 'Products');
  }, [dbProducts]);

  const servicesList = useMemo(() => {
    return dbProducts.filter((p) => normalizeMainCategoryName(p.mainCategory || p.subNavbarCategory) === 'Services');
  }, [dbProducts]);

  const dailyNeedsList = useMemo(() => {
    return dbProducts.filter((p) => normalizeMainCategoryName(p.mainCategory || p.subNavbarCategory) === 'Daily Needs');
  }, [dbProducts]);

  const foodList = useMemo(() => {
    return dbProducts.filter((p) => normalizeMainCategoryName(p.mainCategory || p.subNavbarCategory) === 'Food');
  }, [dbProducts]);

  const stayList = useMemo(() => {
    return dbProducts.filter((p) => normalizeMainCategoryName(p.mainCategory || p.subNavbarCategory) === 'Stay');
  }, [dbProducts]);

  const travelList = useMemo(() => {
    return dbProducts.filter((p) => normalizeMainCategoryName(p.mainCategory || p.subNavbarCategory) === 'Travel');
  }, [dbProducts]);

  const jobsList = useMemo(() => {
    return dbProducts.filter((p) => normalizeMainCategoryName(p.mainCategory || p.subNavbarCategory) === 'Jobs');
  }, [dbProducts]);

  // Memoized cards for 2-column personalized Picked For You feed
  const pickedForYouCards = useMemo(() => {
    return (dbProducts || []).slice(0, 20).map(formatCardItem);
  }, [dbProducts]);


  const handlePlaceOrder = (name: string, price: string, category: string) => {
    const numPrice = typeof price === 'number'
      ? price
      : (parseFloat(String(price || '0').replace(/[^\d.]/g, '')) || 0);
    const isBooking = ['Services', 'Service', 'Stay', 'Travel', 'Food', 'Jobs'].includes(category);
    const curUser = useAuthStore.getState().currentUser;
    const userPhone = curUser?.phone || '+91 98888 88888';
    const userAddrObj = curUser?.address;
    const userAddress = userAddrObj
      ? [userAddrObj.house, userAddrObj.street || userAddrObj.address, userAddrObj.city, userAddrObj.pincode].filter(Boolean).join(', ')
      : 'Koramangala 5th Block, Bangalore';

    // 1. Instant optimistic navigation
    navigation.navigate('CustomerTabs', { screen: 'Orders' });

    // 2. Non-blocking asynchronous sync
    apiFetch('/orders', {
      method: 'POST',
      body: JSON.stringify({
        vendor_id: 'v1',
        customer_name: displayName,
        customer_phone: userPhone,
        customer_address: userAddress,
        customer_latitude: 12.9498,
        customer_longitude: 77.6289,
        product_details: name,
        amount: numPrice,
        order_type: isBooking ? 'booking' : 'order'
      })
    })
      .then(() => {
        useOrderStore.getState().loadAllOrders?.();
      })
      .catch((err) => {
        console.warn('Background order sync fallback:', err);
      });
  };


  // Generate rich universal search results across all 7 main categories
  const getSearchResults = () => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase().trim();
    const results: Array<any> = [];

    // Search dynamic items from MongoDB Atlas
    if (dbProducts && Array.isArray(dbProducts)) {
      dbProducts.forEach((prod: any) => {
        const pName = prod.name || '';
        const pCat = prod.category || prod.vendorType || '';
        const pSub = prod.subcategory || prod.subCategory || '';
        const pDesc = prod.description || '';
        const pBrand = prod.brand || '';
        const pFrom = prod.from || prod.origin || '';
        const pTo = prod.to || prod.destination || '';
        const pRoute = `${pFrom} to ${pTo} ${pFrom} ➔ ${pTo}`;
        const pOp = prod.operator || prod.operatorName || prod.businessName || prod.vendorName || '';
        const pBoarding = Array.isArray(prod.boardingPoints) ? prod.boardingPoints.join(' ') : (prod.boardingPoint || '');
        const pDropping = Array.isArray(prod.droppingPoints) ? prod.droppingPoints.join(' ') : (prod.dropPoint || '');

        let isMatch =
          pName.toLowerCase().includes(query) ||
          pCat.toLowerCase().includes(query) ||
          pSub.toLowerCase().includes(query) ||
          pDesc.toLowerCase().includes(query) ||
          pBrand.toLowerCase().includes(query) ||
          pFrom.toLowerCase().includes(query) ||
          pTo.toLowerCase().includes(query) ||
          pRoute.toLowerCase().includes(query) ||
          pOp.toLowerCase().includes(query) ||
          pBoarding.toLowerCase().includes(query) ||
          pDropping.toLowerCase().includes(query);

        if (!isMatch && (pCat.toLowerCase().includes('travel') || pCat.toLowerCase().includes('bus') || pSub.toLowerCase().includes('bus'))) {
          const parts = query.replace(/\bto\b|\b➔\b|->|-/gi, ' ').split(/\s+/).filter(Boolean);
          if (parts.length >= 2) {
            const partFrom = parts[0];
            const partTo = parts[parts.length - 1];
            const mFrom = pFrom.toLowerCase().includes(partFrom) || pBoarding.toLowerCase().includes(partFrom);
            const mTo = pTo.toLowerCase().includes(partTo) || pDropping.toLowerCase().includes(partTo);
            if (mFrom && mTo) isMatch = true;
          }
        }

        if (isMatch) {
          const prodId = prod.id || prod._id;
          if (!results.some((r) => r.id === prodId || r.name.toLowerCase() === pName.toLowerCase())) {
            results.push({
              id: prodId,
              name: pName,
              categoryKey: pCat || 'Products',
              subcategoryName: pSub || 'General',
              price: typeof prod.price === 'number' ? `₹${prod.price.toLocaleString('en-IN')}` : String(prod.price || '₹0'),
              originalPrice: prod.originalPrice ? (typeof prod.originalPrice === 'number' ? `₹${prod.originalPrice.toLocaleString('en-IN')}` : String(prod.originalPrice)) : undefined,
              rating: String(prod.rating || '4.5'),
              image: resolveImageUrl(prod.image || prod.imageUrl) || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=150&q=80',
              badgeColor: '#D97706',
              badgeBg: 'rgba(217, 119, 6, 0.12)',
              type: (pCat || 'product').toLowerCase(),
              rawProduct: prod,
            });
          }
        }
      });
    }

    // Search results come exclusively from live backend data (dbProducts).
    // No static/fake catalog data is used here.

    return results;
  };

  const handlePlacePendingOrder = (product: any) => {
    const rawPrice = product.price;
    const numPrice = typeof rawPrice === 'number'
      ? rawPrice
      : (parseFloat(String(rawPrice || '0').replace(/[^\d.]/g, '')) || 0);
    const curUser = useAuthStore.getState().currentUser;
    const userPhone = curUser?.phone || '+91 98888 88888';
    const userAddrObj = curUser?.address;
    const userAddress = userAddrObj
      ? [userAddrObj.house, userAddrObj.street || userAddrObj.address, userAddrObj.city, userAddrObj.pincode].filter(Boolean).join(', ')
      : 'Koramangala 5th Block, Bangalore';
    
    // 1. Instant optimistic state update & navigation
    setPendingProduct(null);
    navigation.navigate('CustomerTabs', { screen: 'Orders' });

    // 2. Non-blocking asynchronous sync
    apiFetch('/orders', {
      method: 'POST',
      body: JSON.stringify({
        vendor_id: 'v1',
        customer_name: displayName,
        customer_phone: userPhone,
        customer_address: userAddress,
        customer_latitude: 12.9498,
        customer_longitude: 77.6289,
        product_details: product.name,
        amount: numPrice
      })
    })
      .then(() => {
        useOrderStore.getState().loadAllOrders?.();
      })
      .catch((err) => {
        console.warn('Background pending order sync fallback:', err);
      });
  };


  const handleSearchPress = () => {
    setIsSearchOpen(true);
  };

  const handleMenuPress = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const renderCategoryIcon = (iconName: string, color = '#F4C400', size = 24) => {
    const IconComp = (Icons as any)[iconName];
    if (!IconComp) return <Icons.HelpCircle color={color} size={size} strokeWidth={2.2} />;
    return <IconComp color={color} size={size} strokeWidth={2.2} />;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={colors.statusBarStyle}
        backgroundColor={isLightActive ? '#FFF3D6' : colors.background}
        translucent={false}
      />
      {/* Top Mobile Commerce Header with SafeAreaView - Always fully visible above side drawer */}
      <SafeAreaView
        edges={Platform.OS === 'android' ? [] : ['top']}
        onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height)}
        style={{
          backgroundColor: isLightActive ? '#FFF3D6' : colors.background,
          borderBottomWidth: 1,
          borderBottomColor: isLightActive ? 'rgba(242, 183, 5, 0.3)' : colors.cardBorder,
          paddingTop: Platform.OS === 'android' ? Math.max(insets.top, (StatusBar.currentHeight || 0) > 0 ? (StatusBar.currentHeight || 0) : 24) : 0,
          zIndex: 1000,
          elevation: 12,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 4,
        }}
      >
        <View style={styles.navbar}>
          {/* Row 1: Location & User on Left, Wishlist/Cart/Notif/Hamburger on Right */}
          <View style={styles.topHeaderRow}>
            {/* 1. Official Logo & Location Selector Chip matching reference */}
            <TouchableOpacity
              style={styles.headerWelcomeGroup}
              activeOpacity={0.8}
              onPress={() => {
                setIsSidebarOpen(true);
              }}
            >
              <Image
                source={require('../../assets/images/forge_india_logo.jpg')}
                style={[
                  styles.headerConnectLogo,
                  { borderColor: isLightActive ? '#F1EAD8' : colors.cardBorder }
                ]}
                resizeMode="cover"
              />
              <View style={styles.headerWelcomeTextCol}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                  <Text style={[styles.headerWelcomeNameText, { color: colors.text }]} numberOfLines={1}>
                    {selectedCity || selectedState || 'Tamil Nadu'}
                  </Text>
                  <Icons.ChevronDown color={colors.text} size={13} strokeWidth={2.5} />
                </View>
                <Text style={[styles.headerWelcomeSubtext, { color: isLightActive ? '#64748B' : 'rgba(255, 255, 255, 0.6)' }]} numberOfLines={1}>
                  {displayName}
                </Text>
              </View>
            </TouchableOpacity>

            {/* 2. Right Action Icons: Wishlist -> Cart -> Notifications -> Hamburger */}
            <View style={styles.navRightGroup}>
              <TouchableOpacity
                style={styles.navIconBtn}
                activeOpacity={0.7}
                onPress={() => setIsWishlistVisible(true)}
                hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
              >
                <Icons.Heart 
                  color={wishlistItems.length > 0 ? "#FF3B30" : colors.text} 
                  size={20} 
                  fill={wishlistItems.length > 0 ? "#FF3B30" : "transparent"} 
                />
                {wishlistItems.length > 0 && (
                  <View style={[styles.badge, { backgroundColor: '#FF6A00' }]}>
                    <Text style={styles.badgeText}>{wishlistItems.length}</Text>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.navIconBtn}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('Cart')}
                hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
              >
                <Icons.ShoppingCart color={colors.text} size={20} />
                {totalCartCount > 0 && (
                  <View style={[styles.badge, { backgroundColor: '#FF6A00' }]}>
                    <Text style={styles.badgeText}>{totalCartCount}</Text>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.navIconBtn}
                activeOpacity={0.7}
                onPress={() => setIsNotifDropdownOpen((prev) => !prev)}
                hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
              >
                <Icons.Bell color={colors.text} size={20} />
                {unreadNotifCount > 0 && (
                  <View style={[styles.badge, { backgroundColor: '#FF6A00' }]}>
                    <Text style={styles.badgeText}>{unreadNotifCount}</Text>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.hamburgerBtn}
                activeOpacity={0.7}
                onPress={handleMenuPress}
                hitSlop={{ top: 12, bottom: 12, left: 6, right: 6 }}
              >
                <Icons.Menu color={colors.text} size={22} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Row 2: Full-Width Search Bar */}
          <View style={[
            styles.commerceSearchBar,
            {
              backgroundColor: isLightActive ? '#FFFFFF' : 'rgba(255, 255, 255, 0.07)',
              borderColor: isLightActive ? '#F1EAD8' : colors.cardBorder,
              borderRadius: 12,
            }
          ]}>
            <TouchableOpacity
              style={styles.searchBarLeftTouch}
              activeOpacity={0.85}
              onPress={handleSearchPress}
            >
              <Icons.Search color="#FF6A00" size={17} />
              <Text style={[styles.searchPlaceholderText, { color: isLightActive ? '#94A3B8' : 'rgba(255, 255, 255, 0.6)' }]} numberOfLines={1}>
                {t('search_placeholder')}
              </Text>
            </TouchableOpacity>

            <View style={styles.searchRightIcons}>
              <TouchableOpacity
                onPress={handleMicPress}
                style={styles.searchActionIconBtn}
                activeOpacity={0.7}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Icons.Mic color={isListening ? "#FF6A00" : colors.text} size={19} />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleCameraPress}
                style={styles.searchActionIconBtn}
                activeOpacity={0.7}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Icons.Camera color={colors.text} size={19} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </SafeAreaView>

      {/* Notification Modal with Strong Blur & Dim Backdrop */}
      <Modal
        visible={isNotifDropdownOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsNotifDropdownOpen(false)}
        statusBarTranslucent={true}
      >
        <View style={styles.notifFullModalContainer}>
          {/* Strong blurred + semi-transparent dim overlay capturing touch outside */}
          <TouchableOpacity
            style={styles.notifFullModalBackdrop}
            activeOpacity={1}
            onPress={() => setIsNotifDropdownOpen(false)}
          />

          {/* Floating Dropdown Card */}
          <View
            style={[
              styles.notifDropdownPanel,
              {
                backgroundColor: isLightActive ? '#FFFFFF' : '#0B132B',
                borderColor: isLightActive ? '#FDE68A' : 'rgba(245, 184, 0, 0.3)',
                top: insets.top + 48,
              },
            ]}
          >
            {/* Panel Header */}
            <View style={[styles.notifPanelHeader, { borderBottomColor: isLightActive ? '#F1EAD8' : 'rgba(255,255,255,0.08)' }]}>
              <View style={styles.notifPanelTitleRow}>
                <Icons.Bell color="#F5B800" size={16} />
                <Text style={[styles.notifPanelTitle, { color: colors.text }]}>Notifications</Text>
                {unreadNotifCount > 0 && (
                  <View style={styles.notifBadgeSmall}>
                    <Text style={styles.notifBadgeSmallText}>{unreadNotifCount} New</Text>
                  </View>
                )}
              </View>

              <View style={styles.notifPanelActions}>
                {unreadNotifCount > 0 && (
                  <TouchableOpacity onPress={markAllAsRead} activeOpacity={0.7} style={styles.markReadBtn}>
                    <Text style={styles.markReadBtnText}>Read all</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={() => setIsNotifDropdownOpen(false)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Icons.X color={isLightActive ? '#64748B' : 'rgba(255,255,255,0.5)'} size={16} />
                </TouchableOpacity>
              </View>
            </View>

            {/* List of Recent Notifications */}
            <ScrollView style={{ maxHeight: 260 }} showsVerticalScrollIndicator={true} nestedScrollEnabled={true}>
              {notifications.length > 0 ? (
                notifications.slice(0, 5).map((item) => {
                  const IconComp = (item.icon && typeof (Icons as any)[item.icon] === 'function') ? (Icons as any)[item.icon] : Icons.Bell;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[
                        styles.notifItemRow,
                        {
                          backgroundColor: item.unread
                            ? isLightActive ? '#FFFDF5' : 'rgba(245, 184, 0, 0.08)'
                            : 'transparent',
                          borderBottomColor: isLightActive ? '#F8FAFC' : 'rgba(255, 255, 255, 0.04)',
                        },
                      ]}
                      activeOpacity={0.8}
                      onPress={() => {
                        if (item.unread) markAsRead(item.id);
                        setIsNotifDropdownOpen(false);
                        if (item.targetScreen) {
                          if (item.targetScreen === 'Orders') {
                            navigation.navigate('CustomerTabs', { screen: 'Orders' });
                          } else if (item.targetScreen === 'Membership') {
                            navigation.navigate('CustomerTabs', { screen: 'Membership' });
                          } else {
                            navigation.navigate(item.targetScreen as any);
                          }
                        }
                      }}
                    >
                      <View
                        style={[
                          styles.notifIconCircle,
                          {
                            backgroundColor: item.unread
                              ? 'rgba(245, 184, 0, 0.18)'
                              : isLightActive ? '#F1F5F9' : 'rgba(255, 255, 255, 0.06)',
                          },
                        ]}
                      >
                        <IconComp color="#F5B800" size={14} />
                      </View>

                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Text style={[styles.notifItemTitle, { color: colors.text }]} numberOfLines={1}>
                            {item.title}
                          </Text>
                          {item.unread && <View style={styles.unreadDotMini} />}
                        </View>
                        <Text style={[styles.notifItemBody, { color: isLightActive ? '#64748B' : 'rgba(255,255,255,0.65)' }]} numberOfLines={2}>
                          {item.body}
                        </Text>
                        <Text style={[styles.notifItemTime, { color: isLightActive ? '#94A3B8' : 'rgba(255,255,255,0.4)' }]}>
                          {item.time}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })
              ) : (
                <View style={{ padding: 20, alignItems: 'center' }}>
                  <Icons.BellOff color="#F5B800" size={24} />
                  <Text style={{ fontSize: 12, color: colors.text, marginTop: 6, fontWeight: '600' }}>
                    No notifications yet
                  </Text>
                </View>
              )}
            </ScrollView>

            {/* Panel Footer */}
            <TouchableOpacity
              style={[styles.notifPanelFooter, { borderTopColor: isLightActive ? '#F1EAD8' : 'rgba(255,255,255,0.08)' }]}
              activeOpacity={0.8}
              onPress={() => {
                setIsNotifDropdownOpen(false);
                navigation.navigate('Notifications');
              }}
            >
              <Text style={styles.notifPanelFooterText}>View All Notifications</Text>
              <Icons.ChevronRight color="#F5B800" size={14} />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        removeClippedSubviews={true}
      >


        {/* Mobile Promo Banners Carousel */}
        <View style={styles.bannerSection}>
          <ScrollView
            ref={bannerScrollViewRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            snapToInterval={width}
            decelerationRate="fast"
            contentContainerStyle={styles.bannerScrollContent}
            onTouchStart={() => setIsBannerPaused(true)}
            onTouchEnd={() => setIsBannerPaused(false)}
            onScrollBeginDrag={() => setIsBannerPaused(true)}
            onScrollEndDrag={() => setIsBannerPaused(false)}
            onMomentumScrollEnd={(e) => {
              setIsBannerPaused(false);
              const offsetX = e.nativeEvent.contentOffset.x;
              const idx = Math.round(offsetX / width);
              if (idx !== activeBannerIndex && idx >= 0 && idx < banners.length) {
                setActiveBannerIndex(idx);
              }
            }}
            scrollEventThrottle={16}
          >
            {(banners || []).map((banner, bannerIdx) => {
              const IconComp = (banner.iconName && typeof (Icons as any)[banner.iconName] === 'function') ? (Icons as any)[banner.iconName] : Icons.Tag;

              // Extract discount percentage from text for the circular badge (Matching Reference Image)
              const rawTextForDiscount = `${banner.badgeText || ''} ${banner.title || ''} ${banner.subtitle || ''}`;
              const discountMatch = rawTextForDiscount.match(/(\d+)%\s*off/i) || rawTextForDiscount.match(/(\d+)%/i);
              const discountPercent = discountMatch ? `${discountMatch[1]}%` : (banner.badgeText && banner.badgeText.includes('%') ? banner.badgeText : '50%');

              // Two-tone headline parsing for bold contrast
              const titleWords = (banner.title || 'Special Promotion').trim().split(' ');
              const firstLine = titleWords.length > 1 ? titleWords[0] : banner.title;
              const secondLine = titleWords.length > 1 ? titleWords.slice(1).join(' ') : 'Happier You!';

              // Fallback food/promotion image if banner.image is missing
              const resolvedBannerImg = banner.image ? resolveImageUrl(banner.image) : 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=600&auto=format&fit=crop&q=80';
              const gradId = `bannerGrad_${banner.id || bannerIdx}`;

              return (
                <View key={banner.id || bannerIdx} style={{ width: width, alignItems: 'center' }}>
                  <TouchableOpacity
                    activeOpacity={0.92}
                    style={[
                      styles.bannerCard,
                      {
                        width: width - 32,
                      },
                    ]}
                    onPressIn={() => setIsBannerPaused(true)}
                    onPressOut={() => setIsBannerPaused(false)}
                    onPress={() => navigation.navigate('CategoryDetails', { categoryName: banner.targetCategory || 'Products' })}
                  >
                    {/* Full-Bleed Background Image (100% width and height) */}
                    <Image
                      source={{ uri: resolvedBannerImg }}
                      style={styles.bannerBgImage}
                      resizeMode="cover"
                    />

                    {(() => {
                      const isGraphicBanner = Boolean(
                        banner.image &&
                        (banner.image.includes('/uploads/') ||
                         banner.image.includes('api.ficapp.in') ||
                         banner.title?.toLowerCase().includes('diwali') ||
                         banner.title?.toLowerCase().includes('offer') ||
                         banner.categoryTag === 'GRAPHIC')
                      );

                      if (isGraphicBanner) {
                        return (
                          <View
                            style={{
                              position: 'absolute',
                              bottom: 10,
                              right: 12,
                              backgroundColor: 'rgba(0, 0, 0, 0.65)',
                              paddingHorizontal: 12,
                              paddingVertical: 5,
                              borderRadius: 12,
                              borderWidth: 1,
                              borderColor: 'rgba(245, 158, 11, 0.4)',
                            }}
                          >
                            <Text style={{ color: '#F59E0B', fontSize: 11, fontWeight: '800' }}>
                              {banner.buttonText ? `${banner.buttonText} →` : 'Shop Now →'}
                            </Text>
                          </View>
                        );
                      }

                      return (
                        <>
                          {/* Gradient Overlay for Crisp Text Legibility */}
                          <Svg height="100%" width="100%" style={StyleSheet.absoluteFill}>
                            <Defs>
                              <SvgLinearGradient id={gradId} x1="0" y1="0" x2="1" y2="0">
                                <Stop offset="0%" stopColor="#120E0B" stopOpacity="0.95" />
                                <Stop offset="45%" stopColor="#120E0B" stopOpacity="0.85" />
                                <Stop offset="70%" stopColor="#120E0B" stopOpacity="0.45" />
                                <Stop offset="90%" stopColor="#120E0B" stopOpacity="0.10" />
                                <Stop offset="100%" stopColor="#120E0B" stopOpacity="0.0" />
                              </SvgLinearGradient>
                            </Defs>
                            <Rect width="100%" height="100%" fill={`url(#${gradId})`} />
                          </Svg>

                          {/* Content Layer */}
                          <View style={styles.bannerContent}>
                            <View style={styles.bannerTopGroup}>
                              <View style={styles.bannerBadgeContainer}>
                                <Icons.Tag color="#F59E0B" size={10} />
                                <Text style={styles.bannerBadgeText}>
                                  {(banner.categoryTag || banner.badgeText || 'SPECIAL OFFER').toUpperCase()}
                                </Text>
                              </View>

                              <View style={styles.bannerTitleGroup}>
                                <Text style={styles.bannerTitleWhite} numberOfLines={1}>
                                  {firstLine}
                                </Text>
                                <Text style={styles.bannerTitleAmber} numberOfLines={1}>
                                  {secondLine}
                                </Text>
                              </View>

                              <Text style={styles.bannerSubtitle} numberOfLines={2}>
                                {banner.subtitle || 'Get up to 50% OFF on your favourite items'}
                              </Text>
                            </View>

                            <TouchableOpacity
                              style={styles.bannerBtn}
                              activeOpacity={0.85}
                              onPressIn={() => setIsBannerPaused(true)}
                              onPressOut={() => setIsBannerPaused(false)}
                              onPress={() => navigation.navigate('CategoryDetails', { categoryName: banner.targetCategory || 'Products' })}
                            >
                              <Text style={styles.bannerBtnText}>
                                {banner.buttonText ? `${banner.buttonText} →` : 'Order Now →'}
                              </Text>
                            </TouchableOpacity>
                          </View>

                          <View style={styles.bannerCircleBadge}>
                            <Text style={styles.bannerCircleSmallText}>UP TO</Text>
                            <Text style={styles.bannerCircleBigText}>{discountPercent}</Text>
                            <Text style={styles.bannerCircleSmallText}>OFF</Text>
                          </View>
                        </>
                      );
                    })()}
                  </TouchableOpacity>
                </View>
              );
            })}

          </ScrollView>

          {/* Dots Indicator */}
          <View style={styles.bannerDotsRow}>
            {(banners || []).map((_, idx) => (
              <TouchableOpacity
                key={idx}
                activeOpacity={0.7}
                onPress={() => {
                  setActiveBannerIndex(idx);
                  bannerScrollViewRef.current?.scrollTo({
                    x: idx * width,
                    animated: true,
                  });
                }}
              >
                <View
                  style={[
                    styles.bannerDot,
                    activeBannerIndex === idx && styles.bannerDotActive,
                  ]}
                />
              </TouchableOpacity>
            ))}
          </View>

        </View>


        {/* 1. Category Shortcuts (2x4 Grid matching approved reference) */}
        <View style={[styles.sectionContainer, { marginTop: 14, paddingHorizontal: 16 }]}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 14 }}>
            {DISCOVERY_CATEGORIES.map((cat, idx) => (
              <TouchableOpacity
                key={idx}
                style={{ width: '23%', alignItems: 'center' }}
                activeOpacity={0.8}
                onPress={() => {
                  if (cat.name === 'All') {
                    navigation.navigate('CustomerTabs', { screen: 'Categories' });
                  } else if (cat.name === 'Travel') {
                    setIsTravelSearchModalVisible(true);
                  } else {
                    navigation.navigate('CategoryDetails', { categoryName: cat.name });
                  }
                }}
              >
                <View
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 18,
                    backgroundColor: isLightActive ? cat.bg : 'rgba(255, 255, 255, 0.08)',
                    borderColor: isLightActive ? (cat.border || '#F1EAD8') : colors.cardBorder,
                    borderWidth: 1.5,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 6,
                    shadowColor: cat.color,
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: isLightActive ? 0.08 : 0.2,
                    shadowRadius: 4,
                    elevation: 2,
                  }}
                >
                  {renderCategoryIcon(cat.icon, cat.color, 25)}
                </View>
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '700',
                    color: colors.text,
                    textAlign: 'center',
                  }}
                  numberOfLines={1}
                >
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 2. "RECOMMENDED FOR YOU" Deck */}
        <View style={[styles.sectionContainer, { marginTop: 22 }]}>
          <View style={styles.sectionHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Icons.Star color="#F5B800" size={16} fill="#F5B800" />
              <Text style={[styles.sectionHeader, { color: colors.text, letterSpacing: 0.5, fontWeight: '800' }]}>
                {t('RECOMMENDED FOR YOU')}
              </Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('CustomerTabs', { screen: 'Categories' })}>
              <Text style={[styles.viewAllText, { color: colors.primary }]}>{t('view_all')}</Text>
            </TouchableOpacity>
          </View>
          {(!hasLoadedInitial && dbProducts.length === 0) || (isProductsLoading && dbProducts.length === 0) ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
              <SkeletonCard isLightActive={isLightActive} />
              <SkeletonCard isLightActive={isLightActive} />
              <SkeletonCard isLightActive={isLightActive} />
            </ScrollView>
          ) : (recommendedItems.length === 0 && dbProducts.length === 0) ? (
            <View style={{ paddingVertical: 18, paddingHorizontal: 16, alignItems: 'center' }}>
              <Text style={{ color: isLightActive ? '#64748B' : 'rgba(255, 255, 255, 0.5)', fontSize: 13 }}>
                {t('No recommendations available')}
              </Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
              {(recommendedItems.length > 0 ? recommendedItems : dbProducts.slice(0, 10)).map((prod: any) => {
                const cardId = prod._id || prod.id;
                const rawImg = prod.image || prod.imageUrl || (Array.isArray(prod.images) && prod.images[0]?.url) || '';
                const itemImg = resolveImageUrl(rawImg) || getRelevantProductImage(prod.name, prod.category, prod.subcategory) || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80';
                const isWishlisted = useWishlistStore.getState().wishlistItems.some((w) => w.id === cardId);
                const numPrice = typeof prod.price === 'number' ? `₹${prod.price.toLocaleString('en-IN')}` : String(prod.price || '₹499');
                const isStay = normalizeMainCategoryName(prod.mainCategory || prod.subNavbarCategory) === 'Stay' || (prod.category || '').toLowerCase().includes('hotel') || (prod.category || '').toLowerCase().includes('resort');
                const displayPrice = isStay && !numPrice.includes('/night') ? `${numPrice}/night` : numPrice;

                // Price & Discount calculation for strikethrough (Reference Image 3)
                const rawOriginal = prod.originalPrice || prod.mrp;
                const origPriceNum = typeof rawOriginal === 'number' ? rawOriginal : (rawOriginal ? parseInt(String(rawOriginal).replace(/[^\d]/g, ''), 10) : 0);
                const curPriceNum = typeof prod.price === 'number' ? prod.price : parseInt(String(prod.price || '0').replace(/[^\d]/g, ''), 10);
                const hasDiscount = origPriceNum > curPriceNum;
                const discountText = prod.discount || (hasDiscount ? `${Math.round(((origPriceNum - curPriceNum) / origPriceNum) * 100)}% OFF` : null);
                const displayOriginalPrice = hasDiscount ? `₹${origPriceNum.toLocaleString('en-IN')}` : null;

                // Clean Subtitle (e.g. "Hot & Fresh | Italian", "Private Pool | 5 BHK")
                const subCategoryPart = prod.subcategory && prod.subcategory !== prod.name ? prod.subcategory : '';
                const brandOrCategory = prod.brand || prod.category || '';
                const specSubtitle = (subCategoryPart && brandOrCategory && subCategoryPart !== brandOrCategory)
                  ? `${subCategoryPart} | ${brandOrCategory}`
                  : (subCategoryPart || brandOrCategory || 'Featured');

                const ratingValue = prod.rating ? String(prod.rating) : '4.5';
                const isTopRated = !discountText && (parseFloat(ratingValue) >= 4.5 || isStay);

                return (
                  <TouchableOpacity
                    key={`rec_${cardId}`}
                    style={{
                      width: 170,
                      marginRight: 14,
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: isLightActive ? '#F1EAD8' : colors.cardBorder,
                      backgroundColor: isLightActive ? '#FFFFFF' : 'rgba(13, 22, 54, 0.75)',
                      overflow: 'hidden',
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 3 },
                      shadowOpacity: 0.08,
                      shadowRadius: 8,
                      elevation: 3,
                    }}
                    activeOpacity={0.88}
                    onPress={() => {
                      if (isStay) {
                        navigation.navigate('StayDetails', {
                          stay: {
                            ...prod,
                            priceNum: typeof prod.price === 'number' ? prod.price : (parseFloat(String(prod.price || '0').replace(/[^\d.]/g, '')) || 0),
                          },
                        });
                      } else if (normalizeMainCategoryName(prod.mainCategory || prod.subNavbarCategory) === 'Travel') {
                        navigation.navigate('CategoryDetails', { categoryName: 'Travel' });
                      } else {
                        const cardItem = formatCardItem(prod);
                        navigation.navigate('ProductDetails', { item: cardItem, category: cardItem.category });
                      }
                    }}
                  >
                    {/* Top Full-Width Image Container with Overlays (Reference Image 3) */}
                    <View
                      style={{
                        width: '100%',
                        height: 130,
                        backgroundColor: isLightActive ? '#F8FAFC' : 'rgba(255, 255, 255, 0.05)',
                        position: 'relative',
                        overflow: 'hidden',
                      }}
                    >
                      <Image
                        source={{ uri: itemImg }}
                        style={{ width: '100%', height: '100%' }}
                        resizeMode="cover"
                      />

                      {/* Top-Left Rating Pill */}
                      <View
                        style={{
                          position: 'absolute',
                          top: 8,
                          left: 8,
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 3.5,
                          backgroundColor: 'rgba(255, 255, 255, 0.95)',
                          paddingHorizontal: 7,
                          paddingVertical: 3,
                          borderRadius: 10,
                          shadowColor: '#000',
                          shadowOffset: { width: 0, height: 1 },
                          shadowOpacity: 0.15,
                          shadowRadius: 2,
                          elevation: 2,
                        }}
                      >
                        <Icons.Star color="#F5B800" size={11} fill="#F5B800" />
                        <Text style={{ fontSize: 11, fontWeight: '800', color: '#0F172A' }}>
                          {ratingValue}
                        </Text>
                      </View>

                      {/* Top-Right Wishlist Heart Button */}
                      <TouchableOpacity
                        onPress={() => useWishlistStore.getState().toggleWishlist(formatCardItem(prod))}
                        style={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          width: 28,
                          height: 28,
                          borderRadius: 14,
                          backgroundColor: 'rgba(255, 255, 255, 0.95)',
                          alignItems: 'center',
                          justifyContent: 'center',
                          shadowColor: '#000',
                          shadowOffset: { width: 0, height: 1 },
                          shadowOpacity: 0.15,
                          shadowRadius: 2,
                          elevation: 2,
                        }}
                      >
                        <Icons.Heart
                          size={14}
                          color={isWishlisted ? '#EF4444' : '#0F172A'}
                          fill={isWishlisted ? '#EF4444' : 'transparent'}
                          strokeWidth={2.2}
                        />
                      </TouchableOpacity>

                      {/* Bottom-Left Badge (Red Discount or Blue Top Rated) */}
                      {discountText ? (
                        <View
                          style={{
                            position: 'absolute',
                            bottom: 8,
                            left: 8,
                            backgroundColor: '#FF3B30',
                            paddingHorizontal: 7,
                            paddingVertical: 3,
                            borderRadius: 6,
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 1 },
                            shadowOpacity: 0.2,
                            shadowRadius: 2,
                            elevation: 2,
                          }}
                        >
                          <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '800', letterSpacing: 0.3 }}>
                            {discountText}
                          </Text>
                        </View>
                      ) : isTopRated ? (
                        <View
                          style={{
                            position: 'absolute',
                            bottom: 8,
                            left: 8,
                            backgroundColor: '#0284C7',
                            paddingHorizontal: 7,
                            paddingVertical: 3,
                            borderRadius: 6,
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 1 },
                            shadowOpacity: 0.2,
                            shadowRadius: 2,
                            elevation: 2,
                          }}
                        >
                          <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '800', letterSpacing: 0.3 }}>
                            Top Rated
                          </Text>
                        </View>
                      ) : null}
                    </View>

                    {/* Bottom Details Section */}
                    <View style={{ padding: 10, paddingTop: 8 }}>
                      <Text style={{ fontSize: 13.5, fontWeight: '800', color: colors.text }} numberOfLines={1}>
                        {prod.name}
                      </Text>
                      <Text style={{ fontSize: 11, color: isLightActive ? '#64748B' : 'rgba(255, 255, 255, 0.6)', marginTop: 2, marginBottom: 6 }} numberOfLines={1}>
                        {specSubtitle}
                      </Text>

                      {/* Price & Solid Orange Add Button */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'baseline', flex: 1, marginRight: 6 }}>
                          <Text style={{ fontSize: 15.5, fontWeight: '900', color: isLightActive ? '#0F172A' : '#F5B800' }}>
                            {displayPrice}
                          </Text>
                          {displayOriginalPrice && (
                            <Text style={{ fontSize: 11, color: isLightActive ? '#94A3B8' : 'rgba(255, 255, 255, 0.4)', textDecorationLine: 'line-through', marginLeft: 4 }}>
                              {displayOriginalPrice}
                            </Text>
                          )}
                        </View>
                        <TouchableOpacity
                          activeOpacity={0.8}
                          onPress={(e) => {
                            e.stopPropagation?.();
                            const cardItem = formatCardItem(prod);
                            addToCart(cardItem);
                            showToast(t('Added to cart'), 'success');
                          }}
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 10,
                            backgroundColor: '#FF6A00',
                            alignItems: 'center',
                            justifyContent: 'center',
                            shadowColor: '#FF6A00',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.25,
                            shadowRadius: 3,
                            elevation: 3,
                          }}
                        >
                          <Icons.Plus color="#FFFFFF" size={17} strokeWidth={2.8} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>

        {/* 4. "Picked for you ✨" (2-Column Personalized Grid) */}
        <View style={[styles.sectionContainer, { marginTop: 22 }]}>
          <View style={styles.sectionHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Icons.Sparkles color="#F5B800" size={16} />
              <Text style={[styles.sectionHeader, { color: colors.text }]}>{t('picked_for_you')}</Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('CustomerTabs', { screen: 'Categories' })}>
              <Text style={[styles.viewAllText, { color: colors.primary }]}>{t('view_all')}</Text>
            </TouchableOpacity>
          </View>

          {(!hasLoadedInitial && dbProducts.length === 0) || (isProductsLoading && dbProducts.length === 0) ? (
            <View style={styles.feedGrid}>
              <SkeletonGridCard isLightActive={isLightActive} cardWidth={(width - 44) / 2} />
              <SkeletonGridCard isLightActive={isLightActive} cardWidth={(width - 44) / 2} />
              <SkeletonGridCard isLightActive={isLightActive} cardWidth={(width - 44) / 2} />
              <SkeletonGridCard isLightActive={isLightActive} cardWidth={(width - 44) / 2} />
            </View>
          ) : dbProducts.length === 0 ? (
            <View style={{ paddingVertical: 24, paddingHorizontal: 16, alignItems: 'center' }}>
              <Text style={{ color: isLightActive ? '#64748B' : 'rgba(255, 255, 255, 0.5)', fontSize: 13 }}>{t('No products available at the moment')}</Text>
            </View>
          ) : (
            <View style={styles.feedGrid}>
              {pickedForYouCards.map((item) => (
                <ProductCard
                  key={`pfy_${item.id}`}
                  item={item}
                  onPress={() => navigation.navigate('ProductDetails', { item, category: item.category })}
                  onPlaceOrder={handlePlaceOrder}
                />
              ))}
            </View>
          )}
        </View>

        {/* Category Showcases: Products, Services, Daily Needs, Food, Stay, Travel */}
        
        {/* Category Showcase: Products */}
        {productsList.length > 0 && (
          <View style={[styles.sectionContainer, { marginTop: 22 }]}>
            <View style={styles.sectionHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Icons.Package color="#F5B800" size={16} />
                <Text style={[styles.sectionHeader, { color: colors.text, fontWeight: '700' }]}>{t('Products')}</Text>
              </View>
              <TouchableOpacity onPress={() => navigation.navigate('CategoryDetails', { categoryName: 'Products' })}>
                <Text style={[styles.viewAllText, { color: colors.primary }]}>{t('view_all')}</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
              {productsList.slice(0, 10).map((prod: any) => {
                const cardId = prod._id || prod.id;
                const rawImg = prod.image || prod.imageUrl || (Array.isArray(prod.images) && prod.images[0]?.url) || '';
                const itemImg = resolveImageUrl(rawImg);
                const isWishlisted = useWishlistStore.getState().wishlistItems.some((w) => w.id === cardId);
                const numPrice = typeof prod.price === 'number' ? `₹${prod.price.toLocaleString('en-IN')}` : String(prod.price || '₹499');
                const cardItem = formatCardItem(prod);
                return (
                  <TouchableOpacity
                    key={`prod_${cardId}`}
                    style={{
                      width: 160,
                      marginRight: 12,
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: isLightActive ? '#F1EAD8' : colors.cardBorder,
                      backgroundColor: isLightActive ? '#FFFFFF' : 'rgba(13, 22, 54, 0.65)',
                      padding: 10,
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.05,
                      shadowRadius: 6,
                      elevation: 2,
                    }}
                    activeOpacity={0.88}
                    onPress={() => navigation.navigate('ProductDetails', { item: cardItem, category: 'Products' })}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: isLightActive ? '#FFFBEB' : 'rgba(255, 255, 255, 0.08)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 }}>
                        <Icons.Star color="#F5B800" size={11} fill="#F5B800" />
                        <Text style={{ fontSize: 11, fontWeight: '700', color: isLightActive ? '#0F172A' : '#FFFFFF' }}>
                          {prod.rating ? String(prod.rating) : '4.5'}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => useWishlistStore.getState().toggleWishlist(cardItem)}
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: 13,
                          backgroundColor: isLightActive ? '#F8FAFC' : 'rgba(255, 255, 255, 0.08)',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Icons.Heart
                          size={13}
                          color={isWishlisted ? '#EF4444' : (isLightActive ? '#94A3B8' : '#CBD5E1')}
                          fill={isWishlisted ? '#EF4444' : 'transparent'}
                        />
                      </TouchableOpacity>
                    </View>
                    <View
                      style={{
                        width: '100%',
                        height: 112,
                        borderRadius: 10,
                        backgroundColor: isLightActive ? '#F8FAFC' : 'rgba(255, 255, 255, 0.05)',
                        overflow: 'hidden',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 8,
                      }}
                    >
                      {itemImg ? (
                        <Image source={{ uri: itemImg }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                      ) : (
                        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                          <Icons.Image size={28} color="#94A3B8" />
                          <Text style={{ fontSize: 9.5, color: '#94A3B8', marginTop: 4 }}>{t('No image available')}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }} numberOfLines={1}>
                      {prod.name}
                    </Text>
                    <Text style={{ fontSize: 11, color: isLightActive ? '#64748B' : 'rgba(255, 255, 255, 0.6)', marginTop: 2 }} numberOfLines={1}>
                      {prod.subcategory || prod.category || 'Products'}
                    </Text>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: isLightActive ? '#0F172A' : '#F5B800', marginTop: 4 }}>
                      {numPrice}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Category Showcase: Services */}
        {servicesList.length > 0 && (
          <View style={[styles.sectionContainer, { marginTop: 22 }]}>
            <View style={styles.sectionHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Icons.Wrench color="#F5B800" size={16} />
                <Text style={[styles.sectionHeader, { color: colors.text, fontWeight: '700' }]}>{t('Services')}</Text>
              </View>
              <TouchableOpacity onPress={() => navigation.navigate('CategoryDetails', { categoryName: 'Services' })}>
                <Text style={[styles.viewAllText, { color: colors.primary }]}>{t('view_all')}</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
              {servicesList.slice(0, 10).map((prod: any) => {
                const cardId = prod._id || prod.id;
                const rawImg = prod.image || prod.imageUrl || (Array.isArray(prod.images) && prod.images[0]?.url) || '';
                const itemImg = resolveImageUrl(rawImg);
                const isWishlisted = useWishlistStore.getState().wishlistItems.some((w) => w.id === cardId);
                const numPrice = typeof prod.price === 'number' ? `₹${prod.price.toLocaleString('en-IN')}` : String(prod.price || '₹499');
                const cardItem = formatCardItem(prod);
                return (
                  <TouchableOpacity
                    key={`srv_${cardId}`}
                    style={{
                      width: 160,
                      marginRight: 12,
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: isLightActive ? '#F1EAD8' : colors.cardBorder,
                      backgroundColor: isLightActive ? '#FFFFFF' : 'rgba(13, 22, 54, 0.65)',
                      padding: 10,
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.05,
                      shadowRadius: 6,
                      elevation: 2,
                    }}
                    activeOpacity={0.88}
                    onPress={() => navigation.navigate('ProductDetails', { item: cardItem, category: 'Services' })}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: isLightActive ? '#FFFBEB' : 'rgba(255, 255, 255, 0.08)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 }}>
                        <Icons.Star color="#F5B800" size={11} fill="#F5B800" />
                        <Text style={{ fontSize: 11, fontWeight: '700', color: isLightActive ? '#0F172A' : '#FFFFFF' }}>
                          {prod.rating ? String(prod.rating) : '4.6'}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => useWishlistStore.getState().toggleWishlist(cardItem)}
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: 13,
                          backgroundColor: isLightActive ? '#F8FAFC' : 'rgba(255, 255, 255, 0.08)',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Icons.Heart
                          size={13}
                          color={isWishlisted ? '#EF4444' : (isLightActive ? '#94A3B8' : '#CBD5E1')}
                          fill={isWishlisted ? '#EF4444' : 'transparent'}
                        />
                      </TouchableOpacity>
                    </View>
                    <View
                      style={{
                        width: '100%',
                        height: 112,
                        borderRadius: 10,
                        backgroundColor: isLightActive ? '#F8FAFC' : 'rgba(255, 255, 255, 0.05)',
                        overflow: 'hidden',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 8,
                      }}
                    >
                      {itemImg ? (
                        <Image source={{ uri: itemImg }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                      ) : (
                        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                          <Icons.Image size={28} color="#94A3B8" />
                          <Text style={{ fontSize: 9.5, color: '#94A3B8', marginTop: 4 }}>{t('No image available')}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }} numberOfLines={1}>
                      {prod.name}
                    </Text>
                    <Text style={{ fontSize: 11, color: isLightActive ? '#64748B' : 'rgba(255, 255, 255, 0.6)', marginTop: 2 }} numberOfLines={1}>
                      {prod.subcategory || prod.category || 'Services'}
                    </Text>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: isLightActive ? '#0F172A' : '#F5B800', marginTop: 4 }}>
                      {numPrice}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Category Showcase: Daily Needs */}
        {dailyNeedsList.length > 0 && (
          <View style={[styles.sectionContainer, { marginTop: 22 }]}>
            <View style={styles.sectionHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Icons.ShoppingBag color="#F5B800" size={16} />
                <Text style={[styles.sectionHeader, { color: colors.text, fontWeight: '700' }]}>{t('Daily Needs')}</Text>
              </View>
              <TouchableOpacity onPress={() => navigation.navigate('CategoryDetails', { categoryName: 'Daily Needs' })}>
                <Text style={[styles.viewAllText, { color: colors.primary }]}>{t('view_all')}</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
              {dailyNeedsList.slice(0, 10).map((prod: any) => {
                const cardId = prod._id || prod.id;
                const rawImg = prod.image || prod.imageUrl || (Array.isArray(prod.images) && prod.images[0]?.url) || '';
                const itemImg = resolveImageUrl(rawImg);
                const isWishlisted = useWishlistStore.getState().wishlistItems.some((w) => w.id === cardId);
                const numPrice = typeof prod.price === 'number' ? `₹${prod.price.toLocaleString('en-IN')}` : String(prod.price || '₹99');
                const cardItem = formatCardItem(prod);
                return (
                  <TouchableOpacity
                    key={`dn_${cardId}`}
                    style={{
                      width: 160,
                      marginRight: 12,
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: isLightActive ? '#F1EAD8' : colors.cardBorder,
                      backgroundColor: isLightActive ? '#FFFFFF' : 'rgba(13, 22, 54, 0.65)',
                      padding: 10,
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.05,
                      shadowRadius: 6,
                      elevation: 2,
                    }}
                    activeOpacity={0.88}
                    onPress={() => navigation.navigate('ProductDetails', { item: cardItem, category: 'Daily Needs' })}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: isLightActive ? '#FFFBEB' : 'rgba(255, 255, 255, 0.08)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 }}>
                        <Icons.Star color="#F5B800" size={11} fill="#F5B800" />
                        <Text style={{ fontSize: 11, fontWeight: '700', color: isLightActive ? '#0F172A' : '#FFFFFF' }}>
                          {prod.rating ? String(prod.rating) : '4.5'}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => useWishlistStore.getState().toggleWishlist(cardItem)}
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: 13,
                          backgroundColor: isLightActive ? '#F8FAFC' : 'rgba(255, 255, 255, 0.08)',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Icons.Heart
                          size={13}
                          color={isWishlisted ? '#EF4444' : (isLightActive ? '#94A3B8' : '#CBD5E1')}
                          fill={isWishlisted ? '#EF4444' : 'transparent'}
                        />
                      </TouchableOpacity>
                    </View>
                    <View
                      style={{
                        width: '100%',
                        height: 112,
                        borderRadius: 10,
                        backgroundColor: isLightActive ? '#F8FAFC' : 'rgba(255, 255, 255, 0.05)',
                        overflow: 'hidden',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 8,
                      }}
                    >
                      {itemImg ? (
                        <Image source={{ uri: itemImg }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                      ) : (
                        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                          <Icons.Image size={28} color="#94A3B8" />
                          <Text style={{ fontSize: 9.5, color: '#94A3B8', marginTop: 4 }}>{t('No image available')}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }} numberOfLines={1}>
                      {prod.name}
                    </Text>
                    <Text style={{ fontSize: 11, color: isLightActive ? '#64748B' : 'rgba(255, 255, 255, 0.6)', marginTop: 2 }} numberOfLines={1}>
                      {prod.subcategory || prod.category || 'Daily Needs'}
                    </Text>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: isLightActive ? '#0F172A' : '#F5B800', marginTop: 4 }}>
                      {numPrice}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Category Showcase: Food */}
        {foodList.length > 0 && (
          <View style={[styles.sectionContainer, { marginTop: 22 }]}>
            <View style={styles.sectionHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Icons.Utensils color="#F5B800" size={16} />
                <Text style={[styles.sectionHeader, { color: colors.text, fontWeight: '700' }]}>{t('Food')}</Text>
              </View>
              <TouchableOpacity onPress={() => navigation.navigate('CategoryDetails', { categoryName: 'Food' })}>
                <Text style={[styles.viewAllText, { color: colors.primary }]}>{t('view_all')}</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
              {foodList.slice(0, 10).map((prod: any) => {
                const cardId = prod._id || prod.id;
                const rawImg = prod.image || prod.imageUrl || (Array.isArray(prod.images) && prod.images[0]?.url) || '';
                const itemImg = resolveImageUrl(rawImg);
                const isWishlisted = useWishlistStore.getState().wishlistItems.some((w) => w.id === cardId);
                const numPrice = typeof prod.price === 'number' ? `₹${prod.price.toLocaleString('en-IN')}` : String(prod.price || '₹199');
                const cardItem = formatCardItem(prod);
                return (
                  <TouchableOpacity
                    key={`food_${cardId}`}
                    style={{
                      width: 160,
                      marginRight: 12,
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: isLightActive ? '#F1EAD8' : colors.cardBorder,
                      backgroundColor: isLightActive ? '#FFFFFF' : 'rgba(13, 22, 54, 0.65)',
                      padding: 10,
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.05,
                      shadowRadius: 6,
                      elevation: 2,
                    }}
                    activeOpacity={0.88}
                    onPress={() => navigation.navigate('ProductDetails', { item: cardItem, category: 'Food' })}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: isLightActive ? '#FFFBEB' : 'rgba(255, 255, 255, 0.08)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 }}>
                        <Icons.Star color="#F5B800" size={11} fill="#F5B800" />
                        <Text style={{ fontSize: 11, fontWeight: '700', color: isLightActive ? '#0F172A' : '#FFFFFF' }}>
                          {prod.rating ? String(prod.rating) : '4.5'}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => useWishlistStore.getState().toggleWishlist(cardItem)}
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: 13,
                          backgroundColor: isLightActive ? '#F8FAFC' : 'rgba(255, 255, 255, 0.08)',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Icons.Heart
                          size={13}
                          color={isWishlisted ? '#EF4444' : (isLightActive ? '#94A3B8' : '#CBD5E1')}
                          fill={isWishlisted ? '#EF4444' : 'transparent'}
                        />
                      </TouchableOpacity>
                    </View>
                    <View
                      style={{
                        width: '100%',
                        height: 112,
                        borderRadius: 10,
                        backgroundColor: isLightActive ? '#F8FAFC' : 'rgba(255, 255, 255, 0.05)',
                        overflow: 'hidden',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 8,
                      }}
                    >
                      {itemImg ? (
                        <Image source={{ uri: itemImg }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                      ) : (
                        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                          <Icons.Image size={28} color="#94A3B8" />
                          <Text style={{ fontSize: 9.5, color: '#94A3B8', marginTop: 4 }}>{t('No image available')}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }} numberOfLines={1}>
                      {prod.name}
                    </Text>
                    <Text style={{ fontSize: 11, color: isLightActive ? '#64748B' : 'rgba(255, 255, 255, 0.6)', marginTop: 2 }} numberOfLines={1}>
                      {prod.subcategory || prod.category || 'Food'}
                    </Text>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: isLightActive ? '#0F172A' : '#F5B800', marginTop: 4 }}>
                      {numPrice}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Category Showcase: Stay */}
        {stayList.length > 0 && (
          <View style={[styles.sectionContainer, { marginTop: 22 }]}>
            <View style={styles.sectionHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Icons.Bed color="#F5B800" size={16} />
                <Text style={[styles.sectionHeader, { color: colors.text, fontWeight: '700' }]}>{t('Stay')}</Text>
              </View>
              <TouchableOpacity onPress={() => navigation.navigate('CategoryDetails', { categoryName: 'Stay' })}>
                <Text style={[styles.viewAllText, { color: colors.primary }]}>{t('view_all')}</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
              {stayList.slice(0, 10).map((prod: any) => {
                const cardId = prod._id || prod.id;
                const rawImg = prod.image || prod.imageUrl || (Array.isArray(prod.images) && prod.images[0]?.url) || '';
                const itemImg = resolveImageUrl(rawImg);
                const isWishlisted = useWishlistStore.getState().wishlistItems.some((w) => w.id === cardId);
                const rawPrice = typeof prod.price === 'number' ? `₹${prod.price.toLocaleString('en-IN')}` : String(prod.price || '₹1,500');
                const displayPrice = rawPrice.includes('/night') ? rawPrice : `${rawPrice}/night`;
                return (
                  <TouchableOpacity
                    key={`stay_${cardId}`}
                    style={{
                      width: 160,
                      marginRight: 12,
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: isLightActive ? '#F1EAD8' : colors.cardBorder,
                      backgroundColor: isLightActive ? '#FFFFFF' : 'rgba(13, 22, 54, 0.65)',
                      padding: 10,
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.05,
                      shadowRadius: 6,
                      elevation: 2,
                    }}
                    activeOpacity={0.88}
                    onPress={() => navigation.navigate('StayDetails', {
                      stay: {
                        ...prod,
                        priceNum: typeof prod.price === 'number' ? prod.price : (parseFloat(String(prod.price || '0').replace(/[^\d.]/g, '')) || 0),
                      },
                    })}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: isLightActive ? '#FFFBEB' : 'rgba(255, 255, 255, 0.08)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 }}>
                        <Icons.Star color="#F5B800" size={11} fill="#F5B800" />
                        <Text style={{ fontSize: 11, fontWeight: '700', color: isLightActive ? '#0F172A' : '#FFFFFF' }}>
                          {prod.rating ? String(prod.rating) : '4.6'}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => useWishlistStore.getState().toggleWishlist(formatCardItem(prod))}
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: 13,
                          backgroundColor: isLightActive ? '#F8FAFC' : 'rgba(255, 255, 255, 0.08)',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Icons.Heart
                          size={13}
                          color={isWishlisted ? '#EF4444' : (isLightActive ? '#94A3B8' : '#CBD5E1')}
                          fill={isWishlisted ? '#EF4444' : 'transparent'}
                        />
                      </TouchableOpacity>
                    </View>
                    <View
                      style={{
                        width: '100%',
                        height: 112,
                        borderRadius: 10,
                        backgroundColor: isLightActive ? '#F8FAFC' : 'rgba(255, 255, 255, 0.05)',
                        overflow: 'hidden',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 8,
                      }}
                    >
                      {itemImg ? (
                        <Image source={{ uri: itemImg }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                      ) : (
                        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                          <Icons.Image size={28} color="#94A3B8" />
                          <Text style={{ fontSize: 9.5, color: '#94A3B8', marginTop: 4 }}>{t('No image available')}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }} numberOfLines={1}>
                      {prod.name}
                    </Text>
                    <Text style={{ fontSize: 11, color: isLightActive ? '#64748B' : 'rgba(255, 255, 255, 0.6)', marginTop: 2 }} numberOfLines={1}>
                      {prod.subcategory || prod.category || 'Hotels & Resorts'}
                    </Text>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: isLightActive ? '#0F172A' : '#F5B800', marginTop: 4 }}>
                      {displayPrice}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Category Showcase: Travel */}
        {travelList.length > 0 && (
          <View style={[styles.sectionContainer, { marginTop: 22 }]}>
            <View style={styles.sectionHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Icons.Compass color="#F5B800" size={16} />
                <Text style={[styles.sectionHeader, { color: colors.text, fontWeight: '700' }]}>{t('Travel')}</Text>
              </View>
              <TouchableOpacity onPress={() => navigation.navigate('CategoryDetails', { categoryName: 'Travel' })}>
                <Text style={[styles.viewAllText, { color: colors.primary }]}>{t('view_all')}</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
              {travelList.slice(0, 10).map((prod: any) => {
                const cardId = prod._id || prod.id;
                const rawImg = prod.image || prod.imageUrl || (Array.isArray(prod.images) && prod.images[0]?.url) || '';
                const itemImg = resolveImageUrl(rawImg);
                const isWishlisted = useWishlistStore.getState().wishlistItems.some((w) => w.id === cardId);
                const numPrice = typeof prod.price === 'number' ? `₹${prod.price.toLocaleString('en-IN')}` : String(prod.price || '₹799');
                return (
                  <TouchableOpacity
                    key={`trv_${cardId}`}
                    style={{
                      width: 160,
                      marginRight: 12,
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: isLightActive ? '#F1EAD8' : colors.cardBorder,
                      backgroundColor: isLightActive ? '#FFFFFF' : 'rgba(13, 22, 54, 0.65)',
                      padding: 10,
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.05,
                      shadowRadius: 6,
                      elevation: 2,
                    }}
                    activeOpacity={0.88}
                    onPress={() => navigation.navigate('CategoryDetails', { categoryName: 'Travel' })}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: isLightActive ? '#FFFBEB' : 'rgba(255, 255, 255, 0.08)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 }}>
                        <Icons.Star color="#F5B800" size={11} fill="#F5B800" />
                        <Text style={{ fontSize: 11, fontWeight: '700', color: isLightActive ? '#0F172A' : '#FFFFFF' }}>
                          {prod.rating ? String(prod.rating) : '4.7'}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => useWishlistStore.getState().toggleWishlist(formatCardItem(prod))}
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: 13,
                          backgroundColor: isLightActive ? '#F8FAFC' : 'rgba(255, 255, 255, 0.08)',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Icons.Heart
                          size={13}
                          color={isWishlisted ? '#EF4444' : (isLightActive ? '#94A3B8' : '#CBD5E1')}
                          fill={isWishlisted ? '#EF4444' : 'transparent'}
                        />
                      </TouchableOpacity>
                    </View>
                    <View
                      style={{
                        width: '100%',
                        height: 112,
                        borderRadius: 10,
                        backgroundColor: isLightActive ? '#F8FAFC' : 'rgba(255, 255, 255, 0.05)',
                        overflow: 'hidden',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 8,
                      }}
                    >
                      {itemImg ? (
                        <Image source={{ uri: itemImg }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                      ) : (
                        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                          <Icons.Image size={28} color="#94A3B8" />
                          <Text style={{ fontSize: 9.5, color: '#94A3B8', marginTop: 4 }}>{t('No image available')}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }} numberOfLines={1}>
                      {prod.name}
                    </Text>
                    <Text style={{ fontSize: 11, color: isLightActive ? '#64748B' : 'rgba(255, 255, 255, 0.6)', marginTop: 2 }} numberOfLines={1}>
                      {prod.subcategory || prod.category || 'Travel & Bus'}
                    </Text>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: isLightActive ? '#0F172A' : '#F5B800', marginTop: 4 }}>
                      {numPrice}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Category Showcase: Jobs */}
        {jobsList.length > 0 && (
          <View style={[styles.sectionContainer, { marginTop: 22, marginBottom: 40 }]}>
            <View style={styles.sectionHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Icons.Briefcase color="#F5B800" size={16} />
                <Text style={[styles.sectionHeader, { color: colors.text, fontWeight: '700' }]}>{t('Jobs')}</Text>
              </View>
              <TouchableOpacity onPress={() => navigation.navigate('CategoryDetails', { categoryName: 'Jobs' })}>
                <Text style={[styles.viewAllText, { color: colors.primary }]}>{t('view_all')}</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
              {jobsList.slice(0, 10).map((prod: any) => {
                const cardId = prod._id || prod.id;
                const rawImg = prod.image || prod.imageUrl || (Array.isArray(prod.images) && prod.images[0]?.url) || '';
                const itemImg = resolveImageUrl(rawImg);
                const isWishlisted = useWishlistStore.getState().wishlistItems.some((w) => w.id === cardId);
                const numSalary = prod.salary || (typeof prod.price === 'number' ? `₹${prod.price.toLocaleString('en-IN')}/mo` : String(prod.price || '₹25,000/mo'));
                return (
                  <TouchableOpacity
                    key={`job_${cardId}`}
                    style={{
                      width: 160,
                      marginRight: 12,
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: isLightActive ? '#F1EAD8' : colors.cardBorder,
                      backgroundColor: isLightActive ? '#FFFFFF' : 'rgba(13, 22, 54, 0.65)',
                      padding: 10,
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.05,
                      shadowRadius: 6,
                      elevation: 2,
                    }}
                    activeOpacity={0.88}
                    onPress={() => navigation.navigate('JobDetails', { job: prod, openApplySheet: false })}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: isLightActive ? '#FFFBEB' : 'rgba(255, 255, 255, 0.08)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 }}>
                        <Icons.Star color="#F5B800" size={11} fill="#F5B800" />
                        <Text style={{ fontSize: 11, fontWeight: '700', color: isLightActive ? '#0F172A' : '#FFFFFF' }}>
                          {prod.rating ? String(prod.rating) : '4.8'}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => useWishlistStore.getState().toggleWishlist(formatCardItem(prod))}
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: 13,
                          backgroundColor: isLightActive ? '#F8FAFC' : 'rgba(255, 255, 255, 0.08)',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Icons.Heart
                          size={13}
                          color={isWishlisted ? '#EF4444' : (isLightActive ? '#94A3B8' : '#CBD5E1')}
                          fill={isWishlisted ? '#EF4444' : 'transparent'}
                        />
                      </TouchableOpacity>
                    </View>
                    <View
                      style={{
                        width: '100%',
                        height: 112,
                        borderRadius: 10,
                        backgroundColor: isLightActive ? '#F8FAFC' : 'rgba(255, 255, 255, 0.05)',
                        overflow: 'hidden',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 8,
                      }}
                    >
                      {itemImg ? (
                        <Image source={{ uri: itemImg }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                      ) : (
                        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                          <Icons.Briefcase size={28} color="#94A3B8" />
                          <Text style={{ fontSize: 9.5, color: '#94A3B8', marginTop: 4 }}>{t('Job Opening')}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }} numberOfLines={1}>
                      {prod.name || prod.title}
                    </Text>
                    <Text style={{ fontSize: 11, color: isLightActive ? '#64748B' : 'rgba(255, 255, 255, 0.6)', marginTop: 2 }} numberOfLines={1}>
                      {prod.subcategory || prod.category || prod.company || 'Jobs'}
                    </Text>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: isLightActive ? '#0F172A' : '#F5B800', marginTop: 4 }}>
                      {numSalary}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

      </ScrollView>

      {/* Cart Modal Dialog Sheet */}
      <CartModal 
        visible={isCartVisible}
        onClose={() => setIsCartVisible(false)}
        navigation={navigation}
      />

      {/* Travel Search & Availability Modal */}
      <TravelSearchModal
        visible={isTravelSearchModalVisible}
        onClose={() => setIsTravelSearchModalVisible(false)}
        onSearch={(params: TravelSearchParams) => {
          setIsTravelSearchModalVisible(false);
          navigation.navigate('CategoryDetails', {
            categoryName: 'Travel',
            from: params.from,
            to: params.to,
            journeyDate: params.journeyDate,
            departureTime: params.departureTime,
            priceRange: params.priceRange,
            travelType: params.travelType,
            passengers: params.passengers,
          });
        }}
      />


      {/* Wishlist Modal Dialog Sheet */}
      <WishlistModal 
        visible={isWishlistVisible}
        onClose={() => setIsWishlistVisible(false)}
      />

      {/* Vendor Add Banner Modal */}
      <VendorBannerModal
        visible={isVendorBannerModalOpen}
        onClose={() => setIsVendorBannerModalOpen(false)}
      />

      {/* Recommended Partners view all bottom sheet */}
      <Modal
        visible={isPartnersModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsPartnersModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.partnerBottomSheetBackdrop}
          activeOpacity={1}
          onPress={() => setIsPartnersModalVisible(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={[
              styles.partnerBottomSheetContainer,
              {
                backgroundColor: isLightActive ? '#FFF8E8' : '#0B132B',
                borderColor: isLightActive ? '#F1EAD8' : 'rgba(255, 255, 255, 0.1)',
              },
            ]}
          >
            {/* Drag Handle */}
            <View style={styles.sheetDragHandle} />

            {/* Header */}
            <View style={styles.partnerSheetHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.partnerSheetTitle, { color: colors.text }]}>Recommended Partner Hubs</Text>
                <Text style={[styles.partnerSheetSubtitle, { color: isLightActive ? '#64748B' : '#94A3B8' }]}>
                  Verified nearby partners delivering to your location
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsPartnersModalVisible(false)}
                style={[
                  styles.partnerSheetCloseBtn,
                  { backgroundColor: isLightActive ? '#F1F5F9' : 'rgba(255,255,255,0.08)' },
                ]}
              >
                <Icons.X color={colors.text} size={18} />
              </TouchableOpacity>
            </View>

            {/* Category Filter Chips */}
            <View style={styles.partnerChipsWrapper}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.partnerChipsRow}>
                {['All', 'Services', 'Daily Needs', 'Food', 'Stay', 'Products'].map((cat) => {
                  const isSelected = (partnerCatFilter || 'All') === cat;
                  return (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.partnerCatChip,
                        {
                          backgroundColor: isSelected
                            ? '#F5B800'
                            : isLightActive
                            ? '#FFFFFF'
                            : 'rgba(255, 255, 255, 0.05)',
                          borderColor: isSelected
                            ? '#F5B800'
                            : isLightActive
                            ? '#E2E8F0'
                            : 'rgba(255, 255, 255, 0.1)',
                        },
                      ]}
                      onPress={() => setPartnerCatFilter(cat)}
                    >
                      <Text
                        style={[
                          styles.partnerCatChipText,
                          {
                            color: isSelected
                              ? '#0F172A'
                              : isLightActive
                              ? '#475569'
                              : '#CBD5E1',
                            fontWeight: isSelected ? '800' : '600',
                          },
                        ]}
                      >
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Partner Cards List */}
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, gap: 10 }}
              showsVerticalScrollIndicator={false}
              removeClippedSubviews={true}
              scrollEventThrottle={16}
            >
              {(dbVendors || [])
                .filter((p) => {
                  if (!partnerCatFilter || partnerCatFilter === 'All') return true;
                  return (p.category || '').toLowerCase() === partnerCatFilter.toLowerCase();
                })
                .sort((a, b) => {
                  const distA = parseFloat(String(a.distance || '99').replace(/[^\d.]/g, '')) || 99;
                  const distB = parseFloat(String(b.distance || '99').replace(/[^\d.]/g, '')) || 99;
                  return distA - distB;
                })
                .map((partner, idx) => {
                  const cat = partner.category || 'Services';
                  const ctaLabel =
                    cat === 'Services'
                      ? 'Book'
                      : cat === 'Food'
                      ? 'Order'
                      : cat === 'Stay'
                      ? 'Reserve'
                      : 'Explore';

                  return (
                    <TouchableOpacity
                      key={partner.id || idx}
                      style={[
                        styles.partnerCompactCard,
                        {
                          backgroundColor: isLightActive ? '#FFFFFF' : 'rgba(255, 255, 255, 0.04)',
                          borderColor: isLightActive ? '#F1EAD8' : 'rgba(255, 255, 255, 0.08)',
                        },
                      ]}
                      activeOpacity={0.85}
                      onPress={() => {
                        setIsPartnersModalVisible(false);
                        navigation.navigate('CategoryDetails', { categoryName: cat, vendor: partner });
                      }}
                    >
                      <Image source={{ uri: partner.image }} style={styles.partnerCompactImg} />
                      <View style={styles.partnerCompactInfo}>
                        <View style={styles.partnerTopMetaRow}>
                          <View
                            style={[
                              styles.partnerCategoryTag,
                              {
                                backgroundColor:
                                  cat === 'Services'
                                    ? 'rgba(59, 130, 246, 0.12)'
                                    : cat === 'Daily Needs'
                                    ? 'rgba(16, 185, 129, 0.12)'
                                    : cat === 'Food'
                                    ? 'rgba(245, 158, 11, 0.12)'
                                    : 'rgba(139, 92, 246, 0.12)',
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.partnerCategoryTagText,
                                {
                                  color:
                                    cat === 'Services'
                                      ? '#2563EB'
                                      : cat === 'Daily Needs'
                                      ? '#059669'
                                      : cat === 'Food'
                                      ? '#D97706'
                                      : '#7C3AED',
                                },
                              ]}
                            >
                              {cat.toUpperCase()}
                            </Text>
                          </View>
                          <View style={styles.partnerDistanceRow}>
                            <Icons.MapPin color="#F5B800" size={11} />
                            <Text style={styles.partnerDistanceText}>{partner.distance || '1.2 km'}</Text>
                          </View>
                        </View>

                        <Text style={[styles.partnerCompactName, { color: colors.text }]} numberOfLines={1}>
                          {partner.name}
                        </Text>
                        <Text
                          style={[styles.partnerCompactDesc, { color: isLightActive ? '#64748B' : '#94A3B8' }]}
                          numberOfLines={1}
                        >
                          {partner.desc || `${cat} specialist hub`}
                        </Text>

                        <View style={styles.partnerBottomRow}>
                          <View style={styles.partnerRatingTag}>
                            <Icons.Star color="#F5B800" size={11} fill="#F5B800" />
                            <Text style={styles.partnerRatingText}>{partner.rating || '4.8'}</Text>
                          </View>

                          <View style={styles.partnerCtaPill}>
                            <Text style={styles.partnerCtaText}>{ctaLabel}</Text>
                            <Icons.ChevronRight color="#0F172A" size={12} />
                          </View>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>


      {/* Product Details Premium Modal for Login Booking */}
      <Modal
        visible={pendingProduct !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setPendingProduct(null)}
      >
        <View style={styles.modalBackdrop}>
          <TouchableOpacity 
            style={StyleSheet.absoluteFill} 
            activeOpacity={1} 
            onPress={() => setPendingProduct(null)} 
          />
          {pendingProduct && (
            <GlassCard style={styles.modalCard}>
              {/* Product Image Header with Close Button */}
              <View style={styles.modalImageContainer}>
                <Image source={{ uri: pendingProduct.image || pendingProduct.img }} style={styles.modalImage} />
                <TouchableOpacity 
                  style={styles.modalImgCloseBtn} 
                  onPress={() => setPendingProduct(null)}
                  activeOpacity={0.7}
                >
                  <Icons.X color="#FFFFFF" size={18} />
                </TouchableOpacity>
              </View>

              {/* Product Info */}
              <View style={styles.modalInfoContainer}>
                <Text style={[styles.modalProductName, { color: colors.text }]}>{pendingProduct.name}</Text>
                
                {/* Rating and Discount Row */}
                <View style={styles.modalMetaRow}>
                  <View style={styles.modalRatingBadge}>
                    <Icons.Star color="#F4C400" size={10} fill="#F4C400" />
                    <Text style={styles.modalRatingText}> {pendingProduct.rating || '4.8'}</Text>
                  </View>
                  {(pendingProduct.discount || pendingProduct.memberPrice) && (
                    <View style={styles.modalDiscountBadge}>
                      <Text style={styles.modalDiscountText}>{pendingProduct.discount || '50% OFF'}</Text>
                    </View>
                  )}
                </View>

                {/* Price Container */}
                <View style={styles.modalPriceRow}>
                  <Text style={[styles.modalPriceText, { color: colors.primary }]}>{pendingProduct.price}</Text>
                  {pendingProduct.originalPrice && (
                    <Text style={[styles.modalOriginalPriceText, { color: colors.grayLight }]}>{pendingProduct.originalPrice}</Text>
                  )}
                </View>

                <View style={[styles.modalDivider, { backgroundColor: colors.cardBorder }]} />

                {/* Description */}
                <Text style={[styles.modalSectionTitle, { color: colors.primary }]}>PRODUCT DESCRIPTION</Text>
                <Text style={[styles.modalDescText, { color: colors.text, opacity: 0.7 }]}>
                  {pendingProduct.description || pendingProduct.desc || 'Book consultation with expert general physician and cardiologists.'}
                </Text>

                {/* Action Buttons */}
                <TouchableOpacity 
                  style={[styles.modalActionBtn, { backgroundColor: colors.primary }]}
                  activeOpacity={0.8}
                  onPress={() => {
                    handlePlacePendingOrder(pendingProduct);
                  }}
                >
                  <Text style={[styles.modalActionBtnText, { color: '#0F172A', fontWeight: 'bold' }]}>
                    {(() => {
                      const cat = (pendingProduct.category || '').toLowerCase().trim();
                      if (cat.includes('job')) return 'Apply Now';
                      if (cat.includes('rental')) return 'Rent Now';
                      if (cat.includes('stay') || cat.includes('hotel') || cat.includes('resort')) return 'Reserve / Book Stay';
                      if (cat.includes('travel') || cat.includes('flight') || cat.includes('cab') || cat.includes('bus')) return 'Book Ticket';
                      if (cat.includes('service') || cat.includes('health') || cat.includes('appoint') || cat.includes('repair') || cat.includes('clean')) return 'Book Service';
                      if (cat.includes('food') || cat.includes('dine') || cat.includes('restaurant')) return 'Order Now';
                      return 'Buy Now';
                    })()}
                  </Text>
                </TouchableOpacity>

                {(() => {
                  const cat = (pendingProduct.category || '').toLowerCase().trim();
                  const hasCart = 
                    cat.includes('product') || 
                    cat.includes('elect') || 
                    cat.includes('fash') || 
                    cat.includes('grocer') || 
                    cat.includes('daily') || 
                    cat.includes('food') || 
                    cat.includes('dine');
                  if (!hasCart) return null;

                  const isAlreadyInCart = cartItems.some(i => i.id === (pendingProduct.id || 'p-pending'));
                  return (
                    <TouchableOpacity 
                      style={[
                        styles.modalSecondaryBtn, 
                        { borderColor: colors.primary },
                        isAlreadyInCart && { backgroundColor: 'rgba(52, 211, 153, 0.12)', borderColor: '#34D399' }
                      ]}
                      activeOpacity={0.8}
                      onPress={() => {
                        if (isAlreadyInCart) {
                          showToast('Already in your cart', 'View Cart', () => {
                            setPendingProduct(null);
                            navigation.navigate('Cart');
                          });
                        } else {
                          addToCart({
                            id: pendingProduct.id || 'p-pending',
                            name: pendingProduct.name,
                            price: pendingProduct.price,
                            category: pendingProduct.category || 'Product',
                            image: pendingProduct.image || pendingProduct.img,
                          });
                          showToast('Added to cart · View Cart', 'View Cart', () => {
                            setPendingProduct(null);
                            navigation.navigate('Cart');
                          });
                        }
                        setPendingProduct(null);
                      }}
                    >
                      <Text style={[
                        styles.modalSecondaryBtnText, 
                        { color: colors.primary },
                        isAlreadyInCart && { color: '#059669', fontWeight: 'bold' }
                      ]}>
                        {isAlreadyInCart ? '✓ In Cart' : 'Add to Cart'}
                      </Text>
                    </TouchableOpacity>
                  );
                })()}
              </View>
            </GlassCard>
          )}
        </View>
      </Modal>

      {/* Membership Offers view all modal */}
      <Modal
        visible={isOffersModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsOffersModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { height: '75%', backgroundColor: colors.background, borderColor: colors.cardBorder, padding: 0 }]}>
            <View style={[styles.modalHeader, { borderColor: colors.cardBorder }]}>
              <Text style={[styles.modalHeaderTitle, { color: colors.text }]}>
                {currentUser?.membership === 'diamond'
                  ? 'Exclusive Diamond Club Offers'
                  : currentUser?.membership === 'gold'
                  ? 'Exclusive Gold Member Offers'
                  : 'Exclusive Member Offers'}
              </Text>
              <TouchableOpacity onPress={() => setIsOffersModalVisible(false)} style={styles.modalCloseBtn}>
                <Icons.X color={colors.text} size={20} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1, padding: 20 }} showsVerticalScrollIndicator={false}>
              {(dbOffers.length > 0 ? dbOffers : dbProducts).map((prod, idx) => {
                const prodPrice = prod.price ? (typeof prod.price === 'number' ? `₹${prod.price.toLocaleString('en-IN')}` : prod.price) : '₹999';
                const prodMemberPrice = prod.memberPrice ? (typeof prod.memberPrice === 'number' ? `₹${prod.memberPrice.toLocaleString('en-IN')}` : prod.memberPrice) : '₹799';
                const prodName = prod.title || prod.name;
                const prodImg = prod.image || prod.img || 'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=200&auto=format&fit=crop&q=80';
                return (
                  <GlassCard key={idx} style={styles.partnerListCard}>
                    <Image source={{ uri: prodImg }} style={styles.partnerListImg} />
                    <View style={styles.partnerListDetails}>
                      <Text style={[styles.partnerListName, { color: colors.text }]}>{prodName}</Text>
                      <View style={[styles.priceRow, { marginTop: 8 }]}>
                        <Text style={[styles.strikePrice, { fontSize: 13, textDecorationLine: 'line-through', marginRight: 8, color: colors.text, opacity: 0.4 }]}>{prodPrice}</Text>
                        <Text style={[styles.memberPrice, { fontSize: 15, color: colors.primary, fontWeight: 'bold' }]}>{prodMemberPrice}</Text>
                      </View>
                      <View style={[styles.goldBadge, { alignSelf: 'flex-start', marginTop: 8 }]}>
                        <Text style={styles.goldBadgeText}>{prod.discount || 'Gold Member Price'}</Text>
                      </View>
                    </View>
                  </GlassCard>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Sidebar Drawer Overlay (Always sits underneath the fully-visible Top Header) */}
      <Animated.View 
        pointerEvents={isSidebarOpen ? 'auto' : 'none'}
        style={[
          StyleSheet.absoluteFill, 
          { 
            top: headerHeight || insets.top + 94, 
            zIndex: 900, 
            elevation: 8,
            opacity: fadeAnim,
          }
        ]}
      >
        {/* Backdrop */}
        <TouchableOpacity 
          style={styles.backdrop} 
          activeOpacity={1} 
          onPress={() => {
            setIsSidebarOpen(false);
            setIsSidebarLanguageView(false);
            setIsSidebarLocationView(false);
          }}
        />

        {/* Slide-out Sidebar Panel */}
        <Animated.View 
          style={[
            styles.sidebar, 
            { 
              width: width * 0.84,
              top: 0,
              bottom: 0,
              backgroundColor: colors.background,
              borderRightColor: colors.cardBorder,
              transform: [{ translateX: slideAnim }] 
            }
          ]}
        >
            {isSidebarLanguageView ? (
              /* --- SIDEBAR: LANGUAGE SELECTION VIEW --- */
              <View style={{ flex: 1 }}>
                {/* Language Header */}
                <View style={[styles.sidebarHeader, { backgroundColor: colors.background, borderBottomColor: colors.cardBorder }]}>
                  <TouchableOpacity
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
                    onPress={() => setIsSidebarLanguageView(false)}
                    activeOpacity={0.7}
                  >
                    <Icons.ArrowLeft color={colors.text} size={20} />
                    <Text style={[styles.sidebarHeaderTitle, { color: colors.text }]}>{t('select_language')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.sidebarCloseBtn} 
                    onPress={() => {
                      setIsSidebarOpen(false);
                      setIsSidebarLanguageView(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Icons.X color={colors.text} size={20} />
                  </TouchableOpacity>
                </View>

                {/* Subtitle */}
                <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 }}>
                  <Text style={{ fontSize: 12, color: colors.grayLight, lineHeight: 17 }}>
                    {t('choose_language_desc')}
                  </Text>
                </View>

                {/* Language Options List */}
                <ScrollView
                  style={styles.sidebarScroll}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8, gap: 8 }}
                >
                  {LANGUAGES_LIST.map((lang) => {
                    const isSelected = currentLanguage === lang.name;
                    return (
                      <TouchableOpacity
                        key={lang.code}
                        activeOpacity={0.8}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          backgroundColor: isSelected ? colors.cardBg : 'transparent',
                          borderWidth: 1,
                          borderColor: isSelected ? colors.primary : colors.cardBorder,
                          borderRadius: 12,
                          paddingHorizontal: 14,
                          paddingVertical: 12,
                        }}
                        onPress={() => {
                          setLanguage(lang.name);
                          setIsSidebarLanguageView(false);
                        }}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                          <View
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: 16,
                              backgroundColor: isSelected ? colors.primary + '20' : colors.cardBg,
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Icons.Globe color={isSelected ? colors.primary : colors.grayLight} size={16} />
                          </View>
                          <Text style={{ fontSize: 14, fontWeight: isSelected ? 'bold' : '600', color: colors.text }}>
                            {lang.name} {lang.nativeName !== lang.name ? `(${lang.nativeName})` : ''}
                          </Text>
                        </View>

                        {/* Radio Check Indicator */}
                        <View
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: 11,
                            borderWidth: 2,
                            borderColor: isSelected ? colors.primary : colors.cardBorder,
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {isSelected && (
                            <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: colors.primary }} />
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            ) : isSidebarLocationView ? (
              /* --- SIDEBAR: LOCATION SELECTION VIEW --- */
              <View style={{ flex: 1 }}>
                {/* Location Header */}
                <View style={[styles.sidebarHeader, { backgroundColor: colors.background, borderBottomColor: colors.cardBorder }]}>
                  <TouchableOpacity
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
                    onPress={() => setIsSidebarLocationView(false)}
                    activeOpacity={0.7}
                  >
                    <Icons.ArrowLeft color={colors.text} size={20} />
                    <Text style={[styles.sidebarHeaderTitle, { color: colors.text }]}>Select Location</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.sidebarCloseBtn} 
                    onPress={() => {
                      setIsSidebarOpen(false);
                      setIsSidebarLocationView(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Icons.X color={colors.text} size={20} />
                  </TouchableOpacity>
                </View>

                {/* Search Bar for State / City */}
                <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 6 }}>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: colors.cardBg,
                      borderWidth: 1,
                      borderColor: colors.cardBorder,
                      borderRadius: 12,
                      paddingHorizontal: 10,
                      height: 40,
                    }}
                  >
                    <Icons.Search color={colors.grayLight} size={15} />
                    <TextInput
                      style={{ flex: 1, paddingHorizontal: 8, fontSize: 12.5, color: colors.text }}
                      placeholder="Search state, UT, or city/district..."
                      placeholderTextColor={colors.grayLight}
                      value={locationSearchQuery}
                      onChangeText={setLocationSearchQuery}
                    />
                    {locationSearchQuery.length > 0 && (
                      <TouchableOpacity onPress={() => setLocationSearchQuery('')}>
                        <Icons.X color={colors.grayLight} size={15} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {/* Location Options List */}
                <ScrollView
                  style={styles.sidebarScroll}
                  showsVerticalScrollIndicator={false}
                  removeClippedSubviews={true}
                  scrollEventThrottle={16}
                  contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 6, gap: 8, paddingBottom: insets.bottom + 20 }}
                >
                  {/* 1. "Use Current Location" Option */}
                  <TouchableOpacity
                    activeOpacity={0.8}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor: isCurrentLocation ? colors.primary + '14' : colors.cardBg,
                      borderWidth: 1,
                      borderColor: isCurrentLocation ? colors.primary : colors.cardBorder,
                      borderRadius: 12,
                      paddingHorizontal: 12,
                      paddingVertical: 12,
                    }}
                    onPress={() => {
                      setLocation('Karnataka', 'Bengaluru', true);
                      setIsSidebarLocationView(false);
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                      <View
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 16,
                          backgroundColor: colors.primary + '20',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Icons.Navigation color={colors.primary} size={16} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13, fontWeight: 'bold', color: colors.text }}>
                          Use Current Location
                        </Text>
                        <Text style={{ fontSize: 11, color: colors.primary, marginTop: 1 }}>
                          Bengaluru, Karnataka (GPS Live)
                        </Text>
                      </View>
                    </View>

                    {isCurrentLocation && (
                      <View
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: 11,
                          backgroundColor: colors.primary,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Icons.Check color={colors.background === '#F8FAFC' ? '#FFF' : '#050B1E'} size={13} strokeWidth={3} />
                      </View>
                    )}
                  </TouchableOpacity>

                  <View style={{ height: 1, backgroundColor: colors.cardBorder, marginVertical: 4 }} />

                  {/* Section Title */}
                  <Text style={{ fontSize: 10, fontWeight: '900', color: colors.grayLight, letterSpacing: 0.8, marginLeft: 2, marginBottom: 2 }}>
                    INDIAN STATES & UNION TERRITORIES
                  </Text>

                  {/* 2. States & Cities Filtered List */}
                  {INDIAN_STATES_AND_CITIES.filter((item) => {
                    if (!locationSearchQuery.trim()) return true;
                    const q = locationSearchQuery.toLowerCase().trim();
                    const stateMatch = item.state.toLowerCase().includes(q);
                    const cityMatch = item.cities.some((c) => c.toLowerCase().includes(q));
                    return stateMatch || cityMatch;
                  }).map((item) => {
                    const isStateSelected = selectedState === item.state && !selectedCity && !isCurrentLocation;
                    const isExpanded = expandedStateName === item.state || locationSearchQuery.trim().length > 0;
                    const hasSelectedCityInState = selectedState === item.state && !isCurrentLocation;

                    return (
                      <View
                        key={item.state}
                        style={{
                          backgroundColor: colors.cardBg,
                          borderWidth: 1,
                          borderColor: hasSelectedCityInState ? colors.primary + '60' : colors.cardBorder,
                          borderRadius: 12,
                          overflow: 'hidden',
                        }}
                      >
                        {/* State Header Row */}
                        <TouchableOpacity
                          activeOpacity={0.75}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            paddingHorizontal: 12,
                            paddingVertical: 12,
                            backgroundColor: hasSelectedCityInState ? colors.primary + '08' : 'transparent',
                          }}
                          onPress={() => {
                            setExpandedStateName(expandedStateName === item.state ? null : item.state);
                          }}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                            <Icons.MapPin color={hasSelectedCityInState ? colors.primary : colors.grayLight} size={15} />
                            <Text style={{ fontSize: 13, fontWeight: hasSelectedCityInState ? 'bold' : '600', color: colors.text }}>
                              {item.state} {item.isUT ? '(UT)' : ''}
                            </Text>
                          </View>

                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            {isStateSelected && (
                              <View
                                style={{
                                  width: 20,
                                  height: 20,
                                  borderRadius: 10,
                                  backgroundColor: colors.primary,
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                <Icons.Check color={colors.background === '#F8FAFC' ? '#FFF' : '#050B1E'} size={12} strokeWidth={3} />
                              </View>
                            )}
                            <Icons.ChevronDown
                              color={colors.grayLight}
                              size={15}
                              style={{ transform: [{ rotate: isExpanded ? '180deg' : '0deg' }] }}
                            />
                          </View>
                        </TouchableOpacity>

                        {/* Expanded Cities / Districts */}
                        {isExpanded && (
                          <View style={{ borderTopWidth: 1, borderTopColor: colors.cardBorder, paddingHorizontal: 8, paddingVertical: 6, backgroundColor: colors.background }}>
                            {/* Whole State Option */}
                            <TouchableOpacity
                              activeOpacity={0.75}
                              style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                paddingHorizontal: 10,
                                paddingVertical: 8,
                                borderRadius: 8,
                                backgroundColor: isStateSelected ? colors.primary + '15' : 'transparent',
                              }}
                              onPress={() => {
                                setLocation(item.state, '', false);
                                setIsSidebarLocationView(false);
                              }}
                            >
                              <Text style={{ fontSize: 12, fontWeight: '600', color: isStateSelected ? colors.primary : colors.text }}>
                                All of {item.state}
                              </Text>
                              {isStateSelected && (
                                <Icons.Check color={colors.primary} size={14} strokeWidth={3} />
                              )}
                            </TouchableOpacity>

                            {/* City / District rows */}
                            {item.cities.filter((c) => {
                              if (!locationSearchQuery.trim()) return true;
                              const q = locationSearchQuery.toLowerCase().trim();
                              return c.toLowerCase().includes(q) || item.state.toLowerCase().includes(q);
                            }).map((city) => {
                              const isCitySelected = selectedState === item.state && selectedCity === city && !isCurrentLocation;
                              return (
                                <TouchableOpacity
                                  key={city}
                                  activeOpacity={0.75}
                                  style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    paddingHorizontal: 10,
                                    paddingVertical: 8,
                                    borderRadius: 8,
                                    backgroundColor: isCitySelected ? colors.primary + '15' : 'transparent',
                                  }}
                                  onPress={() => {
                                    setLocation(item.state, city, false);
                                    setIsSidebarLocationView(false);
                                  }}
                                >
                                  <Text style={{ fontSize: 12, color: isCitySelected ? colors.primary : colors.text, fontWeight: isCitySelected ? 'bold' : 'normal' }}>
                                    {city}
                                  </Text>
                                  {isCitySelected && (
                                    <Icons.Check color={colors.primary} size={14} strokeWidth={3} />
                                  )}
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        )}
                      </View>
                    );
                  })}
                </ScrollView>
              </View>
            ) : (
              /* --- SIDEBAR: MAIN MENU VIEW --- */
              <View style={{ flex: 1 }}>
                {/* Sidebar Header */}
                <View style={[styles.sidebarHeader, { backgroundColor: colors.background, borderBottomColor: colors.cardBorder }]}>
                  <View style={styles.sidebarBrandRow}>
                    <Image
                      source={require('../../assets/images/forge_india_logo.jpg')}
                      style={styles.sidebarLogo}
                    />
                    <Text style={[styles.sidebarHeaderTitle, { color: colors.text }]}>{t('connect_app')}</Text>
                  </View>
                  <TouchableOpacity 
                    style={styles.sidebarCloseBtn} 
                    onPress={() => setIsSidebarOpen(false)}
                    activeOpacity={0.7}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Icons.X color={colors.text} size={20} />
                  </TouchableOpacity>
                </View>

                {/* Sidebar Main Content List */}
                <ScrollView 
                  style={styles.sidebarScroll} 
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ flexGrow: 1, paddingVertical: 8, paddingBottom: insets.bottom + 20 }}
                >
                  {/* --- SECTION 1: ACCOUNT & MAIN NAVIGATION --- */}
                  {/* 1. My Orders */}
                  <Pressable 
                    style={({ pressed }) => [
                      styles.sidebarNavRow,
                      pressed && { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)' }
                    ]}
                    android_ripple={{ color: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)' }}
                    onPress={() => {
                      setIsSidebarOpen(false);
                      navigation.navigate('CustomerTabs', { screen: 'Orders', params: { activeTab: 'orders' } });
                    }}
                  >
                    <View style={styles.sidebarNavRowLeft}>
                      <View style={styles.sidebarNavIconWrapper}>
                        <Icons.Package color="#F4C400" size={20} />
                      </View>
                      <Text style={[styles.sidebarNavRowText, { color: colors.text }]}>{t('my_orders')}</Text>
                    </View>
                    <Icons.ChevronRight color={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(15,23,42,0.35)'} size={16} />
                  </Pressable>

                  {/* 2. My Bookings */}
                  <Pressable 
                    style={({ pressed }) => [
                      styles.sidebarNavRow,
                      pressed && { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)' }
                    ]}
                    android_ripple={{ color: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)' }}
                    onPress={() => {
                      setIsSidebarOpen(false);
                      navigation.navigate('CustomerTabs', { screen: 'Orders', params: { activeTab: 'bookings' } });
                    }}
                  >
                    <View style={styles.sidebarNavRowLeft}>
                      <View style={styles.sidebarNavIconWrapper}>
                        <Icons.Calendar color="#F4C400" size={20} />
                      </View>
                      <Text style={[styles.sidebarNavRowText, { color: colors.text }]}>{t('my_bookings')}</Text>
                    </View>
                    <Icons.ChevronRight color={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(15,23,42,0.35)'} size={16} />
                  </Pressable>

                  {/* 3. Membership Card */}
                  <Pressable 
                    style={({ pressed }) => [
                      styles.sidebarNavRow,
                      pressed && { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)' }
                    ]}
                    android_ripple={{ color: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)' }}
                    onPress={() => {
                      setIsSidebarOpen(false);
                      navigation.navigate('Membership');
                    }}
                  >
                    <View style={styles.sidebarNavRowLeft}>
                      <View style={styles.sidebarNavIconWrapper}>
                        <Icons.Award color="#F4C400" size={20} />
                      </View>
                      <Text style={[styles.sidebarNavRowText, { color: colors.text }]}>{t('membership_card')}</Text>
                    </View>
                    <Icons.ChevronRight color={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(15,23,42,0.35)'} size={16} />
                  </Pressable>

                  {/* 4. My Profile */}
                  <Pressable 
                    style={({ pressed }) => [
                      styles.sidebarNavRow,
                      pressed && { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)' }
                    ]}
                    android_ripple={{ color: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)' }}
                    onPress={() => {
                      setIsSidebarOpen(false);
                      navigation.navigate('Profile' as any);
                    }}
                  >
                    <View style={styles.sidebarNavRowLeft}>
                      <View style={styles.sidebarNavIconWrapper}>
                        <Icons.User color="#F4C400" size={20} />
                      </View>
                      <Text style={[styles.sidebarNavRowText, { color: colors.text }]}>{t('my_profile')}</Text>
                    </View>
                    <Icons.ChevronRight color={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(15,23,42,0.35)'} size={16} />
                  </Pressable>

                  {/* 5. Wallet Balance */}
                  <Pressable 
                    style={({ pressed }) => [
                      styles.sidebarNavRow,
                      pressed && { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)' }
                    ]}
                    android_ripple={{ color: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)' }}
                    onPress={() => {
                      setIsSidebarOpen(false);
                      navigation.navigate('Wallet');
                    }}
                  >
                    <View style={styles.sidebarNavRowLeft}>
                      <View style={styles.sidebarNavIconWrapper}>
                        <Icons.Wallet color="#F4C400" size={20} />
                      </View>
                      <Text style={[styles.sidebarNavRowText, { color: colors.text }]}>{t('wallet_balance')}</Text>
                    </View>
                    <View style={styles.sidebarNavRowRight}>
                      <Text style={[styles.sidebarNavValueText, { color: isDark ? '#F4C400' : '#D97706' }]}>
                        ₹{(currentUser?.walletBalance ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </Text>
                      <Icons.ChevronRight color={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(15,23,42,0.35)'} size={16} />
                    </View>
                  </Pressable>

                  {/* Divider between Account & App Preferences */}
                  <View style={[styles.sidebarSectionDivider, { backgroundColor: colors.cardBorder }]} />

                  {/* --- SECTION 2: APP PREFERENCES --- */}
                  <View style={styles.sidebarSection}>
                    <Text style={[styles.sidebarSectionTitle, { color: isDark ? 'rgba(255,255,255,0.45)' : '#8A8474' }]}>
                      {t('app_preferences')}
                    </Text>

                    {/* Language */}
                    <Pressable
                      style={({ pressed }) => [
                        styles.sidebarNavRow,
                        pressed && { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)' }
                      ]}
                      android_ripple={{ color: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)' }}
                      onPress={() => setIsSidebarLanguageView(true)}
                    >
                      <View style={styles.sidebarNavRowLeft}>
                        <View style={styles.sidebarNavIconWrapper}>
                          <Icons.Globe color="#F4C400" size={20} />
                        </View>
                        <Text style={[styles.sidebarNavRowText, { color: colors.text }]}>{t('language')}</Text>
                      </View>
                      <View style={styles.sidebarNavRowRight}>
                        <Text style={[styles.sidebarNavValueText, { color: isDark ? '#F4C400' : '#D97706' }]}>
                          {currentLanguage}
                        </Text>
                        <Icons.ChevronRight color={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(15,23,42,0.35)'} size={16} />
                      </View>
                    </Pressable>

                    {/* Location Option below Language */}
                    <Pressable
                      style={({ pressed }) => [
                        styles.sidebarNavRow,
                        pressed && { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)' }
                      ]}
                      android_ripple={{ color: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)' }}
                      onPress={() => {
                        setLocationSearchQuery('');
                        setExpandedStateName(selectedState || 'Karnataka');
                        setIsSidebarLocationView(true);
                      }}
                    >
                      <View style={styles.sidebarNavRowLeft}>
                        <View style={styles.sidebarNavIconWrapper}>
                          <Icons.MapPin color="#F4C400" size={20} />
                        </View>
                        <Text style={[styles.sidebarNavRowText, { color: colors.text }]}>{t('location')}</Text>
                      </View>
                      <View style={styles.sidebarNavRowRight}>
                        <Text
                          style={[styles.sidebarNavValueText, { color: isDark ? '#F4C400' : '#D97706', maxWidth: 130 }]}
                          numberOfLines={1}
                        >
                          {getDisplayLocation()}
                        </Text>
                        <Icons.ChevronRight color={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(15,23,42,0.35)'} size={16} />
                      </View>
                    </Pressable>

                    {/* App Theme Segmented Control */}
                    <View style={styles.sidebarThemeWrapper}>
                      <View style={[
                        styles.themeOptionsRow, 
                        { 
                          backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)', 
                          borderColor: colors.cardBorder 
                        }
                      ]}>
                        <TouchableOpacity 
                          style={[
                            styles.themeOptionBtn, 
                            themeMode === 'light' && styles.themeOptionBtnActive
                          ]}
                          activeOpacity={0.8}
                          onPress={() => setThemeMode('light')}
                        >
                          <Icons.Sun color={themeMode === 'light' ? '#000000' : colors.text} size={14} />
                          <Text style={[
                            styles.themeOptionText, 
                            { color: themeMode === 'light' ? '#000000' : colors.text }
                          ]}>{t('light')}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                          style={[
                            styles.themeOptionBtn, 
                            themeMode === 'dark' && styles.themeOptionBtnActive
                          ]}
                          activeOpacity={0.8}
                          onPress={() => setThemeMode('dark')}
                        >
                          <Icons.Moon color={themeMode === 'dark' ? '#000000' : colors.text} size={14} />
                          <Text style={[
                            styles.themeOptionText, 
                            { color: themeMode === 'dark' ? '#000000' : colors.text }
                          ]}>{t('dark')}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                          style={[
                            styles.themeOptionBtn, 
                            themeMode === 'system' && styles.themeOptionBtnActive
                          ]}
                          activeOpacity={0.8}
                          onPress={() => setThemeMode('system')}
                        >
                          <Icons.Monitor color={themeMode === 'system' ? '#000000' : colors.text} size={14} />
                          <Text style={[
                            styles.themeOptionText, 
                            { color: themeMode === 'system' ? '#000000' : colors.text }
                          ]}>{t('system')}</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>

                  {/* Flexible Spacer to pin Logout / Sign In to bottom on tall screens */}
                  <View style={{ flex: 1, minHeight: 16 }} />

                  {/* Divider before Bottom CTA */}
                  <View style={[styles.sidebarSectionDivider, { backgroundColor: colors.cardBorder }]} />

                  {/* --- SECTION 3: AUTHENTICATION CTA --- */}
                  <View style={styles.sidebarCtaContainer}>
                    {currentUser ? (
                      <TouchableOpacity 
                        style={[styles.sidebarActionBtn, styles.sidebarLogoutBtn]} 
                        activeOpacity={0.75}
                        onPress={() => {
                          setIsSidebarOpen(false);
                          logout();
                        }}
                      >
                        <View style={styles.sidebarActionBtnLeft}>
                          <Icons.LogOut color="#EF4444" size={18} />
                          <Text style={[styles.sidebarActionBtnText, { color: '#EF4444', fontWeight: '700' }]}>{t('logout')}</Text>
                        </View>
                        <Icons.ChevronRight color="rgba(239, 68, 68, 0.4)" size={16} />
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity 
                        style={[styles.sidebarActionBtn, styles.sidebarLoginBtn]} 
                        activeOpacity={0.8}
                        onPress={() => {
                          setIsSidebarOpen(false);
                          navigation.navigate('Login');
                        }}
                      >
                        <View style={styles.sidebarActionBtnLeft}>
                          <Icons.LogIn color="#000000" size={18} />
                          <Text style={[styles.sidebarActionBtnText, { color: '#000000', fontWeight: '800' }]}>Sign In / Register</Text>
                        </View>
                        <Icons.ChevronRight color="#000000" size={18} />
                      </TouchableOpacity>
                    )}
                  </View>
                </ScrollView>
              </View>
            )}
          </Animated.View>
      </Animated.View>

      {/* Universal Search Experience Modal (Matching Light Customer App Theme) */}
      <Modal
        visible={isSearchOpen}
        animationType="fade"
        transparent={false}
        onRequestClose={() => {
          stopVoiceListening();
          setIsSearchOpen(false);
          setSearchQuery('');
          setCapturedImageUri(null);
          setVoiceError(null);
        }}
      >
        <View style={[styles.searchLightContainer, { backgroundColor: isDark ? colors.background : '#FFF8E8', paddingTop: Math.max(insets.top, 10) }]}>
          {/* Light/Dark Branded Header */}
          <View style={[styles.searchLightHeader, { backgroundColor: isDark ? colors.cardBg : '#FFF1C7', borderColor: isDark ? colors.cardBorder : '#F1EAD8' }]}>
            {/* Top Row: Back Button + Location Pill + Notification */}
            <View style={styles.searchLightTopRow}>
              <TouchableOpacity
                style={[styles.searchLightBackBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#FFFFFF', borderColor: isDark ? colors.cardBorder : '#F1EAD8' }]}
                activeOpacity={0.7}
                onPress={() => {
                  stopVoiceListening();
                  setIsSearchOpen(false);
                  setSearchQuery('');
                  setCapturedImageUri(null);
                  setVoiceError(null);
                }}
              >
                <Icons.ArrowLeft color={isDark ? colors.text : "#0F172A"} size={20} />
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.searchNotificationBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#FFFFFF', borderColor: isDark ? colors.cardBorder : '#F1EAD8' }]} 
                activeOpacity={0.7}
                onPress={() => {
                  setIsSearchOpen(false);
                  setIsNotifDropdownOpen(true);
                }}
              >
                <Icons.Bell color={isDark ? colors.text : "#0F172A"} size={19} />
                {unreadNotifCount > 0 && (
                  <View style={styles.searchNotifBadge}>
                    <Text style={styles.searchNotifBadgeText}>{unreadNotifCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* Input Bar */}
            <View style={[
              styles.searchLightInputWrapper,
              { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#FFFFFF', borderColor: '#F5B800' },
              isListening && styles.searchLightInputListening
            ]}>
              {isListening ? (
                <View style={[styles.waveformContainer, { marginRight: 6 }]}>
                  <Animated.View style={[styles.waveBarGold, { height: wave1 }]} />
                  <Animated.View style={[styles.waveBarGold, { height: wave2 }]} />
                  <Animated.View style={[styles.waveBarGold, { height: wave3 }]} />
                  <Animated.View style={[styles.waveBarGold, { height: wave4 }]} />
                </View>
              ) : (
                <Icons.Search color={isDark ? colors.subtext : "#94A3B8"} size={18} style={{ marginRight: 8 }} />
              )}

              <TextInput
                ref={searchInputRef}
                style={[styles.searchLightInputField, { color: isDark ? colors.text : '#0F172A', flex: 1 }]}
                placeholder={isListening ? "Listening... Speak now 🎙️" : "Search products, food, services & more..."}
                placeholderTextColor={isListening ? "#D97706" : isDark ? colors.subtext : "#94A3B8"}
                value={searchQuery}
                onChangeText={(txt) => setSearchQuery(txt)}
              />

              {searchQuery.length > 0 && (
                <TouchableOpacity
                  onPress={() => {
                    setSearchQuery('');
                    setCapturedImageUri(null);
                  }}
                  style={{ padding: 4, marginRight: 6 }}
                >
                  <Icons.X color={isDark ? colors.subtext : "#64748B"} size={16} />
                </TouchableOpacity>
              )}
              
              <TouchableOpacity
                onPress={handleMicPress}
                style={{ padding: 4, marginRight: 6 }}
                activeOpacity={0.7}
              >
                <Icons.Mic color={isListening ? "#F59E0B" : isDark ? colors.text : "#0F172A"} size={20} />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleCameraPress}
                style={{ padding: 4 }}
                activeOpacity={0.7}
              >
                <Icons.Camera color={isDark ? colors.text : "#0F172A"} size={20} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Visual Search captured image thumbnail */}
          {capturedImageUri && (
            <View style={styles.visualSearchChipRowLight}>
              <View style={[styles.visualSearchChipLight, { backgroundColor: isDark ? colors.cardBg : '#FFFFFF', borderColor: isDark ? colors.cardBorder : '#F1EAD8' }]}>
                <Image source={{ uri: capturedImageUri }} style={styles.visualSearchThumbnail} />
                <Text style={[styles.visualSearchChipTextLight, { color: isDark ? colors.text : '#0F172A' }]}>
                  {isVisualSearching ? 'Analyzing visual attributes...' : 'Visual matches captured photo'}
                </Text>
                {isVisualSearching ? (
                  <ActivityIndicator size="small" color="#F5B800" style={{ marginLeft: 6 }} />
                ) : (
                  <TouchableOpacity onPress={() => setCapturedImageUri(null)} style={{ padding: 4 }}>
                    <Icons.X color={isDark ? colors.subtext : "#64748B"} size={14} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {/* Scrollable Body */}
          <ScrollView
            style={[styles.searchLightScroll, { backgroundColor: isDark ? colors.background : '#FFF8E8' }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            removeClippedSubviews={true}
            scrollEventThrottle={16}
          >
            {searchQuery.trim().length === 0 ? (
              <View style={styles.searchSuggestionsLight}>
                {/* Recent Searches */}
                <View style={styles.searchSectionHeaderRow}>
                  <Text style={[styles.searchSectionTitleLight, { color: isDark ? colors.subtext : '#64748B' }]}>RECENT SEARCHES</Text>
                  <TouchableOpacity onPress={() => useActivityStore.setState({ recentSearches: [] })}>
                    <Text style={styles.clearAllText}>Clear All</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.recentSearchPillRow}>
                  {['AC Repair', 'Whole Wheat Atta', 'Doctor Video Consultation', 'Hyderabadi Biryani'].map((term) => (
                    <TouchableOpacity
                      key={term}
                      style={[styles.recentSearchPill, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#FFFFFF', borderColor: isDark ? colors.cardBorder : '#E2E8F0' }]}
                      activeOpacity={0.8}
                      onPress={() => setSearchQuery(term)}
                    >
                      <Icons.Clock color={isDark ? colors.subtext : "#94A3B8"} size={12} />
                      <Text style={[styles.recentSearchPillText, { color: isDark ? colors.text : '#0F172A' }]}>{term}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Popular Searches */}
                <Text style={[styles.searchSectionTitleLight, { marginTop: 18, color: isDark ? colors.subtext : '#64748B' }]}>POPULAR SEARCHES</Text>
                <View style={styles.suggestionsGridLight}>
                  {['Smartphones', 'Hospitals', 'Electrician', 'Burgers', 'Hotels', 'Flight Booking', 'IT Jobs'].map((term) => (
                    <TouchableOpacity
                      key={term}
                      style={[styles.suggestionTagLight, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#FFFFFF', borderColor: isDark ? colors.cardBorder : '#E2E8F0' }]}
                      activeOpacity={0.8}
                      onPress={() => setSearchQuery(term)}
                    >
                      <Icons.TrendingUp color="#F5B800" size={12} />
                      <Text style={[styles.suggestionTagTextLight, { color: isDark ? colors.text : '#0F172A' }]}>{term}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Categories */}
                <Text style={[styles.searchSectionTitleLight, { marginTop: 22, color: isDark ? colors.subtext : '#64748B' }]}>CATEGORIES</Text>
                <View style={styles.categoriesGridLight}>
                  {DISCOVERY_CATEGORIES.map((cat: any, idx: number) => (
                    <TouchableOpacity
                      key={idx}
                      style={[styles.searchCategoryCardLight, { backgroundColor: isDark ? colors.cardBg : '#FFFFFF', borderColor: isDark ? colors.cardBorder : '#E2E8F0' }]}
                      activeOpacity={0.85}
                      onPress={() => {
                        setIsSearchOpen(false);
                        useActivityStore.getState().recordCategoryExplore(cat.name);
                        if (cat.name === 'All') {
                          navigation.navigate('CustomerTabs', { screen: 'Categories' });
                        } else if (cat.name === 'Travel') {
                          setIsTravelSearchModalVisible(true);
                        } else {
                          navigation.navigate('CategoryDetails', { categoryName: cat.name });
                        }
                      }}
                    >
                      <View style={[styles.searchCategoryCircleLight, { backgroundColor: cat.bg }]}>
                        {renderCategoryIcon(cat.icon, cat.color)}
                      </View>
                      <Text style={[styles.searchCategoryLabelLight, { color: isDark ? colors.text : '#0F172A' }]}>{cat.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ) : getSearchResults().length > 0 ? (
              <View style={styles.searchResultsListLight}>
                <Text style={[styles.searchSectionTitleLight, { color: isDark ? colors.subtext : '#64748B' }]}>
                  SEARCH RESULTS ({getSearchResults().length})
                </Text>
                {getSearchResults().map((result: any, idx: number) => (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.resultItemCardLight, { backgroundColor: isDark ? colors.cardBg : '#FFFFFF', borderColor: isDark ? colors.cardBorder : '#E2E8F0' }]}
                    activeOpacity={0.88}
                    onPress={() => {
                      setIsSearchOpen(false);
                      if (searchQuery) {
                        useActivityStore.getState().recordSearch(searchQuery);
                      }
                      useActivityStore.getState().recordCategoryExplore(result.categoryKey);
                      setSearchQuery('');

                      if (result.type === 'job' && result.jobData) {
                        navigation.navigate('JobDetails', { job: result.jobData, openApplySheet: true });
                      } else if (result.type === 'product' && isCartableCategory(result.categoryKey, result.name)) {
                        navigation.navigate('ProductDetails', { item: result, category: result.categoryKey });
                      } else {
                        openRespectivePage(navigation, {
                          category: result.categoryKey,
                          subcategory: result.subcategoryName,
                          name: result.name,
                          ...result,
                        });
                      }
                    }}
                  >
                    <Image source={{ uri: result.image }} style={styles.resultItemImgLight} />

                    <View style={styles.resultItemDetailsLight}>
                      <View style={styles.resultBadgeRowLight}>
                        <View style={[styles.resultCategoryBadgeLight, { backgroundColor: result.badgeBg }]}>
                          <Text style={[styles.resultCategoryBadgeTextLight, { color: result.badgeColor }]}>
                            {result.categoryKey.toUpperCase()}
                          </Text>
                        </View>
                        {result.rating && (
                          <View style={styles.resultRatingTagLight}>
                            <Icons.Star color="#F5B800" size={10} fill="#F5B800" />
                            <Text style={styles.resultRatingTextLight}>{result.rating}</Text>
                          </View>
                        )}
                      </View>

                      <Text style={[styles.resultItemNameLight, { color: isDark ? colors.text : '#0F172A' }]} numberOfLines={1}>
                        {result.name}
                      </Text>
                      <Text style={[styles.resultItemSubTextLight, { color: isDark ? colors.subtext : '#64748B' }]} numberOfLines={1}>
                        {result.subcategoryName} • <Text style={styles.resultPriceHighlightLight}>{result.price}</Text>
                      </Text>
                    </View>

                    <Icons.ChevronRight color={isDark ? colors.subtext : "#94A3B8"} size={18} />
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View style={styles.noResultsContainerLight}>
                <View style={[styles.noResultsIconCircleLight, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9' }]}>
                  <Icons.Search color={isDark ? colors.subtext : "#94A3B8"} size={36} />
                </View>
                <Text style={[styles.noResultsTitleLight, { color: isDark ? colors.text : '#0F172A' }]}>No results found</Text>
                <Text style={[styles.noResultsSubtitleLight, { color: isDark ? colors.subtext : '#64748B' }]}>
                  We couldn't find any match for "{searchQuery}". Try searching for products, services, daily needs, food, stays, or jobs.
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>

    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050B1E',
  },
  // Inline Voice Search & Visual Search Styles
  searchInputWrapperListening: {
    borderColor: '#F59E0B',
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
  },
  inlineListeningRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    height: 24,
    paddingLeft: 4,
    paddingRight: 8,
  },
  waveBar: {
    width: 3.5,
    backgroundColor: '#F59E0B',
    borderRadius: 2,
  },
  listeningText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#F59E0B',
    letterSpacing: 0.3,
  },
  searchHeaderIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  searchHeaderIconBtnActive: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  voiceErrorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(245, 158, 11, 0.2)',
    gap: 8,
  },
  voiceErrorText: {
    flex: 1,
    fontSize: 12.5,
    color: '#F59E0B',
    fontWeight: '600',
  },
  voiceRetryBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#F59E0B',
    borderRadius: 6,
  },
  voiceRetryBtnText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#0D1636',
  },
  visualSearchChipRow: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  visualSearchChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 8,
  },
  visualSearchThumbnail: {
    width: 28,
    height: 28,
    borderRadius: 6,
  },
  visualSearchChipText: {
    flex: 1,
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  navbar: {
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 8,
    zIndex: 100,
  },

  topHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 40,
    marginBottom: 6,
    gap: 8,
  },
  headerConnectLogo: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.5,
    borderColor: '#FDE68A',
  },
  navLogo: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F59E0B',
    marginRight: 2,
  },
  headerWelcomeGroup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
    marginRight: 8,
  },
  headerWelcomeTextCol: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
    marginLeft: 8,
  },
  headerWelcomeSubtext: {
    fontSize: 10,
    fontWeight: '600',
    lineHeight: 12,
  },
  headerWelcomeNameText: {
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 16,
    letterSpacing: 0.1,
  },
  navRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  navIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -1,
    right: -1,
    backgroundColor: '#EF4444',
    borderRadius: 6,
    minWidth: 12,
    height: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 7.5,
    fontWeight: 'bold',
  },
  commerceSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 38,
    borderRadius: 10,
    borderWidth: 1.2,
    borderColor: '#FCD34D',
    backgroundColor: '#FFFFFF',
    paddingLeft: 10,
    paddingRight: 4,
    gap: 6,
  },

  searchBarLeftTouch: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: '100%',
  },
  searchPlaceholderText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
  },
  searchRightIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  searchMiniIconBtn: {
    padding: 2,
  },
  searchActionIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },





  greetingSection: {
    paddingHorizontal: 20,
    marginBottom: 10,
    marginTop: 8,
  },
  greetingSub: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.45)',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFF',
    marginTop: 2,
  },
  scrollContent: {
    paddingTop: 16,
    paddingBottom: 32,
  },
  walletRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 18,
    justifyContent: 'space-between',
  },
  walletCard: {
    padding: 14,
  },
  couponCard: {
    padding: 14,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  walletTitle: {
    fontSize: 9,
    fontWeight: '900',
    color: 'rgba(255, 255, 255, 0.5)',
    letterSpacing: 0.5,
    marginLeft: 6,
  },
  walletBalance: {
    fontSize: 16,
    fontWeight: 'black',
    color: '#FFF',
  },
  couponCount: {
    fontSize: 16,
    fontWeight: 'black',
    color: '#F4C400',
  },
  couponHint: {
    fontSize: 9,
    color: 'rgba(255, 255, 255, 0.4)',
    marginTop: 6,
  },
  addMoneyBtn: {
    marginTop: 12,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(244, 196, 0, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  addMoneyText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#F4C400',
  },
  sectionContainer: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  sectionContainerWarm: {
    marginTop: 22,
    marginHorizontal: 16,
    padding: 16,
    backgroundColor: '#FEF9E7',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 40,
    marginBottom: 12,
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.2,
    marginBottom: 0,
  },
  viewAllText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#F59E0B',
    marginTop: 0,
  },

  discoveryScroll: {
    paddingLeft: 4,
    paddingRight: 16,
    gap: 12,
  },
  discoveryItem: {
    alignItems: 'center',
    width: 68,
  },
  discoveryCircle: {
    width: 54,
    height: 54,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  discoveryIconInner: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  discoveryLabel: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },

  // "What's happening near you" Card Styles
  happeningCard: {
    width: 230,
    marginRight: 14,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2.5,
  },
  happeningImg: {
    width: '100%',
    height: 110,
    backgroundColor: '#E2E8F0',
  },
  happeningBody: {
    padding: 10,
  },
  happeningTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  happeningTagText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#D97706',
    letterSpacing: 0.5,
  },
  happeningRatingText: {
    fontSize: 10.5,
    fontWeight: '600',
  },
  happeningTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  happeningFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  happeningOffer: {
    fontSize: 12,
    fontWeight: '800',
  },
  happeningCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#F5B800',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  happeningCtaText: {
    fontSize: 10.5,
    fontWeight: 'bold',
    color: '#0F172A',
  },

  // Connect Membership Promotional Strip
  promoStripCard: {
    marginHorizontal: 16,
    marginTop: 20,
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1.5,
  },
  promoStripLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginRight: 8,
  },
  promoCrownCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  promoStripTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  goldBadgeSmall: {
    backgroundColor: '#F5B800',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  goldBadgeSmallText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: 0.5,
  },
  promoStripSub: {
    fontSize: 10.5,
    color: '#4B5563',
    fontWeight: '500',
    marginTop: 1,
  },
  promoStripCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F5B800',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
  },
  promoStripCtaText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#0F172A',
  },

  categoriesScroll: {
    paddingLeft: 4,
    paddingRight: 16,
    gap: 16,
  },
  categoryItem: {
    alignItems: 'center',
    width: 72,
  },
  categoryCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: '#F1EAD8',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    marginBottom: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1.5,
  },
  categoryLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0F172A',
    textAlign: 'center',
  },
  horizontalScroll: {
    paddingLeft: 4,
    paddingRight: 16,
  },

  prodCard: {
    width: 160,
    marginRight: 12,
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1EAD8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  prodImg: {

    width: '100%',
    height: 100,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  prodName: {
    fontSize: 12.5,
    fontWeight: 'bold',
    color: '#0F172A',
    marginTop: 10,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  strikePrice: {
    fontSize: 10.5,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
    marginRight: 6,
  },
  memberPrice: {
    fontSize: 13,
    color: '#D97706',
    fontWeight: 'bold',
  },
  goldBadge: {
    marginTop: 8,
    backgroundColor: 'rgba(217, 119, 6, 0.12)',
    paddingVertical: 3,
    borderRadius: 6,
    alignItems: 'center',
  },
  goldBadgeText: {
    fontSize: 8.5,
    fontWeight: 'bold',
    color: '#D97706',
  },
  vendorCard: {
    width: 200,
    marginRight: 14,
    padding: 0,
    overflow: 'hidden',
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  vendorImg: {
    width: '100%',
    height: 110,
    resizeMode: 'cover',
  },
  vendorInfo: {
    padding: 10,
  },
  vendorName: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 4,
  },
  vendorMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  metaCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metaVal: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  // Sidebar Styling
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  sidebar: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: '#050B1E',
    borderRightWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 6, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 10,
    zIndex: 901,
  },
  hamburgerBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 2,
  },
  sidebarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: '#030814',
  },
  sidebarBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sidebarLogo: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F4C400',
  },
  sidebarHeaderTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  sidebarCloseBtn: {
    padding: 6,
  },
  sidebarScroll: {
    flex: 1,
  },
  sidebarGreeting: {
    padding: 16,
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
    backgroundColor: 'rgba(255, 255, 255, 0.01)',
  },
  sidebarUserLabel: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.4)',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sidebarUserName: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '900',
    marginTop: 2,
  },
  catBlock: {
    marginVertical: 5,
    marginHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    overflow: 'hidden',
  },
  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  catLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  catText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  subcatContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.015)',
    paddingLeft: 12,
  },
  subcatBlock: {
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.015)',
  },
  subcatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  subcatLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  subcatText: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 12,
    fontWeight: '600',
  },
  itemsContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    paddingLeft: 20,
    paddingVertical: 6,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 16,
    gap: 8,
  },
  itemBullet: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#F4C400',
  },
  itemText: {
    color: 'rgba(255, 255, 255, 0.65)',
    fontSize: 11.5,
    fontWeight: '500',
  },
  sidebarFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: '#030814',
    gap: 12,
  },
  footerWalletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  footerWalletVal: {
    color: '#F4C400',
    fontSize: 12,
    fontWeight: 'bold',
  },
  footerActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: 8,
    gap: 8,
    borderWidth: 1,
  },
  profileBtn: {
    borderColor: 'rgba(255, 255, 255, 0.15)',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  profileBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  logoutBtnSidebar: {
    borderColor: 'rgba(239, 68, 68, 0.25)',
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
  },
  logoutBtnText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: 'bold',
  },
  // Universal Search Styling
  searchContainer: {
    flex: 1,
    backgroundColor: '#050B1E',
  },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: '#030814',
    gap: 12,
  },
  searchBackBtn: {
    padding: 6,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 40,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  searchInputField: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    paddingVertical: 0,
  },
  searchClearBtn: {
    padding: 4,
  },
  searchResultsScroll: {
    flex: 1,
  },
  searchSuggestions: {
    padding: 20,
  },
  searchSectionTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: 'rgba(255, 255, 255, 0.4)',
    letterSpacing: 1.2,
    marginBottom: 12,
  },
  suggestionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  suggestionTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  suggestionTagText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    fontWeight: '600',
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  searchCategoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    gap: 10,
  },
  searchCategoryIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchCategoryCardLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  searchResultsList: {
    padding: 20,
  },
  resultItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
    gap: 12,
  },
  resultIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(244, 196, 0, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultTextWrapper: {
    flex: 1,
  },
  resultItemName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  resultItemPath: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 11,
    marginTop: 2,
    fontWeight: '600',
  },
  noResultsContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
  },
  noResultsIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  noResultsTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  noResultsSubtitle: {
    color: 'rgba(255, 255, 255, 0.45)',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 260,
  },
  // Modern Clean Navigation Drawer Styles
  sidebarNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    paddingHorizontal: 20,
    backgroundColor: 'transparent',
  },
  sidebarNavRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  sidebarNavIconWrapper: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sidebarNavRowText: {
    fontSize: 14.5,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  sidebarNavRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sidebarNavValueText: {
    fontSize: 13,
    fontWeight: '600',
  },
  sidebarSectionDivider: {
    height: 1,
    marginVertical: 10,
    marginHorizontal: 20,
  },
  sidebarSection: {
    marginTop: 2,
  },
  sidebarSectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: 20,
    marginBottom: 6,
  },
  sidebarThemeWrapper: {
    paddingHorizontal: 20,
    marginTop: 10,
  },
  sidebarCtaContainer: {
    paddingHorizontal: 20,
    paddingTop: 2,
    paddingBottom: 4,
  },
  sidebarActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  sidebarActionBtnLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sidebarActionBtnText: {
    fontSize: 14,
    letterSpacing: 0.2,
  },
  sidebarLoginBtn: {
    backgroundColor: '#F4C400',
    elevation: 2,
    shadowColor: '#F4C400',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  sidebarLogoutBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  sidebarMenuCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    paddingHorizontal: 20,
    backgroundColor: 'transparent',
  },
  sidebarMenuCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  sidebarMenuCardText: {
    fontSize: 14.5,
    fontWeight: '600',
  },
  sidebarCardDivider: {
    height: 1,
    marginVertical: 10,
    marginHorizontal: 20,
  },
  sidebarLogoutCard: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  sidebarFooterOnly: {
    padding: 16,
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: '#030814',
    alignSelf: 'stretch',
  },
  feedGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 12,
  },
  feedCard: {
    width: (width - 52) / 2, // 2-columns with padding
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  feedImgWrapper: {
    position: 'relative',
    width: '100%',
    height: 120,
    backgroundColor: '#0D1636',
  },
  feedImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  discountBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#10B981',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  discountBadgeText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: 'bold',
  },
  heartBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(5, 11, 30, 0.6)',
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  feedDetails: {
    padding: 10,
  },
  feedName: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
    minHeight: 32,
  },
  feedSpec: {
    color: 'rgba(255, 255, 255, 0.45)',
    fontSize: 9,
    marginTop: 2,
  },
  feedRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 6,
  },
  ratingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  ratingText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '700',
  },
  assuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  assuredText: {
    color: '#10B981',
    fontSize: 8,
    fontWeight: 'bold',
  },
  feedPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 10,
  },
  feedPrice: {
    color: '#F4C400',
    fontSize: 13,
    fontWeight: '900',
  },
  feedStrikePrice: {
    color: 'rgba(255, 255, 255, 0.3)',
    fontSize: 9,
    textDecorationLine: 'line-through',
    marginTop: 1,
  },
  freeDelText: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 8,
    fontWeight: 'bold',
  },
  feedDescBox: {
    paddingHorizontal: 10,
    paddingBottom: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    paddingTop: 8,
  },
  feedDescText: {
    color: 'rgba(255, 255, 255, 0.65)',
    fontSize: 10,
    lineHeight: 14,
  },
  feedActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  feedSmallCartBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedAddCartBtn: {
    flex: 1,
    backgroundColor: '#F4C400',
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedAddCartText: {
    color: '#050B1E',
    fontSize: 10,
    fontWeight: 'bold',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  modalHeaderTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalCloseBtn: {
    padding: 4,
  },
  partnerListCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 16,
  },
  partnerListImg: {
    width: 64,
    height: 64,
    borderRadius: 10,
    backgroundColor: '#0D1636',
  },
  partnerListDetails: {
    flex: 1,
    marginLeft: 14,
  },
  partnerListName: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  partnerListDesc: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 10,
    marginTop: 4,
    lineHeight: 14,
  },
  partnerListMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 6,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(5, 11, 30, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: 'rgba(13, 22, 54, 0.95)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 24,
    padding: 0,
    overflow: 'hidden',
  },
  themeSection: {
    alignSelf: 'stretch',
    marginBottom: 10,
  },
  themeSectionTitle: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },
  themeOptionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    padding: 3,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  themeOptionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 9,
    backgroundColor: 'transparent',
  },
  themeOptionBtnActive: {
    backgroundColor: '#F4C400',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
  },
  themeOptionText: {
    fontSize: 12,
    fontWeight: '700',
  },
  themeOptionTextActive: {
    color: '#050B1E',
  },
  modalImageContainer: {
    width: '100%',
    height: 220,
    position: 'relative',
  },
  modalImage: {
    width: '100%',
    height: '100%',
  },
  modalImgCloseBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(5, 11, 30, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalInfoContainer: {
    padding: 20,
  },
  modalProductName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  modalMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  modalRatingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(244, 196, 0, 0.12)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  modalRatingText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#F4C400',
  },
  modalDiscountBadge: {
    backgroundColor: 'rgba(233, 30, 99, 0.12)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  modalDiscountText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#E91E63',
  },
  modalPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 16,
  },
  modalPriceText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#F4C400',
  },
  modalOriginalPriceText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.4)',
    textDecorationLine: 'line-through',
  },
  modalDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 16,
  },
  modalSectionTitle: {
    fontSize: 9.5,
    fontWeight: '900',
    color: 'rgba(255, 255, 255, 0.4)',
    letterSpacing: 1,
    marginBottom: 6,
  },
  modalDescText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.75)',
    lineHeight: 20,
    marginBottom: 20,
  },
  modalActionBtn: {
    backgroundColor: '#E91E63',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#E91E63',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  modalActionBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  modalSecondaryBtn: {
    borderWidth: 1.5,
    borderColor: '#E91E63',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  modalSecondaryBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#E91E63',
  },
  bannerSection: {
    marginTop: 10,
    marginBottom: 4,
  },
  bannerScrollContent: {
    paddingHorizontal: 0,
  },
  bannerCard: {
    height: 184,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
    backgroundColor: '#161311',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
    position: 'relative',
  },
  bannerBgImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  bannerContent: {
    width: '64%',
    height: '100%',
    padding: 14,
    justifyContent: 'space-between',
    zIndex: 2,
  },
  bannerTopGroup: {
    gap: 4,
  },
  bannerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  bannerCategoryTag: {
    color: '#F59E0B',
    fontSize: 9.5,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  bannerBadgeContainer: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.45)',
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderRadius: 6,
    paddingVertical: 2.5,
    paddingHorizontal: 7,
    marginBottom: 4,
  },
  bannerBadgeText: {
    color: '#F59E0B',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  bannerTitleGroup: {
    gap: 1,
  },
  bannerTitleWhite: {
    color: '#FFFFFF',
    fontSize: 18.5,
    fontWeight: '900',
    lineHeight: 22,
    letterSpacing: -0.3,
  },
  bannerTitleAmber: {
    color: '#F59E0B',
    fontSize: 17.5,
    fontWeight: '900',
    lineHeight: 21,
    letterSpacing: -0.2,
  },
  bannerTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
    lineHeight: 21,
  },
  bannerSubtitle: {
    color: '#CBD5E1',
    fontSize: 11,
    lineHeight: 15,
    marginTop: 2,
  },
  bannerBtn: {
    backgroundColor: '#F59E0B',
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 22,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 3,
  },
  bannerBtnText: {
    color: '#0F172A',
    fontSize: 11.5,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  bannerCircleBadge: {
    position: 'absolute',
    top: 10,
    right: 12,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FF1744',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
    elevation: 6,
    zIndex: 3,
  },
  bannerCircleSmallText: {
    color: '#FFFFFF',
    fontSize: 7.5,
    fontWeight: '800',
    letterSpacing: 0.4,
    lineHeight: 9,
  },
  bannerCircleBigText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '900',
    lineHeight: 15,
  },
  bannerDotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
    marginBottom: 12,
  },
  bannerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(156, 163, 175, 0.35)',
  },
  bannerDotActive: {
    width: 22,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FF6A00',
  },
  // Notification Modal Styles
  notifFullModalContainer: {
    flex: 1,
    position: 'relative',
    alignItems: 'center',
  },
  notifFullModalBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
  },
  notifDropdownPanel: {
    position: 'absolute',
    right: 14,
    width: width - 32,
    maxWidth: 350,
    borderRadius: 18,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 24,
    overflow: 'hidden',
  },
  notifPanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  notifPanelTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  notifPanelTitle: {
    fontSize: 13.5,
    fontWeight: '800',
  },
  notifBadgeSmall: {
    backgroundColor: '#F5B800',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 8,
  },
  notifBadgeSmallText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#0F172A',
  },
  notifPanelActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  markReadBtn: {
    backgroundColor: 'rgba(245, 184, 0, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  markReadBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#F5B800',
  },
  notifItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 10,
    gap: 10,
    borderBottomWidth: 1,
  },
  notifIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  notifItemTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  unreadDotMini: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EF4444',
  },
  notifItemBody: {
    fontSize: 11,
    lineHeight: 15,
    marginTop: 1,
  },
  notifItemTime: {
    fontSize: 9.5,
    marginTop: 3,
  },
  notifPanelFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 4,
    borderTopWidth: 1,
  },
  notifPanelFooterText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#F5B800',
  },

  // Light Branded Search Screen Styles
  searchLightContainer: {
    flex: 1,
    backgroundColor: '#FFF8E8',
  },
  searchLightHeader: {
    backgroundColor: '#FFF1C7',
    paddingHorizontal: 16,
    paddingBottom: 14,
    paddingTop: 6,
    borderBottomWidth: 1,
    borderColor: '#F1EAD8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  searchLightTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  searchLightBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F1EAD8',
  },
  searchLocationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F1EAD8',
    maxWidth: '65%',
  },
  searchLocationText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    flexShrink: 1,
  },
  searchNotificationBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F1EAD8',
    position: 'relative',
  },
  searchNotifBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#EF4444',
    borderRadius: 9,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  searchNotifBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
  },
  searchLightInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 46,
    borderWidth: 1.5,
    borderColor: '#F5B800',
    shadowColor: '#F5B800',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  searchLightInputListening: {
    borderColor: '#F59E0B',
    backgroundColor: 'rgba(245, 158, 11, 0.05)',
  },
  searchLightInputField: {
    flex: 1,
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '600',
    paddingVertical: 0,
  },
  inlineListeningRowLight: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  listeningTextLight: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '700',
    flex: 1,
  },
  waveBarGold: {
    width: 3,
    backgroundColor: '#F5B800',
    borderRadius: 2,
  },
  voiceErrorBannerLight: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    borderBottomWidth: 1,
    borderColor: '#FDE68A',
  },
  voiceErrorTextLight: {
    color: '#92400E',
    fontSize: 12,
    fontWeight: '600',
  },
  visualSearchChipRowLight: {
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  visualSearchChipLight: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F1EAD8',
    gap: 8,
  },
  visualSearchChipTextLight: {
    fontSize: 11.5,
    color: '#0F172A',
    fontWeight: '600',
    flex: 1,
  },
  searchLightScroll: {
    flex: 1,
  },
  searchSuggestionsLight: {
    padding: 16,
  },
  searchSectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  searchSectionTitleLight: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 1,
  },
  clearAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#D97706',
  },
  recentSearchPillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  recentSearchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F1EAD8',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  recentSearchPillText: {
    color: '#0F172A',
    fontSize: 12,
    fontWeight: '600',
  },
  suggestionsGridLight: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
    marginBottom: 16,
  },
  suggestionTagLight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F1EAD8',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  suggestionTagTextLight: {
    color: '#0F172A',
    fontSize: 12,
    fontWeight: '600',
  },
  categoriesGridLight: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 10,
  },
  searchCategoryCardLight: {
    width: (width - 42) / 2,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F1EAD8',
    borderRadius: 14,
    padding: 10,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  searchCategoryCircleLight: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchCategoryLabelLight: {
    color: '#0F172A',
    fontSize: 12.5,
    fontWeight: '700',
  },
  searchResultsListLight: {
    padding: 16,
  },
  resultItemCardLight: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F1EAD8',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1.5,
  },
  resultItemImgLight: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
  },
  resultItemDetailsLight: {
    flex: 1,
  },
  resultBadgeRowLight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  },
  resultCategoryBadgeLight: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  resultCategoryBadgeTextLight: {
    fontSize: 8.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  resultRatingTagLight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  resultRatingTextLight: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  resultItemNameLight: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  resultItemSubTextLight: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  resultPriceHighlightLight: {
    color: '#0F172A',
    fontWeight: '800',
  },
  noResultsContainerLight: {
    padding: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
  },
  noResultsIconCircleLight: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F1EAD8',
  },
  noResultsTitleLight: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 6,
  },
  noResultsSubtitleLight: {
    color: '#64748B',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
  },

  // Recommended Partner Hubs Bottom Sheet Styles
  partnerBottomSheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(5, 11, 30, 0.7)',
    justifyContent: 'flex-end',
  },
  partnerBottomSheetContainer: {
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderTopWidth: 1,
    height: height * 0.78,
    maxHeight: height * 0.82,
    paddingTop: 8,
    overflow: 'hidden',
  },
  sheetDragHandle: {
    width: 38,
    height: 4.5,
    borderRadius: 3,
    backgroundColor: 'rgba(148, 163, 184, 0.4)',
    alignSelf: 'center',
    marginBottom: 8,
  },
  partnerSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingBottom: 8,
  },
  partnerSheetTitle: {
    fontSize: 16.5,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  partnerSheetSubtitle: {
    fontSize: 11,
    marginTop: 2,
    fontWeight: '500',
  },
  partnerSheetCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  partnerChipsWrapper: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148, 163, 184, 0.15)',
    marginBottom: 10,
  },
  partnerChipsRow: {
    paddingHorizontal: 16,
    gap: 8,
  },
  partnerCatChip: {
    paddingHorizontal: 13,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  partnerCatChipText: {
    fontSize: 11.5,
  },
  partnerCompactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    padding: 10,
    gap: 12,
  },
  partnerCompactImg: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
  },
  partnerCompactInfo: {
    flex: 1,
  },
  partnerTopMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  partnerCategoryTag: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  partnerCategoryTagText: {
    fontSize: 8.5,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  partnerDistanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  partnerDistanceText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#F5B800',
  },
  partnerCompactName: {
    fontSize: 13,
    fontWeight: '800',
  },
  partnerCompactDesc: {
    fontSize: 10.5,
    marginTop: 1,
    marginBottom: 4,
  },
  partnerBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  partnerRatingTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  partnerRatingText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#F5B800',
  },
  partnerCtaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#F5B800',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  partnerCtaText: {
    fontSize: 10.5,
    fontWeight: '900',
    color: '#0F172A',
  },
});


