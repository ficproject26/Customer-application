import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  TextInput,
  Image,
  Modal,
  Alert,
  Share,
  RefreshControl,
  StatusBar,
  Platform,
  KeyboardAvoidingView,
  Keyboard,
  Linking,
} from 'react-native';
import { useNavigation, useIsFocused, useRoute, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { CustomerStackParamList } from '../../navigation/AppNavigator';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useOrderStore, Order } from '../../store/orderStore';
import { resolveImageUrl, apiFetch } from '../../services/api';
import { useThemeStore } from '../../store/themeStore';
import { useAuthStore, isUserAuthenticated } from '../../store/authStore';
import * as Icons from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WebView } from 'react-native-webview';
import { downloadInvoicePDF, shareInvoicePDF, generateInvoiceHTML } from '../../services/invoiceService';
import { useTranslation } from '../../store/languageStore';
import { socketService } from '../../services/socket';

const { width, height } = Dimensions.get('window');

type CustomerOrdersProp = StackNavigationProp<CustomerStackParamList, 'CustomerTabs'>;

export const CATEGORIES = [
  'All',
  'Daily Needs',
  'Food',
  'Products',
  'Services',
  'Stay',
  'Travel',
  'Jobs',
] as const;

export type CategoryFilterType = (typeof CATEGORIES)[number];

export const TOP_TABS = ['My Orders', 'My Bookings', 'Job Applied'] as const;
export type TopTabType = (typeof TOP_TABS)[number];

export type StatusFilterType = 'all' | 'active' | 'completed' | 'bookings' | 'cancelled';
export type DateFilterType = 'all' | 'today' | 'this_week' | 'this_month' | 'custom';

export default function CustomerOrders() {
  const { t } = useTranslation();
  const navigation = useNavigation<CustomerOrdersProp>();
  const isFocused = useIsFocused();
  const route = useRoute<any>();
  const colors = useThemeStore((state) => state.colors);
  const isDark = useThemeStore((state) => state.isDark);
  const isLight = !isDark;
  const currentUser = useAuthStore((state) => state.currentUser);
  const insets = useSafeAreaInsets();
  const isAuthenticated = isUserAuthenticated(currentUser);
  const allOrders = useOrderStore((state) => state.allOrders);
  const loadAllOrders = useOrderStore((state) => state.loadAllOrders);
  const cancelCustomerOrder = useOrderStore((state) => state.cancelCustomerOrder);
  const rateOrder = useOrderStore((state) => state.rateOrder);

  // Search & Filter State
  const [refreshing, setRefreshing] = useState(false);
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Date Filter State
  const [selectedDateFilter, setSelectedDateFilter] = useState<DateFilterType>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // 1. Primary Top Tab Filter (null = unselected / all)
  const [selectedTopTab, setSelectedTopTab] = useState<TopTabType | null>(null);

  // 2. Secondary Category Filter ('All' or specific category)
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // 3. Status Filter ('all' | 'active' | 'completed' | 'cancelled' | 'returned')
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');

  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  // Modals & Action State
  const [selectedOrderForDetails, setSelectedOrderForDetails] = useState<Order | null>(null);
  const [showAllDetails, setShowAllDetails] = useState(false);
  const [isTrackingTimelineModalOpen, setIsTrackingTimelineModalOpen] = useState(false);
  const [isStatusCardExpanded, setIsStatusCardExpanded] = useState(true);
  const [isDeliveryCardExpanded, setIsDeliveryCardExpanded] = useState(false);
  const [isPriceCardExpanded, setIsPriceCardExpanded] = useState(false);
  const [selectedOrderForReview, setSelectedOrderForReview] = useState<Order | null>(null);
  const [selectedOrderForCancel, setSelectedOrderForCancel] = useState<Order | null>(null);
  const [cancelReason, setCancelReason] = useState('Found a better price');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  // Delivery details & Invoice Modals state
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [invoiceToastMsg, setInvoiceToastMsg] = useState<string | null>(null);
  const [savedAddressesList, setSavedAddressesList] = useState<any[]>([]);
  const [selectedAddressIndex, setSelectedAddressIndex] = useState<number>(0);
  const [editAddressText, setEditAddressText] = useState('');
  const [editAddressLabel, setEditAddressLabel] = useState('Home');
  const [editContactName, setEditContactName] = useState('');
  const [editContactPhone, setEditContactPhone] = useState('');
  const [isSavingDeliveryDetails, setIsSavingDeliveryDetails] = useState(false);
  const [isAddingNewAddress, setIsAddingNewAddress] = useState(false);

  // Live Jobs Catalog mapping for dynamic Job details resolution
  const [jobsCatalogMap, setJobsCatalogMap] = useState<Record<string, any>>({});

  const refreshJobsCatalog = useCallback(() => {
    apiFetch('/products?category=Jobs', { skipCache: true })
      .then((res: any) => {
        const rawList = res?.data || res?.products || res?.items || (Array.isArray(res) ? res : []);
        if (Array.isArray(rawList)) {
          const map: Record<string, any> = {};
          rawList.forEach((p: any) => {
            if (p.isDeleted !== true && p.status !== 'deleted' && p.isActive !== false) {
              if (p.jobID) map[p.jobID.toLowerCase()] = p;
              if (p._id) map[String(p._id).toLowerCase()] = p;
              if (p.id) map[String(p.id).toLowerCase()] = p;
              if (p.name) map[p.name.toLowerCase().trim()] = p;
            }
          });
          setJobsCatalogMap(map);
        }
      })
      .catch(() => {});
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshJobsCatalog();
    }, [refreshJobsCatalog])
  );

  const getResolvedJobInfo = useCallback(
    (order: Order) => {
      const rawNum = (order.order_number || '').toLowerCase();
      const rawId = (order.id || '').toLowerCase();
      const rawTitle = (order.product_details || order.items?.[0]?.name || '').toLowerCase();

      // Find matching job in backend catalog
      const matchedJob =
        jobsCatalogMap[rawNum] ||
        jobsCatalogMap[rawNum.replace('#', '')] ||
        jobsCatalogMap[rawId] ||
        jobsCatalogMap[rawTitle] ||
        Object.values(jobsCatalogMap).find(
          (j: any) =>
            (j.jobID && rawNum.includes(j.jobID.toLowerCase())) ||
            (j.jobID && rawTitle.includes(j.jobID.toLowerCase())) ||
            (j.name && rawTitle.includes(j.name.toLowerCase()))
        );

      // Clean Title
      let title = order.product_details || order.items?.[0]?.name || matchedJob?.name || 'Job Role';
      title = title.replace(/\s*\([^\)]*\)\s*-\s*ID:.*$/i, '').trim();

      // Company
      const company =
        order.vendor_name ||
        order.brand_or_seller ||
        matchedJob?.vendorName ||
        matchedJob?.businessName ||
        matchedJob?.seller?.name ||
        'Verified Employer';

      // Salary
      let salary =
        order.salary ||
        (order as any).salaryPackage ||
        matchedJob?.salaryPackage ||
        (matchedJob?.price ? `₹${matchedJob.price}` : '') ||
        '';
      if (!salary || salary === '0' || salary === '₹0') {
        salary = 'Competitive Salary';
      }

      // Location
      let location =
        order.location ||
        (order as any).jobLocation ||
        matchedJob?.jobLocation ||
        matchedJob?.location ||
        matchedJob?.seller?.location ||
        '';
      if (!location) {
        location = 'Remote / On-site';
      }

      // Department
      let department =
        order.department ||
        (order as any).subCategory ||
        matchedJob?.subCategory ||
        matchedJob?.subcategory ||
        matchedJob?.department ||
        '';
      if (!department) {
        department = 'IT & Engineering';
      }

      // Work Mode
      const workMode =
        order.work_mode ||
        (order as any).workMode ||
        matchedJob?.jobType ||
        matchedJob?.workMode ||
        'Full-time';

      // Experience
      const experience =
        order.experience ||
        (order as any).experience ||
        matchedJob?.experienceLevel ||
        matchedJob?.experienceRequired ||
        '1–3 yrs';

      // Applicant Details
      const candidateName = order.customer_name || 'Applicant';
      const candidatePhone = order.customer_phone || '';
      const candidateEmail = order.applicant_email || (order as any).email || currentUser?.email || '';

      let resumeName = order.resume_name || '';
      if (!resumeName && order.customer_address) {
        const match = order.customer_address.match(/Resume:\s*([^\s•]+(?:\.[a-zA-Z0-9]+)?)/i);
        if (match) resumeName = match[1];
      }
      if (!resumeName) resumeName = 'Applicant_Resume.pdf';

      let education = order.applicant_education || '';
      if (!education && order.customer_address) {
        const parts = order.customer_address.split('•');
        if (parts.length > 0 && !parts[0].includes('Resume:')) {
          education = parts[0].trim();
        }
      }
      if (!education) education = matchedJob?.qualification || 'Degree / Professional';

      let applicantExp = order.applicant_experience || '';
      if (!applicantExp && order.customer_address) {
        const parts = order.customer_address.split('•');
        if (parts.length > 1 && !parts[1].includes('Resume:')) {
          applicantExp = parts[1].trim();
        }
      }
      if (!applicantExp) applicantExp = experience;

      const isJobDeleted = !matchedJob || matchedJob.isActive === false || matchedJob.isDeleted === true || matchedJob.status === 'deleted' || matchedJob.status === 'Inactive';
      const companyWebsite = matchedJob?.companyWebsite || matchedJob?.linkedProfileUrl || (order as any).companyWebsite || '';

      return {
        title,
        company,
        companyWebsite,
        salary,
        location,
        department,
        workMode,
        experience,
        candidateName,
        candidatePhone,
        candidateEmail,
        resumeName,
        education,
        applicantExp,
        matchedJob,
        isJobDeleted,
      };
    },
    [jobsCatalogMap, currentUser]
  );

  // Structured fields for Add New Address form
  const [newAddressLabel, setNewAddressLabel] = useState<'Home' | 'Work' | 'Other'>('Home');
  const [newHouse, setNewHouse] = useState('');
  const [newStreet, setNewStreet] = useState('');
  const [newLandmark, setNewLandmark] = useState('');
  const [newCity, setNewCity] = useState('Bengaluru');
  const [newState, setNewState] = useState('Karnataka');
  const [newPincode, setNewPincode] = useState('');

  // Keyboard avoidance height tracking
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
      }
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Status checks
  const isOrderDelivered = (order?: Order | null): boolean => {
    if (!order) return false;
    const s = (order.status || '').toLowerCase();
    return s === 'delivered' || s === 'completed';
  };

  const isOrderPackedOrBeyond = (order?: Order | null): boolean => {
    if (!order) return false;
    const s = (order.status || '').toLowerCase();
    return (
      s.includes('pack') ||
      s.includes('ship') ||
      s.includes('dispatch') ||
      s.includes('assign') ||
      s.includes('out') ||
      s.includes('deliver') ||
      s.includes('complet') ||
      s.includes('cancel')
    );
  };

  const handleOpenAddressModal = async () => {
    if (!selectedOrderForDetails) return;
    const currentAddr =
      (selectedOrderForDetails as any).delivery_address ||
      (selectedOrderForDetails as any).customerAddress ||
      selectedOrderForDetails.customer_address ||
      '';
    const currentLabel = (selectedOrderForDetails as any).address_label || 'Home';
    setEditAddressText(currentAddr);
    setEditAddressLabel(currentLabel);
    setIsAddingNewAddress(false);
    setNewHouse('');
    setNewStreet('');
    setNewLandmark('');
    setNewCity('Bengaluru');
    setNewState('Karnataka');
    setNewPincode('');
    setNewAddressLabel('Home');

    try {
      const storageKey = isUserAuthenticated(currentUser)
        ? `connect_user_addresses_${currentUser?.id || 'registered'}`
        : 'connect_app_customer_addresses';
      const raw = await AsyncStorage.getItem(storageKey);
      let list: any[] = [];
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          list = parsed;
        }
      }

      if (list.length === 0) {
        const altRaw = await AsyncStorage.getItem('connect_guest_addresses');
        if (altRaw) {
          const altParsed = JSON.parse(altRaw);
          if (Array.isArray(altParsed) && altParsed.length > 0) {
            list = altParsed;
          }
        }
      }

      // If still empty and order has an address or user has address:
      if (list.length === 0 && (currentAddr || currentUser?.address)) {
        list = [
          {
            id: 'addr_default_1',
            label: currentLabel || 'Home',
            house: currentAddr || currentUser?.address?.address || '962, Papareddypalya',
            street: 'Bengaluru',
            city: currentUser?.address?.city || 'Bengaluru',
            state: currentUser?.address?.state || 'Karnataka',
            pincode: currentUser?.address?.pincode || '560072',
            isDefault: true,
          },
        ];
      }

      setSavedAddressesList(list);

      let matchedIdx = 0;
      if (list.length > 0) {
        list.forEach((addr: any, idx: number) => {
          const fullAddr = `${addr.house || ''} ${addr.street || ''}, ${
            addr.landmark ? addr.landmark + ', ' : ''
          }${addr.city || ''} ${addr.pincode || ''}`.trim();
          if (
            currentAddr &&
            (currentAddr.trim().toLowerCase() === fullAddr.trim().toLowerCase() ||
              (addr.label && currentLabel && addr.label.toLowerCase() === currentLabel.toLowerCase()))
          ) {
            matchedIdx = idx;
          }
        });
        const matched = list[matchedIdx];
        const fullAddr = `${matched.house || ''} ${matched.street || ''}, ${
          matched.landmark ? matched.landmark + ', ' : ''
        }${matched.city || ''} ${matched.pincode || ''}`.trim();
        setEditAddressText(fullAddr);
        setEditAddressLabel(matched.label || 'Home');
        setSelectedAddressIndex(matchedIdx);
      }
    } catch (e) {
      console.log('Error reading saved addresses:', e);
    }

    setIsAddressModalOpen(true);
  };

  const handleOpenPhoneModal = () => {
    if (!selectedOrderForDetails) return;
    const currentName =
      selectedOrderForDetails.customer_name ||
      (selectedOrderForDetails as any).memberName ||
      currentUser?.name ||
      '';
    const currentPhone =
      (selectedOrderForDetails as any).phone ||
      (selectedOrderForDetails as any).customerPhone ||
      (selectedOrderForDetails as any).contact_phone ||
      selectedOrderForDetails.customer_phone ||
      '';
    setEditContactName(currentName);
    setEditContactPhone(currentPhone);
    setIsPhoneModalOpen(true);
  };

  const handleSaveAddress = async (newAddr: string, newLabel: string) => {
    if (!selectedOrderForDetails) return;
    if (!newAddr.trim()) {
      Alert.alert('Address Required', 'Please enter or select a valid delivery address.');
      return;
    }
    setIsSavingDeliveryDetails(true);
    const orderId = selectedOrderForDetails.id || selectedOrderForDetails.order_number;
    const ok = await useOrderStore.getState().updateDeliveryDetails(orderId, {
      customer_address: newAddr.trim(),
      address_label: newLabel,
    });
    setIsSavingDeliveryDetails(false);
    if (ok) {
      setSelectedOrderForDetails((prev: any) =>
        prev
          ? {
              ...prev,
              customer_address: newAddr.trim(),
              delivery_address: newAddr.trim(),
              customerAddress: newAddr.trim(),
              address_label: newLabel,
            }
          : null
      );
      setIsAddressModalOpen(false);
      setActionSuccessMsg('Delivery address updated successfully!');
      setTimeout(() => setActionSuccessMsg(null), 3500);
    } else {
      Alert.alert('Update Failed', 'Failed to update address. Please check your network.');
    }
  };

  const handleSaveNewAddress = async () => {
    if (!newHouse.trim()) {
      Alert.alert('Required Field', 'Please enter Flat / House / Building details.');
      return;
    }
    if (!newStreet.trim()) {
      Alert.alert('Required Field', 'Please enter Street / Area details.');
      return;
    }
    if (!newCity.trim()) {
      Alert.alert('Required Field', 'Please enter City.');
      return;
    }
    const cleanPin = newPincode.replace(/[^0-9]/g, '');
    if (cleanPin.length !== 6) {
      Alert.alert('Invalid Pincode', 'Please enter a valid 6-digit Pincode.');
      return;
    }

    const formatted = `${newHouse.trim()}, ${newStreet.trim()}${
      newLandmark.trim() ? ', ' + newLandmark.trim() : ''
    }, ${newCity.trim()}, ${newState.trim() || 'Karnataka'} - ${cleanPin}`;

    const newObj = {
      id: `addr_${Date.now()}`,
      label: newAddressLabel,
      house: newHouse.trim(),
      street: newStreet.trim(),
      landmark: newLandmark.trim(),
      city: newCity.trim(),
      state: newState.trim() || 'Karnataka',
      pincode: cleanPin,
      isDefault: false,
    };

    try {
      const storageKey = isUserAuthenticated(currentUser)
        ? `connect_user_addresses_${currentUser?.id || 'registered'}`
        : 'connect_app_customer_addresses';
      const updatedList = [newObj, ...savedAddressesList];
      await AsyncStorage.setItem(storageKey, JSON.stringify(updatedList));
      setSavedAddressesList(updatedList);
    } catch (err) {
      console.warn('Failed to persist new address:', err);
    }

    await handleSaveAddress(formatted, newAddressLabel);
    setIsAddingNewAddress(false);
  };

  const handleSaveContact = async () => {
    if (!selectedOrderForDetails) return;
    const cleanPhone = editContactPhone.replace(/[^0-9]/g, '');
    if (cleanPhone.length < 10) {
      Alert.alert('Invalid Number', 'Please enter a valid 10-digit mobile number.');
      return;
    }
    setIsSavingDeliveryDetails(true);
    const orderId = selectedOrderForDetails.id || selectedOrderForDetails.order_number;
    const ok = await useOrderStore.getState().updateDeliveryDetails(orderId, {
      customer_name: editContactName.trim() || selectedOrderForDetails.customer_name,
      customer_phone: editContactPhone.trim(),
    });
    setIsSavingDeliveryDetails(false);
    if (ok) {
      setSelectedOrderForDetails((prev: any) =>
        prev
          ? {
              ...prev,
              customer_name: editContactName.trim() || prev.customer_name,
              memberName: editContactName.trim() || (prev as any).memberName,
              customer_phone: editContactPhone.trim(),
              customerPhone: editContactPhone.trim(),
              phone: editContactPhone.trim(),
            }
          : null
      );
      setIsPhoneModalOpen(false);
      Alert.alert('Contact Updated', 'Contact details updated successfully!');
    } else {
      Alert.alert('Update Failed', 'Failed to update contact phone number.');
    }
  };

  const handleOpenOnlineInvoice = (order: Order) => {
    setSelectedOrderForDetails(order);
    setIsInvoiceModalOpen(true);
  };

  const [liveStatusBanner, setLiveStatusBanner] = useState<{
    visible: boolean;
    orderNumber: string;
    status: string;
    message: string;
  } | null>(null);

  // Sync selectedOrderForDetails when allOrders updates in store
  useEffect(() => {
    if (selectedOrderForDetails) {
      const match = allOrders.find(
        (o) =>
          String(o.id) === String(selectedOrderForDetails.id) ||
          String(o.order_number) === String(selectedOrderForDetails.order_number) ||
          String((o as any)._id) === String(selectedOrderForDetails.id)
      );
      if (
        match &&
        (match.status !== selectedOrderForDetails.status ||
          (match.tracking_updates?.length || 0) !== (selectedOrderForDetails.tracking_updates?.length || 0))
      ) {
        setSelectedOrderForDetails(match);
      }
    }
  }, [allOrders, selectedOrderForDetails]);

  // Real-time socket listener for order status changes (Vendor acceptance, status updates)
  useEffect(() => {
    const handleStatusLiveUpdate = (data: any) => {
      if (!data) return;
      console.log('[CustomerOrders Screen] Real-time socket update received:', data);
      const incomingId = String(data.orderId || data.order_number || data.id || '');
      const newStatus = data.status || 'Accepted';
      const joyfulMsg = data.message || data.body || `Your order #${incomingId} has been updated to ${newStatus}`;

      // (Top live green banner removed as requested by user)

      // Also directly update in orderStore
      useOrderStore.getState().updateOrderStatusLocally(incomingId, newStatus, {
        order: data.order,
        description: joyfulMsg,
      });

      // If user has the details sheet open for this order, immediately update it live!
      setSelectedOrderForDetails((current) => {
        if (!current) return current;
        const matches =
          String(current.id) === incomingId ||
          String(current.order_number) === incomingId ||
          String((current as any)._id) === incomingId ||
          (data.order_number && String(current.order_number) === String(data.order_number)) ||
          (data.id && String(current.id) === String(data.id)) ||
          (data._id && String((current as any)._id) === String(data._id));

        if (matches) {
          const newTracking = data.order?.tracking_updates || [
            ...(current.tracking_updates || []),
            {
              title: data.title || `Order ${newStatus}`,
              status: newStatus,
              message: data.description || joyfulMsg,
              timestamp: data.timestamp || new Date().toISOString(),
            },
          ];
          return {
            ...current,
            status: newStatus,
            joyful_message: joyfulMsg,
            tracking_updates: newTracking,
          };
        }
        return current;
      });

      // Reload fresh orders from backend silently
      loadAllOrders(true).catch(() => {});
    };

    socketService.on('order_status_updated', handleStatusLiveUpdate);
    socketService.on('customer_order_status', handleStatusLiveUpdate);
    socketService.on('job_application_updated', handleStatusLiveUpdate);

    return () => {
      socketService.off('order_status_updated', handleStatusLiveUpdate);
      socketService.off('customer_order_status', handleStatusLiveUpdate);
      socketService.off('job_application_updated', handleStatusLiveUpdate);
    };
  }, [loadAllOrders]);

  // Gentle fallback polling every 3 seconds while order details modal is open
  useEffect(() => {
    if (!selectedOrderForDetails) return;
    const interval = setInterval(() => {
      loadAllOrders(true).catch(() => {});
    }, 3000);
    return () => clearInterval(interval);
  }, [selectedOrderForDetails, loadAllOrders]);

  // Fetch orders in background once on mount without blocking UI
  useEffect(() => {
    loadAllOrders().catch((e) => console.log('Silent load orders err:', e));
  }, [loadAllOrders]);

  // Sync route params if navigated from elsewhere
  useEffect(() => {
    if (route.params?.activeTab) {
      const tabParam = String(route.params.activeTab).toLowerCase();
      if (tabParam === 'bookings' || tabParam === 'my bookings') {
        setSelectedTopTab('My Bookings');
      } else if (tabParam === 'jobs' || tabParam === 'job applied') {
        setSelectedTopTab('Job Applied');
      } else if (tabParam === 'orders' || tabParam === 'my orders') {
        setSelectedTopTab('My Orders');
      }
      setSelectedCategory('All');
    }
    if (route.params?.category) {
      const cat = String(route.params.category).toLowerCase();
      if (cat === 'jobs' || cat === 'job') {
        setSelectedTopTab('Job Applied');
        setSelectedCategory('Jobs');
      } else if (['services', 'service', 'stay', 'travel', 'healthcare'].includes(cat)) {
        setSelectedTopTab('My Bookings');
        setSelectedCategory(cat === 'services' || cat === 'service' ? 'Services' : cat === 'stay' ? 'Stay' : 'Travel');
      } else if (['products', 'product', 'daily needs', 'food'].includes(cat)) {
        setSelectedTopTab('My Orders');
        setSelectedCategory(cat === 'daily needs' ? 'Daily Needs' : cat === 'food' ? 'Food' : 'Products');
      }
    }
  }, [route.params?.activeTab, route.params?.category]);

  // Auto-refresh orders silently in background when screen is focused
  useFocusEffect(
    useCallback(() => {
      loadAllOrders().catch(() => {});
    }, [loadAllOrders])
  );

  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    await loadAllOrders();
    setRefreshing(false);
  };

  // Status Check Helpers
  const isActiveStatus = (status: string) => {
    const s = (status || '').toLowerCase();
    return (
      s.includes('order received') ||
      s.includes('placed') ||
      s.includes('preparing') ||
      s.includes('processing') ||
      s.includes('ready') ||
      s.includes('assigned') ||
      s.includes('accepted') ||
      s.includes('picked up') ||
      s.includes('out for delivery') ||
      s.includes('near customer') ||
      s.includes('in transit') ||
      s.includes('confirmed') ||
      s.includes('in progress')
    );
  };

  const isCompletedStatus = (status: string) => {
    const s = (status || '').toLowerCase();
    return s.includes('delivered') || s.includes('completed');
  };

  const isCancelledStatus = (status: string) => {
    return (status || '').toLowerCase().includes('cancel');
  };

  // Status Badge Colors & Info
  const getStatusMeta = (status: string) => {
    const s = (status || '').toLowerCase();
    if (isCompletedStatus(status)) {
      return {
        label: (status || 'COMPLETED').toUpperCase(),
        color: '#10B981',
        bg: 'rgba(16, 185, 129, 0.12)',
        border: 'rgba(16, 185, 129, 0.25)',
      };
    }
    if (isCancelledStatus(status)) {
      return {
        label: 'CANCELLED',
        color: '#EF4444',
        bg: 'rgba(239, 68, 68, 0.12)',
        border: 'rgba(239, 68, 68, 0.25)',
      };
    }
    if (
      s.includes('out for delivery') ||
      s.includes('in transit')
    ) {
      return {
        label: 'OUT FOR DELIVERY',
        color: '#3B82F6',
        bg: 'rgba(59, 130, 246, 0.12)',
        border: 'rgba(59, 130, 246, 0.25)',
      };
    }
    if (s.includes('confirmed')) {
      return {
        label: 'CONFIRMED',
        color: '#06B6D4',
        bg: 'rgba(6, 182, 212, 0.12)',
        border: 'rgba(6, 182, 212, 0.25)',
      };
    }
    return {
      label: (status || 'ORDER RECEIVED').toUpperCase(),
      color: '#F59E0B',
      bg: 'rgba(245, 158, 11, 0.12)',
      border: 'rgba(245, 158, 11, 0.25)',
    };
  };

  // Pure helper to categorize orders accurately across all features
  const normalizeOrderCategory = (order: Order): string => {
    if (!order) return 'Products';
    const cat = String(order.category || '').trim();
    const orderType = String(order.order_type || '').trim();
    const orderNum = String(order.order_number || '');
    const id = String(order.id || '');

    if (
      cat === 'Jobs' ||
      cat === 'Job' ||
      cat.toLowerCase() === 'jobs' ||
      orderNum.includes('JOB') ||
      id.includes('job') ||
      Boolean(order.application_status) ||
      Boolean(order.resume_name) ||
      Boolean(order.applicant_education) ||
      Boolean((order as any).candidateResume)
    ) {
      return 'Jobs';
    }
    if (
      cat === 'Travel' ||
      cat.toLowerCase() === 'travel' ||
      Boolean((order as any).boarding_point) ||
      Boolean((order as any).dropping_point) ||
      ((order.product_details || '').toLowerCase().includes('boarding:') && (order.product_details || '').toLowerCase().includes('dropping:')) ||
      /\b(bus|travels?|volvo|sleeper|seater)\b/i.test(order.product_details || '') ||
      /\b(bus|travels?|ksrtc|vrl|intrcity|airavat)\b/i.test(order.vendor_name || '')
    ) {
      const lowerPd = (order.product_details || '').toLowerCase();
      if (!cat.toLowerCase().includes('food') && !cat.toLowerCase().includes('daily') && !lowerPd.includes('biryani') && !lowerPd.includes('milk')) {
        return 'Travel';
      }
    }
    if (cat === 'Services' || cat === 'Service') return 'Services';
    if (cat === 'Stay') return 'Stay';
    if (cat === 'Travel') return 'Travel';
    if (cat === 'Daily Needs' || cat === 'Grocery' || cat.toLowerCase().includes('daily')) return 'Daily Needs';
    if (cat === 'Food') return 'Food';

    // Daily Needs item detection (Milk, lays, dairy, snacks, groceries, etc.)
    const detailsLower = (order.product_details || '').toLowerCase();
    const hasDailyNeedsItem =
      (order.items &&
        order.items.some((it: any) => {
          const itCat = String(it.category || '').toLowerCase();
          const itName = String(it.name || '').toLowerCase();
          return (
            itCat.includes('daily') ||
            itCat.includes('grocery') ||
            itCat.includes('dairy') ||
            itCat.includes('snack') ||
            /\b(milk|lays|curd|bread|eggs?|butter|chips|paneer|biscuit|biscuits|tea|coffee|atta|rice|dal|sugar|oil|vegetables?|fruits?)\b/i.test(itName)
          );
        })) ||
      /\b(milk|lays|curd|bread|eggs?|butter|chips|paneer|biscuit|biscuits|tea|coffee|atta|rice|dal|sugar|oil|vegetables?|fruits?)\b/i.test(detailsLower);

    if (hasDailyNeedsItem) {
      return 'Daily Needs';
    }

    if (cat === 'Products' || cat === 'Product' || cat === 'Electronics' || cat === 'Fashion') return 'Products';

    if (orderType === 'booking') return 'Services';
    return 'Products';
  };

  // Check if order is eligible for express delivery tracking (Daily Needs, Food, Products)
  const isExpressDeliveryEligible = (order: Order): boolean => {
    if (!order) return false;
    const norm = normalizeOrderCategory(order);
    if (norm === 'Daily Needs' || norm === 'Food') return true;
    if (norm === 'Products') {
      return true; // Local/express products eligible for live tracking
    }
    return false;
  };

  // Get dynamic express delivery timing based on order and category
  const getDynamicExpressTiming = (order: Order): string => {
    if (!order) return 'Express';
    const o = order as any;
    if (o.tracking?.eta) return `${o.tracking.eta} mins`;
    if (o.delivery_time) return o.delivery_time;
    if (o.estimated_delivery) return o.estimated_delivery;
    const cat = normalizeOrderCategory(order);
    if (cat === 'Food') return '20-30 mins';
    if (cat === 'Daily Needs') return '15-25 mins';
    return '15-30 mins';
  };

  // Category Tag Meta
  const getCategoryMeta = (order: Order) => {
    const cat = normalizeOrderCategory(order);
    switch (cat) {
      case 'Daily Needs':
        return { label: 'DAILY NEEDS', color: '#10B981', icon: Icons.ShoppingBasket };
      case 'Food':
        return { label: 'FOOD & DINING', color: '#F97316', icon: Icons.UtensilsCrossed };
      case 'Products':
      case 'Electronics':
      case 'Fashion':
        return { label: 'PRODUCTS', color: '#3B82F6', icon: Icons.Package };
      case 'Services':
        return { label: 'SERVICE BOOKING', color: '#8B5CF6', icon: Icons.Wrench };
      case 'Stay':
        return { label: 'STAY BOOKING', color: '#0EA5E9', icon: Icons.Hotel };
      case 'Travel':
        return { label: 'BUS TICKET', color: '#EC4899', icon: Icons.Bus };
      case 'Jobs':
        return { label: 'JOB APPLICATION', color: '#059669', icon: Icons.Briefcase };
      default:
        return { label: 'PRODUCTS', color: '#F59E0B', icon: Icons.Package };
    }
  };

  // Helper to determine if an order is a Bus Booking
  const isBusOrder = (order: Order | null | undefined): boolean => {
    if (!order) return false;
    const cat = String(order.category || '').toLowerCase();
    const normCat = normalizeOrderCategory(order).toLowerCase();
    const pd = String(order.product_details || '').toLowerCase();
    const vendor = String(order.vendor_name || '').toLowerCase();
    const hasBoarding = Boolean((order as any).boarding_point);
    const hasDropping = Boolean((order as any).dropping_point);
    const hasTravelers = Boolean((order as any).travelers && (order as any).travelers.length > 0);

    if (cat === 'travel' || normCat === 'travel') return true;
    if (hasBoarding || hasDropping || hasTravelers) return true;
    if (pd.includes('boarding:') || pd.includes('dropping:')) return true;
    if (
      /\b(bus|travels?|volvo|sleeper|seater|ksrtc|vrl|intrcity|redbus|airavat)\b/i.test(pd) ||
      /\b(bus|travels?|ksrtc|vrl|intrcity|airavat)\b/i.test(vendor)
    ) {
      if (!cat.includes('food') && !cat.includes('daily') && !pd.includes('biryani') && !pd.includes('milk')) return true;
    }
    return false;
  };

  // Helper to determine if an order is a Doorstep / Professional Service Booking
  const isServiceOrder = (order: Order | null | undefined): boolean => {
    if (!order) return false;
    if (isBusOrder(order)) return false;
    const cat = String(order.category || '').toLowerCase();
    const normCat = normalizeOrderCategory(order).toLowerCase();
    const ordType = String(order.order_type || (order as any).type || '').toLowerCase();
    const ordNum = String(order.order_number || order.id || '').toUpperCase();
    const pd = String(order.product_details || '').toLowerCase();

    if (ordNum.startsWith('BK-') || ordNum.includes('SRV') || ordNum.includes('BK')) return true;
    if (ordType === 'booking' && normCat !== 'stay' && normCat !== 'travel') return true;
    if (
      normCat === 'services' ||
      cat.includes('service') ||
      cat.includes('repair') ||
      cat.includes('plumb') ||
      cat.includes('electric') ||
      cat.includes('clean') ||
      cat.includes('appliance') ||
      cat.includes('salon') ||
      cat.includes('auto') ||
      cat.includes('health') ||
      cat.includes('legal')
    ) {
      return true;
    }
    if (
      /\b(repair|service|cleaning|jet wash|plumber|electrician|carpenter|inspection|technician|installation)\b/i.test(pd)
    ) {
      if (!cat.includes('food') && !cat.includes('daily') && !pd.includes('biryani') && !pd.includes('milk')) return true;
    }
    return false;
  };

  // Helper to extract clean structured info from a Service Booking Order
  const getResolvedServiceInfo = (order: Order) => {
    const o = order as any;
    const pd = String(o.product_details || o.items?.[0]?.name || 'Service Booking');

    // Clean service name (e.g. "Washing machine repair")
    let serviceName = pd.split('(')[0]?.trim();
    if (!serviceName) serviceName = o.items?.[0]?.name || 'Home Service';

    // Package / problem label
    let packageLabel = '';
    const parenMatch = pd.match(/\(([^•)]+)/);
    if (parenMatch && parenMatch[1]) {
      packageLabel = parenMatch[1].trim();
    }
    if (!packageLabel && o.problemPackage) {
      packageLabel = o.problemPackage;
    }
    if (!packageLabel) {
      packageLabel = 'Standard Service & Inspection';
    }

    // Appointment date and time slot
    let dateStr = '';
    let timeStr = '';
    const appointmentSlot = String(o.appointment_slot || '');

    if (appointmentSlot && appointmentSlot.includes(' at ')) {
      const parts = appointmentSlot.split(' at ');
      dateStr = parts[0]?.trim();
      timeStr = parts[1]?.trim();
    } else if (appointmentSlot) {
      dateStr = appointmentSlot;
      timeStr = '09:00 AM';
    } else if (pd.includes('•')) {
      const dateMatch = pd.match(/•\s*([A-Za-z]{3},\s*\d{1,2}\s+[A-Za-z]{3}\s+\d{4})\s*(?:at\s*(\d{1,2}:\d{2}\s*(?:AM|PM)))?/i);
      if (dateMatch) {
        dateStr = dateMatch[1]?.trim();
        timeStr = dateMatch[2]?.trim() || '09:00 AM';
      }
    }

    if (!dateStr) {
      const createdDate = o.created_at || o.createdAt || Date.now();
      dateStr = formatOrderDisplayDate(createdDate, 0).short;
    }
    if (!timeStr) {
      timeStr = '09:00 AM';
    }

    // Expert / Technician details
    const expertName = o.technician_name || o.expert_name || 'Rajesh Kumar';
    const expertPhone = o.technician_phone || '+91 98451 23456';
    const expertRating = o.technician_rating || '4.9';

    // Start-Service OTP: 4 digits
    const rawNum = String(o.order_number || o.id || '4821');
    const digits = rawNum.replace(/[^\d]/g, '');
    const otpCode = digits.length >= 4 ? digits.slice(-4) : '4821';

    // Service Address
    const serviceAddress =
      o.customer_address ||
      o.delivery_address ||
      o.customerAddress ||
      o.address ||
      'Home — 962, Papareddypalya, Bengaluru, Karnataka 560072';

    const customerName = o.customer_name || currentUser?.name || 'Customer';
    const customerPhone = o.customer_phone || o.phone || currentUser?.phone || '6379789641';

    // Price
    const totalAmount = Number(o.amount || o.total || o.items?.[0]?.price || 1649);
    const baseServicePrice = totalAmount > 400 ? totalAmount - 350 : totalAmount;
    const addonPrice = totalAmount > baseServicePrice ? totalAmount - baseServicePrice : 0;

    return {
      serviceName,
      packageLabel,
      dateStr,
      timeStr,
      expertName,
      expertPhone,
      expertRating,
      otpCode,
      serviceAddress,
      customerName,
      customerPhone,
      totalAmount,
      baseServicePrice,
      addonPrice,
      paymentMethod: o.payment_method || 'Razorpay Test Mode (Online)',
      image: o.image || '',
    };
  };

  // Helper to extract clean structured info from a Bus Booking Order
  const getResolvedBusInfo = (order: Order) => {
    const o = order as any;
    const pd = String(o.product_details || '');
    const items = o.items || [];
    const firstItemName = String(items[0]?.name || '');

    // Boarding Point
    let boarding = o.boarding_point || '';
    if (!boarding && pd.includes('Boarding:')) {
      const match = pd.match(/Boarding:\s*([^➔•]+)/i);
      if (match) boarding = match[1].trim();
    }
    if (!boarding) boarding = 'Bangalore (Majestic)';

    // Dropping Point
    let dropping = o.dropping_point || '';
    if (!dropping && pd.includes('Dropping:')) {
      const match = pd.match(/Dropping:\s*([^•]+)/i);
      if (match) dropping = match[1].trim();
    }
    if (!dropping) dropping = 'Chennai (Koyambedu)';

    // Boarding City & Time
    const boardingCity = boarding.split('(')[0].trim();
    const boardingTimeMatch = boarding.match(/\(([^)]+)\)/);
    const boardingTime = boardingTimeMatch ? boardingTimeMatch[1] : '';

    // Dropping City & Time
    const droppingCity = dropping.split('(')[0].trim();
    const droppingTimeMatch = dropping.match(/\(([^)]+)\)/);
    const droppingTime = droppingTimeMatch ? droppingTimeMatch[1] : '';

    // Clean Titles (before parentheses)
    const cleanPdTitle = pd.split('(')[0]?.trim() || '';
    const cleanItemTitle = firstItemName.split('(')[0]?.trim() || '';

    // Check if vendor_name is generic default
    const isGenericVendor = !o.vendor_name || 
      /connect\s*(official\s*store|expert\s*pro|store|verified)?/i.test(o.vendor_name);

    // 1. DYNAMIC BUS NAME RESOLUTION
    let busName = o.bus_name || '';
    if (!busName) {
      if (cleanPdTitle && !cleanPdTitle.toLowerCase().includes('connect') && cleanPdTitle !== 'Order Item') {
        busName = cleanPdTitle;
      } else if (cleanItemTitle && !cleanItemTitle.toLowerCase().includes('connect')) {
        busName = cleanItemTitle;
      } else if (!isGenericVendor && o.vendor_name) {
        busName = o.vendor_name;
      } else {
        busName = cleanPdTitle || cleanItemTitle || 'Bus Service';
      }
    }

    // 2. DYNAMIC OPERATOR NAME RESOLUTION
    let operatorName = o.operator_name || '';
    if (!operatorName) {
      if (!isGenericVendor && o.vendor_name) {
        operatorName = o.vendor_name;
      } else if (/\b(airavat|ksrtc)\b/i.test(busName) || /\b(airavat|ksrtc)\b/i.test(pd)) {
        operatorName = 'KSRTC Airavat';
      } else if (/\bvrl\b/i.test(busName) || /\bvrl\b/i.test(pd)) {
        operatorName = 'VRL Travels';
      } else if (/\b(smartbus|intrcity)\b/i.test(busName) || /\b(smartbus|intrcity)\b/i.test(pd)) {
        operatorName = 'IntrCity SmartBus';
      } else if (/\borange\b/i.test(busName) || /\borange\b/i.test(pd)) {
        operatorName = 'Orange Tours & Travels';
      } else if (/\bmorning\s*star\b/i.test(busName) || /\bmorning\s*star\b/i.test(pd)) {
        operatorName = 'Morning Star Travels';
      } else if (/\bsrs\b/i.test(busName) || /\bsrs\b/i.test(pd)) {
        operatorName = 'SRS Travels';
      } else {
        operatorName = busName.split('-')[0]?.trim() || o.vendor_name || 'Travel Operator';
      }
    }

    // 3. DYNAMIC BUS TYPE RESOLUTION (Skip generic "1 Guest (1x)" or packages)
    let busType = o.bus_type || '';
    if (!busType) {
      const parenMatch = pd.match(/\(([^•]+)/);
      const parenText = parenMatch ? parenMatch[1].trim() : '';
      if (parenText && !/(\d+\s*guest|\d+\s*person|1x|2x|standard|package)/i.test(parenText)) {
        busType = parenText;
      } else if (/\bsemi[\s-]?sleeper\b/i.test(busName) || /\bsemi[\s-]?sleeper\b/i.test(pd)) {
        busType = 'Semi-Sleeper AC';
      } else if (/\bmulti[\s-]?axle\b/i.test(busName) || /\bvolvo\b/i.test(busName)) {
        busType = 'Multi-Axle Volvo AC';
      } else if (/\belectric\b/i.test(busName)) {
        busType = 'Electric SmartBus AC';
      } else {
        busType = 'Standard Coach';
      }
    }
    if (busType.length > 36) {
      busType = busType.slice(0, 36) + '...';
    }

    // Journey Date & Departure Time
    const appointmentSlot = String(o.appointment_slot || '');
    const slotParts = appointmentSlot.split(' at ');
    const journeyDate = slotParts[0] || formatOrderDisplayDate(o.created_at || Date.now(), 0).short;
    const departureTime = slotParts[1] || (boardingTime || '21:30');

    // Travelers & Seats
    const travelers = Array.isArray(o.travelers) ? o.travelers : [];
    let passengerCount = travelers.length;
    if (passengerCount === 0) {
      const pMatch = pd.match(/(\d+)\s*Person/i);
      if (pMatch) passengerCount = parseInt(pMatch[1], 10);
      else passengerCount = 1;
    }

    const isConfirmedOrAllocated = 
      String(o.status || '').toLowerCase().includes('confirm') ||
      String(o.status || '').toLowerCase().includes('accept') ||
      String(o.status || '').toLowerCase().includes('allocat');

    const seatList: string[] = [];
    travelers.forEach((t: any) => {
      const s = String(t.seat || '').trim();
      if (s && !s.toLowerCase().includes('pending') && !s.toLowerCase().includes('awaiting')) {
        seatList.push(s);
      }
    });

    if (seatList.length === 0 && (o.seat || o.allocated_seat)) {
      const sVal = String(o.allocated_seat || o.seat).trim();
      if (sVal && !sVal.toLowerCase().includes('pending') && !sVal.toLowerCase().includes('awaiting')) {
        const split = sVal.split(/[,&]+/).map(s => s.trim().replace(/^seat\s*:?/i, '').trim()).filter(Boolean);
        seatList.push(...(split.length > 0 ? split : [sVal]));
      }
    }

    if (seatList.length === 0 && pd && /seat\s*:\s*([^•\n,]+)/i.test(pd)) {
      const match = pd.match(/seat\s*:\s*([^•\n,]+)/i);
      if (match && match[1] && !match[1].toLowerCase().includes('pending') && !match[1].toLowerCase().includes('awaiting')) {
        seatList.push(match[1].trim());
      }
    }

    const hasAllocatedSeat = seatList.length > 0;
    let seatString = '';
    if (hasAllocatedSeat) {
      seatString = seatList.length > 1 ? `Seats: ${seatList.join(', ')}` : `Seat: ${seatList[0]}`;
    } else if (isConfirmedOrAllocated) {
      seatString = 'Seat: Allocation in progress';
    } else {
      seatString = 'Seat: Awaiting Allocation';
    }

    const primaryPassenger = travelers[0]?.name || o.customer_name || 'Passenger';
    const pnr = String(o.order_number || o.id || 'VRL-78902').replace(/^#/, '');

    const resolvedTravelers = (travelers.length > 0 ? travelers : [{ name: primaryPassenger, seat: '' }]).map((t: any, idx: number) => {
      const existingSeat = String(t.seat || '').trim();
      const hasValid = existingSeat && !existingSeat.toLowerCase().includes('pending') && !existingSeat.toLowerCase().includes('awaiting');
      const seat = hasValid ? existingSeat : (seatList[idx] || (seatList.length === 1 ? seatList[0] : ''));
      return {
        ...t,
        seat,
      };
    });

    return {
      busName,
      operatorName,
      busType,
      boarding,
      boardingCity,
      boardingTime,
      dropping,
      droppingCity,
      droppingTime,
      journeyDate,
      departureTime,
      passengerCount,
      seatString,
      hasAllocatedSeat,
      seatList,
      primaryPassenger,
      pnr,
      travelers: resolvedTravelers,
    };
  };

  // Helper to format date strings cleanly: e.g., "Mon, 21st Sep '26" or "Sep 21"
  const getDayWithSuffix = (d: number) => {
    if (d > 3 && d < 21) return `${d}th`;
    switch (d % 10) {
      case 1: return `${d}st`;
      case 2: return `${d}nd`;
      case 3: return `${d}rd`;
      default: return `${d}th`;
    }
  };

  const MONTH_NAMES_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const DAY_NAMES_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const formatOrderDisplayDate = (dateVal?: string | Date, offsetDays = 0) => {
    const d = dateVal ? new Date(dateVal) : new Date();
    if (isNaN(d.getTime())) return { short: 'Sep 21', relativeTomorrow: 'Tomorrow, Sep 23', timelineDate: "Mon, 21st Sep '26", byDeliveryTime: 'Thu Sep 24 by 11 PM' };
    if (offsetDays !== 0) {
      d.setDate(d.getDate() + offsetDays);
    }
    const dayName = DAY_NAMES_SHORT[d.getDay()];
    const monthName = MONTH_NAMES_SHORT[d.getMonth()];
    const dayNum = d.getDate();
    const yearShort = String(d.getFullYear()).slice(-2);
    return {
      short: `${monthName} ${dayNum}`,
      relativeTomorrow: offsetDays === 1 ? `Tomorrow, ${monthName} ${dayNum}` : `${monthName} ${dayNum}`,
      timelineDate: `${dayName}, ${getDayWithSuffix(dayNum)} ${monthName} '${yearShort}`,
      byDeliveryTime: `${dayName} ${monthName} ${dayNum} by 11 PM`,
    };
  };

  const formatTime12h = (dateVal?: string | Date, offsetMinutes = 0) => {
    const d = dateVal ? new Date(dateVal) : new Date();
    if (isNaN(d.getTime())) return '11:27pm';
    if (offsetMinutes !== 0) {
      d.setMinutes(d.getMinutes() + offsetMinutes);
    }
    let hours = d.getHours();
    const minutes = d.getMinutes();
    const ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const minStr = minutes < 10 ? `0${minutes}` : `${minutes}`;
    return `${hours}:${minStr}${ampm}`;
  };

  const getStepperDataForOrder = (order: Order) => {
    const normCat = getNormalizedCategory(order);
    const statusLower = (order.status || 'pending').toLowerCase();
    const createdDate = order.created_at || (order as any).createdAt || new Date().toISOString();
    const d0 = formatOrderDisplayDate(createdDate, 0);
    const d1 = formatOrderDisplayDate(createdDate, 1);
    const d3 = formatOrderDisplayDate(createdDate, 3);
    const t0 = formatTime12h(createdDate, 0);

    const isAcceptedOrBeyond =
      statusLower.includes('accept') ||
      statusLower.includes('prep') ||
      statusLower.includes('assign') ||
      statusLower.includes('pick') ||
      statusLower.includes('ship') ||
      statusLower.includes('transit') ||
      statusLower.includes('out for delivery') ||
      statusLower.includes('near') ||
      statusLower.includes('shortlist') ||
      statusLower.includes('interview') ||
      statusLower.includes('complete') ||
      statusLower.includes('deliver') ||
      statusLower.includes('hire');

    const isOutForDelivery =
      statusLower.includes('out for delivery') ||
      statusLower.includes('out_for_delivery') ||
      statusLower.includes('on the way');

    const isDeliveredStrict =
      !isOutForDelivery &&
      (statusLower === 'delivered' ||
       statusLower.includes('item delivered') ||
       statusLower.includes('order delivered') ||
       statusLower.startsWith('delivered') ||
       (statusLower.includes('deliver') && !statusLower.includes('out')));

    const isCompleted =
      isDeliveredStrict ||
      statusLower.includes('complete') ||
      statusLower.includes('hire');

    const isShippedOrBeyond =
      statusLower.includes('ship') ||
      statusLower.includes('transit') ||
      statusLower.includes('dispatch') ||
      isOutForDelivery ||
      isCompleted;

    const isPreparing =
      statusLower.includes('prep') ||
      statusLower.includes('accept') ||
      statusLower.includes('pack');

    if (normCat === 'Food') {
      return {
        statusLabel: (order.status || 'ORDER RECEIVED').toUpperCase(),
        statusDescription: statusLower.includes('accept')
          ? '🎉 Chef has accepted your order and started preparing!'
          : statusLower.includes('prep')
          ? '🍳 Delicious food is being freshly prepared in the kitchen.'
          : statusLower.includes('assign') || statusLower.includes('pick')
          ? '🛵 Delivery partner has picked up your food package!'
          : isCompleted
          ? '✨ Order delivered hot and fresh! Enjoy your meal.'
          : 'Restaurant has received your order.',
        step1: { label: 'Order Confirmed', date: d0.short === formatOrderDisplayDate(new Date(), 0).short ? `Today, ${t0}` : `${d0.short}, ${t0}`, done: true, active: false },
        step2: {
          label: isShippedOrBeyond ? 'On The Way' : 'Food Preparing',
          date: isShippedOrBeyond ? formatTime12h(createdDate, 20) : formatTime12h(createdDate, 10),
          done: isShippedOrBeyond,
          active: isPreparing && !isShippedOrBeyond,
        },
        step3: {
          label: 'Delivered',
          date: isCompleted ? `Delivered (${formatTime12h(createdDate, 35)})` : `In 35 Mins (${formatTime12h(createdDate, 35)})`,
          done: isCompleted,
          active: false,
        },
        infoBox: 'Delivery Partner details will be visible once food is picked up.',
      };
    }

    if (normCat === 'Daily Needs') {
      return {
        statusLabel: (order.status || 'ORDER RECEIVED').toUpperCase(),
        statusDescription: statusLower.includes('accept')
          ? '🎉 Store executive has accepted your order & started packing.'
          : statusLower.includes('prep')
          ? '⚡ Items are packed and ready for lightning dispatch.'
          : isCompleted
          ? '✨ Order delivered at your doorstep!'
          : 'Order received at dark store hub.',
        step1: { label: 'Order Placed', date: d0.short === formatOrderDisplayDate(new Date(), 0).short ? `Today, ${t0}` : `${d0.short}, ${t0}`, done: true, active: false },
        step2: {
          label: isShippedOrBeyond ? 'On The Way' : 'Packed at Hub',
          date: isShippedOrBeyond ? formatTime12h(createdDate, 7) : formatTime12h(createdDate, 3),
          done: isShippedOrBeyond,
          active: isPreparing && !isShippedOrBeyond,
        },
        step3: {
          label: 'Delivered',
          date: isCompleted ? 'Delivered' : `In 15 Mins (${formatTime12h(createdDate, 15)})`,
          done: isCompleted,
          active: false,
        },
        infoBox: 'Fast delivery partner assigned from nearby Hub #402.',
      };
    }

    if (normCat === 'Services') {
      return {
        statusLabel: (order.status || 'BOOKING RECEIVED').toUpperCase(),
        statusDescription: statusLower.includes('accept')
          ? '🎉 Professional expert accepted your service booking!'
          : statusLower.includes('assign')
          ? '🛠️ Expert assigned and scheduled for your appointment.'
          : isCompleted
          ? '✨ Service completed successfully to your satisfaction.'
          : 'Service request registered.',
        step1: { label: 'Booking Confirmed', date: d0.short, done: true, active: false },
        step2: {
          label: isCompleted ? 'Expert Visited' : statusLower.includes('on the way') ? 'On The Way' : 'Expert Assigned',
          date: statusLower.includes('on the way') ? 'En route' : isAcceptedOrBeyond ? 'Assigned' : d1.short,
          done: isCompleted || statusLower.includes('on the way'),
          active: isAcceptedOrBeyond && !statusLower.includes('on the way') && !isCompleted,
        },
        step3: { label: 'Service Done', date: (order as any).appointment_slot || d3.short, done: isCompleted, active: false },
        infoBox: 'Service expert contact and OTP will be sent prior to arrival.',
      };
    }

    if (normCat === 'Stay') {
      return {
        statusLabel: (order.status || 'BOOKING RECEIVED').toUpperCase(),
        statusDescription: statusLower.includes('accept')
          ? '🎉 Hotel manager accepted your reservation request!'
          : isCompleted
          ? '✨ Hope you had a comfortable and memorable stay.'
          : 'Room reservation request registered.',
        step1: { label: 'Booking Confirmed', date: d0.short, done: true, active: false },
        step2: {
          label: isCompleted ? 'Checked In' : statusLower.includes('check') ? 'Check-in Ready' : 'Room Allotted',
          date: statusLower.includes('check') ? 'Ready' : isAcceptedOrBeyond ? 'Reserved' : d1.short,
          done: isCompleted || statusLower.includes('check'),
          active: isAcceptedOrBeyond && !statusLower.includes('check') && !isCompleted,
        },
        step3: { label: 'Stay Completed', date: d3.short, done: isCompleted, active: false },
        infoBox: 'Please carry valid Govt photo ID proof for all adult guests during check-in.',
      };
    }

    if (normCat === 'Travel') {
      return {
        statusLabel: (order.status || 'BOOKING RECEIVED').toUpperCase(),
        statusDescription: statusLower.includes('accept')
          ? '🎉 Travel ticket has been confirmed and reserved!'
          : isCompleted
          ? '✨ Journey successfully completed. Thank you for travelling!'
          : 'Ticket booking initiated.',
        step1: { label: 'Ticket Confirmed', date: d0.short, done: true, active: false },
        step2: {
          label: isCompleted ? 'Boarding Done' : statusLower.includes('transit') ? 'In Transit' : 'Boarding Pass',
          date: statusLower.includes('transit') ? 'Departed' : isAcceptedOrBeyond ? 'Issued' : d1.short,
          done: isCompleted || statusLower.includes('transit'),
          active: isAcceptedOrBeyond && !statusLower.includes('transit') && !isCompleted,
        },
        step3: { label: 'Journey Done', date: d3.short, done: isCompleted, active: false },
        infoBox: 'E-ticket and PNR confirmation have been shared with your registered mobile number.',
      };
    }

    if (normCat === 'Jobs') {
      return {
        statusLabel: (order.status || 'APPLIED').toUpperCase(),
        statusDescription: statusLower.includes('shortlist')
          ? '🎉 Great news! Your profile is shortlisted by the employer.'
          : statusLower.includes('interview')
          ? '📞 Employer has invited you for an interview round.'
          : isCompleted
          ? '🎊 Congratulations! You have received a formal offer.'
          : 'Application submitted to hiring team.',
        step1: { label: 'Applied', date: d0.short, done: true, active: false },
        step2: {
          label: isCompleted ? 'Shortlisted' : statusLower.includes('interview') ? 'Interview' : 'Shortlisted',
          date: statusLower.includes('interview') ? 'Scheduled' : isAcceptedOrBeyond ? 'Under Review' : d1.short,
          done: isCompleted || statusLower.includes('interview'),
          active: isAcceptedOrBeyond && !statusLower.includes('interview') && !isCompleted,
        },
        step3: { label: 'Interview/Offer', date: d3.short, done: isCompleted, active: false },
        infoBox: 'HR & Recruiter communication will arrive at your registered email.',
      };
    }

    // Default / Products (Screenshots 1, 2, 3)
    let step2Label = 'Shipped';
    let step2Date = d1.relativeTomorrow;
    let step2Done = false;
    let step2Active = false;

    if (isShippedOrBeyond) {
      step2Label = 'Shipped';
      step2Date = d1.relativeTomorrow;
      step2Done = true;
      step2Active = false;
    } else if (isPreparing) {
      step2Label = 'Preparing';
      step2Date = 'In progress';
      step2Done = false;
      step2Active = true;
    } else {
      step2Label = 'Shipped';
      step2Date = d1.relativeTomorrow;
      step2Done = false;
      step2Active = false;
    }

    return {
      statusLabel: (order.status || 'ORDER RECEIVED').toUpperCase(),
      statusDescription: statusLower.includes('accept')
        ? '🎉 Seller has accepted your order and started packaging.'
        : statusLower.includes('prep')
        ? '📦 Item is being inspected and packaged for dispatch.'
        : statusLower.includes('ship') || statusLower.includes('transit')
        ? '🚚 Item dispatched and currently in transit to delivery hub.'
        : isOutForDelivery
        ? '🚀 Package is out for delivery! Reaching you today.'
        : isCompleted
        ? '✨ Item delivered successfully. Thank you for shopping!'
        : 'Seller has processed your order.',
      step1: { label: 'Order Confirmed', date: d0.short, done: true, active: false },
      step2: { label: step2Label, date: step2Date, done: step2Done, active: step2Active },
      step3: {
        label: isOutForDelivery && !isCompleted ? 'Out For Delivery' : 'Delivery',
        date: isCompleted ? 'Delivered' : (isOutForDelivery ? 'Reaching today' : d3.byDeliveryTime),
        done: isCompleted,
        active: isOutForDelivery && !isCompleted,
      },
      infoBox: isOutForDelivery
        ? '🚀 Delivery executive is on the way to your location with your package.'
        : 'Delivery Executive details will be available once the order is out for delivery.',
    };
  };

  interface TrackingMilestone {
    title: string;
    timeText: string;
    descriptions: string[];
    done: boolean;
    active?: boolean;
  }

  const getCategoryTrackingMilestones = (order?: Order | null): TrackingMilestone[] => {
    if (!order) return [];
    const normCat = getNormalizedCategory(order);
    const statusLower = (order.status || 'pending').toLowerCase();
    const createdDate = order.created_at || (order as any).createdAt || new Date().toISOString();
    const d0 = formatOrderDisplayDate(createdDate, 0);
    const d1 = formatOrderDisplayDate(createdDate, 1);
    const d3 = formatOrderDisplayDate(createdDate, 3);
    const t0 = formatTime12h(createdDate, 0);

    const isOutForDelivery =
      statusLower.includes('out for delivery') ||
      statusLower.includes('out_for_delivery') ||
      statusLower.includes('on the way');

    const isDeliveredStrict =
      !isOutForDelivery &&
      (statusLower === 'delivered' ||
        statusLower.includes('item delivered') ||
        statusLower.includes('order delivered') ||
        statusLower.startsWith('delivered') ||
        (statusLower.includes('deliver') && !statusLower.includes('out')));

    const isCompleted =
      isDeliveredStrict ||
      statusLower.includes('complete') ||
      statusLower.includes('hire');

    const isAcceptedOrBeyond =
      statusLower.includes('accept') ||
      statusLower.includes('prep') ||
      statusLower.includes('assign') ||
      statusLower.includes('pick') ||
      statusLower.includes('ship') ||
      statusLower.includes('transit') ||
      isOutForDelivery ||
      statusLower.includes('way') ||
      statusLower.includes('shortlist') ||
      statusLower.includes('interview') ||
      isCompleted;

    const isShippedOrBeyond =
      statusLower.includes('ship') ||
      statusLower.includes('transit') ||
      statusLower.includes('dispatch') ||
      isOutForDelivery ||
      isCompleted;

    const isPreparing =
      statusLower.includes('prep') ||
      statusLower.includes('accept') ||
      statusLower.includes('pack');

    // 1. FOOD & DINING (30-40 Mins Fast & Fresh Delivery on Same Day)
    if (normCat === 'Food') {
      return [
        {
          title: 'Order Confirmed',
          timeText: `${d0.timelineDate} - ${t0}`,
          descriptions: [
            `Your food order has been placed. ${d0.timelineDate} - ${t0}`,
            `Restaurant accepted your order. Fresh kitchen preparation initiated.`,
          ],
          done: true,
          active: false,
        },
        {
          title: 'Food Preparing',
          timeText: isShippedOrBeyond
            ? `${formatTime12h(createdDate, 10)}`
            : isPreparing
            ? 'Kitchen • Freshly cooking'
            : `${formatTime12h(createdDate, 10)}`,
          descriptions: [
            'Delicious food is being freshly prepared in the kitchen with high hygiene.',
            'Dishes checked, sealed in thermal tamper-proof containers.',
          ],
          done: isShippedOrBeyond,
          active: isPreparing && !isShippedOrBeyond,
        },
        {
          title: 'Out For Delivery',
          timeText: isCompleted
            ? `${formatTime12h(createdDate, 22)}`
            : isShippedOrBeyond
            ? 'Rider On The Way'
            : 'Delivery Partner',
          descriptions: [
            isShippedOrBeyond
              ? 'Delivery partner has picked up your food package and is heading to your location.'
              : 'Delivery partner waiting at restaurant to pick up fresh food package.',
          ],
          done: isCompleted,
          active: isShippedOrBeyond && !isCompleted,
        },
        {
          title: isCompleted ? 'Delivered Hot & Fresh' : 'Delivery Within 30–40 Mins',
          timeText: isCompleted
            ? `Delivered at ${formatTime12h(createdDate, 35)}`
            : `Today by ${formatTime12h(createdDate, 35)}`,
          descriptions: [
            isCompleted
              ? 'Food order handed over hot and fresh to you. Enjoy your meal!'
              : `Fast doorstep delivery estimated within 30–40 mins (${formatTime12h(createdDate, 35)}).`,
          ],
          done: isCompleted,
          active: false,
        },
      ];
    }

    // 2. DAILY NEEDS (10-15 Mins Lightning Delivery)
    if (normCat === 'Daily Needs') {
      return [
        {
          title: 'Order Placed',
          timeText: `${d0.timelineDate} - ${t0}`,
          descriptions: [
            `Your order has been placed. ${d0.timelineDate} - ${t0}`,
            'Order received at nearest Connect Dark Store Hub.',
          ],
          done: true,
          active: false,
        },
        {
          title: 'Packed at Hub',
          timeText: isShippedOrBeyond
            ? `${formatTime12h(createdDate, 4)}`
            : isPreparing
            ? 'Packing now'
            : `${formatTime12h(createdDate, 4)}`,
          descriptions: [
            isShippedOrBeyond
              ? 'Groceries picked and sealed in eco-friendly delivery bag.'
              : 'Items being gathered and verified from store shelves.',
          ],
          done: isShippedOrBeyond,
          active: isPreparing && !isShippedOrBeyond,
        },
        {
          title: 'Out For Delivery',
          timeText: isCompleted
            ? `${formatTime12h(createdDate, 8)}`
            : isShippedOrBeyond
            ? 'Rider on the way'
            : 'Express Delivery',
          descriptions: [
            isShippedOrBeyond
              ? 'Lightning delivery partner dispatched with your daily essentials.'
              : 'Delivery executive arriving at hub for quick dispatch.',
          ],
          done: isCompleted,
          active: isShippedOrBeyond && !isCompleted,
        },
        {
          title: isCompleted ? 'Delivered' : 'Delivery in 10–15 Mins',
          timeText: isCompleted
            ? `Delivered at ${formatTime12h(createdDate, 14)}`
            : `Today by ${formatTime12h(createdDate, 15)}`,
          descriptions: [
            isCompleted
              ? 'Order delivered safely at your doorstep. Thank you for choosing Connect!'
              : 'Lightning 15-minute delivery en route to your address.',
          ],
          done: isCompleted,
          active: false,
        },
      ];
    }

    // 3. SERVICES (Booking - Slot Based)
    if (normCat === 'Services') {
      const slotText = (order as any).appointment_slot || d1.short;
      return [
        {
          title: 'Booking Confirmed',
          timeText: `${d0.timelineDate} - ${t0}`,
          descriptions: [
            `Service request booked for: ${slotText}.`,
            'Service partner notified for appointment verification.',
          ],
          done: true,
          active: false,
        },
        {
          title: isAcceptedOrBeyond ? 'Expert Assigned' : 'Assigning Expert',
          timeText: isAcceptedOrBeyond ? 'Assigned' : 'In Progress',
          descriptions: [
            isAcceptedOrBeyond
              ? `Verified technician assigned: ${(order as any).provider_name || order.vendor_name || 'Certified Expert'}.`
              : 'Matching top-rated service professionals in your area.',
            'Toolkit & background check verified.',
          ],
          done: isAcceptedOrBeyond,
          active: isAcceptedOrBeyond && !statusLower.includes('way') && !isCompleted,
        },
        {
          title: statusLower.includes('way') ? 'Expert On The Way' : 'Appointment Slot',
          timeText: statusLower.includes('way') ? 'En route' : `Slot: ${slotText}`,
          descriptions: [
            statusLower.includes('way')
              ? 'Technician has left for your address with required equipment.'
              : `Service expert will arrive at your address for the slot: ${slotText}.`,
            'Please verify OTP before work commences.',
          ],
          done: isCompleted || statusLower.includes('way'),
          active: statusLower.includes('way') && !isCompleted,
        },
        {
          title: isCompleted ? 'Service Completed' : 'Service Done & Sign-Off',
          timeText: isCompleted ? 'Completed' : 'Post-Service',
          descriptions: [
            isCompleted
              ? 'Service completed successfully to your satisfaction with 30-day warranty.'
              : 'Final inspection, customer sign-off and payment verification.',
          ],
          done: isCompleted,
          active: false,
        },
      ];
    }

    // 4. STAY (Hotel / Resort Booking)
    if (normCat === 'Stay') {
      const checkInText = (order as any).check_in || '02:00 PM';
      const checkOutText = (order as any).check_out || '11:00 AM';
      return [
        {
          title: 'Reservation Confirmed',
          timeText: `${d0.timelineDate} - ${t0}`,
          descriptions: [
            `Stay reservation confirmed with ${order.vendor_name || 'Hotel Property'}.`,
            `Booking reference: #${order.order_number}`,
          ],
          done: true,
          active: false,
        },
        {
          title: isAcceptedOrBeyond ? 'Room Allotted' : 'Room Preparation',
          timeText: isAcceptedOrBeyond ? 'Ready' : 'Pre-Arrival',
          descriptions: [
            `Room allotted: ${(order as any).room_type || order.product_details || 'Deluxe Room'}.`,
            'Housekeeping inspection and amenities prepared.',
          ],
          done: isAcceptedOrBeyond,
          active: isAcceptedOrBeyond && !isCompleted,
        },
        {
          title: 'Check-in Ready',
          timeText: `Check-in: ${checkInText}`,
          descriptions: [
            'Front desk reception ready to assist your arrival.',
            'Please present valid Government Photo ID for all adult guests.',
          ],
          done: isCompleted || statusLower.includes('check'),
          active: statusLower.includes('check') && !isCompleted,
        },
        {
          title: isCompleted ? 'Stay Completed' : 'Check-Out',
          timeText: isCompleted ? 'Checked Out' : `Check-out: ${checkOutText}`,
          descriptions: [
            isCompleted
              ? 'Check-out completed. Thank you for your stay!'
              : 'Express checkout available at property desk.',
          ],
          done: isCompleted,
          active: false,
        },
      ];
    }

    // 5. TRAVEL (Flight / Bus / Train)
    if (normCat === 'Travel') {
      const pnrText = (order as any).pnr || 'PNR-' + (order.order_number || '884210').slice(-6);
      const travelDateText = (order as any).travel_date || d1.short;
      return [
        {
          title: 'Ticket Confirmed',
          timeText: `${d0.timelineDate} - ${t0}`,
          descriptions: [
            `Ticket confirmed. PNR: ${pnrText}`,
            `Route: ${(order as any).route || order.product_details || 'Confirmed Route'}`,
          ],
          done: true,
          active: false,
        },
        {
          title: isAcceptedOrBeyond ? 'Boarding Pass & E-Ticket' : 'E-Ticket Generation',
          timeText: isAcceptedOrBeyond ? 'Issued' : '24h before travel',
          descriptions: [
            'Confirmed digital ticket and itinerary sent to your mobile.',
            'Terminal and gate details shared via SMS notifications.',
          ],
          done: isAcceptedOrBeyond,
          active: isAcceptedOrBeyond && !statusLower.includes('transit') && !isCompleted,
        },
        {
          title: statusLower.includes('transit') ? 'In Transit / Departed' : 'Departure',
          timeText: statusLower.includes('transit') ? 'Departed' : `${travelDateText}`,
          descriptions: [
            statusLower.includes('transit')
              ? 'Journey in progress to destination on schedule.'
              : 'Boarding starts 45 mins prior to departure time.',
          ],
          done: isCompleted || statusLower.includes('transit'),
          active: statusLower.includes('transit') && !isCompleted,
        },
        {
          title: isCompleted ? 'Journey Completed' : 'Arrival at Destination',
          timeText: isCompleted ? 'Arrived' : 'On Schedule',
          descriptions: [
            isCompleted
              ? 'Arrived at destination safely. Thank you for travelling with us!'
              : 'Baggage claim and arrival guidance at destination terminal.',
          ],
          done: isCompleted,
          active: false,
        },
      ];
    }

    // 6. JOBS (Job Applications)
    if (normCat === 'Jobs') {
      const interviewSlot = (order as any).appointment_slot;
      return [
        {
          title: 'Application Submitted',
          timeText: `${d0.timelineDate} - ${t0}`,
          descriptions: [
            `Application submitted to ${order.vendor_name || 'Employer'} hiring portal.`,
            'Resume & candidate profile received for screening.',
          ],
          done: true,
          active: false,
        },
        {
          title: isAcceptedOrBeyond ? 'Profile Shortlisted' : 'Screening In Progress',
          timeText: isAcceptedOrBeyond ? 'Shortlisted' : 'Under Review',
          descriptions: [
            isAcceptedOrBeyond
              ? 'Congratulations! Recruiter has shortlisted your profile.'
              : 'Recruitment team is screening your experience and credentials.',
          ],
          done: isAcceptedOrBeyond,
          active: isAcceptedOrBeyond && !interviewSlot && !isCompleted,
        },
        {
          title: interviewSlot ? 'Interview Scheduled' : 'Interview Round',
          timeText: interviewSlot ? `${interviewSlot}` : 'Scheduled on Shortlisting',
          descriptions: [
            interviewSlot
              ? `Technical interview scheduled: ${interviewSlot}. Video link sent to email.`
              : 'Recruiter will coordinate interview slot via email / call.',
          ],
          done: isCompleted || !!interviewSlot,
          active: !!interviewSlot && !isCompleted,
        },
        {
          title: isCompleted ? 'Offer Extended' : 'Final Selection',
          timeText: isCompleted ? 'Selected' : 'Post-Interview',
          descriptions: [
            isCompleted
              ? 'Formal job offer extended by employer! Onboarding briefing to follow.'
              : 'Final evaluation by hiring leadership team.',
          ],
          done: isCompleted,
          active: false,
        },
      ];
    }

    // 7. PRODUCTS (E-Commerce / Electronics / Fashion - Standard 2-3 Days)
    const isShipped = statusLower.includes('ship') || statusLower.includes('transit') || isOutForDelivery || isCompleted;
    const isDelivered = isDeliveredStrict;

    return [
      {
        title: 'Order Confirmed',
        timeText: `${d0.timelineDate} - ${t0}`,
        descriptions: [
          `Your Order has been placed. ${d0.timelineDate} - ${t0}`,
          `Seller has processed your order. ${d0.timelineDate} - ${formatTime12h(createdDate, 90)}`,
          'Item waiting to be picked up by delivery partner.',
        ],
        done: true,
        active: false,
      },
      {
        title: isShipped ? 'Shipped' : `Shipped Expected By ${d1.short}`,
        timeText: isShipped ? `${d1.short} • Shipped` : `Expected by ${d1.short}`,
        descriptions: [
          isShipped
            ? 'Item dispatched from seller hub and in transit.'
            : `Item yet to be shipped. Expected by ${d1.short}`,
          'Item reaching hub nearest to you.',
        ],
        done: isShipped,
        active: isPreparing && !isShipped,
      },
      {
        title: isOutForDelivery ? 'Out For Delivery' : 'Out For Delivery Expected',
        timeText: isOutForDelivery ? 'Today' : `Expected by ${d3.short}`,
        descriptions: [
          isOutForDelivery
            ? 'Delivery executive is out for delivery with your package.'
            : 'Item reaching local delivery facility.',
        ],
        done: isDelivered,
        active: isOutForDelivery && !isDelivered,
      },
      {
        title: isDelivered ? 'Delivered' : `Delivery Expected By ${d3.short}`,
        timeText: isDelivered ? `Delivered on ${d3.short}` : `Expected by ${d3.short}`,
        descriptions: [
          isDelivered
            ? 'Order handed over successfully to customer.'
            : `Item yet to be delivered. Expected by ${d3.short}`,
        ],
        done: isDelivered,
        active: false,
      },
    ];
  };

  // Date Range Matching Helper
  const isOrderInDateRange = useCallback(
    (order: Order) => {
      if (selectedDateFilter === 'all') return true;
      const orderDate = new Date(order.created_at || Date.now());
      const now = new Date();

      if (selectedDateFilter === 'today') {
        return (
          orderDate.getFullYear() === now.getFullYear() &&
          orderDate.getMonth() === now.getMonth() &&
          orderDate.getDate() === now.getDate()
        );
      }

      if (selectedDateFilter === 'this_week') {
        const startOfWeek = new Date(now);
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1);
        startOfWeek.setDate(diff);
        startOfWeek.setHours(0, 0, 0, 0);

        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);

        return orderDate >= startOfWeek && orderDate <= endOfWeek;
      }

      if (selectedDateFilter === 'this_month') {
        return (
          orderDate.getFullYear() === now.getFullYear() &&
          orderDate.getMonth() === now.getMonth()
        );
      }

      if (selectedDateFilter === 'custom') {
        if (!customStartDate && !customEndDate) return true;
        let valid = true;
        if (customStartDate) {
          const start = new Date(customStartDate);
          start.setHours(0, 0, 0, 0);
          if (isNaN(start.getTime()) || orderDate < start) valid = false;
        }
        if (customEndDate) {
          const end = new Date(customEndDate);
          end.setHours(23, 59, 59, 999);
          if (isNaN(end.getTime()) || orderDate > end) valid = false;
        }
        return valid;
      }

      return true;
    },
    [selectedDateFilter, customStartDate, customEndDate]
  );

  // Orders strictly scoped to current user session (with fallback)
  const userOrders = useMemo(() => {
    if (!currentUser) return allOrders;
    const cId = currentUser.id || (currentUser as any)._id;
    const cName = (currentUser.name || (currentUser as any).customer_name || '').toLowerCase().trim();
    const cPhone = (currentUser.phone || '').replace(/[^\d]/g, '');

    return allOrders.filter((o) => {
      // 1. All Job Applications should ALWAYS be visible to this customer
      const isJob =
        o.category === 'Jobs' ||
        String(o.category || '').toLowerCase() === 'jobs' ||
        String(o.order_number || '').includes('JOB') ||
        String(o.id || '').includes('job') ||
        Boolean(o.application_status) ||
        Boolean(o.resume_name) ||
        Boolean(o.applicant_education) ||
        Boolean((o as any).candidateResume);
      if (isJob) return true;

      // 2. Orders without user_id or customer_id or created locally should not be hidden
      if (!o.user_id && !(o as any).userId && !o.customer_id && !(o as any).customerId) return true;

      // 3. User session matching (Support MongoDB _id, registrationId, customerId, phone, and email)
      const custIdTarget = (currentUser as any).customerId || cId;
      const idMatch = Boolean(
        (cId && (o.user_id === cId || (o as any).userId === cId || o.customer_id === cId || (o as any).customerId === cId || (o as any).memberId === cId)) ||
        (custIdTarget && (o.customer_id === custIdTarget || (o as any).customerId === custIdTarget || (o as any).memberId === custIdTarget))
      );
      const emailMatch = Boolean(
        currentUser?.email && (
          (o as any).customer_email?.toLowerCase() === currentUser.email.toLowerCase() ||
          (o as any).customerEmail?.toLowerCase() === currentUser.email.toLowerCase() ||
          (o as any).applicant_email?.toLowerCase() === currentUser.email.toLowerCase()
        )
      );
      const nameMatch = Boolean(cName && (
        (o.customer_name && o.customer_name.toLowerCase().trim().includes(cName)) ||
        ((o as any).memberName && (o as any).memberName.toLowerCase().trim().includes(cName))
      ));
      const phoneMatch = Boolean(cPhone && cPhone.length >= 6 && (
        (o.customer_phone && o.customer_phone.includes(cPhone)) ||
        ((o as any).customerPhone && (o as any).customerPhone.includes(cPhone))
      ));
      return idMatch || emailMatch || nameMatch || phoneMatch;
    });
  }, [allOrders, currentUser]);

  // Orders pre-filtered by selected Date Range
  const dateFilteredOrders = useMemo(() => {
    return userOrders.filter(isOrderInDateRange);
  }, [userOrders, isOrderInDateRange]);

  // Categorize order helper
  const getNormalizedCategory = useCallback((order: Order): string => {
    return normalizeOrderCategory(order);
  }, []);

  // Compute Accurate Counts per Top Tab across date-filtered orders
  const topTabCounts = useMemo(() => {
    const counts: Record<TopTabType, number> = {
      'My Orders': 0,
      'My Bookings': 0,
      'Job Applied': 0,
    };
    dateFilteredOrders.forEach((o) => {
      const normCat = getNormalizedCategory(o);
      if (['Products', 'Daily Needs', 'Food'].includes(normCat)) {
        counts['My Orders']++;
      } else if (['Services', 'Stay', 'Travel'].includes(normCat)) {
        counts['My Bookings']++;
      } else if (normCat === 'Jobs') {
        counts['Job Applied']++;
      } else {
        counts['My Orders']++;
      }
    });
    return counts;
  }, [dateFilteredOrders, getNormalizedCategory]);

  // Bottom Category Pills available based on active top tab
  const availableCategoryPills = useMemo(() => {
    if (selectedTopTab === 'My Orders') {
      return ['All', 'Products', 'Daily Needs', 'Food'];
    }
    if (selectedTopTab === 'My Bookings') {
      return ['All', 'Services', 'Stay', 'Travel'];
    }
    if (selectedTopTab === 'Job Applied') {
      return ['All', 'Jobs'];
    }
    return ['All', 'Services', 'Products', 'Daily Needs', 'Food', 'Stay', 'Travel', 'Jobs'];
  }, [selectedTopTab]);

  // Handle Top Tab Switch (Toggle behavior: clicking active tab unselects it to null / show all)
  const handleSelectTopTab = (tab: TopTabType) => {
    if (selectedTopTab === tab) {
      setSelectedTopTab(null);
    } else {
      setSelectedTopTab(tab);
    }
    setSelectedCategory('All');
  };

  // Filter & Search Logic
  const filteredOrders = useMemo(() => {
    return dateFilteredOrders
      .filter((order) => {
        const normCat = getNormalizedCategory(order);

        // 1. Primary Top Tab Filter (null = show all)
        if (selectedTopTab === 'My Orders') {
          if (!['Products', 'Daily Needs', 'Food'].includes(normCat)) return false;
        } else if (selectedTopTab === 'My Bookings') {
          if (!['Services', 'Stay', 'Travel'].includes(normCat)) return false;
        } else if (selectedTopTab === 'Job Applied') {
          if (normCat !== 'Jobs') return false;
        }

        // 2. Secondary Category Pill Filter
        if (selectedCategory !== 'All') {
          if (normCat !== selectedCategory) return false;
        }

        // 3. Status Filter
        if (selectedStatusFilter !== 'all') {
          const s = (order.status || '').toLowerCase();
          if (selectedStatusFilter === 'active') {
            if (!isActiveStatus(order.status)) return false;
          } else if (selectedStatusFilter === 'completed') {
            if (!isCompletedStatus(order.status)) return false;
          } else if (selectedStatusFilter === 'cancelled') {
            if (!isCancelledStatus(order.status)) return false;
          } else if (selectedStatusFilter === 'returned') {
            if (!s.includes('return')) return false;
          }
        }

        // 4. Search Query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchesName = (order.product_details || '').toLowerCase().includes(q);
          const matchesNum = (order.order_number || '').toLowerCase().includes(q);
          const matchesVendor = (order.vendor_name || '').toLowerCase().includes(q);
          const matchesSeller = (order.brand_or_seller || '').toLowerCase().includes(q);
          const matchesProvider = (order.provider_name || '').toLowerCase().includes(q);
          const matchesOperator = (order.operator_name || '').toLowerCase().includes(q);
          const matchesHotel = (order.hotel_name || '').toLowerCase().includes(q);

          if (
            !matchesName &&
            !matchesNum &&
            !matchesVendor &&
            !matchesSeller &&
            !matchesProvider &&
            !matchesOperator &&
            !matchesHotel
          ) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        return new Date(b.created_at || Date.now()).getTime() - new Date(a.created_at || Date.now()).getTime();
      });
  }, [dateFilteredOrders, selectedTopTab, selectedCategory, selectedStatusFilter, getNormalizedCategory, isActiveStatus, isCompletedStatus, isCancelledStatus, searchQuery]);

  // Subtitle Record Count Formatter
  const renderRecordCountSubtitle = () => {
    const totalInTab = selectedTopTab ? (topTabCounts[selectedTopTab] || 0) : dateFilteredOrders.length;

    let dateLabel = '';
    if (selectedDateFilter === 'today') dateLabel = 'Today';
    else if (selectedDateFilter === 'this_week') dateLabel = 'This Week';
    else if (selectedDateFilter === 'this_month') dateLabel = 'This Month';
    else if (selectedDateFilter === 'custom') dateLabel = 'Custom Date';

    if (!selectedTopTab) {
      if (selectedCategory === 'All' && selectedDateFilter === 'all' && !searchQuery.trim()) {
        return `${filteredOrders.length} ${filteredOrders.length === 1 ? 'item' : 'items'}`;
      }
      return `${filteredOrders.length} of ${totalInTab} ${totalInTab === 1 ? 'item' : 'items'} ${dateLabel ? `(${dateLabel})` : ''}`.trim();
    }

    const unitLabel =
      selectedTopTab === 'My Orders'
        ? totalInTab === 1 ? 'order' : 'orders'
        : selectedTopTab === 'My Bookings'
        ? totalInTab === 1 ? 'booking' : 'bookings'
        : totalInTab === 1 ? 'job application' : 'job applications';

    if (selectedCategory === 'All' && selectedDateFilter === 'all' && !searchQuery.trim()) {
      return `${totalInTab} ${unitLabel}`;
    }

    return `${filteredOrders.length} of ${totalInTab} ${unitLabel} ${dateLabel ? `(${dateLabel})` : ''}`.trim();
  };

  // Group by Date sections
  const groupedOrders = useMemo(() => {
    const groups: { [key: string]: Order[] } = {};
    const now = new Date();
    const todayStr = now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();

    filteredOrders.forEach((order) => {
      const orderDate = new Date(order.created_at || Date.now());
      const orderDateStr = orderDate.toDateString();

      let groupKey = 'Older Orders';
      if (orderDateStr === todayStr) {
        groupKey = 'Today';
      } else if (orderDateStr === yesterdayStr) {
        groupKey = 'Yesterday';
      } else if (now.getTime() - orderDate.getTime() < 30 * 24 * 3600 * 1000) {
        groupKey = orderDate.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
      }

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(order);
    });

    return Object.entries(groups).map(([title, items]) => ({ title, items }));
  }, [filteredOrders]);

  // Handle Cancel Order / Job Withdrawal
  const executeCancel = async () => {
    if (!selectedOrderForCancel || isProcessingAction) return;
    const targetOrder = selectedOrderForCancel;
    const orderId = targetOrder.id;
    const isJob = targetOrder.category === 'Jobs' || (targetOrder.order_number || '').includes('JOB');
    setIsProcessingAction(true);
    setSelectedOrderForCancel(null);

    const success = await cancelCustomerOrder(orderId, isJob ? 'Candidate Withdrawn' : cancelReason);
    setIsProcessingAction(false);
    if (success) {
      showToast(isJob ? 'Application withdrawn successfully.' : 'Order cancelled successfully. Refund initiated if prepaid.');
      if (selectedOrderForDetails?.id === orderId) {
        setSelectedOrderForDetails({
          ...selectedOrderForDetails,
          status: 'Cancelled',
          application_status: 'Withdrawn',
        });
      }
    } else {
      Alert.alert('Notice', isJob ? 'Application withdrawn.' : 'Order cancelled and updated.');
    }
  };

  // Handle Rating Submission
  const executeReview = async () => {
    if (!selectedOrderForReview || isProcessingAction) return;
    const orderId = selectedOrderForReview.id;
    setIsProcessingAction(true);
    setSelectedOrderForReview(null);

    const success = await rateOrder(orderId, reviewRating, reviewText);
    setIsProcessingAction(false);
    if (success) {
      showToast('Thank you! Your review has been submitted.');
      if (selectedOrderForDetails?.id === orderId) {
        setSelectedOrderForDetails({
          ...selectedOrderForDetails,
          rating: reviewRating,
          review_note: reviewText,
        });
      }
      setReviewText('');
    }
  };

  const showToast = (msg: string) => {
    setActionSuccessMsg(msg);
    setTimeout(() => setActionSuccessMsg(null), 3500);
  };

  const shareInvoice = async (order: Order) => {
    try {
      await Share.share({
        message: `Connect Order Invoice #${order?.order_number || order?.id}\nCategory: ${order?.category || 'Products'}\nDetails: ${order?.product_details}\nTotal: ₹${(order?.amount ?? 0).toLocaleString('en-IN')}\nStatus: ${order?.status}`,
      });
    } catch (e) {
      console.log(e);
    }
  };

  // Route Explore Button to Specific Screen/Category
  const handleExploreTab = (tab: TopTabType) => {
    if (tab === 'My Bookings') {
      navigation.navigate('CategoryDetails', { categoryName: 'Services' });
    } else if (tab === 'Job Applied') {
      navigation.navigate('CategoryDetails', { categoryName: 'Jobs' });
    } else {
      navigation.navigate('CustomerTabs', { screen: 'Categories' });
    }
  };

  // Render Dynamic Empty State Description & Explore Action
  const renderEmptyState = () => {
    if (searchQuery.trim()) {
      return (
        <View style={styles.emptyContainer}>
          <View
            style={[
              styles.emptyIconCircle,
              {
                backgroundColor: isLight ? '#FFFFFF' : 'rgba(255, 255, 255, 0.06)',
                borderColor: isLight ? '#F1EAD8' : colors.cardBorder,
              },
            ]}
          >
            <Icons.SearchX color="#F5B800" size={32} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No search results</Text>
          <Text
            style={[
              styles.emptySubtitle,
              { color: isLight ? '#64748B' : 'rgba(255, 255, 255, 0.6)' },
            ]}
          >
            No items match "{searchQuery}".
          </Text>
          <TouchableOpacity
            style={styles.emptyActionBtn}
            onPress={() => setSearchQuery('')}
            activeOpacity={0.85}
          >
            <Text style={styles.emptyActionBtnText}>Clear Search</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (selectedCategory !== 'All') {
      return (
        <View style={styles.emptyContainer}>
          <View
            style={[
              styles.emptyIconCircle,
              {
                backgroundColor: isLight ? '#FFFFFF' : 'rgba(255, 255, 255, 0.06)',
                borderColor: isLight ? '#F1EAD8' : colors.cardBorder,
              },
            ]}
          >
            <Icons.FilterX color="#F5B800" size={32} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            No {selectedCategory} items found
          </Text>
          <Text
            style={[
              styles.emptySubtitle,
              { color: isLight ? '#64748B' : 'rgba(255, 255, 255, 0.6)' },
            ]}
          >
            There are no active {selectedCategory.toLowerCase()} items under this view.
          </Text>
          <TouchableOpacity
            style={styles.emptyActionBtn}
            onPress={() => setSelectedCategory('All')}
            activeOpacity={0.85}
          >
            <Text style={styles.emptyActionBtnText}>
              Show All Categories
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    // Truly 0 Items in Selected Top Tab
    const getEmptyTabMeta = () => {
      switch (selectedTopTab) {
        case 'My Bookings':
          return {
            icon: Icons.Wrench,
            title: 'No Service bookings found',
            desc: 'Book certified technicians for AC servicing, home deep cleaning, and repairs.',
            btn: 'Explore Services',
          };
        case 'Job Applied':
          return {
            icon: Icons.Briefcase,
            title: 'No Job applications found',
            desc: 'Discover verified job openings, apply in one tap, and track recruiter screenings.',
            btn: 'Explore Jobs & Careers',
          };
        case 'My Orders':
        default:
          return {
            icon: Icons.PackageX,
            title: 'No orders found',
            desc: 'Browse our full marketplace of products, daily essentials, and food.',
            btn: 'Explore Products',
          };
      }
    };

    const emptyMeta = getEmptyTabMeta();
    const IconComp = emptyMeta.icon;

    return (
      <View style={styles.emptyContainer}>
        <View
          style={[
            styles.emptyIconCircle,
            {
              backgroundColor: isLight ? '#FFFFFF' : 'rgba(255, 255, 255, 0.06)',
              borderColor: isLight ? '#F1EAD8' : colors.cardBorder,
            },
          ]}
        >
          <IconComp color="#F5B800" size={34} />
        </View>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>{emptyMeta.title}</Text>
        <Text
          style={[
            styles.emptySubtitle,
            { color: isLight ? '#64748B' : 'rgba(255, 255, 255, 0.6)' },
          ]}
        >
          {emptyMeta.desc}
        </Text>

        <TouchableOpacity
          style={styles.emptyActionBtn}
          onPress={() => handleExploreTab(selectedTopTab || 'My Orders')}
          activeOpacity={0.85}
        >
          <Icons.ShoppingBag color="#0F172A" size={15} />
          <Text style={styles.emptyActionBtnText}>{emptyMeta.btn}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // Dedicated Bus Ticket / Boarding Pass Card for Bus Bookings
  const renderBusTicketCard = (order: Order, customKey?: string) => {
    const busInfo = getResolvedBusInfo(order);
    const statusMeta = getStatusMeta(order.status);
    const isCancelled = isCancelledStatus(order.status);
    const cardKey = customKey || `bus_order_${order.id || order.order_number || Math.random()}`;

    return (
      <View
        key={cardKey}
        style={[
          styles.busTicketCard,
          {
            backgroundColor: isLight ? '#FFFFFF' : 'rgba(13, 22, 54, 0.75)',
            borderColor: isLight ? '#F1EAD8' : colors.cardBorder,
            opacity: isCancelled ? 0.75 : 1,
          },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={() => setSelectedOrderForDetails(order)}
          style={{ padding: 14 }}
        >
          {/* Header Row: Operator Icon, Name & Type + Status Badge */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, marginRight: 8 }}>
              <View
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  backgroundColor: isLight ? '#FDF2F8' : 'rgba(236, 72, 153, 0.15)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: isLight ? '#FBCFE8' : 'rgba(236, 72, 153, 0.3)',
                }}
              >
                <Icons.Bus color="#EC4899" size={20} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '900', color: colors.text }} numberOfLines={1}>
                  {busInfo.busName}
                </Text>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#EC4899', marginTop: 1 }} numberOfLines={1}>
                  {busInfo.operatorName ? `${busInfo.operatorName} • ${busInfo.busType}` : busInfo.busType}
                </Text>
              </View>
            </View>

            <View
              style={[
                styles.statusPill,
                { backgroundColor: statusMeta.bg, borderColor: statusMeta.border },
              ]}
            >
              <Text style={[styles.statusPillText, { color: statusMeta.color }]}>
                {statusMeta.label}
              </Text>
            </View>
          </View>

          {/* Ticket Perforated Divider Line with Notches */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 6, marginHorizontal: -14 }}>
            <View
              style={{
                width: 14,
                height: 14,
                borderRadius: 7,
                backgroundColor: isLight ? '#F8FAFC' : '#060B1E',
                borderRightWidth: 1,
                borderRightColor: isLight ? '#E2E8F0' : colors.cardBorder,
              }}
            />
            <View
              style={{
                flex: 1,
                borderStyle: 'dashed',
                borderWidth: 0.8,
                borderColor: isLight ? '#E2E8F0' : 'rgba(255, 255, 255, 0.12)',
              }}
            />
            <View
              style={{
                width: 14,
                height: 14,
                borderRadius: 7,
                backgroundColor: isLight ? '#F8FAFC' : '#060B1E',
                borderLeftWidth: 1,
                borderLeftColor: isLight ? '#E2E8F0' : colors.cardBorder,
              }}
            />
          </View>

          {/* Route Section: Departure -> Middle Indicator -> Arrival */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10, marginBottom: 12 }}>
            {/* Departure */}
            <View style={{ flex: 1.1 }}>
              <Text style={{ fontSize: 16, fontWeight: '900', color: colors.text }}>
                {busInfo.departureTime}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981' }} />
                <Text style={{ fontSize: 13, fontWeight: '800', color: colors.text }} numberOfLines={1}>
                  {busInfo.boardingCity}
                </Text>
              </View>
              {busInfo.boardingTime ? (
                <Text style={{ fontSize: 10.5, color: isLight ? '#64748B' : '#94A3B8', marginTop: 2 }} numberOfLines={1}>
                  {busInfo.boardingTime}
                </Text>
              ) : null}
            </View>

            {/* Middle Route Indicator */}
            <View style={{ flex: 1, alignItems: 'center', paddingHorizontal: 4 }}>
              <View
                style={{
                  backgroundColor: isLight ? '#FFF1F2' : 'rgba(236, 72, 153, 0.12)',
                  paddingHorizontal: 7,
                  paddingVertical: 2,
                  borderRadius: 6,
                  marginBottom: 4,
                }}
              >
                <Text style={{ fontSize: 10, fontWeight: '800', color: '#EC4899' }}>
                  {busInfo.journeyDate}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%', justifyContent: 'center' }}>
                <View style={{ flex: 1, height: 1.5, backgroundColor: isLight ? '#CBD5E1' : 'rgba(255,255,255,0.2)' }} />
                <View style={{ paddingHorizontal: 4 }}>
                  <Icons.ArrowRight color={isLight ? '#94A3B8' : 'rgba(255,255,255,0.4)'} size={13} />
                </View>
                <View style={{ flex: 1, height: 1.5, backgroundColor: isLight ? '#CBD5E1' : 'rgba(255,255,255,0.2)' }} />
              </View>
              <Text style={{ fontSize: 9.5, color: isLight ? '#94A3B8' : 'rgba(255,255,255,0.4)', marginTop: 2 }}>
                Direct Bus
              </Text>
            </View>

            {/* Arrival */}
            <View style={{ flex: 1.1, alignItems: 'flex-end' }}>
              <Text style={{ fontSize: 16, fontWeight: '900', color: colors.text }}>
                {busInfo.droppingTime || 'Arrival'}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                <Text style={{ fontSize: 13, fontWeight: '800', color: colors.text }} numberOfLines={1}>
                  {busInfo.droppingCity}
                </Text>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#EF4444' }} />
              </View>
              {busInfo.dropping ? (
                <Text style={{ fontSize: 10.5, color: isLight ? '#64748B' : '#94A3B8', marginTop: 2 }} numberOfLines={1}>
                  {busInfo.dropping.includes('(') ? busInfo.dropping.match(/\(([^)]+)\)/)?.[1] || '' : 'Dropping Point'}
                </Text>
              ) : null}
            </View>
          </View>

          {/* Ticket Information Strip: 2-Row Clean Layout without horizontal collision */}
          <View
            style={{
              backgroundColor: isLight ? '#F8FAFC' : 'rgba(255, 255, 255, 0.03)',
              borderRadius: 10,
              padding: 10,
              borderWidth: 1,
              borderColor: isLight ? '#E2E8F0' : 'rgba(255, 255, 255, 0.06)',
              marginBottom: 10,
              gap: 8,
            }}
          >
            {/* Row 1: Seat Allocation Status Pill (Left) + PNR Badge (Right) */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 5,
                  backgroundColor: busInfo.hasAllocatedSeat
                    ? (isLight ? '#DCFCE7' : 'rgba(16, 185, 129, 0.15)')
                    : (isLight ? '#FEF3C7' : 'rgba(245, 158, 11, 0.15)'),
                  paddingHorizontal: 8,
                  paddingVertical: 3.5,
                  borderRadius: 6,
                  borderWidth: 1,
                  borderColor: busInfo.hasAllocatedSeat
                    ? (isLight ? '#86EFAC' : 'rgba(16, 185, 129, 0.3)')
                    : (isLight ? '#FDE68A' : 'rgba(245, 158, 11, 0.3)'),
                }}
              >
                {busInfo.hasAllocatedSeat ? (
                  <Icons.Ticket color="#15803D" size={12} />
                ) : (
                  <Icons.Clock color="#D97706" size={12} />
                )}
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '800',
                    color: busInfo.hasAllocatedSeat ? '#15803D' : '#D97706',
                  }}
                >
                  {busInfo.seatString}
                </Text>
              </View>

              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  backgroundColor: isLight ? '#EFF6FF' : 'rgba(59, 130, 246, 0.12)',
                  paddingHorizontal: 8,
                  paddingVertical: 3.5,
                  borderRadius: 6,
                }}
              >
                <Text style={{ fontSize: 10, fontWeight: '700', color: isLight ? '#64748B' : '#94A3B8' }}>
                  PNR:
                </Text>
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '900',
                    color: '#3B82F6',
                    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
                  }}
                >
                  {busInfo.pnr}
                </Text>
              </View>
            </View>

            {/* Row 2: Passenger Info (Left) + Boarding Notice (Right) */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: 6,
                borderTopWidth: 1,
                borderTopColor: isLight ? '#EDF2F7' : 'rgba(255, 255, 255, 0.05)',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, flex: 1, marginRight: 8 }}>
                <Icons.Users color="#64748B" size={12} />
                <Text style={{ fontSize: 11, fontWeight: '600', color: isLight ? '#475569' : '#94A3B8' }}>
                  {busInfo.passengerCount} {busInfo.passengerCount === 1 ? 'Pax' : 'Pax'}:
                </Text>
                <Text style={{ fontSize: 11, fontWeight: '800', color: colors.text }} numberOfLines={1}>
                  {busInfo.primaryPassenger}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <Icons.Clock color="#D97706" size={11} />
                <Text style={{ fontSize: 10, fontWeight: '700', color: '#D97706' }}>
                  Board 15m prior
                </Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>

        {/* Footer: Price + Quick Action Buttons */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 14,
            paddingVertical: 10,
            borderTopWidth: 1,
            borderTopColor: isLight ? '#F1EAD8' : 'rgba(255, 255, 255, 0.08)',
            backgroundColor: isLight ? '#FAFAFA' : 'rgba(255, 255, 255, 0.02)',
          }}
        >
          <View>
            <Text style={{ fontSize: 10, color: isLight ? '#64748B' : '#94A3B8', fontWeight: '600' }}>
              Total Fare
            </Text>
            <Text style={{ fontSize: 16, fontWeight: '900', color: isLight ? '#0F172A' : '#F5B800' }}>
              {(order.amount ?? 0) > 0 ? `₹${(order.amount ?? 0).toLocaleString('en-IN')}` : '₹950'}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
                paddingHorizontal: 12,
                paddingVertical: 7,
                borderRadius: 8,
                backgroundColor: isLight ? '#EFF6FF' : 'rgba(59, 130, 246, 0.15)',
                borderWidth: 1,
                borderColor: isLight ? '#BFDBFE' : 'rgba(59, 130, 246, 0.3)',
              }}
              onPress={() => handleOpenOnlineInvoice(order)}
              activeOpacity={0.8}
            >
              <Icons.Download color="#3B82F6" size={12} />
              <Text style={{ fontSize: 11.5, fontWeight: '800', color: '#3B82F6' }}>
                E-Ticket
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 8,
                backgroundColor: '#EC4899',
              }}
              onPress={() => setSelectedOrderForDetails(order)}
              activeOpacity={0.85}
            >
              <Icons.Ticket color="#FFFFFF" size={13} />
              <Text style={{ fontSize: 12, fontWeight: '900', color: '#FFFFFF' }}>
                View Ticket
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  // Render Order Card Component
  const renderOrderCard = (order: Order, customKey?: string) => {
    if (isBusOrder(order)) {
      return renderBusTicketCard(order, customKey);
    }
    const categoryMeta = getCategoryMeta(order);
    const CategoryIcon = categoryMeta.icon;
    const statusMeta = getStatusMeta(order.status);
    const isCancelled = isCancelledStatus(order.status);
    const isCompleted = isCompletedStatus(order.status);
    const isActive = isActiveStatus(order.status);
    const cardKey = customKey || `order_${order.id || order.order_number || Math.random()}`;

    return (
      <View
        key={cardKey}
        style={[
          styles.orderCard,
          {
            backgroundColor: isLight ? '#FFFFFF' : 'rgba(13, 22, 54, 0.65)',
            borderColor: isLight ? '#F1EAD8' : colors.cardBorder,
            opacity: isCancelled ? 0.75 : 1,
          },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => setSelectedOrderForDetails(order)}
          style={styles.cardTouchable}
        >
          {/* Card Top Row: Category Tag + Status Pill */}
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardHeaderLeft}>
              <View
                style={[
                  styles.categoryPill,
                  {
                    backgroundColor: categoryMeta.color + '15',
                    borderColor: categoryMeta.color + '30',
                  },
                ]}
              >
                <CategoryIcon color={categoryMeta.color} size={11} />
                <Text style={[styles.categoryPillText, { color: categoryMeta.color }]}>
                  {categoryMeta.label}
                </Text>
              </View>
            </View>
            <View
              style={[
                styles.statusPill,
                { backgroundColor: statusMeta.bg, borderColor: statusMeta.border },
              ]}
            >
              <Text style={[styles.statusPillText, { color: statusMeta.color }]}>
                {statusMeta.label}
              </Text>
            </View>
          </View>

          {/* Card Main Body */}
          <View style={styles.cardBodyRow}>
            {(() => {
              const itemNormCat = getNormalizedCategory(order);
              const isJobOrder = itemNormCat === 'Jobs' || (order.order_number || '').includes('JOB');
              const jobInfo = isJobOrder ? getResolvedJobInfo(order) : null;

              return (
                <>
                  {!isJobOrder && (
                    <View style={styles.thumbnailWrapper}>
                      <Image
                        source={{
                          uri:
                            resolveImageUrl(order.image) ||
                            'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&auto=format&fit=crop&q=80',
                        }}
                        style={styles.thumbnailImage}
                        resizeMode="cover"
                      />
                    </View>
                  )}

                  <View style={styles.cardDetailsCol}>
                    {/* Primary Title */}
                    <Text style={[styles.cardTitleText, { color: colors.text }]} numberOfLines={2}>
                      {isJobOrder
                        ? jobInfo?.title
                        : (itemNormCat === 'Products' ||
                           itemNormCat === 'Electronics' ||
                           itemNormCat === 'Fashion')
                          ? (order.product_details || order.vendor_name || 'Wireless Noise Cancelling Headphones')
                          : (order.vendor_name || order.product_details)}
                    </Text>

                    {/* Category-Specific Secondary Info */}
                    {isJobOrder && (
                      <>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 3, marginBottom: 3 }}>
                          <View
                            style={{
                              backgroundColor: isLight ? '#F0F9FF' : 'rgba(14, 165, 233, 0.12)',
                              borderColor: isLight ? '#BAE6FD' : 'rgba(56, 189, 248, 0.3)',
                              borderWidth: 1,
                              borderRadius: 6,
                              paddingHorizontal: 7,
                              paddingVertical: 2,
                              alignSelf: 'flex-start',
                            }}
                          >
                            <Text style={{ fontSize: 11, fontWeight: '800', color: isLight ? '#0284C7' : '#38BDF8' }}>
                              Application ID: #{String(order.order_number || (order.id ? (String(order.id).startsWith('JOB-') ? order.id : `JOB-${String(order.id).slice(-6)}`) : 'JOB-bc63a5')).replace(/^#/, '')}
                            </Text>
                          </View>
                        </View>
                        <Text
                          style={[
                            styles.cardSubText,
                            { color: '#0EA5E9', fontWeight: '700', marginTop: 1 },
                          ]}
                          numberOfLines={1}
                        >
                          {jobInfo?.company}
                        </Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 3 }}>
                          <Text style={{ fontSize: 11, color: isLight ? '#64748B' : 'rgba(255, 255, 255, 0.6)' }} numberOfLines={1}>
                            📍 {jobInfo?.location}
                          </Text>
                          <Text style={{ fontSize: 11, color: '#059669', fontWeight: '700' }}>
                            • 💰 {jobInfo?.salary}
                          </Text>
                        </View>
                      </>
                    )}

                    {itemNormCat === 'Daily Needs' && (
                      <Text
                        style={[
                          styles.cardSubText,
                          { color: isLight ? '#64748B' : 'rgba(255, 255, 255, 0.6)' },
                        ]}
                        numberOfLines={1}
                      >
                        {order.product_details}
                      </Text>
                    )}

                    {itemNormCat === 'Food' && (
                      <Text
                        style={[
                          styles.cardSubText,
                          { color: isLight ? '#64748B' : 'rgba(255, 255, 255, 0.6)' },
                        ]}
                        numberOfLines={1}
                      >
                        {order.product_details}
                      </Text>
                    )}

                    {(itemNormCat === 'Products' ||
                      itemNormCat === 'Electronics' ||
                      itemNormCat === 'Fashion') && (
                      <>
                        <Text
                          style={[
                            styles.cardSubText,
                            { color: isLight ? '#475569' : 'rgba(255, 255, 255, 0.7)', fontWeight: '600', marginTop: 1 },
                          ]}
                          numberOfLines={1}
                        >
                          {order.vendor_name ? `Store: ${order.vendor_name}` : 'Connect Official Store'}
                        </Text>
                        <Text
                          style={[
                            styles.cardSubText,
                            { color: isLight ? '#64748B' : 'rgba(255, 255, 255, 0.6)', marginTop: 1 },
                          ]}
                          numberOfLines={1}
                        >
                          {order.brand_or_seller
                            ? `Seller: ${order.brand_or_seller}`
                            : 'Seller: Connect Verified'}
                        </Text>
                      </>
                    )}

                    {isExpressDeliveryEligible(order) && isActive && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 5 }}>
                        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981' }} />
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#10B981' }}>
                          ⚡ Express Delivery ({getDynamicExpressTiming(order)}) • Live On Map
                        </Text>
                      </View>
                    )}

                    {order.category === 'Services' && (
                      <View style={styles.inlineInfoRow}>
                        <Icons.Clock color="#D97706" size={11} style={{ marginRight: 4 }} />
                        <Text style={[styles.cardHighlightText, { color: '#D97706' }]}>
                          {order.appointment_slot || 'Tomorrow, 10:30 AM'}
                        </Text>
                      </View>
                    )}

                    {order.category === 'Stay' && (
                      <View style={styles.inlineInfoRow}>
                        <Icons.Calendar color="#0EA5E9" size={11} style={{ marginRight: 4 }} />
                        <Text
                          style={[
                            styles.cardSubText,
                            { color: isLight ? '#64748B' : 'rgba(255, 255, 255, 0.6)' },
                          ]}
                        >
                          {order.check_in
                            ? `${order.check_in.split(',')[0]} • ${order.guests_count || '2 Guests'}`
                            : order.product_details}
                        </Text>
                      </View>
                    )}

                    {order.category === 'Travel' && (
                      <View style={styles.inlineInfoRow}>
                        <Icons.Plane color="#EC4899" size={11} style={{ marginRight: 4 }} />
                        <Text style={[styles.cardHighlightText, { color: '#EC4899' }]}>
                          {order.route || order.travel_date || 'Flight 6E-512 BLR ➔ DEL'}
                        </Text>
                      </View>
                    )}

                    {/* Price & Date Row */}
                    <View style={styles.cardFooterRow}>
                      <Text
                        style={[
                          styles.cardPriceText,
                          isJobOrder
                            ? { color: '#059669', fontSize: 12, fontWeight: '800' }
                            : { color: isLight ? '#0F172A' : '#F5B800' },
                        ]}
                      >
                        {isJobOrder
                          ? jobInfo?.salary
                          : (order?.amount ?? 0) > 0
                          ? `₹${(order.amount ?? 0).toLocaleString('en-IN')}`
                          : 'Free'}
                      </Text>
                      <View style={styles.dateChevronRow}>
                        <Text
                          style={[
                            styles.cardDateText,
                            { color: isLight ? '#94A3B8' : 'rgba(255, 255, 255, 0.5)' },
                          ]}
                        >
                          {new Date(order.created_at || Date.now()).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </Text>
                        <Icons.ChevronRight
                          color={isLight ? '#94A3B8' : 'rgba(255, 255, 255, 0.5)'}
                          size={14}
                          style={{ marginLeft: 2 }}
                        />
                      </View>
                    </View>
                  </View>
                </>
              );
            })()}
          </View>
        </TouchableOpacity>

        {/* Quick Action Footer */}
        {((isActive && isExpressDeliveryEligible(order)) || isCompleted) && (
          <View
            style={[
              styles.cardActionFooter,
              { borderTopColor: isLight ? '#F1EAD8' : 'rgba(255, 255, 255, 0.08)' },
            ]}
          >
            {isActive && isExpressDeliveryEligible(order) ? (
              <TouchableOpacity
                style={[styles.actionPrimaryBtn, { backgroundColor: '#10B981', borderColor: '#059669' }]}
                onPress={() => navigation.navigate('LiveTracking', { orderId: order.id, order })}
                activeOpacity={0.85}
              >
                <Icons.Navigation color="#FFFFFF" size={13} />
                <Text style={[styles.actionPrimaryBtnText, { color: '#FFFFFF', fontWeight: '800' }]}>{t('Track Live (Express)')}</Text>
              </TouchableOpacity>
            ) : isCompleted ? (
              <TouchableOpacity
                style={styles.actionSecondaryBtn}
                onPress={() => setSelectedOrderForReview(order)}
                activeOpacity={0.85}
              >
                <Icons.Star color={isLight ? '#D97706' : '#F5B800'} size={13} />
                <Text
                  style={[
                    styles.actionSecondaryBtnText,
                    { color: isLight ? '#0F172A' : '#FFFFFF' },
                  ]}
                >
                  {order.rating ? `Rated ${order.rating}★` : 'Rate Order'}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        )}
      </View>
    );
  };

  if (!isAuthenticated) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', padding: 24 }]}>
        <StatusBar barStyle={colors.statusBarStyle} backgroundColor={colors.background} translucent={false} />
        <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: isDark ? 'rgba(245, 196, 0, 0.15)' : '#FEF3C7', justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
          <Icons.ShoppingBag color="#F4C400" size={38} />
        </View>
        <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text, marginBottom: 8, textAlign: 'center' }}>
          Sign In to View Your Orders
        </Text>
        <Text style={{ fontSize: 13, color: colors.subtext, textAlign: 'center', marginBottom: 24, lineHeight: 19 }}>
          Sign in or create an account to view your past purchases, track active deliveries, and manage service bookings.
        </Text>
        <TouchableOpacity
          style={{ backgroundColor: '#F4C400', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12, width: '100%', alignItems: 'center' }}
          onPress={() => navigation.navigate('Login')}
          activeOpacity={0.85}
        >
          <Text style={{ color: '#000', fontWeight: '700', fontSize: 15 }}>Sign In / Register</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={colors.statusBarStyle}
        backgroundColor={isLight ? '#FFF1C7' : colors.background}
        translucent={false}
      />
      {/* Toast Notification Banner */}
      {actionSuccessMsg && (
        <View style={styles.toastBanner}>
          <Icons.CheckCircle2 color="#0F172A" size={15} />
          <Text style={styles.toastText}>{actionSuccessMsg}</Text>
        </View>
      )}



      {/* Main Header (#FFF1C7 / Warm Branded) with SafeAreaView */}
      <SafeAreaView
        edges={['top']}
        style={{
          backgroundColor: isLight ? '#FFF1C7' : colors.background,
          borderBottomWidth: 1,
          borderBottomColor: isLight ? 'rgba(242, 183, 5, 0.25)' : colors.cardBorder,
          zIndex: 50,
          elevation: 4,
        }}
      >
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity
              style={styles.headerBtn}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <Icons.ArrowLeft color={colors.text} size={20} />
            </TouchableOpacity>
            <View>
              <Text style={[styles.headerTitle, { color: colors.text }]}>{t('My Orders')}</Text>
              <Text
                style={[
                  styles.headerSubtitle,
                  { color: isLight ? '#64748B' : 'rgba(255, 255, 255, 0.6)' },
                ]}
              >
                {renderRecordCountSubtitle()}
              </Text>
            </View>
          </View>

          <View style={styles.headerRight}>
            <TouchableOpacity
              style={[
                styles.headerActionBtn,
                isSearchVisible && { backgroundColor: 'rgba(245, 184, 0, 0.25)' },
              ]}
              onPress={() => setIsSearchVisible(!isSearchVisible)}
              activeOpacity={0.65}
            >
              <Icons.Search color={isSearchVisible ? '#F5B800' : colors.text} size={18} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.headerActionBtn,
                (isFilterModalOpen || selectedCategory !== 'All' || selectedDateFilter !== 'all') && {
                  backgroundColor: 'rgba(245, 184, 0, 0.25)',
                },
              ]}
              onPress={() => setIsFilterModalOpen(true)}
              activeOpacity={0.65}
            >
              <Icons.Sliders
                color={selectedCategory !== 'All' || selectedDateFilter !== 'all' ? '#F5B800' : colors.text}
                size={18}
              />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      {/* Search Input Bar */}
      {isSearchVisible && (
        <View
          style={[
            styles.searchBarContainer,
            {
              backgroundColor: isLight ? '#FFFFFF' : 'rgba(255, 255, 255, 0.08)',
              borderColor: isLight ? '#FCD34D' : colors.cardBorder,
            },
          ]}
        >
          <Icons.Search
            color={isLight ? '#94A3B8' : 'rgba(255, 255, 255, 0.5)'}
            size={16}
            style={{ marginLeft: 12 }}
          />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search orders, items, or booking ID..."
            placeholderTextColor={isLight ? '#94A3B8' : 'rgba(255, 255, 255, 0.5)'}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={{ padding: 8 }}>
              <Icons.X color={isLight ? '#94A3B8' : 'rgba(255, 255, 255, 0.5)'} size={16} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* ========================================================================= */}
      {/* 1. PRIMARY HORIZONTAL CATEGORY SELECTOR                                  */}
      {/* ========================================================================= */}
      <View
        style={[
          styles.categorySelectorWrapper,
          {
            backgroundColor: isLight ? '#FFFDF5' : colors.background,
            borderBottomColor: isLight ? '#F1EAD8' : colors.cardBorder,
          },
        ]}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScrollContent}
        >
          {TOP_TABS.map((tab) => {
            const isSelected = selectedTopTab === tab;
            const count = topTabCounts[tab] || 0;
            return (
              <TouchableOpacity
                key={tab}
                style={[
                  styles.categoryTabBtn,
                  {
                    backgroundColor: isSelected
                      ? '#F5B800'
                      : isLight
                      ? '#FFFFFF'
                      : 'rgba(255, 255, 255, 0.06)',
                    borderColor: isSelected
                      ? '#F5B800'
                      : isLight
                      ? '#F1EAD8'
                      : colors.cardBorder,
                  },
                ]}
                onPress={() => handleSelectTopTab(tab)}
                activeOpacity={0.85}
              >
                <Text
                  style={[
                    styles.categoryTabText,
                    { color: isSelected ? '#0F172A' : colors.text },
                    isSelected && { fontWeight: '800' },
                  ]}
                >
                  {tab}
                </Text>
                <View
                  style={[
                    styles.categoryCountBadge,
                    {
                      backgroundColor: isSelected
                        ? 'rgba(15, 23, 42, 0.15)'
                        : isLight
                        ? '#FEF3C7'
                        : 'rgba(255, 255, 255, 0.12)',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.categoryCountText,
                      {
                        color: isSelected
                          ? '#0F172A'
                          : isLight
                          ? '#92400E'
                          : '#F5B800',
                      },
                    ]}
                  >
                    {count}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Active Date Filter Chip Banner */}
      {selectedDateFilter !== 'all' && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: isLight ? '#FFFBEB' : 'rgba(245, 184, 0, 0.12)',
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderBottomWidth: 1,
            borderBottomColor: isLight ? '#FDE68A' : 'rgba(245, 184, 0, 0.25)',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Icons.Calendar color="#D97706" size={15} />
            <Text style={{ fontSize: 12.5, fontWeight: '700', color: isLight ? '#92400E' : '#F5B800' }}>
              Date Range:{' '}
              {selectedDateFilter === 'today'
                ? 'Today'
                : selectedDateFilter === 'this_week'
                ? 'This Week'
                : selectedDateFilter === 'this_month'
                ? 'This Month'
                : customStartDate || customEndDate
                ? `Custom (${customStartDate || 'Any'} to ${customEndDate || 'Any'})`
                : 'Custom Date'}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              setSelectedDateFilter('all');
              setCustomStartDate('');
              setCustomEndDate('');
            }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              backgroundColor: isLight ? '#FDE68A' : 'rgba(245, 184, 0, 0.25)',
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderRadius: 12,
            }}
          >
            <Text style={{ fontSize: 11, fontWeight: '800', color: isLight ? '#78350F' : '#F5B800' }}>
              Clear
            </Text>
            <Icons.X color={isLight ? '#78350F' : '#F5B800'} size={13} />
          </TouchableOpacity>
        </View>
      )}

      {/* ========================================================================= */}
      {/* 2. SECONDARY CATEGORY FILTER ROW                                           */}
      {/* ========================================================================= */}
      <View style={styles.statusFilterWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.statusFilterScroll}
        >
          {availableCategoryPills.map((catName) => {
            const isSelected = selectedCategory === catName;
            return (
              <TouchableOpacity
                key={catName}
                style={[
                  styles.statusChip,
                  {
                    backgroundColor: isSelected
                      ? '#FEF3C7'
                      : isLight
                      ? '#FFFFFF'
                      : 'rgba(255, 255, 255, 0.04)',
                    borderColor: isSelected
                      ? '#F5B800'
                      : isLight
                      ? '#F1EAD8'
                      : colors.cardBorder,
                  },
                ]}
                onPress={() => setSelectedCategory(catName)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.statusChipText,
                    {
                      color: isSelected
                        ? '#92400E'
                        : isLight
                        ? '#64748B'
                        : 'rgba(255, 255, 255, 0.6)',
                    },
                    isSelected && { fontWeight: '800' },
                  ]}
                >
                  {catName}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ========================================================================= */}
      {/* ORDER LIST CONTENT                                                        */}
      {/* ========================================================================= */}
      {filteredOrders.length === 0 ? (
        <ScrollView
          contentContainerStyle={styles.emptyScroll}
          showsVerticalScrollIndicator={false}
        >
          {renderEmptyState()}
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={styles.ordersScroll}
          showsVerticalScrollIndicator={false}
        >
          {groupedOrders.map((group, groupIdx) => (
            <View key={`group_${group.title}_${groupIdx}`} style={styles.groupSection}>
              {/* Group Date Header */}
              <View style={styles.groupHeaderRow}>
                <Text
                  style={[
                    styles.groupHeaderTitle,
                    { color: isLight ? '#94A3B8' : 'rgba(255, 255, 255, 0.5)' },
                  ]}
                >
                  {group.title.toUpperCase()}
                </Text>
                <View
                  style={[
                    styles.groupHeaderDivider,
                    { backgroundColor: isLight ? '#F1EAD8' : colors.cardBorder },
                  ]}
                />
              </View>

              {/* Group Orders */}
              {group.items.map((order, orderIdx) =>
                renderOrderCard(
                  order,
                  `order_${order.id || order.order_number || 'item'}_g${groupIdx}_i${orderIdx}`
                )
              )}
            </View>
          ))}
        </ScrollView>
      )}

      {/* ========================================================================= */}
      {/* FULL ORDER / BOOKING DETAILS MODAL                                        */}
      {/* ========================================================================= */}
      <Modal
        visible={!!selectedOrderForDetails}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedOrderForDetails(null)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalSheet,
              {
                backgroundColor: isLight ? '#FFFDF5' : '#0B1530',
                borderColor: isLight ? '#FDE68A' : colors.cardBorder,
                maxHeight: height * 0.9,
              },
            ]}
          >
            {selectedOrderForDetails && (
              selectedOrderForDetails.category === 'Jobs' ||
              (selectedOrderForDetails.order_number || '').includes('JOB') ? (
                <>
                  {/* Job Application Sheet Header */}
                  <View
                    style={[
                      styles.modalHeader,
                      { borderBottomColor: isLight ? '#F1EAD8' : 'rgba(255, 255, 255, 0.08)' },
                    ]}
                  >
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={[styles.modalTitle, { color: colors.text }]}>
                          Application Details
                        </Text>
                        <View
                          style={[
                            styles.categoryPill,
                            {
                              backgroundColor: 'rgba(14, 165, 233, 0.15)',
                              borderColor: 'rgba(14, 165, 233, 0.3)',
                            },
                          ]}
                        >
                          <Text style={[styles.categoryPillText, { color: '#0EA5E9' }]}>
                            JOB APPLICATION
                          </Text>
                        </View>
                      </View>
                      <Text
                        style={[
                          styles.orderNumberText,
                          { color: isLight ? '#64748B' : 'rgba(255, 255, 255, 0.6)', marginTop: 2 },
                        ]}
                      >
                        #{selectedOrderForDetails.order_number}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => setSelectedOrderForDetails(null)}
                      style={styles.modalCloseBtn}
                    >
                      <Icons.X color={colors.text} size={18} />
                    </TouchableOpacity>
                  </View>

                  <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 18, paddingBottom: Math.max(insets.bottom, 24) + 20 }}>
                    {(() => {
                      const jobInfo = getResolvedJobInfo(selectedOrderForDetails);
                      const isWithdrawn = isCancelledStatus(selectedOrderForDetails.status);
                      const sLow = (selectedOrderForDetails.status || '').toLowerCase();

                      // Timeline stage calculations
                      const isReviewDone =
                        sLow.includes('review') ||
                        sLow.includes('shortlist') ||
                        sLow.includes('interview') ||
                        sLow.includes('hire') ||
                        sLow.includes('selected') ||
                        sLow.includes('offer') ||
                        isCompletedStatus(selectedOrderForDetails.status);

                      const isShortlistDone =
                        sLow.includes('shortlist') ||
                        sLow.includes('interview') ||
                        sLow.includes('hire') ||
                        sLow.includes('selected') ||
                        sLow.includes('offer') ||
                        isCompletedStatus(selectedOrderForDetails.status);

                      const isInterviewDone =
                        sLow.includes('interview') ||
                        sLow.includes('hire') ||
                        sLow.includes('selected') ||
                        sLow.includes('offer') ||
                        isCompletedStatus(selectedOrderForDetails.status);

                      // In-progress step determination
                      const isStep1Active = !isWithdrawn && !isReviewDone;
                      const isStep2Active = !isWithdrawn && isReviewDone && !isShortlistDone;
                      const isStep3Active = !isWithdrawn && isShortlistDone && !isInterviewDone;

                      // Status Banner Config
                      let bannerTitle = 'APPLICATION SUBMITTED';
                      let bannerBg = 'rgba(14, 165, 233, 0.12)';
                      let bannerBorder = 'rgba(14, 165, 233, 0.3)';
                      let bannerColor = '#0EA5E9';
                      let bannerSub = `Applied on ${formatOrderDisplayDate(selectedOrderForDetails.created_at || (selectedOrderForDetails as any).createdAt, 0).timelineDate}`;

                      if (isWithdrawn) {
                        bannerTitle = 'APPLICATION WITHDRAWN';
                        bannerBg = 'rgba(239, 68, 68, 0.12)';
                        bannerBorder = 'rgba(239, 68, 68, 0.3)';
                        bannerColor = '#EF4444';
                        bannerSub = 'Candidacy withdrawn by applicant';
                      } else if (isInterviewDone) {
                        bannerTitle = 'INTERVIEW SCHEDULED';
                        bannerBg = 'rgba(139, 92, 246, 0.12)';
                        bannerBorder = 'rgba(139, 92, 246, 0.3)';
                        bannerColor = '#8B5CF6';
                        bannerSub = 'Employer has scheduled an interview with you';
                      } else if (isShortlistDone) {
                        bannerTitle = 'PROFILE SHORTLISTED';
                        bannerBg = 'rgba(16, 185, 129, 0.12)';
                        bannerBorder = 'rgba(16, 185, 129, 0.3)';
                        bannerColor = '#10B981';
                        bannerSub = 'Congratulations! Your profile has been shortlisted';
                      } else if (isReviewDone) {
                        bannerTitle = 'APPLICATION REVIEWED';
                        bannerBg = 'rgba(245, 158, 11, 0.12)';
                        bannerBorder = 'rgba(245, 158, 11, 0.3)';
                        bannerColor = '#F59E0B';
                        bannerSub = 'Employer has reviewed your application';
                      }

                      return (
                        <>
                          {/* Status Banner */}
                          <View
                            style={[
                              styles.detailsStatusBanner,
                              {
                                backgroundColor: bannerBg,
                                borderColor: bannerBorder,
                              },
                            ]}
                          >
                            <Text style={[styles.detailsStatusText, { color: bannerColor }]}>
                              {bannerTitle}
                            </Text>
                            <Text
                              style={[
                                styles.detailsDeliveryEta,
                                { color: isLight ? '#64748B' : 'rgba(255, 255, 255, 0.7)' },
                              ]}
                            >
                              {bannerSub}
                            </Text>
                          </View>

                          {/* 1. Job Overview Information */}
                          <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 14 }]}>
                            JOB INFORMATION
                          </Text>
                          <View
                            style={[
                              styles.sectionCard,
                              {
                                backgroundColor: isLight ? '#FFFFFF' : 'rgba(255, 255, 255, 0.04)',
                                borderColor: isLight ? '#F1EAD8' : colors.cardBorder,
                                padding: 14,
                              },
                            ]}
                          >
                            <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                              <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 14.5, fontWeight: '900', color: colors.text }}>
                                  {jobInfo.title}
                                </Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 }}>
                                  <Icons.Building2 color="#0EA5E9" size={13} />
                                  <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#0EA5E9' }}>
                                    {jobInfo.company}
                                  </Text>
                                  <Icons.BadgeCheck color="#10B981" size={14} />
                                </View>
                              </View>
                            </View>

                            <View style={{ height: 1, backgroundColor: isLight ? '#F1F5F9' : 'rgba(255,255,255,0.06)', marginVertical: 10 }} />

                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                <Icons.Layers color={isLight ? '#64748B' : '#94A3B8'} size={12} />
                                <Text style={{ fontSize: 11.5, color: isLight ? '#475569' : '#CBD5E1' }}>
                                  Dept: <Text style={{ fontWeight: '700', color: colors.text }}>{jobInfo.department}</Text>
                                </Text>
                              </View>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                <Icons.MapPin color={isLight ? '#64748B' : '#94A3B8'} size={12} />
                                <Text style={{ fontSize: 11.5, color: isLight ? '#475569' : '#CBD5E1' }}>
                                  Location: <Text style={{ fontWeight: '700', color: colors.text }}>{jobInfo.location}</Text>
                                </Text>
                              </View>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                <Icons.IndianRupee color="#059669" size={12} />
                                <Text style={{ fontSize: 11.5, color: '#059669', fontWeight: '800' }}>
                                  Salary: {jobInfo.salary}
                                </Text>
                              </View>
                              {jobInfo.workMode ? (
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                  <Icons.Briefcase color={isLight ? '#64748B' : '#94A3B8'} size={12} />
                                  <Text style={{ fontSize: 11.5, color: isLight ? '#475569' : '#CBD5E1' }}>
                                    Mode: <Text style={{ fontWeight: '700', color: colors.text }}>{jobInfo.workMode}</Text>
                                  </Text>
                                </View>
                              ) : null}
                            </View>
                          </View>

                          {/* 2. Applicant Submission Details */}
                          <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 14 }]}>
                            APPLICANT DETAILS
                          </Text>
                          <View
                            style={[
                              styles.sectionCard,
                              {
                                backgroundColor: isLight ? '#FFFFFF' : 'rgba(255, 255, 255, 0.04)',
                                borderColor: isLight ? '#F1EAD8' : colors.cardBorder,
                                padding: 14,
                              },
                            ]}
                          >
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Icons.User color={isLight ? '#64748B' : '#94A3B8'} size={14} />
                                <Text style={{ fontSize: 13, fontWeight: '800', color: colors.text }}>
                                  {jobInfo.candidateName}
                                </Text>
                              </View>
                              {jobInfo.candidatePhone ? (
                                <Text style={{ fontSize: 11.5, color: isLight ? '#64748B' : '#94A3B8', fontWeight: '600' }}>
                                  {jobInfo.candidatePhone}
                                </Text>
                              ) : null}
                            </View>

                            {jobInfo.candidateEmail ? (
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                                <Icons.Mail color={isLight ? '#64748B' : '#94A3B8'} size={13} />
                                <Text style={{ fontSize: 12, color: isLight ? '#475569' : '#CBD5E1' }}>
                                  {jobInfo.candidateEmail}
                                </Text>
                              </View>
                            ) : null}

                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                              {jobInfo.education ? (
                                <View style={{ backgroundColor: isLight ? '#F1F5F9' : 'rgba(255,255,255,0.06)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                                  <Text style={{ fontSize: 11, color: isLight ? '#475569' : '#CBD5E1', fontWeight: '600' }}>
                                    🎓 {jobInfo.education}
                                  </Text>
                                </View>
                              ) : null}
                              {jobInfo.applicantExp ? (
                                <View style={{ backgroundColor: isLight ? '#F1F5F9' : 'rgba(255,255,255,0.06)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                                  <Text style={{ fontSize: 11, color: isLight ? '#475569' : '#CBD5E1', fontWeight: '600' }}>
                                    ⏳ {jobInfo.applicantExp}
                                  </Text>
                                </View>
                              ) : null}
                            </View>

                            {/* Attached Resume */}
                            <View
                              style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 8,
                                backgroundColor: isLight ? '#F8FAFC' : 'rgba(255, 255, 255, 0.03)',
                                borderColor: isLight ? '#E2E8F0' : 'rgba(255, 255, 255, 0.08)',
                                borderWidth: 1,
                                borderRadius: 10,
                                padding: 10,
                                marginTop: 10,
                              }}
                            >
                              <Icons.FileText color="#F5B800" size={17} />
                              <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text }} numberOfLines={1}>
                                  {jobInfo.resumeName}
                                </Text>
                                <Text style={{ fontSize: 10.5, color: '#10B981', fontWeight: '600' }}>
                                  Attached Resume • Submitted
                                </Text>
                              </View>
                            </View>
                          </View>

                          {/* 3. Dynamic Application Timeline */}
                          <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 16 }]}>
                            APPLICATION TIMELINE
                          </Text>
                          <View
                            style={[
                              styles.sectionCard,
                              {
                                backgroundColor: isLight ? '#FFFFFF' : 'rgba(255, 255, 255, 0.04)',
                                borderColor: isLight ? '#F1EAD8' : colors.cardBorder,
                                padding: 14,
                              },
                            ]}
                          >
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                              {/* Step 1: Applied */}
                              <View style={{ alignItems: 'center', width: 60 }}>
                                <View
                                  style={{
                                    width: 24,
                                    height: 24,
                                    borderRadius: 12,
                                    backgroundColor: isWithdrawn ? (isLight ? '#CBD5E1' : '#334155') : '#F5B800',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                  }}
                                >
                                  <Icons.Check color={isWithdrawn ? '#64748B' : '#0F172A'} size={12} strokeWidth={2.5} />
                                </View>
                                <Text style={{ fontSize: 10, fontWeight: '800', color: colors.text, marginTop: 4 }}>Applied</Text>
                                <Text style={{ fontSize: 8.5, color: '#10B981', fontWeight: '700', marginTop: 1 }}>Submitted</Text>
                              </View>

                              {/* Connector 1 */}
                              <View
                                style={{
                                  flex: 1,
                                  height: 2,
                                  backgroundColor: isWithdrawn
                                    ? (isLight ? '#E2E8F0' : '#1E293B')
                                    : (isReviewDone || isStep1Active ? '#F5B800' : isLight ? '#E2E8F0' : 'rgba(255,255,255,0.1)'),
                                  marginBottom: 20,
                                }}
                              />

                              {/* Step 2: Under Review */}
                              <View style={{ alignItems: 'center', width: 64 }}>
                                <View
                                  style={{
                                    width: 24,
                                    height: 24,
                                    borderRadius: 12,
                                    backgroundColor: isReviewDone
                                      ? '#F5B800'
                                      : isStep1Active
                                      ? '#FEF3C7'
                                      : isLight
                                      ? '#F1F5F9'
                                      : 'rgba(255,255,255,0.06)',
                                    borderWidth: isStep1Active ? 2 : 0,
                                    borderColor: '#F5B800',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                  }}
                                >
                                  {isReviewDone ? (
                                    <Icons.Check color="#0F172A" size={12} strokeWidth={2.5} />
                                  ) : isStep1Active ? (
                                    <Icons.Clock color="#92400E" size={11} strokeWidth={2.5} />
                                  ) : (
                                    <Icons.Clock color="#94A3B8" size={11} />
                                  )}
                                </View>
                                <Text
                                  style={{
                                    fontSize: 10,
                                    fontWeight: isReviewDone || isStep1Active ? '800' : '600',
                                    color: isReviewDone || isStep1Active ? colors.text : isLight ? '#94A3B8' : '#64748B',
                                    marginTop: 4,
                                  }}
                                >
                                  Review
                                </Text>
                                <Text
                                  style={{
                                    fontSize: 8.5,
                                    color: isReviewDone ? '#10B981' : isStep1Active ? '#D97706' : '#94A3B8',
                                    fontWeight: '700',
                                    marginTop: 1,
                                  }}
                                >
                                  {isReviewDone ? 'Reviewed' : isStep1Active ? 'In Review' : 'Pending'}
                                </Text>
                              </View>

                              {/* Connector 2 */}
                              <View
                                style={{
                                  flex: 1,
                                  height: 2,
                                  backgroundColor: isWithdrawn
                                    ? (isLight ? '#E2E8F0' : '#1E293B')
                                    : (isShortlistDone || isStep2Active ? '#F5B800' : isLight ? '#E2E8F0' : 'rgba(255,255,255,0.1)'),
                                  marginBottom: 20,
                                }}
                              />

                              {/* Step 3: Shortlisted */}
                              <View style={{ alignItems: 'center', width: 64 }}>
                                <View
                                  style={{
                                    width: 24,
                                    height: 24,
                                    borderRadius: 12,
                                    backgroundColor: isShortlistDone
                                      ? '#10B981'
                                      : isStep2Active
                                      ? '#FEF3C7'
                                      : isLight
                                      ? '#F1F5F9'
                                      : 'rgba(255,255,255,0.06)',
                                    borderWidth: isStep2Active ? 2 : 0,
                                    borderColor: '#F5B800',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                  }}
                                >
                                  {isShortlistDone ? (
                                    <Icons.Check color="#FFFFFF" size={12} strokeWidth={2.5} />
                                  ) : (
                                    <Icons.Award color={isStep2Active ? '#92400E' : '#94A3B8'} size={11} />
                                  )}
                                </View>
                                <Text
                                  style={{
                                    fontSize: 10,
                                    fontWeight: isShortlistDone || isStep2Active ? '800' : '600',
                                    color: isShortlistDone || isStep2Active ? colors.text : isLight ? '#94A3B8' : '#64748B',
                                    marginTop: 4,
                                  }}
                                >
                                  Shortlist
                                </Text>
                                <Text
                                  style={{
                                    fontSize: 8.5,
                                    color: isShortlistDone ? '#10B981' : isStep2Active ? '#D97706' : '#94A3B8',
                                    fontWeight: '700',
                                    marginTop: 1,
                                  }}
                                >
                                  {isShortlistDone ? 'Shortlisted' : isStep2Active ? 'Active' : 'Pending'}
                                </Text>
                              </View>

                              {/* Connector 3 */}
                              <View
                                style={{
                                  flex: 1,
                                  height: 2,
                                  backgroundColor: isWithdrawn
                                    ? (isLight ? '#E2E8F0' : '#1E293B')
                                    : (isInterviewDone || isStep3Active ? '#F5B800' : isLight ? '#E2E8F0' : 'rgba(255,255,255,0.1)'),
                                  marginBottom: 20,
                                }}
                              />

                              {/* Step 4: Interview */}
                              <View style={{ alignItems: 'center', width: 60 }}>
                                <View
                                  style={{
                                    width: 24,
                                    height: 24,
                                    borderRadius: 12,
                                    backgroundColor: isInterviewDone
                                      ? '#8B5CF6'
                                      : isStep3Active
                                      ? '#FEF3C7'
                                      : isLight
                                      ? '#F1F5F9'
                                      : 'rgba(255,255,255,0.06)',
                                    borderWidth: isStep3Active ? 2 : 0,
                                    borderColor: '#F5B800',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                  }}
                                >
                                  <Icons.Video color={isInterviewDone ? '#FFFFFF' : isStep3Active ? '#92400E' : '#94A3B8'} size={11} />
                                </View>
                                <Text
                                  style={{
                                    fontSize: 10,
                                    fontWeight: isInterviewDone || isStep3Active ? '800' : '600',
                                    color: isInterviewDone || isStep3Active ? colors.text : isLight ? '#94A3B8' : '#64748B',
                                    marginTop: 4,
                                  }}
                                >
                                  Interview
                                </Text>
                                <Text
                                  style={{
                                    fontSize: 8.5,
                                    color: isInterviewDone ? '#8B5CF6' : isStep3Active ? '#D97706' : '#94A3B8',
                                    fontWeight: '700',
                                    marginTop: 1,
                                  }}
                                >
                                  {isInterviewDone ? 'Scheduled' : isStep3Active ? 'Scheduled' : 'Pending'}
                                </Text>
                              </View>
                            </View>
                          </View>

                          {/* 4. Redesigned Action Buttons */}
                          <View style={styles.jobActionContainer}>
                            <TouchableOpacity
                              style={styles.viewJobListingBtn}
                              onPress={() => {
                                const item = selectedOrderForDetails;
                                if (jobInfo.isJobDeleted || !jobInfo.matchedJob) {
                                  Alert.alert(
                                    'Job Listing Unavailable',
                                    'This job listing is no longer available as it has been closed or removed by the employer.',
                                    [{ text: 'OK' }]
                                  );
                                  return;
                                }

                                setSelectedOrderForDetails(null);
                                navigation.navigate('JobDetails', {
                                  job: {
                                    id: item.id || item.order_number,
                                    jobID: item.order_number,
                                    title: jobInfo.title,
                                    company: jobInfo.company,
                                    companyName: jobInfo.company,
                                    companyWebsite: jobInfo.companyWebsite,
                                    salary: jobInfo.salary,
                                    location: jobInfo.location,
                                    department: jobInfo.department,
                                    experience: jobInfo.experience,
                                    logo: '',
                                    skills: [jobInfo.department, 'Technical Skills'],
                                    description: (jobInfo as any).description || (jobInfo as any).jobDescription || '',
                                    keyResponsibilities: (jobInfo as any).keyResponsibilities || '',
                                  },
                                });
                              }}
                              activeOpacity={0.85}
                            >
                              <Icons.ExternalLink color="#0F172A" size={15} />
                              <Text style={styles.viewJobListingBtnText}>
                                View Job Listing
                              </Text>
                            </TouchableOpacity>

                            {isWithdrawn ? (
                              <View
                                style={{
                                  flexDirection: 'row',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: 6,
                                  paddingVertical: 10,
                                  paddingHorizontal: 12,
                                  borderRadius: 10,
                                  backgroundColor: isLight ? '#F1F5F9' : 'rgba(255,255,255,0.04)',
                                  borderWidth: 1,
                                  borderColor: isLight ? '#E2E8F0' : 'rgba(255,255,255,0.08)',
                                  marginTop: 4,
                                }}
                              >
                                <Icons.CheckCircle2 color="#64748B" size={14} />
                                <Text style={{ fontSize: 12, color: isLight ? '#64748B' : '#94A3B8', fontWeight: '600' }}>
                                  Application Withdrawn
                                </Text>
                              </View>
                            ) : (
                              <View style={{ marginTop: 2 }}>
                                <TouchableOpacity
                                  style={styles.withdrawJobBtn}
                                  onPress={() => {
                                    const o = selectedOrderForDetails;
                                    setSelectedOrderForDetails(null);
                                    setSelectedOrderForCancel(o);
                                  }}
                                  activeOpacity={0.85}
                                >
                                  <Icons.XCircle color="#EF4444" size={15} />
                                  <Text style={styles.withdrawJobBtnText}>
                                    Withdraw Application
                                  </Text>
                                </TouchableOpacity>
                                <Text
                                  style={{
                                    fontSize: 10.5,
                                    color: isLight ? '#94A3B8' : 'rgba(255,255,255,0.4)',
                                    textAlign: 'center',
                                    marginTop: 6,
                                  }}
                                >
                                  Withdrawing removes your application from employer review
                                </Text>
                              </View>
                            )}
                          </View>
                        </>
                      );
                    })()}
                  </ScrollView>
                </>
              ) : isBusOrder(selectedOrderForDetails) ? (
                <>
                  {/* Dedicated Bus Ticket / Boarding Pass Sheet */}
                  {(() => {
                    const busInfo = getResolvedBusInfo(selectedOrderForDetails);
                    const statusMeta = getStatusMeta(selectedOrderForDetails.status);
                    const isCancelled = isCancelledStatus(selectedOrderForDetails.status);

                    return (
                      <>
                        <View
                          style={[
                            styles.modalHeader,
                            { borderBottomColor: isLight ? '#F1EAD8' : 'rgba(255, 255, 255, 0.08)' },
                          ]}
                        >
                          <View style={{ flex: 1, marginRight: 8 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <Text style={[styles.modalTitle, { color: colors.text }]}>Bus Ticket Details</Text>
                              <View
                                style={[
                                  styles.categoryPill,
                                  {
                                    backgroundColor: 'rgba(236, 72, 153, 0.15)',
                                    borderColor: 'rgba(236, 72, 153, 0.3)',
                                  },
                                ]}
                              >
                                <Icons.Bus color="#EC4899" size={11} />
                                <Text style={[styles.categoryPillText, { color: '#EC4899' }]}>
                                  BUS TICKET
                                </Text>
                              </View>
                            </View>
                            <Text
                              style={[
                                styles.orderNumberText,
                                { color: isLight ? '#64748B' : 'rgba(255, 255, 255, 0.6)', marginTop: 2 },
                              ]}
                            >
                              PNR: #{busInfo.pnr}
                            </Text>
                          </View>
                          <TouchableOpacity
                            onPress={() => setSelectedOrderForDetails(null)}
                            style={styles.modalCloseBtn}
                          >
                            <Icons.X color={colors.text} size={18} />
                          </TouchableOpacity>
                        </View>

                        <ScrollView
                          showsVerticalScrollIndicator={false}
                          contentContainerStyle={{ padding: 16, paddingBottom: Math.max(insets.bottom, 24) + 16 }}
                        >
                          {/* 1. Bus Operator & Status Header Card */}
                          <View
                            style={{
                              backgroundColor: isLight ? '#FDF2F8' : 'rgba(236, 72, 153, 0.08)',
                              borderRadius: 16,
                              borderWidth: 1,
                              borderColor: isLight ? '#FBCFE8' : 'rgba(236, 72, 153, 0.25)',
                              padding: 16,
                              marginBottom: 14,
                            }}
                          >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                              <View
                                style={{
                                  width: 48,
                                  height: 48,
                                  borderRadius: 14,
                                  backgroundColor: isLight ? '#EC4899' : 'rgba(236, 72, 153, 0.25)',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                <Icons.Bus color={isLight ? '#FFFFFF' : '#F472B6'} size={24} />
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 17, fontWeight: '900', color: colors.text }}>
                                  {busInfo.busName}
                                </Text>
                                <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#EC4899', marginTop: 2 }}>
                                  {busInfo.operatorName ? `${busInfo.operatorName} • ${busInfo.busType}` : busInfo.busType}
                                </Text>
                              </View>
                              <View
                                style={[
                                  styles.statusPill,
                                  { backgroundColor: statusMeta.bg, borderColor: statusMeta.border, paddingHorizontal: 9, paddingVertical: 4 },
                                ]}
                              >
                                <Text style={[styles.statusPillText, { color: statusMeta.color, fontSize: 10, fontWeight: '900' }]}>
                                  {statusMeta.label}
                                </Text>
                              </View>
                            </View>
                          </View>

                          {/* 2. Route & Timings Card */}
                          <View
                            style={{
                              backgroundColor: isLight ? '#FFFFFF' : 'rgba(255, 255, 255, 0.04)',
                              borderRadius: 16,
                              borderWidth: 1,
                              borderColor: isLight ? '#E2E8F0' : colors.cardBorder,
                              padding: 16,
                              marginBottom: 14,
                            }}
                          >
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Icons.Calendar color="#EC4899" size={15} />
                                <Text style={{ fontSize: 13, fontWeight: '800', color: '#EC4899' }}>
                                  {busInfo.journeyDate}
                                </Text>
                              </View>
                              <View
                                style={{
                                  backgroundColor: busInfo.hasAllocatedSeat
                                    ? (isLight ? '#EFF6FF' : 'rgba(59, 130, 246, 0.15)')
                                    : (isLight ? '#FFFBEB' : 'rgba(245, 158, 11, 0.15)'),
                                  paddingHorizontal: 8,
                                  paddingVertical: 3,
                                  borderRadius: 6,
                                }}
                              >
                                <Text style={{ fontSize: 11, fontWeight: '800', color: busInfo.hasAllocatedSeat ? '#3B82F6' : '#D97706' }}>
                                  {busInfo.seatString}
                                </Text>
                              </View>
                            </View>

                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                              {/* Boarding Point */}
                              <View style={{ flex: 1.1 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981' }} />
                                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#10B981', textTransform: 'uppercase' }}>
                                    Boarding
                                  </Text>
                                </View>
                                <Text style={{ fontSize: 16, fontWeight: '900', color: colors.text }}>
                                  {busInfo.departureTime}
                                </Text>
                                <Text style={{ fontSize: 13, fontWeight: '800', color: colors.text, marginTop: 2 }}>
                                  {busInfo.boardingCity}
                                </Text>
                                {busInfo.boarding && busInfo.boarding.includes('(') ? (
                                  <Text style={{ fontSize: 11, color: isLight ? '#64748B' : '#94A3B8', marginTop: 2 }}>
                                    {busInfo.boarding.match(/\(([^)]+)\)/)?.[1] || ''}
                                  </Text>
                                ) : null}
                              </View>

                              {/* Arrow */}
                              <View style={{ alignItems: 'center', paddingHorizontal: 10 }}>
                                <Icons.ArrowRight color={isLight ? '#94A3B8' : 'rgba(255,255,255,0.4)'} size={18} />
                              </View>

                              {/* Dropping Point */}
                              <View style={{ flex: 1.1, alignItems: 'flex-end' }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#EF4444', textTransform: 'uppercase' }}>
                                    Dropping
                                  </Text>
                                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444' }} />
                                </View>
                                <Text style={{ fontSize: 16, fontWeight: '900', color: colors.text }}>
                                  {busInfo.droppingTime || 'Arrival'}
                                </Text>
                                <Text style={{ fontSize: 13, fontWeight: '800', color: colors.text, marginTop: 2 }}>
                                  {busInfo.droppingCity}
                                </Text>
                                {busInfo.dropping && busInfo.dropping.includes('(') ? (
                                  <Text style={{ fontSize: 11, color: isLight ? '#64748B' : '#94A3B8', marginTop: 2 }}>
                                    {busInfo.dropping.match(/\(([^)]+)\)/)?.[1] || ''}
                                  </Text>
                                ) : null}
                              </View>
                            </View>
                          </View>

                          {/* 3. Detailed Boarding & Dropping Locations */}
                          <View
                            style={{
                              backgroundColor: isLight ? '#FFFFFF' : 'rgba(255, 255, 255, 0.04)',
                              borderRadius: 16,
                              borderWidth: 1,
                              borderColor: isLight ? '#E2E8F0' : colors.cardBorder,
                              padding: 16,
                              marginBottom: 14,
                            }}
                          >
                            <Text style={{ fontSize: 13, fontWeight: '900', color: colors.text, marginBottom: 12 }}>
                              Boarding & Dropping Locations
                            </Text>

                            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
                              <View
                                style={{
                                  width: 28,
                                  height: 28,
                                  borderRadius: 8,
                                  backgroundColor: isLight ? '#F0FDF4' : 'rgba(16, 185, 129, 0.15)',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                <Icons.MapPin color="#10B981" size={14} />
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 11, fontWeight: '700', color: '#10B981', textTransform: 'uppercase' }}>
                                  Boarding Point
                                </Text>
                                <Text style={{ fontSize: 13, fontWeight: '800', color: colors.text, marginTop: 2 }}>
                                  {busInfo.boarding}
                                </Text>
                                <Text style={{ fontSize: 11, color: isLight ? '#64748B' : '#94A3B8', marginTop: 2 }}>
                                  ⏰ Please arrive 15 minutes before departure
                                </Text>
                              </View>
                            </View>

                            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                              <View
                                style={{
                                  width: 28,
                                  height: 28,
                                  borderRadius: 8,
                                  backgroundColor: isLight ? '#FEF2F2' : 'rgba(239, 68, 68, 0.15)',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                <Icons.MapPin color="#EF4444" size={14} />
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 11, fontWeight: '700', color: '#EF4444', textTransform: 'uppercase' }}>
                                  Dropping Point
                                </Text>
                                <Text style={{ fontSize: 13, fontWeight: '800', color: colors.text, marginTop: 2 }}>
                                  {busInfo.dropping}
                                </Text>
                              </View>
                            </View>
                          </View>

                          {/* 4. Passenger Details */}
                          <View
                            style={{
                              backgroundColor: isLight ? '#FFFFFF' : 'rgba(255, 255, 255, 0.04)',
                              borderRadius: 16,
                              borderWidth: 1,
                              borderColor: isLight ? '#E2E8F0' : colors.cardBorder,
                              padding: 16,
                              marginBottom: 14,
                            }}
                          >
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                              <Text style={{ fontSize: 13, fontWeight: '900', color: colors.text }}>
                                Passenger Details
                              </Text>
                              <View
                                style={{
                                  backgroundColor: isLight ? '#EFF6FF' : 'rgba(59, 130, 246, 0.15)',
                                  paddingHorizontal: 8,
                                  paddingVertical: 3,
                                  borderRadius: 6,
                                }}
                              >
                                <Text style={{ fontSize: 10.5, fontWeight: '800', color: '#3B82F6' }}>
                                  {busInfo.passengerCount} {busInfo.passengerCount === 1 ? 'PASSENGER' : 'PASSENGERS'}
                                </Text>
                              </View>
                            </View>

                            {(busInfo.travelers.length > 0 ? busInfo.travelers : [{ name: busInfo.primaryPassenger, seat: (busInfo.hasAllocatedSeat ? (busInfo.seatList[0] || 'U4') : '') }]).map((t: any, idx: number) => {
                              const travelerSeat = t.seat || (busInfo.hasAllocatedSeat ? (busInfo.seatList[idx] || busInfo.seatList[0]) : '');
                              const hasSeat = Boolean(travelerSeat && String(travelerSeat).trim() && !String(travelerSeat).toLowerCase().includes('pending') && !String(travelerSeat).toLowerCase().includes('awaiting'));
                              return (
                                <View
                                  key={idx}
                                  style={{
                                    backgroundColor: isLight ? '#F8FAFC' : 'rgba(255, 255, 255, 0.02)',
                                    borderRadius: 14,
                                    padding: 12,
                                    marginBottom: 10,
                                    borderWidth: 1,
                                    borderColor: isLight ? '#E2E8F0' : 'rgba(255, 255, 255, 0.06)',
                                  }}
                                >
                                  {/* Top Row: Avatar + Name + Confirmed/Awaiting Badge */}
                                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, marginRight: 8 }}>
                                      <View
                                        style={{
                                          width: 34,
                                          height: 34,
                                          borderRadius: 17,
                                          backgroundColor: isLight ? '#FDF2F8' : 'rgba(236, 72, 153, 0.15)',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                        }}
                                      >
                                        <Text style={{ fontSize: 13, fontWeight: '900', color: '#EC4899' }}>P{idx + 1}</Text>
                                      </View>
                                      <View style={{ flex: 1 }}>
                                        <Text style={{ fontSize: 14, fontWeight: '800', color: colors.text }} numberOfLines={1}>
                                          {t.name || `Passenger ${idx + 1}`}
                                        </Text>
                                        {(t.age || t.gender) && (
                                          <Text style={{ fontSize: 11, color: isLight ? '#64748B' : '#94A3B8', marginTop: 1 }}>
                                            {[t.age ? `${t.age} yrs` : '', t.gender].filter(Boolean).join(' • ')}
                                          </Text>
                                        )}
                                      </View>
                                    </View>

                                    <View
                                      style={{
                                        backgroundColor: hasSeat
                                          ? (isLight ? '#DCFCE7' : 'rgba(16, 185, 129, 0.15)')
                                          : (isLight ? '#FEF3C7' : 'rgba(245, 158, 11, 0.15)'),
                                        paddingHorizontal: 8,
                                        paddingVertical: 4,
                                        borderRadius: 6,
                                        borderWidth: 1,
                                        borderColor: hasSeat
                                          ? (isLight ? '#86EFAC' : 'rgba(16, 185, 129, 0.3)')
                                          : (isLight ? '#FDE68A' : 'rgba(245, 158, 11, 0.3)'),
                                      }}
                                    >
                                      <Text style={{ fontSize: 9.5, fontWeight: '900', color: hasSeat ? '#15803D' : '#D97706' }}>
                                        {hasSeat ? '✓ CONFIRMED' : '⏳ AWAITING SEAT'}
                                      </Text>
                                    </View>
                                  </View>

                                  {/* Middle Row: Prominent Seat Number Card */}
                                  <View
                                    style={{
                                      flexDirection: 'row',
                                      alignItems: 'center',
                                      gap: 6,
                                      backgroundColor: hasSeat
                                        ? (isLight ? '#F0FDF4' : 'rgba(16, 185, 129, 0.08)')
                                        : (isLight ? '#FFFBEB' : 'rgba(245, 158, 11, 0.08)'),
                                      paddingHorizontal: 10,
                                      paddingVertical: 6,
                                      borderRadius: 8,
                                      marginBottom: (t.aadhar || t.phone) ? 8 : 0,
                                    }}
                                  >
                                    <Icons.Ticket color={hasSeat ? '#16A34A' : '#D97706'} size={13} />
                                    <Text style={{ fontSize: 12, fontWeight: '800', color: hasSeat ? '#15803D' : '#B45309' }}>
                                      {hasSeat ? `Seat: ${travelerSeat}` : 'Seat: Pending Vendor Allocation'}
                                    </Text>
                                  </View>

                                  {/* Bottom Row: Metadata (Aadhaar & Phone) wrapping cleanly without colliding */}
                                  {(t.aadhar || t.phone) && (
                                    <View
                                      style={{
                                        flexDirection: 'row',
                                        flexWrap: 'wrap',
                                        alignItems: 'center',
                                        gap: 12,
                                        paddingTop: 6,
                                        borderTopWidth: 1,
                                        borderTopColor: isLight ? '#F1F5F9' : 'rgba(255, 255, 255, 0.04)',
                                      }}
                                    >
                                      {t.aadhar ? (
                                        <Text style={{ fontSize: 11, color: isLight ? '#64748B' : '#94A3B8' }}>
                                          🪪 Aadhaar: ••••{String(t.aadhar).slice(-4)}
                                        </Text>
                                      ) : null}
                                      {t.phone ? (
                                        <Text style={{ fontSize: 11, color: isLight ? '#64748B' : '#94A3B8' }}>
                                          📱 {t.phone}
                                        </Text>
                                      ) : null}
                                    </View>
                                  )}
                                </View>
                              );
                            })}
                          </View>

                          {/* 5. Bus Amenities */}
                          <View
                            style={{
                              backgroundColor: isLight ? '#FFFFFF' : 'rgba(255, 255, 255, 0.04)',
                              borderRadius: 16,
                              borderWidth: 1,
                              borderColor: isLight ? '#E2E8F0' : colors.cardBorder,
                              padding: 16,
                              marginBottom: 14,
                            }}
                          >
                            <Text style={{ fontSize: 13, fontWeight: '900', color: colors.text, marginBottom: 10 }}>
                              Onboard Amenities & Facilities
                            </Text>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                              {['AC Sleeper', 'Live GPS Tracking', 'Mobile Charging Point', 'Blanket & Pillow', 'Emergency Exit', 'Water Bottle'].map((amenity, aIdx) => (
                                <View
                                  key={aIdx}
                                  style={{
                                    backgroundColor: isLight ? '#F8FAFC' : 'rgba(255, 255, 255, 0.05)',
                                    borderRadius: 8,
                                    paddingHorizontal: 10,
                                    paddingVertical: 5,
                                    borderWidth: 1,
                                    borderColor: isLight ? '#E2E8F0' : 'rgba(255, 255, 255, 0.08)',
                                  }}
                                >
                                  <Text style={{ fontSize: 11, fontWeight: '700', color: colors.text }}>
                                    ✓ {amenity}
                                  </Text>
                                </View>
                              ))}
                            </View>
                          </View>

                          {/* 6. Fare Breakdown */}
                          <View
                            style={{
                              backgroundColor: isLight ? '#FFFFFF' : 'rgba(255, 255, 255, 0.04)',
                              borderRadius: 16,
                              borderWidth: 1,
                              borderColor: isLight ? '#E2E8F0' : colors.cardBorder,
                              padding: 16,
                              marginBottom: 14,
                            }}
                          >
                            <Text style={{ fontSize: 13, fontWeight: '900', color: colors.text, marginBottom: 12 }}>
                              Fare Breakdown
                            </Text>
                            <View style={{ gap: 8 }}>
                              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                <Text style={{ fontSize: 12.5, color: isLight ? '#475569' : '#CBD5E1' }}>Bus Ticket Fare ({busInfo.passengerCount} Seat{busInfo.passengerCount > 1 ? 's' : ''})</Text>
                                <Text style={{ fontSize: 12.5, fontWeight: '700', color: colors.text }}>₹{(selectedOrderForDetails.amount ?? 950).toLocaleString('en-IN')}</Text>
                              </View>
                              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                <Text style={{ fontSize: 12.5, color: isLight ? '#475569' : '#CBD5E1' }}>GST & State Bus Tax</Text>
                                <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#10B981' }}>INCLUDED</Text>
                              </View>
                              <View style={{ height: 1, backgroundColor: isLight ? '#F1F5F9' : 'rgba(255, 255, 255, 0.08)', marginVertical: 4 }} />
                              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Text style={{ fontSize: 14, fontWeight: '900', color: colors.text }}>Total Paid</Text>
                                <Text style={{ fontSize: 16, fontWeight: '900', color: isLight ? '#0F172A' : '#F5B800' }}>
                                  ₹{(selectedOrderForDetails.amount ?? 950).toLocaleString('en-IN')}
                                </Text>
                              </View>
                            </View>
                          </View>

                          {/* 7. E-Ticket Notice Banner */}
                          <View
                            style={{
                              backgroundColor: isLight ? '#FFFBEB' : 'rgba(245, 158, 11, 0.08)',
                              borderRadius: 12,
                              borderWidth: 1,
                              borderColor: isLight ? '#FDE68A' : 'rgba(245, 158, 11, 0.25)',
                              padding: 12,
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 10,
                              marginBottom: 16,
                            }}
                          >
                            <Icons.FileText color="#F59E0B" size={18} />
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontSize: 12, fontWeight: '800', color: isLight ? '#92400E' : '#FBBF24' }}>
                                Valid M-Ticket on Bus
                              </Text>
                              <Text style={{ fontSize: 11, color: isLight ? '#A16207' : '#FCD34D', marginTop: 1 }}>
                                Show this digital ticket or SMS at the bus boarding point along with Govt ID.
                              </Text>
                            </View>
                          </View>

                          {/* 8. Action Buttons: Download PDF, Share Ticket, Cancel */}
                          <View style={styles.modalActionContainer}>
                            <View style={styles.modalActionButtonsRow}>
                              <TouchableOpacity
                                style={styles.invoiceDownloadBtn}
                                onPress={() => handleOpenOnlineInvoice(selectedOrderForDetails)}
                                activeOpacity={0.85}
                              >
                                <Icons.Download color="#0F172A" size={15} />
                                <Text style={styles.invoiceDownloadBtnText}>Download E-Ticket</Text>
                              </TouchableOpacity>

                              <TouchableOpacity
                                style={[
                                  styles.invoiceShareBtn,
                                  {
                                    backgroundColor: isLight ? '#F1F5F9' : 'rgba(255, 255, 255, 0.08)',
                                    borderColor: isLight ? '#E2E8F0' : 'rgba(255, 255, 255, 0.12)',
                                    borderWidth: 1,
                                  },
                                ]}
                                onPress={() => shareInvoicePDF(selectedOrderForDetails)}
                                activeOpacity={0.85}
                              >
                                <Icons.Share2 color={colors.text} size={15} />
                                <Text style={[styles.invoiceShareBtnText, { color: colors.text }]}>Share Ticket</Text>
                              </TouchableOpacity>
                            </View>

                            {!isCancelled && (
                              <TouchableOpacity
                                style={styles.cancelOrderBtn}
                                onPress={() => {
                                  setSelectedOrderForCancel(selectedOrderForDetails);
                                }}
                                activeOpacity={0.85}
                              >
                                <Text style={styles.cancelOrderBtnText}>Cancel Bus Ticket</Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        </ScrollView>
                      </>
                    );
                  })()}
                </>
              ) : isServiceOrder(selectedOrderForDetails) ? (
                <>
                  {/* Dedicated Doorstep Service Booking Sheet */}
                  {(() => {
                    const sInfo = getResolvedServiceInfo(selectedOrderForDetails);
                    const statusMeta = getStatusMeta(selectedOrderForDetails.status);
                    const isCancelled = isCancelledStatus(selectedOrderForDetails.status);
                    const isCompleted = isCompletedStatus(selectedOrderForDetails.status);
                    const rawStatus = (selectedOrderForDetails.status || '').toLowerCase();
                    const isAssignedOrBeyond =
                      isCompleted ||
                      rawStatus.includes('assign') ||
                      rawStatus.includes('progress') ||
                      rawStatus.includes('accept') ||
                      rawStatus.includes('ready');
                    const isEnRouteOrBeyond =
                      isCompleted || rawStatus.includes('progress') || rawStatus.includes('transit');

                    return (
                      <>
                        {/* 1. Modal Header */}
                        <View
                          style={[
                            styles.modalHeader,
                            { borderBottomColor: isLight ? '#F1EAD8' : 'rgba(255, 255, 255, 0.08)' },
                          ]}
                        >
                          <View style={{ flex: 1, marginRight: 8 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <Text style={[styles.modalTitle, { color: colors.text }]}>Service Booking Details</Text>
                              <View
                                style={[
                                  styles.categoryPill,
                                  {
                                    backgroundColor: 'rgba(139, 92, 246, 0.15)',
                                    borderColor: 'rgba(139, 92, 246, 0.3)',
                                  },
                                ]}
                              >
                                <Icons.Wrench color="#8B5CF6" size={11} />
                                <Text style={[styles.categoryPillText, { color: '#8B5CF6' }]}>
                                  SERVICE BOOKING
                                </Text>
                              </View>
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                              <Text
                                style={[
                                  styles.orderNumberText,
                                  { color: isLight ? '#64748B' : 'rgba(255, 255, 255, 0.6)' },
                                ]}
                              >
                                #{selectedOrderForDetails.order_number || selectedOrderForDetails.id}
                              </Text>
                              <TouchableOpacity
                                onPress={() => {
                                  Alert.alert(
                                    'Copied',
                                    `Booking #${selectedOrderForDetails.order_number || selectedOrderForDetails.id} copied!`
                                  );
                                }}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                              >
                                <Icons.Copy color={isLight ? '#8B5CF6' : '#A78BFA'} size={13} />
                              </TouchableOpacity>
                            </View>
                          </View>
                          <TouchableOpacity
                            onPress={() => setSelectedOrderForDetails(null)}
                            style={styles.modalCloseBtn}
                          >
                            <Icons.X color={colors.text} size={18} />
                          </TouchableOpacity>
                        </View>

                        <ScrollView
                          showsVerticalScrollIndicator={false}
                          contentContainerStyle={{ padding: 16, paddingBottom: Math.max(insets.bottom, 24) + 16 }}
                        >
                          {/* 2. Top Service & Provider Hero Card */}
                          <View
                            style={{
                              backgroundColor: isLight ? '#FFFFFF' : 'rgba(255, 255, 255, 0.04)',
                              borderRadius: 16,
                              borderWidth: 1,
                              borderColor: isLight ? '#E9D5FF' : 'rgba(139, 92, 246, 0.25)',
                              padding: 14,
                              marginBottom: 12,
                            }}
                          >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                              {sInfo.image ? (
                                <Image
                                  source={{ uri: resolveImageUrl(sInfo.image) }}
                                  style={{
                                    width: 56,
                                    height: 56,
                                    borderRadius: 12,
                                    backgroundColor: isLight ? '#F5F3FF' : '#1E1B4B',
                                  }}
                                  resizeMode="cover"
                                />
                              ) : (
                                <View
                                  style={{
                                    width: 56,
                                    height: 56,
                                    borderRadius: 12,
                                    backgroundColor: isLight ? '#F5F3FF' : 'rgba(139, 92, 246, 0.18)',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderWidth: 1,
                                    borderColor: isLight ? '#DDD6FE' : 'rgba(139, 92, 246, 0.3)',
                                  }}
                                >
                                  <Icons.Wrench color="#8B5CF6" size={26} />
                                </View>
                              )}
                              <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 16, fontWeight: '900', color: colors.text }}>
                                  {sInfo.serviceName}
                                </Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
                                  <View
                                    style={{
                                      backgroundColor: isLight ? '#F5F3FF' : 'rgba(139, 92, 246, 0.15)',
                                      paddingHorizontal: 8,
                                      paddingVertical: 2,
                                      borderRadius: 6,
                                    }}
                                  >
                                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#8B5CF6' }}>
                                      {sInfo.packageLabel}
                                    </Text>
                                  </View>
                                </View>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5 }}>
                                  <Icons.ShieldCheck color="#10B981" size={13} />
                                  <Text style={{ fontSize: 11.5, fontWeight: '700', color: isLight ? '#475569' : '#94A3B8' }}>
                                    Connect Certified Pro • Verified Partner
                                  </Text>
                                </View>
                              </View>
                            </View>
                          </View>

                          {/* 3. Prominent Scheduled Appointment Slot Banner */}
                          <View
                            style={{
                              backgroundColor: isLight ? '#FFFBEB' : 'rgba(245, 158, 11, 0.08)',
                              borderRadius: 16,
                              borderWidth: 1.5,
                              borderColor: isLight ? '#FDE68A' : 'rgba(245, 158, 11, 0.3)',
                              padding: 14,
                              marginBottom: 12,
                            }}
                          >
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Icons.Calendar color="#D97706" size={16} />
                                <Text style={{ fontSize: 11.5, fontWeight: '900', color: '#D97706', letterSpacing: 0.5, textTransform: 'uppercase' }}>
                                  Confirmed Service Slot
                                </Text>
                              </View>
                              <View
                                style={{
                                  backgroundColor: isLight ? '#FEF3C7' : 'rgba(245, 158, 11, 0.2)',
                                  paddingHorizontal: 8,
                                  paddingVertical: 3,
                                  borderRadius: 6,
                                }}
                              >
                                <Text style={{ fontSize: 10, fontWeight: '900', color: '#B45309' }}>
                                  DOORSTEP VISIT
                                </Text>
                              </View>
                            </View>

                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                              <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 15, fontWeight: '900', color: colors.text }}>
                                  {sInfo.dateStr}
                                </Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 }}>
                                  <Icons.Clock color={isLight ? '#64748B' : '#94A3B8'} size={13} />
                                  <Text style={{ fontSize: 13, fontWeight: '700', color: isLight ? '#475569' : '#CBD5E1' }}>
                                    {sInfo.timeStr} (Preferred Slot)
                                  </Text>
                                </View>
                              </View>
                              <View style={{ alignItems: 'flex-end' }}>
                                <View
                                  style={{
                                    backgroundColor: '#10B981',
                                    paddingHorizontal: 8,
                                    paddingVertical: 4,
                                    borderRadius: 6,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: 4,
                                  }}
                                >
                                  <Icons.Check color="#FFF" size={12} strokeWidth={3} />
                                  <Text style={{ fontSize: 11, fontWeight: '900', color: '#FFF' }}>SLOT BOOKED</Text>
                                </View>
                              </View>
                            </View>

                            <Text style={{ fontSize: 11, color: isLight ? '#78350F' : '#FDE68A', marginTop: 10, opacity: 0.9 }}>
                              💡 Expert will arrive at your doorstep in this time window. Free cancellation up to 2 hrs prior.
                            </Text>
                          </View>

                          {/* 4. Start-Service Security PIN / OTP Card */}
                          <View
                            style={{
                              backgroundColor: isLight ? '#F0FDF4' : 'rgba(16, 185, 129, 0.08)',
                              borderRadius: 16,
                              borderWidth: 1.5,
                              borderColor: isLight ? '#BBF7D0' : 'rgba(16, 185, 129, 0.25)',
                              padding: 14,
                              marginBottom: 12,
                            }}
                          >
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <View
                                  style={{
                                    width: 34,
                                    height: 34,
                                    borderRadius: 17,
                                    backgroundColor: isLight ? '#DCFCE7' : 'rgba(16, 185, 129, 0.2)',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                  }}
                                >
                                  <Icons.ShieldCheck color="#10B981" size={20} />
                                </View>
                                <View>
                                  <Text style={{ fontSize: 11, fontWeight: '900', color: '#059669', letterSpacing: 0.5, textTransform: 'uppercase' }}>
                                    Start-Service Security PIN
                                  </Text>
                                  <Text style={{ fontSize: 11, color: isLight ? '#475569' : '#94A3B8', marginTop: 1 }}>
                                    Share with expert upon arrival
                                  </Text>
                                </View>
                              </View>

                              {/* OTP Box */}
                              <TouchableOpacity
                                style={{
                                  backgroundColor: isLight ? '#FFFFFF' : '#064E3B',
                                  paddingHorizontal: 12,
                                  paddingVertical: 6,
                                  borderRadius: 10,
                                  borderWidth: 1.5,
                                  borderColor: '#10B981',
                                  flexDirection: 'row',
                                  alignItems: 'center',
                                  gap: 6,
                                }}
                                onPress={() => Alert.alert('OTP Copied', `Start-Service OTP: ${sInfo.otpCode}`)}
                                activeOpacity={0.8}
                              >
                                <Text style={{ fontSize: 18, fontWeight: '900', color: '#10B981', letterSpacing: 3 }}>
                                  {sInfo.otpCode}
                                </Text>
                                <Icons.Copy color="#10B981" size={13} />
                              </TouchableOpacity>
                            </View>
                          </View>

                          {/* 5. Service Progress Status Stepper Card */}
                          <View
                            style={{
                              backgroundColor: isLight ? '#FFFFFF' : 'rgba(255, 255, 255, 0.04)',
                              borderRadius: 16,
                              borderWidth: 1,
                              borderColor: isLight ? '#E2E8F0' : colors.cardBorder,
                              padding: 14,
                              marginBottom: 12,
                            }}
                          >
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <View
                                  style={{
                                    width: 10,
                                    height: 10,
                                    borderRadius: 5,
                                    backgroundColor: isCompleted
                                      ? '#10B981'
                                      : isCancelled
                                      ? '#EF4444'
                                      : '#8B5CF6',
                                  }}
                                />
                                <Text style={{ fontSize: 14.5, fontWeight: '900', color: colors.text }}>
                                  {statusMeta.label}
                                </Text>
                              </View>
                              <View
                                style={[
                                  styles.statusPill,
                                  { backgroundColor: statusMeta.bg, borderColor: statusMeta.border, paddingHorizontal: 8, paddingVertical: 3 },
                                ]}
                              >
                                <Text style={[styles.statusPillText, { color: statusMeta.color, fontSize: 10, fontWeight: '900' }]}>
                                  {statusMeta.label}
                                </Text>
                              </View>
                            </View>

                            <Text style={{ fontSize: 12, color: isLight ? '#475569' : '#CBD5E1', marginBottom: 14 }}>
                              {(selectedOrderForDetails as any).joyful_message ||
                                (isCompleted
                                  ? 'Service completed successfully! Thank you for choosing Connect.'
                                  : isCancelled
                                  ? 'This service booking has been cancelled.'
                                  : 'Service request registered. Connect verified technician assigned for your scheduled slot.')}
                            </Text>

                            {/* Service Stepper */}
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, paddingHorizontal: 6 }}>
                              {/* Step 1: Confirmed */}
                              <View style={{ alignItems: 'center' }}>
                                <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#10B981', alignItems: 'center', justifyContent: 'center' }}>
                                  <Icons.Check color="#FFFFFF" size={13} strokeWidth={3} />
                                </View>
                              </View>
                              <View
                                style={{
                                  flex: 1,
                                  height: 3,
                                  backgroundColor: isAssignedOrBeyond ? '#10B981' : isLight ? '#E2E8F0' : '#334155',
                                  marginHorizontal: 4,
                                }}
                              />
                              {/* Step 2: Expert Assigned */}
                              <View style={{ alignItems: 'center' }}>
                                <View
                                  style={{
                                    width: 20,
                                    height: 20,
                                    borderRadius: 10,
                                    backgroundColor: isAssignedOrBeyond ? '#10B981' : isLight ? '#F1F5F9' : '#1E293B',
                                    borderWidth: isAssignedOrBeyond ? 0 : 2,
                                    borderColor: isAssignedOrBeyond ? 'transparent' : isLight ? '#CBD5E1' : '#475569',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                  }}
                                >
                                  {isAssignedOrBeyond && <Icons.Check color="#FFFFFF" size={11} strokeWidth={3} />}
                                </View>
                              </View>
                              <View
                                style={{
                                  flex: 1,
                                  height: 3,
                                  backgroundColor: isEnRouteOrBeyond ? '#10B981' : isLight ? '#E2E8F0' : '#334155',
                                  marginHorizontal: 4,
                                }}
                              />
                              {/* Step 3: En Route */}
                              <View style={{ alignItems: 'center' }}>
                                <View
                                  style={{
                                    width: 20,
                                    height: 20,
                                    borderRadius: 10,
                                    backgroundColor: isEnRouteOrBeyond ? '#10B981' : isLight ? '#F1F5F9' : '#1E293B',
                                    borderWidth: isEnRouteOrBeyond ? 0 : 2,
                                    borderColor: isEnRouteOrBeyond ? 'transparent' : isLight ? '#CBD5E1' : '#475569',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                  }}
                                >
                                  {isEnRouteOrBeyond && <Icons.Check color="#FFFFFF" size={11} strokeWidth={3} />}
                                </View>
                              </View>
                              <View
                                style={{
                                  flex: 1,
                                  height: 3,
                                  backgroundColor: isCompleted ? '#10B981' : isLight ? '#E2E8F0' : '#334155',
                                  marginHorizontal: 4,
                                }}
                              />
                              {/* Step 4: Completed */}
                              <View style={{ alignItems: 'center' }}>
                                <View
                                  style={{
                                    width: 20,
                                    height: 20,
                                    borderRadius: 10,
                                    backgroundColor: isCompleted ? '#10B981' : isLight ? '#F1F5F9' : '#1E293B',
                                    borderWidth: isCompleted ? 0 : 2,
                                    borderColor: isCompleted ? 'transparent' : isLight ? '#CBD5E1' : '#475569',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                  }}
                                >
                                  {isCompleted && <Icons.Check color="#FFFFFF" size={11} strokeWidth={3} />}
                                </View>
                              </View>
                            </View>

                            {/* Stepper Labels */}
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 0 }}>
                              <View style={{ width: 68, alignItems: 'center' }}>
                                <Text style={{ fontSize: 10.5, fontWeight: '800', color: colors.text, textAlign: 'center' }}>
                                  Booking Confirmed
                                </Text>
                                <Text style={{ fontSize: 9.5, color: isLight ? '#64748B' : '#94A3B8', marginTop: 1 }}>
                                  {sInfo.dateStr.split(',')[0]}
                                </Text>
                              </View>
                              <View style={{ width: 68, alignItems: 'center' }}>
                                <Text style={{ fontSize: 10.5, fontWeight: isAssignedOrBeyond ? '800' : '600', color: isAssignedOrBeyond ? colors.text : isLight ? '#94A3B8' : '#64748B', textAlign: 'center' }}>
                                  Expert Assigned
                                </Text>
                                <Text style={{ fontSize: 9.5, color: isAssignedOrBeyond ? '#10B981' : isLight ? '#94A3B8' : '#64748B', marginTop: 1 }}>
                                  {isAssignedOrBeyond ? 'Assigned' : 'Pending'}
                                </Text>
                              </View>
                              <View style={{ width: 68, alignItems: 'center' }}>
                                <Text style={{ fontSize: 10.5, fontWeight: isEnRouteOrBeyond ? '800' : '600', color: isEnRouteOrBeyond ? colors.text : isLight ? '#94A3B8' : '#64748B', textAlign: 'center' }}>
                                  En Route
                                </Text>
                                <Text style={{ fontSize: 9.5, color: isEnRouteOrBeyond ? '#10B981' : isLight ? '#94A3B8' : '#64748B', marginTop: 1 }}>
                                  {isEnRouteOrBeyond ? 'On Way' : 'Scheduled'}
                                </Text>
                              </View>
                              <View style={{ width: 68, alignItems: 'center' }}>
                                <Text style={{ fontSize: 10.5, fontWeight: isCompleted ? '800' : '600', color: isCompleted ? colors.text : isLight ? '#94A3B8' : '#64748B', textAlign: 'center' }}>
                                  Service Done
                                </Text>
                                <Text style={{ fontSize: 9.5, color: isCompleted ? '#10B981' : isLight ? '#94A3B8' : '#64748B', marginTop: 1 }}>
                                  {sInfo.timeStr}
                                </Text>
                              </View>
                            </View>

                            <TouchableOpacity
                              style={{ marginTop: 14, alignSelf: 'center', paddingVertical: 4, paddingHorizontal: 10 }}
                              onPress={() => setIsTrackingTimelineModalOpen(true)}
                              activeOpacity={0.7}
                            >
                              <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#8B5CF6' }}>
                                See all status updates →
                              </Text>
                            </TouchableOpacity>
                          </View>

                          {/* 6. Assigned Service Expert Card */}
                          <View
                            style={{
                              backgroundColor: isLight ? '#FFFFFF' : 'rgba(255, 255, 255, 0.04)',
                              borderRadius: 16,
                              borderWidth: 1,
                              borderColor: isLight ? '#E2E8F0' : colors.cardBorder,
                              padding: 14,
                              marginBottom: 12,
                            }}
                          >
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                              <Text style={{ fontSize: 12, fontWeight: '900', color: isLight ? '#64748B' : '#94A3B8', letterSpacing: 0.5, textTransform: 'uppercase' }}>
                                Assigned Service Expert
                              </Text>
                              <View
                                style={{
                                  backgroundColor: isLight ? '#F0FDF4' : 'rgba(16, 185, 129, 0.15)',
                                  paddingHorizontal: 7,
                                  paddingVertical: 2,
                                  borderRadius: 5,
                                }}
                              >
                                <Text style={{ fontSize: 9.5, fontWeight: '800', color: '#10B981' }}>
                                  ✓ ID VERIFIED
                                </Text>
                              </View>
                            </View>

                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                              <View
                                style={{
                                  width: 44,
                                  height: 44,
                                  borderRadius: 22,
                                  backgroundColor: isLight ? '#EDE9FE' : 'rgba(139, 92, 246, 0.25)',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                <Icons.User color="#8B5CF6" size={22} />
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 14.5, fontWeight: '900', color: colors.text }}>
                                  {sInfo.expertName}
                                </Text>
                                <Text style={{ fontSize: 11.5, color: isLight ? '#64748B' : '#94A3B8', marginTop: 1 }}>
                                  Home Service Specialist • ⭐ {sInfo.expertRating} (120+ jobs)
                                </Text>
                              </View>
                            </View>

                            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                              <TouchableOpacity
                                style={{
                                  flex: 1,
                                  backgroundColor: isLight ? '#F8FAFC' : 'rgba(255, 255, 255, 0.06)',
                                  borderWidth: 1,
                                  borderColor: isLight ? '#CBD5E1' : 'rgba(255, 255, 255, 0.12)',
                                  borderRadius: 10,
                                  paddingVertical: 9,
                                  flexDirection: 'row',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: 6,
                                }}
                                onPress={() => {
                                  Linking.openURL(`tel:${sInfo.expertPhone}`).catch(() => {
                                    Alert.alert('Expert Contact', `${sInfo.expertName}: ${sInfo.expertPhone}`);
                                  });
                                }}
                                activeOpacity={0.8}
                              >
                                <Icons.Phone color={colors.text} size={14} />
                                <Text style={{ fontSize: 12.5, fontWeight: '800', color: colors.text }}>
                                  Call Expert
                                </Text>
                              </TouchableOpacity>

                              <TouchableOpacity
                                style={{
                                  flex: 1,
                                  backgroundColor: isLight ? '#F8FAFC' : 'rgba(255, 255, 255, 0.06)',
                                  borderWidth: 1,
                                  borderColor: isLight ? '#CBD5E1' : 'rgba(255, 255, 255, 0.12)',
                                  borderRadius: 10,
                                  paddingVertical: 9,
                                  flexDirection: 'row',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: 6,
                                }}
                                onPress={() => {
                                  Alert.alert(
                                    'Connect Support',
                                    'Need help with this booking? Our 24x7 Support team is here to assist you.',
                                    [
                                      { text: 'Cancel', style: 'cancel' },
                                      {
                                        text: 'Call Support',
                                        onPress: () => Linking.openURL('tel:1800123456').catch(() => {}),
                                      },
                                    ]
                                  );
                                }}
                                activeOpacity={0.8}
                              >
                                <Icons.MessageSquare color={colors.text} size={14} />
                                <Text style={{ fontSize: 12.5, fontWeight: '800', color: colors.text }}>
                                  Need Help
                                </Text>
                              </TouchableOpacity>
                            </View>
                          </View>

                          {/* 7. Doorstep Service Location Card */}
                          <View
                            style={{
                              backgroundColor: isLight ? '#FFFFFF' : 'rgba(255, 255, 255, 0.04)',
                              borderRadius: 16,
                              borderWidth: 1,
                              borderColor: isLight ? '#E2E8F0' : colors.cardBorder,
                              padding: 14,
                              marginBottom: 12,
                            }}
                          >
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Icons.MapPin color="#8B5CF6" size={15} />
                                <Text style={{ fontSize: 12, fontWeight: '900', color: isLight ? '#64748B' : '#94A3B8', letterSpacing: 0.5, textTransform: 'uppercase' }}>
                                  Service Location (Doorstep)
                                </Text>
                              </View>
                              <TouchableOpacity
                                onPress={handleOpenAddressModal}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                              >
                                <Text style={{ fontSize: 11.5, fontWeight: '800', color: '#8B5CF6' }}>Edit</Text>
                              </TouchableOpacity>
                            </View>

                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                              <Text style={{ fontSize: 14, fontWeight: '900', color: colors.text }}>
                                {sInfo.customerName}
                              </Text>
                              <View style={{ backgroundColor: isLight ? '#F1F5F9' : 'rgba(255,255,255,0.08)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                                <Text style={{ fontSize: 10, fontWeight: '800', color: isLight ? '#475569' : '#CBD5E1' }}>HOME</Text>
                              </View>
                            </View>

                            <Text style={{ fontSize: 12.5, color: isLight ? '#475569' : '#CBD5E1', lineHeight: 18 }}>
                              {sInfo.serviceAddress}
                            </Text>

                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
                              <Icons.Phone color={isLight ? '#64748B' : '#94A3B8'} size={12} />
                              <Text style={{ fontSize: 12, fontWeight: '700', color: isLight ? '#64748B' : '#94A3B8' }}>
                                {sInfo.customerPhone}
                              </Text>
                            </View>
                          </View>

                          {/* 8. Service Price Details Card */}
                          <View
                            style={{
                              backgroundColor: isLight ? '#FFFFFF' : 'rgba(255, 255, 255, 0.04)',
                              borderRadius: 16,
                              borderWidth: 1,
                              borderColor: isLight ? '#E2E8F0' : colors.cardBorder,
                              padding: 14,
                              marginBottom: 12,
                            }}
                          >
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                              <Text style={{ fontSize: 13, fontWeight: '900', color: colors.text }}>
                                Service Price Breakdown
                              </Text>
                              <View
                                style={{
                                  backgroundColor: isLight ? '#F0FDF4' : 'rgba(16, 185, 129, 0.15)',
                                  paddingHorizontal: 8,
                                  paddingVertical: 2,
                                  borderRadius: 5,
                                }}
                              >
                                <Text style={{ fontSize: 10, fontWeight: '800', color: '#10B981' }}>PAID</Text>
                              </View>
                            </View>

                            <View style={{ gap: 8, marginBottom: 12 }}>
                              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                <Text style={{ fontSize: 12.5, color: isLight ? '#475569' : '#CBD5E1' }}>
                                  Inspection & Base Service Charge
                                </Text>
                                <Text style={{ fontSize: 12.5, fontWeight: '700', color: colors.text }}>
                                  ₹{sInfo.baseServicePrice.toLocaleString('en-IN')}
                                </Text>
                              </View>

                              {sInfo.addonPrice > 0 && (
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                  <Text style={{ fontSize: 12.5, color: isLight ? '#475569' : '#CBD5E1' }}>
                                    Package / Problem Add-on
                                  </Text>
                                  <Text style={{ fontSize: 12.5, fontWeight: '700', color: colors.text }}>
                                    ₹{sInfo.addonPrice.toLocaleString('en-IN')}
                                  </Text>
                                </View>
                              )}

                              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                <Text style={{ fontSize: 12.5, color: isLight ? '#475569' : '#CBD5E1' }}>
                                  Doorstep Visit & Inspection Fee
                                </Text>
                                <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#10B981' }}>
                                  FREE
                                </Text>
                              </View>

                              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                <Text style={{ fontSize: 12.5, color: isLight ? '#475569' : '#CBD5E1' }}>
                                  Taxes & Safety Surcharge
                                </Text>
                                <Text style={{ fontSize: 12.5, fontWeight: '700', color: colors.text }}>
                                  ₹10
                                </Text>
                              </View>
                            </View>

                            <View
                              style={{
                                height: 1,
                                borderStyle: 'dashed',
                                borderWidth: 1,
                                borderColor: isLight ? '#E2E8F0' : 'rgba(255, 255, 255, 0.1)',
                                marginBottom: 12,
                              }}
                            />

                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                              <Text style={{ fontSize: 14.5, fontWeight: '900', color: colors.text }}>Total Paid</Text>
                              <Text style={{ fontSize: 16, fontWeight: '900', color: isLight ? '#0F172A' : '#F5B800' }}>
                                ₹{sInfo.totalAmount.toLocaleString('en-IN')}
                              </Text>
                            </View>

                            <View
                              style={{
                                backgroundColor: isLight ? '#F8FAFC' : 'rgba(255, 255, 255, 0.02)',
                                borderRadius: 10,
                                padding: 10,
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                              }}
                            >
                              <Text style={{ fontSize: 12, fontWeight: '700', color: isLight ? '#64748B' : '#94A3B8' }}>
                                Payment Method
                              </Text>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Icons.CreditCard color={colors.text} size={14} />
                                <Text style={{ fontSize: 12, fontWeight: '800', color: colors.text }}>
                                  {sInfo.paymentMethod}
                                </Text>
                              </View>
                            </View>
                          </View>

                          {/* 9. Connect 30-Day Service Guarantee Banner */}
                          <View
                            style={{
                              backgroundColor: isLight ? '#F5F3FF' : 'rgba(139, 92, 246, 0.08)',
                              borderRadius: 14,
                              borderWidth: 1,
                              borderColor: isLight ? '#DDD6FE' : 'rgba(139, 92, 246, 0.25)',
                              padding: 12,
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 10,
                              marginBottom: 16,
                            }}
                          >
                            <Icons.ShieldCheck color="#8B5CF6" size={20} />
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontSize: 12, fontWeight: '800', color: isLight ? '#5B21B6' : '#C4B5FD' }}>
                                Connect 30-Day Service Guarantee
                              </Text>
                              <Text style={{ fontSize: 11, color: isLight ? '#6D28D9' : '#DDD6FE', marginTop: 1 }}>
                                Free rework warranty & certified genuine spare parts guarantee included.
                              </Text>
                            </View>
                          </View>

                          {/* 10. Bottom Actions: Download Service Invoice & Share */}
                          <View style={styles.modalActionContainer}>
                            <View style={styles.modalActionButtonsRow}>
                              <TouchableOpacity
                                style={styles.invoiceDownloadBtn}
                                onPress={() => handleOpenOnlineInvoice(selectedOrderForDetails)}
                                activeOpacity={0.85}
                              >
                                <Icons.Download color="#0F172A" size={15} />
                                <Text style={styles.invoiceDownloadBtnText}>Download Invoice</Text>
                              </TouchableOpacity>

                              <TouchableOpacity
                                style={[
                                  styles.invoiceShareBtn,
                                  {
                                    backgroundColor: isLight ? '#F1F5F9' : 'rgba(255, 255, 255, 0.08)',
                                    borderColor: isLight ? '#CBD5E1' : 'rgba(255, 255, 255, 0.15)',
                                    borderWidth: 1,
                                  },
                                ]}
                                onPress={() => shareInvoicePDF(selectedOrderForDetails)}
                                activeOpacity={0.85}
                              >
                                <Icons.Share2 color={colors.text} size={15} />
                                <Text style={[styles.invoiceShareBtnText, { color: colors.text }]}>Share Invoice</Text>
                              </TouchableOpacity>
                            </View>

                            {isActiveStatus(selectedOrderForDetails.status) && (
                              <TouchableOpacity
                                style={styles.cancelOrderBtn}
                                onPress={() => {
                                  const o = selectedOrderForDetails;
                                  setSelectedOrderForDetails(null);
                                  setSelectedOrderForCancel(o);
                                }}
                                activeOpacity={0.85}
                              >
                                <Text style={styles.cancelOrderBtnText}>Cancel / Reschedule Booking</Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        </ScrollView>
                      </>
                    );
                  })()}
                </>
              ) : (
                <>
                  {/* Standard E-Commerce Order Sheet Header */}
                  <View
                    style={[
                      styles.modalHeader,
                      { borderBottomColor: isLight ? '#F1EAD8' : 'rgba(255, 255, 255, 0.08)' },
                    ]}
                  >
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={[styles.modalTitle, { color: colors.text }]}>Order Details</Text>
                        <View
                          style={[
                            styles.categoryPill,
                            {
                              backgroundColor: getCategoryMeta(selectedOrderForDetails).color + '15',
                              borderColor: getCategoryMeta(selectedOrderForDetails).color + '30',
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.categoryPillText,
                              { color: getCategoryMeta(selectedOrderForDetails).color },
                            ]}
                          >
                            {getCategoryMeta(selectedOrderForDetails).label}
                          </Text>
                        </View>
                      </View>
                      <Text
                        style={[
                          styles.orderNumberText,
                          { color: isLight ? '#64748B' : 'rgba(255, 255, 255, 0.6)', marginTop: 2 },
                        ]}
                      >
                        #{selectedOrderForDetails.order_number}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => setSelectedOrderForDetails(null)}
                      style={styles.modalCloseBtn}
                    >
                      <Icons.X color={colors.text} size={18} />
                    </TouchableOpacity>
                  </View>

                  {/* Category-based Details Sheet Content */}
                  <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: Math.max(insets.bottom, 24) + 16 }}>
                    <>
                        {/* ========================================================================= */}
                        {/* 1. PRODUCTS ORDER DETAILS (Screenshot 1 & 2 Layout)                       */}
                        {/* ========================================================================= */}
                        
                        {/* TOP PRODUCT CARD ROW (Clicking navigates to Category/Product list) */}
                        <TouchableOpacity
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 12,
                            marginBottom: 10,
                            backgroundColor: isLight ? '#FFFFFF' : 'rgba(255, 255, 255, 0.04)',
                            padding: 12,
                            borderRadius: 14,
                            borderWidth: 1,
                            borderColor: isLight ? '#F1EAD8' : colors.cardBorder,
                          }}
                          onPress={() => {
                            const item = selectedOrderForDetails;
                            setSelectedOrderForDetails(null);
                            (navigation as any).navigate('CategoryDetails', {
                              categoryName: item.category || 'Products',
                              selectedItem: item.product_details || '',
                            });
                          }}
                          activeOpacity={0.8}
                        >
                          {selectedOrderForDetails.image ? (
                            <Image
                              source={{ uri: resolveImageUrl(selectedOrderForDetails.image) }}
                              style={{ width: 54, height: 54, borderRadius: 10, backgroundColor: isLight ? '#F8FAFC' : '#1E293B' }}
                              resizeMode="cover"
                            />
                          ) : (
                            <View
                              style={{
                                width: 54,
                                height: 54,
                                borderRadius: 10,
                                backgroundColor: isLight ? '#F1F5F9' : 'rgba(255,255,255,0.06)',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <Icons.Package color={isLight ? '#64748B' : '#94A3B8'} size={24} />
                            </View>
                          )}
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 13.5, fontWeight: '800', color: colors.text }} numberOfLines={1}>
                              {selectedOrderForDetails.product_details || 'Hyderabadi Chicken Dum Biryani Special'}
                            </Text>
                            <Text style={{ fontSize: 11.5, color: isLight ? '#64748B' : 'rgba(255, 255, 255, 0.6)', marginTop: 2 }}>
                              {selectedOrderForDetails.vendor_name ? `Seller: ${selectedOrderForDetails.vendor_name}` : 'Seller: Connect Official Store'}
                            </Text>
                          </View>
                          <Icons.ChevronRight color={isLight ? '#94A3B8' : 'rgba(255,255,255,0.4)'} size={16} />
                        </TouchableOpacity>

                        {/* ORDER ID ROW WITH COPY BUTTON */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14, paddingHorizontal: 4 }}>
                          <Text style={{ fontSize: 12, fontWeight: '700', color: isLight ? '#64748B' : 'rgba(255, 255, 255, 0.6)' }}>
                            Order #{selectedOrderForDetails.order_number || 'ORD-743865'}
                          </Text>
                          <TouchableOpacity
                            onPress={() => {
                              Alert.alert('Copied', `Order #${selectedOrderForDetails.order_number || 'ORD-743865'} copied to clipboard!`);
                            }}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <Icons.Copy color={isLight ? '#3B82F6' : '#60A5FA'} size={14} />
                          </TouchableOpacity>
                        </View>

                        {/* CARD 1: ORDER STATUS TRACKER CARD (Screenshot 1) */}
                        <View
                          style={{
                            backgroundColor: isLight ? '#FFFFFF' : 'rgba(255, 255, 255, 0.04)',
                            borderRadius: 16,
                            borderWidth: 1,
                            borderColor: isLight ? '#E2E8F0' : colors.cardBorder,
                            marginBottom: 14,
                            overflow: 'hidden',
                          }}
                        >
                          <TouchableOpacity
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: 14,
                            }}
                            onPress={() => setIsStatusCardExpanded(!isStatusCardExpanded)}
                            activeOpacity={0.8}
                          >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                              <View
                                style={{
                                  width: 10,
                                  height: 10,
                                  borderRadius: 5,
                                  backgroundColor: isCompletedStatus(selectedOrderForDetails.status)
                                    ? '#10B981'
                                    : isCancelledStatus(selectedOrderForDetails.status)
                                    ? '#EF4444'
                                    : '#3B82F6',
                                }}
                              />
                              <Text style={{ fontSize: 15, fontWeight: '900', color: colors.text }}>
                                {getStepperDataForOrder(selectedOrderForDetails).statusLabel}
                              </Text>
                            </View>
                            <Icons.ChevronUp
                              color={colors.text}
                              size={18}
                              style={{ transform: [{ rotate: isStatusCardExpanded ? '0deg' : '180deg' }] }}
                            />
                          </TouchableOpacity>

                          {isStatusCardExpanded && (() => {
                            const stepData = getStepperDataForOrder(selectedOrderForDetails);
                            return (
                              <View style={{ paddingHorizontal: 14, paddingBottom: 14 }}>
                                <Text style={{ fontSize: 12, color: isLight ? '#475569' : '#CBD5E1', marginBottom: 14 }}>
                                  {(selectedOrderForDetails as any).joyful_message || stepData.statusDescription}
                                </Text>

                                {/* Horizontal Progress Bar */}
                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, paddingHorizontal: 10 }}>
                                  <View style={{ alignItems: 'center' }}>
                                    <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#10B981', alignItems: 'center', justifyContent: 'center' }}>
                                      <Icons.Check color="#FFFFFF" size={13} strokeWidth={3} />
                                    </View>
                                  </View>
                                  <View
                                    style={{
                                      flex: 1,
                                      height: 3,
                                      backgroundColor: stepData.step2.done
                                        ? '#10B981'
                                        : (stepData.step2 as any).active
                                        ? '#3B82F6'
                                        : '#E2E8F0',
                                      marginHorizontal: 4,
                                    }}
                                  />
                                  <View style={{ alignItems: 'center' }}>
                                    <View
                                      style={{
                                        width: 20,
                                        height: 20,
                                        borderRadius: 10,
                                        borderWidth: 2,
                                        borderColor: stepData.step2.done
                                          ? '#10B981'
                                          : (stepData.step2 as any).active
                                          ? '#3B82F6'
                                          : '#CBD5E1',
                                        backgroundColor: stepData.step2.done
                                          ? '#10B981'
                                          : (stepData.step2 as any).active
                                          ? (isLight ? '#EFF6FF' : 'rgba(59, 130, 246, 0.2)')
                                          : isLight
                                          ? '#FFFFFF'
                                          : '#1E293B',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                      }}
                                    >
                                      {stepData.step2.done && <Icons.Check color="#FFFFFF" size={11} strokeWidth={3} />}
                                      {(stepData.step2 as any).active && !stepData.step2.done && (
                                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#3B82F6' }} />
                                      )}
                                    </View>
                                  </View>
                                  <View
                                    style={{
                                      flex: 1,
                                      height: 3,
                                      backgroundColor: stepData.step3.done
                                        ? '#10B981'
                                        : (stepData.step3 as any).active
                                        ? '#3B82F6'
                                        : '#E2E8F0',
                                      marginHorizontal: 4,
                                    }}
                                  />
                                  <View style={{ alignItems: 'center' }}>
                                    <View
                                      style={{
                                        width: 20,
                                        height: 20,
                                        borderRadius: 10,
                                        borderWidth: 2,
                                        borderColor: stepData.step3.done
                                          ? '#10B981'
                                          : (stepData.step3 as any).active
                                          ? '#3B82F6'
                                          : '#CBD5E1',
                                        backgroundColor: stepData.step3.done
                                          ? '#10B981'
                                          : (stepData.step3 as any).active
                                          ? (isLight ? '#EFF6FF' : 'rgba(59, 130, 246, 0.2)')
                                          : isLight
                                          ? '#FFFFFF'
                                          : '#1E293B',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                      }}
                                    >
                                      {stepData.step3.done && <Icons.Check color="#FFFFFF" size={11} strokeWidth={3} />}
                                      {(stepData.step3 as any).active && !stepData.step3.done && (
                                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#3B82F6' }} />
                                      )}
                                    </View>
                                  </View>
                                </View>

                                {/* Labels under Horizontal Bar */}
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 }}>
                                  <View style={{ width: 85 }}>
                                    <Text style={{ fontSize: 10.5, fontWeight: '800', color: colors.text }}>{stepData.step1.label}</Text>
                                    <Text style={{ fontSize: 10, color: '#64748B' }}>{stepData.step1.date}</Text>
                                  </View>
                                  <View style={{ width: 95, alignItems: 'center' }}>
                                    <Text
                                      style={{
                                        fontSize: 10.5,
                                        fontWeight: stepData.step2.done || (stepData.step2 as any).active ? '800' : '700',
                                        color: (stepData.step2 as any).active && !stepData.step2.done ? '#2563EB' : colors.text,
                                      }}
                                    >
                                      {stepData.step2.label}
                                    </Text>
                                    <Text
                                      style={{
                                        fontSize: 10,
                                        color: (stepData.step2 as any).active && !stepData.step2.done ? '#2563EB' : '#64748B',
                                        textAlign: 'center',
                                        fontWeight: (stepData.step2 as any).active && !stepData.step2.done ? '700' : '400',
                                      }}
                                    >
                                      {stepData.step2.date}
                                    </Text>
                                  </View>
                                  <View style={{ width: 100, alignItems: 'flex-end' }}>
                                    <Text
                                      style={{
                                        fontSize: 10.5,
                                        fontWeight: stepData.step3.done || (stepData.step3 as any).active ? '800' : '700',
                                        color: (stepData.step3 as any).active && !stepData.step3.done ? '#2563EB' : colors.text,
                                        textAlign: 'right',
                                      }}
                                    >
                                      {stepData.step3.label}
                                    </Text>
                                    <Text
                                      style={{
                                        fontSize: 10,
                                        color: (stepData.step3 as any).active && !stepData.step3.done ? '#2563EB' : '#64748B',
                                        textAlign: 'right',
                                        fontWeight: (stepData.step3 as any).active && !stepData.step3.done ? '700' : '400',
                                      }}
                                    >
                                      {stepData.step3.date}
                                    </Text>
                                  </View>
                                </View>

                                {/* Info Alert Box */}
                                <View
                                  style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: 8,
                                    padding: 10,
                                    backgroundColor: isLight ? '#F8FAFC' : 'rgba(255, 255, 255, 0.03)',
                                    borderRadius: 10,
                                    borderWidth: 1,
                                    borderColor: isLight ? '#F1F5F9' : 'rgba(255, 255, 255, 0.06)',
                                    marginBottom: 10,
                                  }}
                                >
                                  <Icons.Info color="#64748B" size={15} />
                                  <Text style={{ fontSize: 11, color: isLight ? '#475569' : '#CBD5E1', flex: 1 }}>
                                    {stepData.infoBox}
                                  </Text>
                                </View>

                                {/* SEE ALL UPDATES BUTTON -> OPENS TRACKING TIMELINE MODAL */}
                                <TouchableOpacity
                                  style={{
                                    alignItems: 'center',
                                    paddingVertical: 10,
                                    borderTopWidth: 1,
                                    borderTopColor: isLight ? '#F1F5F9' : 'rgba(255, 255, 255, 0.06)',
                                    marginTop: 4,
                                  }}
                                  onPress={() => setIsTrackingTimelineModalOpen(true)}
                                  activeOpacity={0.7}
                                >
                                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#2563EB' }}>
                                    See all updates
                                  </Text>
                                </TouchableOpacity>
                              </View>
                            );
                          })()}
                        </View>

                        {/* CARD 2: DELIVERY DETAILS CARD (UNSELECTED / COLLAPSED BY DEFAULT) */}
                        <View
                          style={{
                            backgroundColor: isLight ? '#FFFFFF' : 'rgba(255, 255, 255, 0.04)',
                            borderRadius: 16,
                            borderWidth: 1,
                            borderColor: isLight ? '#E2E8F0' : colors.cardBorder,
                            marginBottom: 14,
                            overflow: 'hidden',
                          }}
                        >
                          <TouchableOpacity
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: 14,
                            }}
                            onPress={() => setIsDeliveryCardExpanded(!isDeliveryCardExpanded)}
                            activeOpacity={0.8}
                          >
                            <Text style={{ fontSize: 15, fontWeight: '900', color: colors.text }}>
                              Delivery details
                            </Text>
                            <View
                              style={{
                                width: 28,
                                height: 28,
                                borderRadius: 8,
                                backgroundColor: isLight ? '#F1F5F9' : 'rgba(255, 255, 255, 0.06)',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <Icons.ChevronUp
                                color={colors.text}
                                size={16}
                                style={{ transform: [{ rotate: isDeliveryCardExpanded ? '0deg' : '180deg' }] }}
                              />
                            </View>
                          </TouchableOpacity>

                          {isDeliveryCardExpanded && (
                            <View style={{ paddingHorizontal: 14, paddingBottom: 14 }}>
                              <View
                                style={{
                                  backgroundColor: isLight ? '#F8FAFC' : 'rgba(255, 255, 255, 0.02)',
                                  borderRadius: 14,
                                  padding: 12,
                                  borderWidth: 1,
                                  borderColor: isLight ? '#F1F5F9' : 'rgba(255, 255, 255, 0.05)',
                                  gap: 12,
                                }}
                              >
                                {/* Address */}
                                <TouchableOpacity
                                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
                                  activeOpacity={isOrderDelivered(selectedOrderForDetails) ? 1 : 0.7}
                                  disabled={isOrderDelivered(selectedOrderForDetails)}
                                  onPress={handleOpenAddressModal}
                                >
                                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, marginRight: 8 }}>
                                    <Icons.Building color={colors.text} size={18} />
                                    <View style={{ flex: 1 }}>
                                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                        <Text style={{ fontSize: 13, fontWeight: '800', color: colors.text }}>
                                          {(selectedOrderForDetails as any).address_label || 'Work'}
                                        </Text>
                                        {!isOrderPackedOrBeyond(selectedOrderForDetails) && !isOrderDelivered(selectedOrderForDetails) && (
                                          <View style={{ backgroundColor: isLight ? '#E0F2FE' : 'rgba(56, 189, 248, 0.15)', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 }}>
                                            <Text style={{ fontSize: 9.5, fontWeight: '700', color: '#0284C7' }}>Changeable</Text>
                                          </View>
                                        )}
                                      </View>
                                      <Text style={{ fontSize: 11.5, color: isLight ? '#64748B' : '#94A3B8', marginTop: 1 }} numberOfLines={2}>
                                        {(selectedOrderForDetails as any).delivery_address ||
                                          (selectedOrderForDetails as any).customerAddress ||
                                          (selectedOrderForDetails as any).address ||
                                          (currentUser as any)?.address ||
                                          '1st floor 962 above SBI bank, Excel coworking space, Bangalore'}
                                      </Text>
                                    </View>
                                  </View>
                                  {!isOrderDelivered(selectedOrderForDetails) && (
                                    <Icons.ChevronRight color={isLight ? '#94A3B8' : 'rgba(255,255,255,0.4)'} size={16} />
                                  )}
                                </TouchableOpacity>

                                <View style={{ height: 1, backgroundColor: isLight ? '#E2E8F0' : 'rgba(255, 255, 255, 0.06)' }} />

                                {/* Contact Person */}
                                <TouchableOpacity
                                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
                                  activeOpacity={isOrderDelivered(selectedOrderForDetails) ? 1 : 0.7}
                                  disabled={isOrderDelivered(selectedOrderForDetails)}
                                  onPress={handleOpenPhoneModal}
                                >
                                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                                    <Icons.User color={colors.text} size={18} />
                                    <Text style={{ fontSize: 13, fontWeight: '800', color: colors.text }}>
                                      {selectedOrderForDetails.customer_name ||
                                        (selectedOrderForDetails as any).memberName ||
                                        currentUser?.name ||
                                        (currentUser as any)?.customer_name ||
                                        'Moorthy K'}{' '}
                                      <Text style={{ fontSize: 12, fontWeight: '600', color: isLight ? '#64748B' : '#94A3B8' }}>
                                        {(selectedOrderForDetails as any).phone ||
                                          (selectedOrderForDetails as any).customerPhone ||
                                          (selectedOrderForDetails as any).contact_phone ||
                                          (currentUser as any)?.phone ||
                                          '6379789641'}
                                      </Text>
                                    </Text>
                                  </View>
                                  {!isOrderDelivered(selectedOrderForDetails) && (
                                    <Icons.ChevronRight color={isLight ? '#94A3B8' : 'rgba(255,255,255,0.4)'} size={16} />
                                  )}
                                </TouchableOpacity>
                              </View>
                            </View>
                          )}
                        </View>

                        {/* CARD 3: PRICE DETAILS CARD (UNSELECTED / COLLAPSED BY DEFAULT) */}
                        <View
                          style={{
                            backgroundColor: isLight ? '#FFFFFF' : 'rgba(255, 255, 255, 0.04)',
                            borderRadius: 16,
                            borderWidth: 1,
                            borderColor: isLight ? '#E2E8F0' : colors.cardBorder,
                            marginBottom: 14,
                            overflow: 'hidden',
                          }}
                        >
                          <TouchableOpacity
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: 14,
                            }}
                            onPress={() => setIsPriceCardExpanded(!isPriceCardExpanded)}
                            activeOpacity={0.8}
                          >
                            <Text style={{ fontSize: 15, fontWeight: '900', color: colors.text }}>
                              Price details
                            </Text>
                            <View
                              style={{
                                width: 28,
                                height: 28,
                                borderRadius: 8,
                                backgroundColor: isLight ? '#F1F5F9' : 'rgba(255, 255, 255, 0.06)',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <Icons.ChevronUp
                                color={colors.text}
                                size={16}
                                style={{ transform: [{ rotate: isPriceCardExpanded ? '0deg' : '180deg' }] }}
                              />
                            </View>
                          </TouchableOpacity>

                          {isPriceCardExpanded && (() => {
                            const order = selectedOrderForDetails;

                            // 1. Listing Price (MRP / Original Price)
                            let listingPrice = Number(order.listing_price || order.original_amount || order.mrp_amount || 0);
                            if (!listingPrice && order.items && order.items.length > 0) {
                              listingPrice = order.items.reduce((sum: number, it: any) => {
                                const p = Number(it.originalPrice || it.mrp || 0);
                                return sum + p * (Number(it.quantity) || 1);
                              }, 0);
                            }

                            // 2. Selling Price (Base item price)
                            let sellingPrice = Number(order.selling_price || 0);
                            if (!sellingPrice && order.items && order.items.length > 0) {
                              sellingPrice = order.items.reduce((sum: number, it: any) => {
                                const p = Number(it.price || 0);
                                return sum + p * (Number(it.quantity) || 1);
                              }, 0);
                            }
                            if (!sellingPrice) {
                              sellingPrice = Number(order.amount || order.finalAmount || 0);
                            }

                            // If listing price is not set or <= selling price, fallback to realistic MRP (~25% higher)
                            if (!listingPrice || listingPrice <= sellingPrice) {
                              listingPrice = Math.round(sellingPrice * 1.25);
                            }

                            // 3. Platform Fee
                            const platformFee = typeof order.platform_fee === 'number' ? order.platform_fee : 10;

                            // 4. Delivery Fee
                            const deliveryFee = typeof order.delivery_fee === 'number' ? order.delivery_fee : 0;

                            // 5. Coupon Discount & Code
                            const couponCode = order.coupon_code || '';
                            const couponDiscount = Number(order.coupon_discount || order.discount || 0);

                            // 6. Member Discount
                            const memberDiscount = Number(order.member_discount || 0);

                            // 7. Final Total Amount
                            const finalPayable = Number(
                              order.finalAmount ||
                              order.amount ||
                              (sellingPrice + platformFee + deliveryFee - couponDiscount - memberDiscount)
                            );

                            const mrpSavings = listingPrice > sellingPrice ? listingPrice - sellingPrice : 0;

                            return (
                              <View style={{ paddingHorizontal: 14, paddingBottom: 14 }}>
                                <View style={{ gap: 8, marginBottom: 12 }}>
                                  {/* Listing Price */}
                                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Text style={{ fontSize: 13, color: isLight ? '#475569' : '#CBD5E1' }}>Listing price</Text>
                                    <Text style={{ fontSize: 13, color: isLight ? '#64748B' : '#94A3B8', textDecorationLine: 'line-through' }}>
                                      ₹{listingPrice.toLocaleString('en-IN')}
                                    </Text>
                                  </View>

                                  {/* Selling Price */}
                                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                      <Text style={{ fontSize: 13, color: isLight ? '#475569' : '#CBD5E1' }}>Selling price</Text>
                                      <Icons.Info color="#94A3B8" size={13} />
                                    </View>
                                    <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>
                                      ₹{sellingPrice.toLocaleString('en-IN')}
                                    </Text>
                                  </View>

                                  {/* MRP Savings / Product Discount */}
                                  {mrpSavings > 0 && (
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                      <Text style={{ fontSize: 13, color: '#10B981', fontWeight: '600' }}>Product discount</Text>
                                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#10B981' }}>
                                        -₹{mrpSavings.toLocaleString('en-IN')}
                                      </Text>
                                    </View>
                                  )}

                                  {/* Platform fee */}
                                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                      <Text style={{ fontSize: 13, color: isLight ? '#475569' : '#CBD5E1' }}>Platform fee</Text>
                                    </View>
                                    <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>
                                      ₹{platformFee}
                                    </Text>
                                  </View>

                                  {/* Delivery Fee */}
                                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Text style={{ fontSize: 13, color: isLight ? '#475569' : '#CBD5E1' }}>Delivery fee</Text>
                                    <Text style={{ fontSize: 13, fontWeight: '700', color: deliveryFee === 0 ? '#10B981' : colors.text }}>
                                      {deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}
                                    </Text>
                                  </View>

                                  {/* Coupon Code Discount */}
                                  {couponDiscount > 0 && (
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                        <Icons.Tag color="#10B981" size={13} />
                                        <Text style={{ fontSize: 13, color: '#10B981', fontWeight: '700' }}>
                                          Coupon discount {couponCode ? `(${couponCode})` : ''}
                                        </Text>
                                      </View>
                                      <Text style={{ fontSize: 13, fontWeight: '800', color: '#10B981' }}>
                                        -₹{couponDiscount.toLocaleString('en-IN')}
                                      </Text>
                                    </View>
                                  )}

                                  {/* Member Discount */}
                                  {memberDiscount > 0 && (
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                      <Text style={{ fontSize: 13, color: '#10B981', fontWeight: '700' }}>Member discount</Text>
                                      <Text style={{ fontSize: 13, fontWeight: '800', color: '#10B981' }}>
                                        -₹{memberDiscount.toLocaleString('en-IN')}
                                      </Text>
                                    </View>
                                  )}
                                </View>

                                <View style={{ height: 1, borderStyle: 'dashed', borderWidth: 1, borderColor: isLight ? '#CBD5E1' : 'rgba(255, 255, 255, 0.15)', marginBottom: 12 }} />

                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                                  <Text style={{ fontSize: 15, fontWeight: '900', color: colors.text }}>Total amount</Text>
                                  <Text style={{ fontSize: 16, fontWeight: '900', color: isLight ? '#0F172A' : '#F5B800' }}>
                                    ₹{finalPayable.toLocaleString('en-IN')}
                                  </Text>
                                </View>

                                <View
                                  style={{
                                    backgroundColor: isLight ? '#F8FAFC' : 'rgba(255, 255, 255, 0.03)',
                                    borderRadius: 12,
                                    padding: 12,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    borderWidth: 1,
                                    borderColor: isLight ? '#F1F5F9' : 'rgba(255, 255, 255, 0.06)',
                                  }}
                                >
                                  <Text style={{ fontSize: 13, fontWeight: '700', color: isLight ? '#475569' : '#CBD5E1' }}>Paid By</Text>
                                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                    <Icons.CreditCard color={colors.text} size={16} />
                                    <Text style={{ fontSize: 13, fontWeight: '800', color: colors.text }}>
                                      {selectedOrderForDetails.payment_method || 'Cash on Delivery (COD)'}
                                    </Text>
                                  </View>
                                </View>
                              </View>
                            );
                          })()}
                        </View>
                          {/* 30-MIN EXPRESS DELIVERY & LIVE TRACKING BANNER */}
                          {isExpressDeliveryEligible(selectedOrderForDetails) && (
                            <View style={{
                              backgroundColor: isLight ? '#F0FDF4' : 'rgba(16, 185, 129, 0.12)',
                              borderColor: isLight ? '#86EFAC' : 'rgba(16, 185, 129, 0.35)',
                              borderWidth: 1.5,
                              borderRadius: 16,
                              padding: 16,
                              marginBottom: 16,
                              shadowColor: '#10B981',
                              shadowOffset: { width: 0, height: 4 },
                              shadowOpacity: 0.15,
                              shadowRadius: 8,
                              elevation: 3,
                            }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981' }} />
                                  <Text style={{ fontSize: 13, fontWeight: '900', color: isLight ? '#166534' : '#4ADE80', letterSpacing: 0.5 }}>
                                    ⚡ EXPRESS DELIVERY ({getDynamicExpressTiming(selectedOrderForDetails)})
                                  </Text>
                                </View>
                                <View style={{ backgroundColor: '#10B981', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                                  <Text style={{ fontSize: 10, fontWeight: '900', color: '#FFF' }}>LIVE MAP</Text>
                                </View>
                              </View>
                              <Text style={{ fontSize: 12, color: isLight ? '#374151' : '#E2E8F0', marginBottom: 12, lineHeight: 18 }}>
                                Assigned to local express delivery. Track delivery partner location, live movement, and route in real-time.
                              </Text>
                              <TouchableOpacity
                                style={{
                                  backgroundColor: '#10B981',
                                  borderRadius: 12,
                                  paddingVertical: 12,
                                  flexDirection: 'row',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: 8,
                                }}
                                onPress={() => {
                                  const ord = selectedOrderForDetails;
                                  setSelectedOrderForDetails(null);
                                  navigation.navigate('LiveTracking', { orderId: ord.id, order: ord });
                                }}
                                activeOpacity={0.85}
                              >
                                <Icons.Navigation color="#FFF" size={16} />
                                <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 13.5 }}>
                                  Track Order & Delivery Partner Live
                                </Text>
                              </TouchableOpacity>
                            </View>
                          )}

                          {/* CATEGORY HIGHLIGHT CARDS FOR SPECIFIC CATEGORIES */}
                          {normalizeOrderCategory(selectedOrderForDetails) === 'Daily Needs' && (
                            <View style={{ backgroundColor: 'rgba(16, 185, 129, 0.12)', borderColor: 'rgba(16, 185, 129, 0.3)', borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 14, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                              <Icons.Zap color="#10B981" size={20} />
                              <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 14, fontWeight: '900', color: '#10B981' }}>⚡ Delivered in 15 mins</Text>
                                <Text style={{ fontSize: 11.5, color: isLight ? '#475569' : '#CBD5E1', marginTop: 2 }}>Order delivered from Connect Dark Store • Hub #402</Text>
                              </View>
                            </View>
                          )}
                          {normalizeOrderCategory(selectedOrderForDetails) === 'Food' && (
                            <View style={[styles.sectionCard, { backgroundColor: isLight ? '#FFFFFF' : 'rgba(255, 255, 255, 0.04)', borderColor: isLight ? '#F1EAD8' : colors.cardBorder, padding: 14, marginBottom: 14 }]}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                <Icons.UtensilsCrossed color="#F97316" size={22} />
                                <View style={{ flex: 1 }}>
                                  <Text style={{ fontSize: 15, fontWeight: '900', color: colors.text }}>{selectedOrderForDetails.vendor_name || 'Royal Hyderabadi Biryani House'}</Text>
                                  <Text style={{ fontSize: 11.5, color: '#64748B', marginTop: 2 }}>MG Road, Bangalore • Order #{selectedOrderForDetails.order_number}</Text>
                                </View>
                              </View>
                            </View>
                          )}
                          {normalizeOrderCategory(selectedOrderForDetails) === 'Stay' && (
                            <View style={[styles.sectionCard, { backgroundColor: isLight ? '#FFFFFF' : 'rgba(255, 255, 255, 0.04)', borderColor: isLight ? '#F1EAD8' : colors.cardBorder, padding: 14, marginBottom: 14 }]}>
                              <Text style={{ fontSize: 16, fontWeight: '900', color: colors.text }}>{selectedOrderForDetails.vendor_name || 'Grand Lotus Resort & Spa'}</Text>
                              <Text style={{ fontSize: 12, fontWeight: '700', color: '#0EA5E9', marginTop: 2 }}>{selectedOrderForDetails.product_details || 'Deluxe King Room • Garden View'}</Text>
                            </View>
                          )}
                          {selectedOrderForDetails.category === 'Travel' && (() => {
                            const travelOrder = selectedOrderForDetails as any;
                            // Extract route from product_details e.g. "VRL Travels (Multi-Axle Volvo AC Sleeper • Oct 5 at 21:30 • Boarding: Majestic ➔ Dropping: Koyambedu • 2 Person(s)...)"
                            const pd = travelOrder.product_details || '';
                            const operatorName = travelOrder.vendor_name || pd.split('(')[0]?.trim() || 'Bus Operator';
                            const boardingPt = travelOrder.boarding_point || '';
                            const droppingPt = travelOrder.dropping_point || '';
                            const travelers = travelOrder.travelers || [];
                            const appointmentSlot = travelOrder.appointment_slot || '';
                            // Try to extract bus type from product_details parenthetical
                            const parenMatch = pd.match(/\(([^•]+)/);
                            const busType = parenMatch ? parenMatch[1].trim() : 'AC Sleeper';
                            // Extract date/time from appointment_slot e.g. "Oct 5 at 21:30"
                            const slotParts = appointmentSlot.split(' at ');
                            const journeyDate = slotParts[0] || '';
                            const departureTime = slotParts[1] || '';

                            return (
                              <View style={{ marginBottom: 14 }}>
                                {/* Bus Operator Header Card */}
                                <View style={{
                                  backgroundColor: isLight ? '#FDF2F8' : 'rgba(236, 72, 153, 0.08)',
                                  borderRadius: 16,
                                  borderWidth: 1,
                                  borderColor: isLight ? '#FBCFE8' : 'rgba(236, 72, 153, 0.25)',
                                  padding: 16,
                                  marginBottom: 12,
                                }}>
                                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                    <View style={{
                                      width: 44, height: 44, borderRadius: 12,
                                      backgroundColor: isLight ? '#EC4899' : 'rgba(236, 72, 153, 0.25)',
                                      alignItems: 'center', justifyContent: 'center',
                                    }}>
                                      <Icons.Bus color={isLight ? '#FFF' : '#F472B6'} size={22} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                      <Text style={{ fontSize: 16, fontWeight: '900', color: colors.text }}>{operatorName}</Text>
                                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#EC4899', marginTop: 2 }}>{busType}</Text>
                                    </View>
                                    <View style={{
                                      backgroundColor: '#EC4899',
                                      paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
                                    }}>
                                      <Text style={{ fontSize: 10, fontWeight: '900', color: '#FFF' }}>CONFIRMED</Text>
                                    </View>
                                  </View>
                                </View>

                                {/* Route & Time Card */}
                                <View style={{
                                  backgroundColor: isLight ? '#FFFFFF' : 'rgba(255, 255, 255, 0.04)',
                                  borderRadius: 16, borderWidth: 1,
                                  borderColor: isLight ? '#E2E8F0' : colors.cardBorder,
                                  padding: 16, marginBottom: 12,
                                }}>
                                  {journeyDate ? (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 }}>
                                      <Icons.Calendar color='#EC4899' size={14} />
                                      <Text style={{ fontSize: 12, fontWeight: '800', color: '#EC4899' }}>
                                        {journeyDate}{departureTime ? ` • Dep: ${departureTime}` : ''}
                                      </Text>
                                    </View>
                                  ) : null}
                                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    {/* From */}
                                    <View style={{ flex: 1, alignItems: 'center' }}>
                                      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#10B981', marginBottom: 6 }} />
                                      <Text style={{ fontSize: 14, fontWeight: '900', color: colors.text }}>
                                        {boardingPt ? boardingPt.split('(')[0].trim() : 'Boarding'}
                                      </Text>
                                      {boardingPt && boardingPt.includes('(') && (
                                        <Text style={{ fontSize: 11, color: isLight ? '#64748B' : '#94A3B8', marginTop: 2 }}>
                                          {boardingPt.match(/\(([^)]+)\)/)?.[1] || ''}
                                        </Text>
                                      )}
                                    </View>
                                    {/* Arrow */}
                                    <View style={{ paddingHorizontal: 8, alignItems: 'center' }}>
                                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                        <View style={{ width: 20, height: 1.5, backgroundColor: isLight ? '#CBD5E1' : 'rgba(255,255,255,0.2)' }} />
                                        <Icons.ArrowRight color={isLight ? '#94A3B8' : 'rgba(255,255,255,0.4)'} size={14} />
                                        <View style={{ width: 20, height: 1.5, backgroundColor: isLight ? '#CBD5E1' : 'rgba(255,255,255,0.2)' }} />
                                      </View>
                                    </View>
                                    {/* To */}
                                    <View style={{ flex: 1, alignItems: 'center' }}>
                                      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#EF4444', marginBottom: 6 }} />
                                      <Text style={{ fontSize: 14, fontWeight: '900', color: colors.text }}>
                                        {droppingPt ? droppingPt.split('(')[0].trim() : 'Dropping'}
                                      </Text>
                                      {droppingPt && droppingPt.includes('(') && (
                                        <Text style={{ fontSize: 11, color: isLight ? '#64748B' : '#94A3B8', marginTop: 2 }}>
                                          {droppingPt.match(/\(([^)]+)\)/)?.[1] || ''}
                                        </Text>
                                      )}
                                    </View>
                                  </View>
                                </View>

                                {/* Boarding & Dropping Details Card */}
                                {(boardingPt || droppingPt) && (
                                  <View style={{
                                    backgroundColor: isLight ? '#FFFFFF' : 'rgba(255, 255, 255, 0.04)',
                                    borderRadius: 16, borderWidth: 1,
                                    borderColor: isLight ? '#E2E8F0' : colors.cardBorder,
                                    padding: 16, marginBottom: 12,
                                  }}>
                                    <Text style={{ fontSize: 13, fontWeight: '900', color: colors.text, marginBottom: 12 }}>
                                      Boarding & Dropping
                                    </Text>
                                    {boardingPt ? (
                                      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: droppingPt ? 12 : 0 }}>
                                        <View style={{
                                          width: 28, height: 28, borderRadius: 8,
                                          backgroundColor: isLight ? '#F0FDF4' : 'rgba(16, 185, 129, 0.15)',
                                          alignItems: 'center', justifyContent: 'center',
                                        }}>
                                          <Icons.MapPin color='#10B981' size={14} />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                          <Text style={{ fontSize: 11, fontWeight: '700', color: '#10B981', textTransform: 'uppercase', letterSpacing: 0.5 }}>Boarding Point</Text>
                                          <Text style={{ fontSize: 13, fontWeight: '800', color: colors.text, marginTop: 2 }}>{boardingPt}</Text>
                                        </View>
                                      </View>
                                    ) : null}
                                    {droppingPt ? (
                                      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                                        <View style={{
                                          width: 28, height: 28, borderRadius: 8,
                                          backgroundColor: isLight ? '#FEF2F2' : 'rgba(239, 68, 68, 0.15)',
                                          alignItems: 'center', justifyContent: 'center',
                                        }}>
                                          <Icons.MapPin color='#EF4444' size={14} />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                          <Text style={{ fontSize: 11, fontWeight: '700', color: '#EF4444', textTransform: 'uppercase', letterSpacing: 0.5 }}>Dropping Point</Text>
                                          <Text style={{ fontSize: 13, fontWeight: '800', color: colors.text, marginTop: 2 }}>{droppingPt}</Text>
                                        </View>
                                      </View>
                                    ) : null}
                                  </View>
                                )}

                                {/* Passenger Details Card */}
                                {travelers.length > 0 && (
                                  <View style={{
                                    backgroundColor: isLight ? '#FFFFFF' : 'rgba(255, 255, 255, 0.04)',
                                    borderRadius: 16, borderWidth: 1,
                                    borderColor: isLight ? '#E2E8F0' : colors.cardBorder,
                                    padding: 16, marginBottom: 12,
                                  }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                                      <Text style={{ fontSize: 13, fontWeight: '900', color: colors.text }}>
                                        Passenger Details
                                      </Text>
                                      <View style={{
                                        backgroundColor: isLight ? '#EFF6FF' : 'rgba(59, 130, 246, 0.15)',
                                        paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
                                      }}>
                                        <Text style={{ fontSize: 10.5, fontWeight: '800', color: '#3B82F6' }}>
                                          {travelers.length} {travelers.length === 1 ? 'PASSENGER' : 'PASSENGERS'}
                                        </Text>
                                      </View>
                                    </View>
                                    {travelers.map((t: any, idx: number) => (
                                      <View key={idx} style={{
                                        backgroundColor: isLight ? '#F8FAFC' : 'rgba(255, 255, 255, 0.02)',
                                        borderRadius: 12, padding: 12, marginBottom: idx < travelers.length - 1 ? 8 : 0,
                                        borderWidth: 1, borderColor: isLight ? '#F1F5F9' : 'rgba(255, 255, 255, 0.05)',
                                      }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                          <View style={{
                                            width: 32, height: 32, borderRadius: 16,
                                            backgroundColor: isLight ? '#EC4899' + '18' : 'rgba(236, 72, 153, 0.15)',
                                            alignItems: 'center', justifyContent: 'center',
                                          }}>
                                            <Text style={{ fontSize: 13, fontWeight: '900', color: '#EC4899' }}>P{idx + 1}</Text>
                                          </View>
                                          <View style={{ flex: 1 }}>
                                            <Text style={{ fontSize: 13, fontWeight: '800', color: colors.text }}>
                                              {t.name || `Passenger ${idx + 1}`}
                                            </Text>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 3 }}>
                                              {t.aadhar ? (
                                                <Text style={{ fontSize: 11, color: isLight ? '#64748B' : '#94A3B8' }}>
                                                  Aadhaar: ••••{t.aadhar.slice(-4)}
                                                </Text>
                                              ) : null}
                                              {t.phone ? (
                                                <Text style={{ fontSize: 11, color: isLight ? '#64748B' : '#94A3B8' }}>
                                                  📱 {t.phone}
                                                </Text>
                                              ) : null}
                                            </View>
                                          </View>
                                          <View style={{
                                            backgroundColor: isLight ? '#F0FDF4' : 'rgba(16, 185, 129, 0.15)',
                                            paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
                                          }}>
                                            <Text style={{ fontSize: 9, fontWeight: '800', color: '#10B981' }}>✓ VERIFIED</Text>
                                          </View>
                                        </View>
                                      </View>
                                    ))}
                                  </View>
                                )}

                                {/* E-Ticket Info Banner */}
                                <View style={{
                                  backgroundColor: isLight ? '#FFFBEB' : 'rgba(245, 158, 11, 0.08)',
                                  borderRadius: 12, borderWidth: 1,
                                  borderColor: isLight ? '#FDE68A' : 'rgba(245, 158, 11, 0.25)',
                                  padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10,
                                }}>
                                  <Icons.FileText color='#F59E0B' size={18} />
                                  <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 12, fontWeight: '800', color: isLight ? '#92400E' : '#FBBF24' }}>
                                      E-Ticket & Boarding Pass
                                    </Text>
                                    <Text style={{ fontSize: 11, color: isLight ? '#A16207' : '#FCD34D', marginTop: 1 }}>
                                      Show this booking at the boarding point. SMS & email confirmation sent.
                                    </Text>
                                  </View>
                                </View>
                              </View>
                            );
                          })()}
                      </>

                    {/* BOTTOM INVOICE DOWNLOAD & SHARE ACTIONS */}
                    <View style={styles.modalActionContainer}>
                      <View style={styles.modalActionButtonsRow}>
                        <TouchableOpacity
                          style={styles.invoiceDownloadBtn}
                          onPress={() => handleOpenOnlineInvoice(selectedOrderForDetails)}
                          activeOpacity={0.85}
                        >
                          <Icons.Download color="#0F172A" size={15} />
                          <Text style={styles.invoiceDownloadBtnText}>Download Invoice</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[
                            styles.invoiceShareBtn,
                            {
                              backgroundColor: isLight ? '#F1F5F9' : 'rgba(255, 255, 255, 0.08)',
                              borderColor: isLight ? '#CBD5E1' : 'rgba(255, 255, 255, 0.15)',
                              borderWidth: 1,
                            },
                          ]}
                          onPress={() => shareInvoicePDF(selectedOrderForDetails)}
                          activeOpacity={0.85}
                        >
                          <Icons.Share2 color={colors.text} size={15} />
                          <Text style={[styles.invoiceShareBtnText, { color: colors.text }]}>Share Invoice</Text>
                        </TouchableOpacity>
                      </View>

                      {isActiveStatus(selectedOrderForDetails.status) && (
                        <TouchableOpacity
                          style={styles.cancelOrderBtn}
                          onPress={() => {
                            const o = selectedOrderForDetails;
                            setSelectedOrderForDetails(null);
                            setSelectedOrderForCancel(o);
                          }}
                          activeOpacity={0.85}
                        >
                          <Text style={styles.cancelOrderBtnText}>Cancel Order</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </ScrollView>
                </>
              )
            )}
          </View>
        </View>
      </Modal>

      {/* Tracking Updates Separate Modal (Opened via "See all updates") */}
      <Modal
        visible={isTrackingTimelineModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setIsTrackingTimelineModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalSheet,
              {
                backgroundColor: isLight ? '#FFFDF5' : '#0B1530',
                borderColor: isLight ? '#FDE68A' : colors.cardBorder,
                maxHeight: height * 0.85,
              },
            ]}
          >
            {/* Modal Header */}
            <View
              style={[
                styles.modalHeader,
                { borderBottomColor: isLight ? '#F1EAD8' : 'rgba(255, 255, 255, 0.08)' },
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Tracking Updates</Text>
                <Text style={{ fontSize: 11.5, color: isLight ? '#64748B' : 'rgba(255, 255, 255, 0.6)', marginTop: 2 }}>
                  {selectedOrderForDetails?.category === 'Jobs'
                    ? `Application #${selectedOrderForDetails?.order_number || 'JOB-1042'}`
                    : selectedOrderForDetails?.category === 'Services' ||
                      selectedOrderForDetails?.category === 'Stay' ||
                      selectedOrderForDetails?.category === 'Travel'
                    ? `Booking #${selectedOrderForDetails?.order_number || 'BK-743865'}`
                    : `Order #${selectedOrderForDetails?.order_number || 'ORD-743865'}`}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsTrackingTimelineModalOpen(false)}
                style={styles.modalCloseBtn}
              >
                <Icons.X color={colors.text} size={18} />
              </TouchableOpacity>
            </View>

            {/* Vertical Timeline View (Screenshot 3) */}
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{
                paddingHorizontal: 18,
                paddingTop: 16,
                paddingBottom: Math.max(insets.bottom, 24) + 24,
              }}
            >
              {(() => {
                if (!selectedOrderForDetails) return null;
                const trackingList = selectedOrderForDetails.tracking_updates || [];

                return (
                  <>
                    {/* Live Server Tracking Updates (if any recorded by vendor) */}
                    {trackingList.length > 0 && (
                      <View style={{ marginBottom: 14 }}>
                        <Text style={{ fontSize: 11, fontWeight: '800', color: '#10B981', letterSpacing: 0.5, marginBottom: 8, textTransform: 'uppercase' }}>
                          ⚡ Latest Live Status Updates
                        </Text>
                        {trackingList.map((item: any, idx: number) => (
                          <View key={idx} style={{ flexDirection: 'row', gap: 12, marginBottom: 14, backgroundColor: isLight ? '#F0FDF4' : 'rgba(16, 185, 129, 0.08)', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: isLight ? '#DCFCE7' : 'rgba(16, 185, 129, 0.2)' }}>
                            <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: '#10B981', alignItems: 'center', justifyContent: 'center', marginTop: 2 }}>
                              <Icons.Check color="#FFFFFF" size={9} strokeWidth={3} />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontSize: 13, fontWeight: '800', color: isLight ? '#14532D' : '#86EFAC' }}>
                                {item.title || item.status}
                              </Text>
                              <Text style={{ fontSize: 11.5, color: isLight ? '#166534' : '#BBF7D0', marginTop: 2 }}>
                                {item.message}
                              </Text>
                              <Text style={{ fontSize: 10, color: isLight ? '#65A30D' : '#86EFAC', marginTop: 3 }}>
                                {item.timestamp ? new Date(item.timestamp).toLocaleString() : 'Just now'}
                              </Text>
                            </View>
                          </View>
                        ))}
                      </View>
                    )}

                    {/* Dynamic Category Milestones */}
                    {(() => {
                      const milestones = getCategoryTrackingMilestones(selectedOrderForDetails);
                      return milestones.map((m, mIdx) => {
                        const isLast = mIdx === milestones.length - 1;
                        const nextM = milestones[mIdx + 1];
                        const circleBg = m.done
                          ? '#10B981'
                          : m.active
                          ? (isLight ? '#EFF6FF' : 'rgba(59, 130, 246, 0.2)')
                          : (isLight ? '#FFFFFF' : '#1E293B');
                        const circleBorder = m.done
                          ? '#10B981'
                          : m.active
                          ? '#3B82F6'
                          : (isLight ? '#CBD5E1' : 'rgba(255, 255, 255, 0.2)');
                        const lineBg = (m.done && (nextM?.done || nextM?.active))
                          ? '#10B981'
                          : (m.active && nextM?.active)
                          ? '#3B82F6'
                          : (isLight ? '#E2E8F0' : 'rgba(255, 255, 255, 0.1)');

                        return (
                          <View key={mIdx} style={{ flexDirection: 'row', gap: 14, marginBottom: isLast ? 16 : 20 }}>
                            <View style={{ alignItems: 'center' }}>
                              <View
                                style={{
                                  width: 18,
                                  height: 18,
                                  borderRadius: 9,
                                  backgroundColor: circleBg,
                                  borderWidth: 2,
                                  borderColor: circleBorder,
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                {m.done && <Icons.Check color="#FFFFFF" size={10} strokeWidth={3} />}
                                {m.active && !m.done && (
                                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#3B82F6' }} />
                                )}
                              </View>
                              {!isLast && (
                                <View
                                  style={{
                                    width: 2,
                                    flex: 1,
                                    backgroundColor: lineBg,
                                    marginVertical: 4,
                                    minHeight: 28,
                                  }}
                                />
                              )}
                            </View>
                            <View style={{ flex: 1, paddingBottom: isLast ? 0 : 4 }}>
                              <Text
                                style={{
                                  fontSize: 14,
                                  fontWeight: m.done || m.active ? '800' : '700',
                                  color: m.active ? '#2563EB' : colors.text,
                                }}
                              >
                                {m.title}{' '}
                                <Text
                                  style={{
                                    fontSize: 11.5,
                                    fontWeight: '600',
                                    color: m.active ? '#3B82F6' : (isLight ? '#64748B' : '#94A3B8'),
                                  }}
                                >
                                  {m.timeText}
                                </Text>
                              </Text>
                              {m.descriptions.map((desc, dIdx) => (
                                <Text
                                  key={dIdx}
                                  style={{
                                    fontSize: 12,
                                    color: m.done ? (isLight ? '#475569' : '#CBD5E1') : m.active ? (isLight ? '#1E3A8A' : '#93C5FD') : '#94A3B8',
                                    marginTop: dIdx === 0 ? 4 : 3,
                                    lineHeight: 17,
                                  }}
                                >
                                  {desc}
                                </Text>
                              ))}
                            </View>
                          </View>
                        );
                      });
                    })()}
                  </>
                );
              })()}

              <TouchableOpacity
                style={{
                  backgroundColor: isLight ? '#F1F5F9' : 'rgba(255,255,255,0.08)',
                  paddingVertical: 14,
                  paddingHorizontal: 20,
                  borderRadius: 14,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginTop: 20,
                  borderWidth: 1,
                  borderColor: isLight ? '#E2E8F0' : 'rgba(255,255,255,0.12)',
                }}
                onPress={() => setIsTrackingTimelineModalOpen(false)}
                activeOpacity={0.8}
              >
                <Text style={{ fontSize: 14, fontWeight: '800', color: colors.text }}>Close Tracking Updates</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Cancel Order Confirmation Modal */}
      <Modal
        visible={!!selectedOrderForCancel}
        animationType="fade"
        transparent
        onRequestClose={() => setSelectedOrderForCancel(null)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.cancelCard,
              {
                backgroundColor: isLight ? '#FFFDF5' : '#0B1530',
                borderColor: isLight ? '#FDE68A' : colors.cardBorder,
              },
            ]}
          >
            {(() => {
              const isJob =
                selectedOrderForCancel?.category === 'Jobs' ||
                (selectedOrderForCancel?.order_number || '').includes('JOB');
              const jobInfo = isJob && selectedOrderForCancel ? getResolvedJobInfo(selectedOrderForCancel) : null;

              return (
                <>
                  <Icons.AlertTriangle color="#EF4444" size={36} style={{ alignSelf: 'center', marginBottom: 10 }} />
                  <Text style={[styles.cancelModalTitle, { color: colors.text }]}>
                    {isJob ? 'Withdraw Application?' : 'Cancel Order?'}
                  </Text>
                  <Text
                    style={[
                      styles.cancelModalSubtitle,
                      { color: isLight ? '#64748B' : 'rgba(255, 255, 255, 0.6)' },
                    ]}
                  >
                    {isJob
                      ? `Are you sure you want to withdraw your application for "${jobInfo?.title || 'this role'}"? You will be removed from the candidate review list.`
                      : `Are you sure you want to cancel order #${selectedOrderForCancel?.order_number}?`}
                  </Text>

                  <View style={styles.cancelButtonsRow}>
                    <TouchableOpacity
                      style={styles.cancelDismissBtn}
                      onPress={() => setSelectedOrderForCancel(null)}
                    >
                      <Text style={[styles.cancelDismissBtnText, { color: colors.text }]}>
                        {isJob ? 'Keep Application' : 'No, Keep It'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.cancelConfirmBtn} onPress={executeCancel}>
                      <Text style={styles.cancelConfirmBtnText}>
                        {isJob ? 'Yes, Withdraw' : 'Yes, Cancel'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              );
            })()}
          </View>
        </View>
      </Modal>

      {/* Rate Order Modal */}
      <Modal
        visible={!!selectedOrderForReview}
        animationType="fade"
        transparent
        onRequestClose={() => setSelectedOrderForReview(null)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.cancelCard,
              {
                backgroundColor: isLight ? '#FFFDF5' : '#0B1530',
                borderColor: isLight ? '#FDE68A' : colors.cardBorder,
              },
            ]}
          >
            <Text style={[styles.cancelModalTitle, { color: colors.text }]}>Rate Your Experience</Text>
            <View style={styles.starsRatingRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => setReviewRating(star)}>
                  <Icons.Star
                    color={star <= reviewRating ? '#F5B800' : isLight ? '#CBD5E1' : '#475569'}
                    fill={star <= reviewRating ? '#F5B800' : 'transparent'}
                    size={28}
                  />
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={[
                styles.reviewTextInput,
                {
                  backgroundColor: isLight ? '#FFFFFF' : 'rgba(255, 255, 255, 0.08)',
                  borderColor: isLight ? '#F1EAD8' : colors.cardBorder,
                  color: colors.text,
                },
              ]}
              placeholder="Leave a short note about this order..."
              placeholderTextColor={isLight ? '#94A3B8' : 'rgba(255, 255, 255, 0.5)'}
              value={reviewText}
              onChangeText={setReviewText}
              multiline
            />
            <View style={styles.cancelButtonsRow}>
              <TouchableOpacity
                style={styles.cancelDismissBtn}
                onPress={() => setSelectedOrderForReview(null)}
              >
                <Text style={[styles.cancelDismissBtnText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitReviewBtn} onPress={executeReview}>
                <Text style={styles.submitReviewBtnText}>Submit Review</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Order Status Filter Bottom Sheet Modal */}
      <Modal visible={isFilterModalOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalSheet,
              {
                backgroundColor: colors.cardBg,
                borderColor: isLight ? '#F1EAD8' : colors.cardBorder,
                paddingBottom: 24,
              },
            ]}
          >
            {/* Drag Handle */}
            <View
              style={{
                width: 38,
                height: 4,
                borderRadius: 2,
                backgroundColor: isLight ? '#CBD5E1' : 'rgba(255, 255, 255, 0.2)',
                alignSelf: 'center',
                marginTop: 10,
                marginBottom: 4,
              }}
            />

            {/* Header */}
            <View
              style={[
                styles.modalHeader,
                { borderBottomColor: isLight ? '#F1EAD8' : 'rgba(255, 255, 255, 0.08)' },
              ]}
            >
              <View>
                <Text style={[styles.modalTitle, { color: colors.text, fontSize: 17 }]}>
                  Filter Orders
                </Text>
                <Text style={{ fontSize: 11.5, color: '#64748B', fontWeight: '600', marginTop: 2 }}>
                  {[
                    selectedDateFilter !== 'all' ? `Date: ${selectedDateFilter.toUpperCase().replace('_', ' ')}` : '',
                    selectedCategory !== 'All' ? `Category: ${selectedCategory.toUpperCase()}` : '',
                  ]
                    .filter(Boolean)
                    .join(' • ') || 'Showing all items'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setIsFilterModalOpen(false)}
                activeOpacity={0.7}
              >
                <Icons.X color={colors.text} size={18} />
              </TouchableOpacity>
            </View>

            {/* Scrollable Filter Options Body */}
            <ScrollView style={{ maxHeight: height * 0.6 }} showsVerticalScrollIndicator={false}>
              {/* 1. DATE RANGE SECTION */}
              <View style={{ paddingHorizontal: 18, paddingTop: 14 }}>
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '800',
                    color: isLight ? '#64748B' : 'rgba(255, 255, 255, 0.6)',
                    letterSpacing: 0.5,
                    marginBottom: 10,
                  }}
                >
                  📅 DATE RANGE FILTER
                </Text>

                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {[
                    { key: 'all' as DateFilterType, label: 'All Time' },
                    { key: 'today' as DateFilterType, label: 'Today' },
                    { key: 'this_week' as DateFilterType, label: 'This Week' },
                    { key: 'this_month' as DateFilterType, label: 'This Month' },
                    { key: 'custom' as DateFilterType, label: 'Custom Date' },
                  ].map((item) => {
                    const isSelected = selectedDateFilter === item.key;
                    return (
                      <TouchableOpacity
                        key={item.key}
                        style={{
                          paddingHorizontal: 14,
                          paddingVertical: 8,
                          borderRadius: 20,
                          borderWidth: 1.5,
                          borderColor: isSelected
                            ? '#F5B800'
                            : isLight
                            ? '#E2E8F0'
                            : 'rgba(255, 255, 255, 0.1)',
                          backgroundColor: isSelected
                            ? isLight
                              ? '#FFFBEB'
                              : 'rgba(245, 184, 0, 0.18)'
                            : isLight
                            ? '#F8FAFC'
                            : 'rgba(255, 255, 255, 0.04)',
                        }}
                        onPress={() => setSelectedDateFilter(item.key)}
                        activeOpacity={0.8}
                      >
                        <Text
                          style={{
                            fontSize: 12.5,
                            fontWeight: isSelected ? '800' : '600',
                            color: isSelected ? (isLight ? '#78350F' : '#F5B800') : colors.text,
                          }}
                        >
                          {item.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Custom Date Pickers */}
                {selectedDateFilter === 'custom' && (
                  <View
                    style={{
                      marginTop: 12,
                      padding: 12,
                      backgroundColor: isLight ? '#F8FAFC' : 'rgba(255, 255, 255, 0.04)',
                      borderRadius: 14,
                      borderWidth: 1,
                      borderColor: isLight ? '#E2E8F0' : 'rgba(255, 255, 255, 0.08)',
                      gap: 10,
                    }}
                  >
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748B', marginBottom: 4 }}>
                          Start Date (YYYY-MM-DD)
                        </Text>
                        <TextInput
                          style={{
                            backgroundColor: isLight ? '#FFFFFF' : 'rgba(0, 0, 0, 0.2)',
                            borderWidth: 1,
                            borderColor: isLight ? '#CBD5E1' : 'rgba(255, 255, 255, 0.15)',
                            borderRadius: 8,
                            paddingHorizontal: 10,
                            paddingVertical: 6,
                            fontSize: 12.5,
                            color: colors.text,
                          }}
                          placeholder="e.g. 2026-09-01"
                          placeholderTextColor="#94A3B8"
                          value={customStartDate}
                          onChangeText={setCustomStartDate}
                        />
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748B', marginBottom: 4 }}>
                          End Date (YYYY-MM-DD)
                        </Text>
                        <TextInput
                          style={{
                            backgroundColor: isLight ? '#FFFFFF' : 'rgba(0, 0, 0, 0.2)',
                            borderWidth: 1,
                            borderColor: isLight ? '#CBD5E1' : 'rgba(255, 255, 255, 0.15)',
                            borderRadius: 8,
                            paddingHorizontal: 10,
                            paddingVertical: 6,
                            fontSize: 12.5,
                            color: colors.text,
                          }}
                          placeholder="e.g. 2026-09-30"
                          placeholderTextColor="#94A3B8"
                          value={customEndDate}
                          onChangeText={setCustomEndDate}
                        />
                      </View>
                    </View>

                    {/* Quick Presets */}
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      <TouchableOpacity
                        onPress={() => {
                          const today = new Date();
                          const sevenDaysAgo = new Date(today);
                          sevenDaysAgo.setDate(today.getDate() - 7);
                          setCustomStartDate(sevenDaysAgo.toISOString().split('T')[0]);
                          setCustomEndDate(today.toISOString().split('T')[0]);
                        }}
                        style={{
                          backgroundColor: isLight ? '#E2E8F0' : 'rgba(255, 255, 255, 0.1)',
                          paddingHorizontal: 10,
                          paddingVertical: 5,
                          borderRadius: 8,
                        }}
                      >
                        <Text style={{ fontSize: 11, fontWeight: '700', color: colors.text }}>Last 7 Days</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => {
                          const today = new Date();
                          const thirtyDaysAgo = new Date(today);
                          thirtyDaysAgo.setDate(today.getDate() - 30);
                          setCustomStartDate(thirtyDaysAgo.toISOString().split('T')[0]);
                          setCustomEndDate(today.toISOString().split('T')[0]);
                        }}
                        style={{
                          backgroundColor: isLight ? '#E2E8F0' : 'rgba(255, 255, 255, 0.1)',
                          paddingHorizontal: 10,
                          paddingVertical: 5,
                          borderRadius: 8,
                        }}
                      >
                        <Text style={{ fontSize: 11, fontWeight: '700', color: colors.text }}>Last 30 Days</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>

              {/* 2. STATUS SECTION */}
              <View style={{ paddingHorizontal: 18, paddingTop: 16 }}>
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '800',
                    color: isLight ? '#64748B' : 'rgba(255, 255, 255, 0.6)',
                    letterSpacing: 0.5,
                    marginBottom: 10,
                  }}
                >
                  ⚡ CATEGORY FILTER
                </Text>

                <View style={{ gap: 8 }}>
                  {availableCategoryPills.map((catName) => {
                    const isSelected = selectedCategory === catName;
                    return (
                      <TouchableOpacity
                        key={catName}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          paddingVertical: 12,
                          paddingHorizontal: 14,
                          borderRadius: 14,
                          borderWidth: 1.5,
                          borderColor: isSelected
                            ? '#F5B800'
                            : isLight
                            ? '#E2E8F0'
                            : 'rgba(255, 255, 255, 0.08)',
                          backgroundColor: isSelected
                            ? isLight
                              ? '#FFFBEB'
                              : 'rgba(245, 184, 0, 0.12)'
                            : isLight
                            ? '#FFFFFF'
                            : 'rgba(255, 255, 255, 0.03)',
                        }}
                        activeOpacity={0.8}
                        onPress={() => {
                          setSelectedCategory(catName);
                        }}
                      >
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Text
                              style={{
                                fontSize: 14,
                                fontWeight: isSelected ? '900' : '700',
                                color: isSelected ? '#0F172A' : colors.text,
                              }}
                            >
                              {catName}
                            </Text>
                          </View>
                        </View>

                        <View
                          style={{
                            width: 20,
                            height: 20,
                            borderRadius: 10,
                            borderWidth: 1.5,
                            borderColor: isSelected ? '#F5B800' : '#94A3B8',
                            backgroundColor: isSelected ? '#F5B800' : 'transparent',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginLeft: 10,
                          }}
                        >
                          {isSelected && <Icons.Check color="#0F172A" size={13} strokeWidth={3} />}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* STATUS FILTER */}
              <View style={{ marginTop: 20 }}>
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '800',
                    color: '#F5B800',
                    letterSpacing: 0.5,
                    marginBottom: 10,
                  }}
                >
                  ⚡ STATUS FILTER
                </Text>

                <View style={{ gap: 8 }}>
                  {[
                    { key: 'all', label: 'All Status', icon: '📋', desc: 'Show all orders regardless of status' },
                    { key: 'active', label: 'Active', icon: '🚀', desc: 'Placed, preparing, in-transit orders' },
                    { key: 'completed', label: 'Completed', icon: '✅', desc: 'Delivered and completed orders' },
                    { key: 'cancelled', label: 'Cancelled', icon: '❌', desc: 'Cancelled orders' },
                    { key: 'returned', label: 'Returned', icon: '↩️', desc: 'Returned orders' },
                  ].map((opt) => {
                    const isSelected = selectedStatusFilter === opt.key;
                    return (
                      <TouchableOpacity
                        key={opt.key}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          paddingVertical: 12,
                          paddingHorizontal: 14,
                          borderRadius: 14,
                          borderWidth: 1.5,
                          borderColor: isSelected
                            ? '#F5B800'
                            : isLight ? '#E2E8F0' : 'rgba(255,255,255,0.08)',
                          backgroundColor: isSelected
                            ? isLight ? '#FFFBEB' : 'rgba(245,184,0,0.12)'
                            : isLight ? '#FFFFFF' : 'rgba(255,255,255,0.03)',
                        }}
                        activeOpacity={0.8}
                        onPress={() => setSelectedStatusFilter(opt.key)}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={{
                            fontSize: 14,
                            fontWeight: isSelected ? '900' : '700',
                            color: isSelected ? '#0F172A' : colors.text,
                          }}>
                            {opt.icon}  {opt.label}
                          </Text>
                          <Text style={{
                            fontSize: 11,
                            color: isLight ? '#64748B' : 'rgba(255,255,255,0.5)',
                            marginTop: 2,
                          }}>
                            {opt.desc}
                          </Text>
                        </View>
                        <View style={{
                          width: 20, height: 20, borderRadius: 10,
                          borderWidth: 1.5,
                          borderColor: isSelected ? '#F5B800' : '#94A3B8',
                          backgroundColor: isSelected ? '#F5B800' : 'transparent',
                          alignItems: 'center', justifyContent: 'center', marginLeft: 10,
                        }}>
                          {isSelected && <Icons.Check color="#0F172A" size={13} strokeWidth={3} />}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </ScrollView>

            {/* Bottom Actions */}
            <View
              style={{
                flexDirection: 'row',
                gap: 10,
                paddingHorizontal: 18,
                marginTop: 14,
                paddingTop: 10,
                borderTopWidth: 1,
                borderTopColor: isLight ? '#F1EAD8' : 'rgba(255, 255, 255, 0.08)',
              }}
            >
              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: isLight ? '#F1F5F9' : 'rgba(255, 255, 255, 0.08)',
                  paddingVertical: 12,
                  borderRadius: 12,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                activeOpacity={0.8}
                onPress={() => {
                  setSelectedCategory('All');
                  setSelectedStatusFilter('all');
                  setSelectedDateFilter('all');
                  setCustomStartDate('');
                  setCustomEndDate('');
                  setIsFilterModalOpen(false);
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '800', color: colors.text }}>Reset Filters</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  flex: 2,
                  backgroundColor: '#F5B800',
                  paddingVertical: 12,
                  borderRadius: 12,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                activeOpacity={0.85}
                onPress={() => setIsFilterModalOpen(false)}
              >
                <Text style={{ fontSize: 13, fontWeight: '900', color: '#0F172A' }}>
                  Apply Filters
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 1. Delivery Address View & Change Modal */}
      <Modal
        visible={isAddressModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setIsAddressModalOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View
            style={[
              styles.modalSheet,
              {
                backgroundColor: isLight ? '#FFFDF5' : '#0B1530',
                borderColor: isLight ? '#FDE68A' : colors.cardBorder,
                maxHeight: height * 0.90,
                marginBottom: keyboardHeight > 0 && Platform.OS === 'android' ? keyboardHeight : 0,
              },
            ]}
          >
            {/* Header */}
            <View style={[styles.modalHeader, { borderBottomColor: isLight ? '#F1EAD8' : 'rgba(255, 255, 255, 0.08)' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 12,
                    backgroundColor: isLight ? '#FEF3C7' : 'rgba(245, 184, 0, 0.15)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icons.MapPin color="#F5B800" size={20} />
                </View>
                <View>
                  <Text style={[styles.modalTitle, { color: colors.text }]}>Delivery Address</Text>
                  <Text style={{ fontSize: 11.5, color: isLight ? '#64748B' : '#94A3B8' }}>
                    {selectedOrderForDetails ? `#${selectedOrderForDetails.order_number || selectedOrderForDetails.id}` : ''}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setIsAddressModalOpen(false)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: isLight ? '#F1F5F9' : 'rgba(255,255,255,0.08)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icons.X color={colors.text} size={16} />
              </TouchableOpacity>
            </View>

            <ScrollView
              contentContainerStyle={{ padding: 18, paddingBottom: 32 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* If Order is already packed / dispatched */}
              {isOrderPackedOrBeyond(selectedOrderForDetails) ? (
                <View>
                  {/* Packed Notice Banner */}
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'flex-start',
                      gap: 12,
                      padding: 14,
                      borderRadius: 14,
                      backgroundColor: isLight ? '#FFFBEB' : 'rgba(245, 184, 0, 0.12)',
                      borderWidth: 1,
                      borderColor: isLight ? '#FDE68A' : 'rgba(245, 184, 0, 0.3)',
                      marginBottom: 16,
                    }}
                  >
                    <Icons.Lock color="#D97706" size={20} style={{ marginTop: 2 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13.5, fontWeight: '800', color: isLight ? '#92400E' : '#FBBF24' }}>
                        Address Locked (Order Packed)
                      </Text>
                      <Text style={{ fontSize: 12, color: isLight ? '#B45309' : '#FDE68A', marginTop: 3, lineHeight: 17 }}>
                        This order has already been packed and processed for dispatch. Delivery address cannot be modified once packaging is complete.
                      </Text>
                    </View>
                  </View>

                  {/* Current Address Card */}
                  <View
                    style={{
                      padding: 16,
                      borderRadius: 16,
                      backgroundColor: isLight ? '#FFFFFF' : 'rgba(255, 255, 255, 0.04)',
                      borderWidth: 1,
                      borderColor: isLight ? '#E2E8F0' : colors.cardBorder,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <Icons.Building color={colors.text} size={18} />
                      <Text style={{ fontSize: 14, fontWeight: '800', color: colors.text }}>
                        {(selectedOrderForDetails as any)?.address_label || 'Current Delivery Address'}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 13, color: isLight ? '#334155' : '#CBD5E1', lineHeight: 20 }}>
                      {(selectedOrderForDetails as any)?.delivery_address ||
                        (selectedOrderForDetails as any)?.customerAddress ||
                        selectedOrderForDetails?.customer_address ||
                        editAddressText}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={{
                      backgroundColor: isLight ? '#F1F5F9' : 'rgba(255, 255, 255, 0.08)',
                      paddingVertical: 13,
                      borderRadius: 12,
                      alignItems: 'center',
                      marginTop: 20,
                    }}
                    onPress={() => setIsAddressModalOpen(false)}
                  >
                    <Text style={{ fontSize: 13.5, fontWeight: '800', color: colors.text }}>Got It</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                /* Order NOT packed yet: Address CAN be changed! */
                <View>
                  {!isAddingNewAddress ? (
                    /* VIEW 1: SAVED ADDRESSES LIST + "+ Add New Address" BUTTON */
                    <View>
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: 12,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: '800',
                            color: isLight ? '#64748B' : '#94A3B8',
                            textTransform: 'uppercase',
                            letterSpacing: 0.5,
                          }}
                        >
                          SAVED ADDRESS
                        </Text>

                        {/* + Add New Button */}
                        <TouchableOpacity
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 5,
                            backgroundColor: isLight ? '#EFF6FF' : 'rgba(59, 130, 246, 0.15)',
                            borderWidth: 1,
                            borderColor: isLight ? '#BFDBFE' : 'rgba(59, 130, 246, 0.3)',
                            paddingHorizontal: 12,
                            paddingVertical: 5.5,
                            borderRadius: 16,
                          }}
                          onPress={() => setIsAddingNewAddress(true)}
                          activeOpacity={0.8}
                        >
                          <Icons.Plus color="#2563EB" size={14} strokeWidth={2.5} />
                          <Text style={{ fontSize: 11.5, fontWeight: '800', color: '#2563EB' }}>
                            Add New
                          </Text>
                        </TouchableOpacity>
                      </View>

                      {/* Saved Addresses List */}
                      {savedAddressesList.length > 0 ? (
                        <View style={{ gap: 10, marginBottom: 20 }}>
                          {savedAddressesList.map((addr: any, idx: number) => {
                            const fullAddr = `${addr.house || ''} ${addr.street || ''}, ${
                              addr.landmark ? addr.landmark + ', ' : ''
                            }${addr.city || ''} ${addr.pincode || ''}`.trim();
                            const isSelected = selectedAddressIndex === idx;

                            return (
                              <TouchableOpacity
                                key={addr.id || idx}
                                style={{
                                  padding: 14,
                                  borderRadius: 14,
                                  borderWidth: 1.5,
                                  borderColor: isSelected
                                    ? '#F5B800'
                                    : isLight
                                    ? '#E2E8F0'
                                    : 'rgba(255,255,255,0.08)',
                                  backgroundColor: isSelected
                                    ? isLight
                                      ? '#FFFBEB'
                                      : 'rgba(245, 184, 0, 0.12)'
                                    : isLight
                                    ? '#FFFFFF'
                                    : 'rgba(255,255,255,0.03)',
                                  flexDirection: 'row',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                }}
                                onPress={() => {
                                  setSelectedAddressIndex(idx);
                                  setEditAddressText(fullAddr);
                                  setEditAddressLabel(addr.label || 'Home');
                                }}
                                activeOpacity={0.8}
                              >
                                <View style={{ flex: 1, marginRight: 12 }}>
                                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                    <Text style={{ fontSize: 13, fontWeight: '800', color: colors.text }}>
                                      {addr.label || 'Home'}
                                    </Text>
                                    {addr.isDefault && (
                                      <View
                                        style={{
                                          backgroundColor: '#10B981',
                                          paddingHorizontal: 6,
                                          paddingVertical: 1.5,
                                          borderRadius: 4,
                                        }}
                                      >
                                        <Text style={{ fontSize: 9, fontWeight: '800', color: '#FFFFFF' }}>
                                          DEFAULT
                                        </Text>
                                      </View>
                                    )}
                                  </View>
                                  <Text
                                    style={{
                                      fontSize: 12,
                                      color: isLight ? '#475569' : '#94A3B8',
                                      lineHeight: 17,
                                    }}
                                    numberOfLines={3}
                                  >
                                    {fullAddr}
                                  </Text>
                                </View>
                                <View
                                  style={{
                                    width: 20,
                                    height: 20,
                                    borderRadius: 10,
                                    borderWidth: 2,
                                    borderColor: isSelected ? '#F5B800' : '#94A3B8',
                                    backgroundColor: isSelected ? '#F5B800' : 'transparent',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                  }}
                                >
                                  {isSelected && <Icons.Check color="#0F172A" size={12} strokeWidth={3} />}
                                </View>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      ) : (
                        <View
                          style={{
                            padding: 16,
                            borderRadius: 12,
                            borderWidth: 1,
                            borderColor: isLight ? '#E2E8F0' : 'rgba(255,255,255,0.08)',
                            alignItems: 'center',
                            marginBottom: 20,
                          }}
                        >
                          <Text style={{ fontSize: 12.5, color: isLight ? '#64748B' : '#94A3B8' }}>
                            No saved addresses found.
                          </Text>
                        </View>
                      )}

                      {/* Action Buttons */}
                      <View style={{ flexDirection: 'row', gap: 10 }}>
                        <TouchableOpacity
                          style={{
                            flex: 1,
                            backgroundColor: isLight ? '#F1F5F9' : 'rgba(255, 255, 255, 0.08)',
                            paddingVertical: 13,
                            borderRadius: 12,
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                          onPress={() => setIsAddressModalOpen(false)}
                        >
                          <Text style={{ fontSize: 13, fontWeight: '800', color: colors.text }}>Cancel</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={{
                            flex: 2,
                            backgroundColor: '#F5B800',
                            paddingVertical: 13,
                            borderRadius: 12,
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                          disabled={isSavingDeliveryDetails}
                          onPress={() => handleSaveAddress(editAddressText, editAddressLabel)}
                          activeOpacity={0.85}
                        >
                          {isSavingDeliveryDetails ? (
                            <ActivityIndicator color="#0F172A" size="small" />
                          ) : (
                            <Text style={{ fontSize: 13.5, fontWeight: '900', color: '#0F172A' }}>
                              Save & Update Address
                            </Text>
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    /* VIEW 2: ADD NEW ADDRESS FORM */
                    <View>
                      {/* Address Type Selector */}
                      <View style={{ marginBottom: 14 }}>
                        <Text style={{ fontSize: 11.5, fontWeight: '800', color: isLight ? '#64748B' : '#94A3B8', textTransform: 'uppercase', marginBottom: 8, letterSpacing: 0.5 }}>
                          Address Type
                        </Text>
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                          {(['Home', 'Work', 'Other'] as const).map((type) => {
                            const isSelected = newAddressLabel === type;
                            return (
                              <TouchableOpacity
                                key={type}
                                style={{
                                  flex: 1,
                                  flexDirection: 'row',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: 6,
                                  paddingVertical: 9,
                                  borderRadius: 12,
                                  borderWidth: 1.5,
                                  borderColor: isSelected ? '#F5B800' : isLight ? '#E2E8F0' : 'rgba(255,255,255,0.08)',
                                  backgroundColor: isSelected ? (isLight ? '#FFFBEB' : 'rgba(245, 184, 0, 0.15)') : (isLight ? '#FFFFFF' : 'rgba(255,255,255,0.04)'),
                                }}
                                onPress={() => setNewAddressLabel(type)}
                              >
                                {type === 'Home' ? (
                                  <Icons.Home color={isSelected ? (isLight ? '#0F172A' : '#F5B800') : '#94A3B8'} size={15} />
                                ) : type === 'Work' ? (
                                  <Icons.Briefcase color={isSelected ? (isLight ? '#0F172A' : '#F5B800') : '#94A3B8'} size={15} />
                                ) : (
                                  <Icons.MapPin color={isSelected ? (isLight ? '#0F172A' : '#F5B800') : '#94A3B8'} size={15} />
                                )}
                                <Text style={{ fontSize: 12, fontWeight: '800', color: isSelected ? (isLight ? '#0F172A' : '#F5B800') : colors.text }}>
                                  {type}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </View>

                      {/* Flat, House No, Building */}
                      <View style={{ marginBottom: 12 }}>
                        <Text style={{ fontSize: 11.5, fontWeight: '800', color: isLight ? '#64748B' : '#94A3B8', marginBottom: 5 }}>
                          Flat / House No. / Building *
                        </Text>
                        <TextInput
                          style={{
                            backgroundColor: isLight ? '#FFFFFF' : 'rgba(255, 255, 255, 0.06)',
                            borderColor: isLight ? '#CBD5E1' : colors.cardBorder,
                            borderWidth: 1.5,
                            borderRadius: 12,
                            paddingHorizontal: 12,
                            paddingVertical: 10,
                            fontSize: 13,
                            fontWeight: '600',
                            color: colors.text,
                          }}
                          placeholder="e.g. 1st Floor, Flat #962, Sunshine Apts"
                          placeholderTextColor={isLight ? '#94A3B8' : 'rgba(255, 255, 255, 0.4)'}
                          value={newHouse}
                          onChangeText={setNewHouse}
                        />
                      </View>

                      {/* Area, Street, Locality */}
                      <View style={{ marginBottom: 12 }}>
                        <Text style={{ fontSize: 11.5, fontWeight: '800', color: isLight ? '#64748B' : '#94A3B8', marginBottom: 5 }}>
                          Street / Area / Locality *
                        </Text>
                        <TextInput
                          style={{
                            backgroundColor: isLight ? '#FFFFFF' : 'rgba(255, 255, 255, 0.06)',
                            borderColor: isLight ? '#CBD5E1' : colors.cardBorder,
                            borderWidth: 1.5,
                            borderRadius: 12,
                            paddingHorizontal: 12,
                            paddingVertical: 10,
                            fontSize: 13,
                            fontWeight: '600',
                            color: colors.text,
                          }}
                          placeholder="e.g. 12th Main Road, Papareddypalya"
                          placeholderTextColor={isLight ? '#94A3B8' : 'rgba(255, 255, 255, 0.4)'}
                          value={newStreet}
                          onChangeText={setNewStreet}
                        />
                      </View>

                      {/* Landmark */}
                      <View style={{ marginBottom: 12 }}>
                        <Text style={{ fontSize: 11.5, fontWeight: '800', color: isLight ? '#64748B' : '#94A3B8', marginBottom: 5 }}>
                          Landmark (Optional)
                        </Text>
                        <TextInput
                          style={{
                            backgroundColor: isLight ? '#FFFFFF' : 'rgba(255, 255, 255, 0.06)',
                            borderColor: isLight ? '#CBD5E1' : colors.cardBorder,
                            borderWidth: 1.5,
                            borderRadius: 12,
                            paddingHorizontal: 12,
                            paddingVertical: 10,
                            fontSize: 13,
                            fontWeight: '600',
                            color: colors.text,
                          }}
                          placeholder="e.g. Above SBI Bank, Near Bus Stop"
                          placeholderTextColor={isLight ? '#94A3B8' : 'rgba(255, 255, 255, 0.4)'}
                          value={newLandmark}
                          onChangeText={setNewLandmark}
                        />
                      </View>

                      {/* City & Pincode Row */}
                      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
                        <View style={{ flex: 1.2 }}>
                          <Text style={{ fontSize: 11.5, fontWeight: '800', color: isLight ? '#64748B' : '#94A3B8', marginBottom: 5 }}>
                            City *
                          </Text>
                          <TextInput
                            style={{
                              backgroundColor: isLight ? '#FFFFFF' : 'rgba(255, 255, 255, 0.06)',
                              borderColor: isLight ? '#CBD5E1' : colors.cardBorder,
                              borderWidth: 1.5,
                              borderRadius: 12,
                              paddingHorizontal: 12,
                              paddingVertical: 10,
                              fontSize: 13,
                              fontWeight: '600',
                              color: colors.text,
                            }}
                            placeholder="e.g. Bengaluru"
                            placeholderTextColor={isLight ? '#94A3B8' : 'rgba(255, 255, 255, 0.4)'}
                            value={newCity}
                            onChangeText={setNewCity}
                          />
                        </View>

                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 11.5, fontWeight: '800', color: isLight ? '#64748B' : '#94A3B8', marginBottom: 5 }}>
                            Pincode *
                          </Text>
                          <TextInput
                            style={{
                              backgroundColor: isLight ? '#FFFFFF' : 'rgba(255, 255, 255, 0.06)',
                              borderColor: isLight ? '#CBD5E1' : colors.cardBorder,
                              borderWidth: 1.5,
                              borderRadius: 12,
                              paddingHorizontal: 12,
                              paddingVertical: 10,
                              fontSize: 13,
                              fontWeight: '600',
                              color: colors.text,
                            }}
                            placeholder="6-digit PIN"
                            placeholderTextColor={isLight ? '#94A3B8' : 'rgba(255, 255, 255, 0.4)'}
                            value={newPincode}
                            onChangeText={setNewPincode}
                            keyboardType="number-pad"
                            maxLength={6}
                          />
                        </View>
                      </View>

                      {/* State */}
                      <View style={{ marginBottom: 16 }}>
                        <Text style={{ fontSize: 11.5, fontWeight: '800', color: isLight ? '#64748B' : '#94A3B8', marginBottom: 5 }}>
                          State *
                        </Text>
                        <TextInput
                          style={{
                            backgroundColor: isLight ? '#FFFFFF' : 'rgba(255, 255, 255, 0.06)',
                            borderColor: isLight ? '#CBD5E1' : colors.cardBorder,
                            borderWidth: 1.5,
                            borderRadius: 12,
                            paddingHorizontal: 12,
                            paddingVertical: 10,
                            fontSize: 13,
                            fontWeight: '600',
                            color: colors.text,
                          }}
                          placeholder="e.g. Karnataka"
                          placeholderTextColor={isLight ? '#94A3B8' : 'rgba(255, 255, 255, 0.4)'}
                          value={newState}
                          onChangeText={setNewState}
                        />
                      </View>

                      {/* Form Action Buttons */}
                      <View style={{ flexDirection: 'row', gap: 10 }}>
                        <TouchableOpacity
                          style={{
                            flex: 1,
                            backgroundColor: isLight ? '#F1F5F9' : 'rgba(255, 255, 255, 0.08)',
                            paddingVertical: 13,
                            borderRadius: 12,
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                          onPress={() => setIsAddingNewAddress(false)}
                        >
                          <Text style={{ fontSize: 13, fontWeight: '800', color: colors.text }}>Back</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={{
                            flex: 2,
                            backgroundColor: '#F5B800',
                            paddingVertical: 13,
                            borderRadius: 12,
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                          disabled={isSavingDeliveryDetails}
                          onPress={handleSaveNewAddress}
                          activeOpacity={0.85}
                        >
                          {isSavingDeliveryDetails ? (
                            <ActivityIndicator color="#0F172A" size="small" />
                          ) : (
                            <Text style={{ fontSize: 13.5, fontWeight: '900', color: '#0F172A' }}>
                              Save & Deliver Here
                            </Text>
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* 2. Contact Person & Phone Number Modal */}
      <Modal
        visible={isPhoneModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setIsPhoneModalOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View
            style={[
              styles.modalSheet,
              {
                backgroundColor: isLight ? '#FFFDF5' : '#0B1530',
                borderColor: isLight ? '#FDE68A' : colors.cardBorder,
                marginBottom: keyboardHeight > 0 && Platform.OS === 'android' ? keyboardHeight : 0,
              },
            ]}
          >
            {/* Header */}
            <View style={[styles.modalHeader, { borderBottomColor: isLight ? '#F1EAD8' : 'rgba(255, 255, 255, 0.08)' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 12,
                    backgroundColor: isLight ? '#EFF6FF' : 'rgba(59, 130, 246, 0.15)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icons.Phone color="#3B82F6" size={20} />
                </View>
                <View>
                  <Text style={[styles.modalTitle, { color: colors.text }]}>Contact Details</Text>
                  <Text style={{ fontSize: 11.5, color: isLight ? '#64748B' : '#94A3B8' }}>
                    Delivery contact person and calling number
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setIsPhoneModalOpen(false)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: isLight ? '#F1F5F9' : 'rgba(255,255,255,0.08)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icons.X color={colors.text} size={16} />
              </TouchableOpacity>
            </View>

            <View style={{ padding: 18, gap: 14 }}>
              {/* Recipient Name */}
              <View>
                <Text style={{ fontSize: 12, fontWeight: '800', color: isLight ? '#64748B' : '#94A3B8', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Recipient Name
                </Text>
                <TextInput
                  style={{
                    backgroundColor: isLight ? '#FFFFFF' : 'rgba(255, 255, 255, 0.06)',
                    borderColor: isLight ? '#CBD5E1' : colors.cardBorder,
                    borderWidth: 1.5,
                    borderRadius: 12,
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    fontSize: 13.5,
                    fontWeight: '700',
                    color: colors.text,
                  }}
                  placeholder="Enter recipient full name"
                  placeholderTextColor={isLight ? '#94A3B8' : 'rgba(255, 255, 255, 0.4)'}
                  value={editContactName}
                  onChangeText={setEditContactName}
                />
              </View>

              {/* Phone Number */}
              <View>
                <Text style={{ fontSize: 12, fontWeight: '800', color: isLight ? '#64748B' : '#94A3B8', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Mobile Phone Number
                </Text>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: isLight ? '#FFFFFF' : 'rgba(255, 255, 255, 0.06)',
                    borderColor: isLight ? '#CBD5E1' : colors.cardBorder,
                    borderWidth: 1.5,
                    borderRadius: 12,
                    paddingHorizontal: 12,
                  }}
                >
                  <Text style={{ fontSize: 13.5, fontWeight: '800', color: colors.text, marginRight: 6 }}>+91</Text>
                  <TextInput
                    style={{
                      flex: 1,
                      paddingVertical: 10,
                      fontSize: 13.5,
                      fontWeight: '700',
                      color: colors.text,
                    }}
                    placeholder="10-digit mobile number"
                    placeholderTextColor={isLight ? '#94A3B8' : 'rgba(255, 255, 255, 0.4)'}
                    value={editContactPhone.replace(/^\+91\s*/, '')}
                    onChangeText={(val) => setEditContactPhone(val)}
                    keyboardType="phone-pad"
                    maxLength={13}
                  />
                </View>
              </View>

              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  padding: 10,
                  borderRadius: 10,
                  backgroundColor: isLight ? '#F8FAFC' : 'rgba(255, 255, 255, 0.03)',
                }}
              >
                <Icons.Info color="#3B82F6" size={15} />
                <Text style={{ fontSize: 11.5, color: isLight ? '#64748B' : '#94A3B8', flex: 1 }}>
                  Our delivery executive will call this number for location guidance and OTP confirmation.
                </Text>
              </View>

              {/* Action Buttons */}
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    backgroundColor: isLight ? '#F1F5F9' : 'rgba(255, 255, 255, 0.08)',
                    paddingVertical: 13,
                    borderRadius: 12,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  onPress={() => setIsPhoneModalOpen(false)}
                >
                  <Text style={{ fontSize: 13, fontWeight: '800', color: colors.text }}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{
                    flex: 2,
                    backgroundColor: '#F5B800',
                    paddingVertical: 13,
                    borderRadius: 12,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  disabled={isSavingDeliveryDetails}
                  onPress={handleSaveContact}
                  activeOpacity={0.85}
                >
                  {isSavingDeliveryDetails ? (
                    <ActivityIndicator color="#0F172A" size="small" />
                  ) : (
                    <Text style={{ fontSize: 13.5, fontWeight: '900', color: '#0F172A' }}>
                      Update Contact Number
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* 3. Online Tax Invoice Preview & Download Modal */}
      <Modal
        visible={isInvoiceModalOpen}
        animationType="slide"
        onRequestClose={() => setIsInvoiceModalOpen(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: isLight ? '#F8FAFC' : '#0B132B' }}>
          {/* Header Bar */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 16,
              paddingVertical: 12,
              backgroundColor: isLight ? '#FFFFFF' : '#0B1530',
              borderBottomWidth: 1,
              borderBottomColor: isLight ? '#E2E8F0' : 'rgba(255, 255, 255, 0.08)',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <TouchableOpacity
                onPress={() => setIsInvoiceModalOpen(false)}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: isLight ? '#F1F5F9' : 'rgba(255,255,255,0.08)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icons.ArrowLeft color={colors.text} size={18} />
              </TouchableOpacity>
              <View>
                <Text style={{ fontSize: 15, fontWeight: '900', color: colors.text }}>Tax Invoice & Receipt</Text>
                <Text style={{ fontSize: 11.5, color: isLight ? '#64748B' : '#94A3B8' }}>
                  {selectedOrderForDetails ? `#${selectedOrderForDetails.order_number || selectedOrderForDetails.id}` : ''}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => {
                if (selectedOrderForDetails) shareInvoicePDF(selectedOrderForDetails);
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
                backgroundColor: isLight ? '#EFF6FF' : 'rgba(59, 130, 246, 0.15)',
                paddingHorizontal: 12,
                paddingVertical: 7,
                borderRadius: 10,
              }}
            >
              <Icons.Share2 color="#3B82F6" size={14} />
              <Text style={{ fontSize: 12, fontWeight: '800', color: '#3B82F6' }}>Share</Text>
            </TouchableOpacity>
          </View>

          {/* Feedback banner if saving/saved */}
          {invoiceToastMsg && (
            <View
              style={{
                backgroundColor: '#10B981',
                paddingVertical: 9,
                paddingHorizontal: 14,
                marginHorizontal: 16,
                marginTop: 10,
                borderRadius: 10,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Icons.CheckCircle2 color="#FFFFFF" size={16} />
              <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '800', flex: 1 }}>
                {invoiceToastMsg}
              </Text>
            </View>
          )}

          {/* WebView displaying the exact Tax Invoice HTML */}
          {selectedOrderForDetails && (
            <WebView
              originWhitelist={['*']}
              source={{ html: generateInvoiceHTML(selectedOrderForDetails) }}
              style={{ flex: 1, backgroundColor: '#FFFFFF' }}
              scalesPageToFit={Platform.OS === 'android'}
            />
          )}

          {/* Bottom Action Footer */}
          <View
            style={{
              flexDirection: 'row',
              gap: 12,
              paddingHorizontal: 16,
              paddingVertical: 12,
              backgroundColor: isLight ? '#FFFFFF' : '#0B1530',
              borderTopWidth: 1,
              borderTopColor: isLight ? '#E2E8F0' : 'rgba(255, 255, 255, 0.08)',
            }}
          >
            <TouchableOpacity
              style={{
                flex: 1,
                backgroundColor: isLight ? '#F1F5F9' : 'rgba(255, 255, 255, 0.08)',
                paddingVertical: 13,
                borderRadius: 12,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
              onPress={() => {
                if (selectedOrderForDetails) shareInvoicePDF(selectedOrderForDetails);
              }}
              activeOpacity={0.8}
            >
              <Icons.Share2 color={colors.text} size={15} />
              <Text style={{ fontSize: 13, fontWeight: '800', color: colors.text }}>Share Invoice</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                flex: 1.5,
                backgroundColor: '#F5B800',
                paddingVertical: 13,
                borderRadius: 12,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
              onPress={async () => {
                if (selectedOrderForDetails) {
                  setInvoiceToastMsg('Preparing invoice to download...');
                  const path = await downloadInvoicePDF(selectedOrderForDetails);
                  if (path) {
                    setInvoiceToastMsg('✅ Invoice ready! Saved to device.');
                    setTimeout(() => setInvoiceToastMsg(null), 4000);
                  } else {
                    setInvoiceToastMsg(null);
                  }
                }
              }}
              activeOpacity={0.85}
            >
              <Icons.Download color="#0F172A" size={16} />
              <Text style={{ fontSize: 13.5, fontWeight: '900', color: '#0F172A' }}>Save to Device</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  toastBanner: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    zIndex: 999,
    backgroundColor: '#F5B800',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  toastText: {
    color: '#0F172A',
    fontSize: 12.5,
    fontWeight: '700',
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 4,
    height: 42,
    borderRadius: 12,
    borderWidth: 1.2,
  },
  searchInput: {
    flex: 1,
    paddingHorizontal: 10,
    fontSize: 13,
    fontWeight: '500',
  },
  categorySelectorWrapper: {
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  categoryScrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryTabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6.5,
    borderRadius: 16,
    borderWidth: 1,
    gap: 5,
  },
  categoryTabText: {
    fontSize: 12,
    fontWeight: '600',
  },
  categoryCountBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 8,
  },
  categoryCountText: {
    fontSize: 10,
    fontWeight: '800',
  },
  statusFilterWrapper: {
    paddingVertical: 8,
  },
  statusFilterScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  statusChip: {
    paddingHorizontal: 11,
    paddingVertical: 5.5,
    borderRadius: 14,
    borderWidth: 1,
  },
  statusChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  ordersScroll: {
    paddingHorizontal: 16,
    paddingBottom: 30,
  },
  groupSection: {
    marginBottom: 14,
  },
  groupHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 8,
  },
  groupHeaderTitle: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  groupHeaderDivider: {
    flex: 1,
    height: 1,
  },
  busTicketCard: {
    borderRadius: 18,
    borderWidth: 1.2,
    marginBottom: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  orderCard: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTouchable: {
    padding: 14,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
    borderWidth: 1,
  },
  categoryPillText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  orderNumberText: {
    fontSize: 11,
    fontWeight: '600',
  },
  statusPill: {
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusPillText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  cardBodyRow: {
    flexDirection: 'row',
    gap: 12,
  },
  thumbnailWrapper: {
    width: 60,
    height: 60,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#E2E8F0',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  cardDetailsCol: {
    flex: 1,
    justifyContent: 'space-between',
  },
  cardTitleText: {
    fontSize: 13.5,
    fontWeight: '800',
    lineHeight: 18,
  },
  cardSubText: {
    fontSize: 11.5,
    marginTop: 2,
  },
  inlineInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  cardHighlightText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  cardFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: 6,
  },
  cardPriceText: {
    fontSize: 14,
    fontWeight: '900',
  },
  dateChevronRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardDateText: {
    fontSize: 10.5,
    fontWeight: '600',
  },
  cardActionFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  actionPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F5B800',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  actionPrimaryBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0F172A',
  },
  actionSecondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  actionSecondaryBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  actionDetailsBtn: {
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  actionDetailsBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  emptyScroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 17,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  emptyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F5B800',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
    marginTop: 4,
  },
  emptyActionBtnText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 11, 30, 0.65)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '900',
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailsStatusBanner: {
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailsStatusText: {
    fontSize: 11.5,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  detailsDeliveryEta: {
    fontSize: 11,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  sectionCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 8,
  },
  itemDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  itemNameText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  itemVariantText: {
    fontSize: 10.5,
    marginTop: 1,
  },
  itemQtyPriceText: {
    fontSize: 12,
    fontWeight: '800',
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
  },
  breakdownLabel: {
    fontSize: 11.5,
    fontWeight: '500',
  },
  breakdownValue: {
    fontSize: 12,
    fontWeight: '700',
  },
  totalLabel: {
    fontSize: 13,
    fontWeight: '800',
  },
  totalValue: {
    fontSize: 15,
    fontWeight: '900',
  },
  modalActionContainer: {
    marginTop: 14,
    marginBottom: 20,
    gap: 10,
  },
  modalActionButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  invoiceDownloadBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F5B800',
    paddingVertical: 12,
    borderRadius: 10,
  },
  invoiceDownloadBtnText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  invoiceShareBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
  },
  invoiceShareBtnText: {
    fontSize: 12.5,
    fontWeight: '800',
  },
  cancelOrderBtn: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    paddingVertical: 12,
    borderRadius: 10,
  },
  cancelOrderBtnText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#EF4444',
  },
  jobActionContainer: {
    marginTop: 18,
    marginBottom: 20,
    gap: 10,
  },
  viewJobListingBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F5B800',
    paddingVertical: 13,
    borderRadius: 12,
  },
  viewJobListingBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  withdrawJobBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
  },
  withdrawJobBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#EF4444',
  },
  cancelCard: {
    marginHorizontal: 20,
    marginBottom: height * 0.25,
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
  },
  cancelModalTitle: {
    fontSize: 16,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 6,
  },
  cancelModalSubtitle: {
    fontSize: 12.5,
    textAlign: 'center',
    marginBottom: 16,
  },
  cancelButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelDismissBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelDismissBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  cancelConfirmBtn: {
    flex: 1,
    backgroundColor: '#EF4444',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelConfirmBtnText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  starsRatingRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginVertical: 14,
  },
  reviewTextInput: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    height: 70,
    fontSize: 12,
    textAlignVertical: 'top',
    marginBottom: 14,
  },
  submitReviewBtn: {
    flex: 1,
    backgroundColor: '#F5B800',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitReviewBtnText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#0F172A',
  },
});
