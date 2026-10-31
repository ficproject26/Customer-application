import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  useWindowDimensions,
  Alert,
  Modal,
  Animated,
  PermissionsAndroid,
  Platform,
  Linking,
  StatusBar,
  BackHandler,
  PanResponder,
  ActivityIndicator,
} from 'react-native';
import { useRoute, useNavigation, useFocusEffect, useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import * as Icons from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SIDEBAR_DATA } from './sidebarData';
import { normalizeMainCategoryName, fetchCategoryHierarchy } from '../../services/categoryService';
import { apiFetch, resolveImageUrl } from '../../services/api';
import { useCartStore } from '../../store/cartStore';
import CartModal from '../../components/CartModal';
import TravelSearchModal from '../../components/TravelSearchModal';
import {
  TravelSearchParams,
  TravelRideItem,
  isRealTravelProduct,
  mapProductToTravelItem,
  matchesLocation,
  matchesDepartureTimeSlot,
  matchesPriceBudget,
  DEFAULT_POPULAR_ORIGINS,
  DEFAULT_POPULAR_DESTINATIONS,
  formatJourneyDate,
} from './travelData';
import {
  setupVoiceListeners,
  cleanupVoiceListeners,
  startVoiceRecording,
  stopVoiceRecording,
} from '../../utils/safeVoice';
import { useThemeStore } from '../../store/themeStore';
import JobCard, { JobItem } from '../../components/JobCard';
import { useOrderStore } from '../../store/orderStore';
import { useAuthStore } from '../../store/authStore';
import { useWishlistStore } from '../../store/wishlistStore';
import RazorpayModal, { RazorpayOrderDetails } from '../../components/RazorpayModal';
import { useToastStore } from '../../store/toastStore';
import { getRelevantProductImage } from '../../utils/productImages';
import { useAuthGuardStore } from '../../store/authGuardStore';
import { useTranslation } from '../../store/languageStore';
import { useNotificationStore } from '../../store/notificationStore';
import { dispatchCustomerNotification } from '../../services/notificationService';

export const CURATED_JOBS_CATALOG: JobItem[] = [];
const CURATED_SERVICES_CATALOG: Record<string, Array<any>> = {};

// General category icon mapping
const getCategoryIconName = (name: string) => {
  const n = name.toLowerCase();
  if (n.includes('fruit') || n.includes('veg') || n.includes('apple')) return 'Apple';
  if (n.includes('groc') || n.includes('staple') || n.includes('package') || n.includes('atta') || n.includes('rice')) return 'Package';
  if (n.includes('dairy') || n.includes('milk') || n.includes('egg') || n.includes('bread')) return 'Milk';
  if (n.includes('snack') || n.includes('beverage') || n.includes('cookie') || n.includes('drink')) return 'Cookie';
  if (n.includes('oil') || n.includes('masala') || n.includes('flame') || n.includes('spice')) return 'Flame';
  if (n.includes('house') || n.includes('clean') || n.includes('detergent') || n.includes('sparkles')) return 'Sparkles';
  if (n.includes('personal') || n.includes('care') || n.includes('soap') || n.includes('heart')) return 'Heart';
  if (n.includes('health') || n.includes('doctor')) return 'Activity';
  if (n.includes('home') || n.includes('repair')) return 'Home';
  if (n.includes('legal') || n.includes('law')) return 'Scale';
  if (n.includes('finan') || n.includes('tax') || n.includes('loan')) return 'DollarSign';
  if (n.includes('digit') || n.includes('web') || n.includes('tech')) return 'Cpu';
  if (n.includes('auto') || n.includes('car')) return 'Car';
  if (n.includes('edu') || n.includes('course')) return 'GraduationCap';
  if (n.includes('fit') || n.includes('gym')) return 'Dumbbell';
  if (n.includes('event') || n.includes('photo')) return 'PartyPopper';
  if (n.includes('business')) return 'Building2';
  if (n.includes('insur')) return 'Shield';
  if (n.includes('travel')) return 'Plane';
  if (n.includes('stay') || n.includes('hotel')) return 'Bed';
  if (n.includes('employ') || n.includes('job')) return 'Briefcase';
  if (n.includes('all') || n.includes('shop') || n.includes('store') || n.includes('basket')) return 'ShoppingBag';
  return 'Package';
};

const STATIC_NEXT_7_DAYS = (() => {
  const days = [];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const now = new Date();

  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    const dayName = dayNames[d.getDay()];
    const dateNum = d.getDate();
    const monthName = monthNames[d.getMonth()];
    const fullDateStr = `${dayName}, ${dateNum} ${monthName} 2026`;
    const isFull = d.getDay() === 1 || d.getDay() === 4;

    days.push({
      id: `day_${i}`,
      dayName,
      dateNum,
      monthName,
      fullDateStr,
      isFull,
      label: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : `${dayName}, ${dateNum} ${monthName}`,
    });
  }
  return days;
})();

const STATIC_TIMINGS_GRID = [
  { id: 't1', time: '09:00 AM', status: 'AVAILABLE' },
  { id: 't2', time: '10:30 AM', status: 'AVAILABLE' },
  { id: 't3', time: '12:00 PM', status: 'AVAILABLE' },
  { id: 't4', time: '01:30 PM', status: 'NOT_AVAILABLE' },
  { id: 't5', time: '03:00 PM', status: 'AVAILABLE' },
  { id: 't6', time: '04:30 PM', status: 'NOT_AVAILABLE' },
  { id: 't7', time: '06:00 PM', status: 'AVAILABLE' },
  { id: 't8', time: '07:30 PM', status: 'AVAILABLE' },
];

const SRV_CLOCK_HOURS_ITEMS = [
  { val: '12', label: '12' },
  { val: '01', label: '1' },
  { val: '02', label: '2' },
  { val: '03', label: '3' },
  { val: '04', label: '4' },
  { val: '05', label: '5' },
  { val: '06', label: '6' },
  { val: '07', label: '7' },
  { val: '08', label: '8' },
  { val: '09', label: '9' },
  { val: '10', label: '10' },
  { val: '11', label: '11' },
];

const SRV_CLOCK_MINUTES_ITEMS = [
  { val: '00', label: '00' },
  { val: '05', label: '05' },
  { val: '10', label: '10' },
  { val: '15', label: '15' },
  { val: '20', label: '20' },
  { val: '25', label: '25' },
  { val: '30', label: '30' },
  { val: '35', label: '35' },
  { val: '40', label: '40' },
  { val: '45', label: '45' },
  { val: '50', label: '50' },
  { val: '55', label: '55' },
];

const parseTimeToMinutes = (timeStr?: string): number => {
  if (!timeStr) return 0;
  const clean = timeStr.trim().toUpperCase();
  const isPM = clean.includes('PM');
  const isAM = clean.includes('AM');
  const match = clean.match(/(\d+):(\d+)/);
  if (!match) return 0;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  if (isPM && hours < 12) hours += 12;
  if (isAM && hours === 12) hours = 0;
  return hours * 60 + minutes;
};

const TravelPriceSlider = ({
  min = 300,
  max = 10000,
  value,
  onChange,
  isLight,
}: {
  min?: number;
  max?: number;
  value: number;
  onChange: (val: number) => void;
  isLight: boolean;
}) => {
  const [sliderWidth, setSliderWidth] = useState(300);
  const sliderWidthRef = useRef(300);
  sliderWidthRef.current = sliderWidth;

  const updateFromPosition = useCallback(
    (locX: number) => {
      const sw = sliderWidthRef.current || 300;
      const clampedX = Math.max(0, Math.min(locX, sw));
      const ratio = clampedX / sw;
      const rawVal = Math.round(min + ratio * (max - min));
      const step = rawVal < 1500 ? 50 : rawVal < 4000 ? 100 : 250;
      const rounded = Math.round(rawVal / step) * step;
      onChange(Math.max(min, Math.min(rounded, max)));
    },
    [min, max, onChange]
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => true,
        onMoveShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponderCapture: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (evt) => {
          updateFromPosition(evt.nativeEvent.locationX);
        },
        onPanResponderMove: (evt) => {
          updateFromPosition(evt.nativeEvent.locationX);
        },
      }),
    [updateFromPosition]
  );

  const percentage = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));

  return (
    <View style={{ marginTop: 6, marginBottom: 8 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Text style={{ fontSize: 13, color: '#64748B', fontWeight: '700' }}>Price Up To</Text>
        <View
          style={{
            backgroundColor: '#FFFBEB',
            borderColor: '#F5B800',
            borderWidth: 1.5,
            paddingHorizontal: 12,
            paddingVertical: 4,
            borderRadius: 16,
          }}
        >
          <Text style={{ fontSize: 13, fontWeight: '900', color: '#B45309' }}>
            ₹300 – ₹{value.toLocaleString('en-IN')}
          </Text>
        </View>
      </View>

      {/* Slider Track with PanResponder Handling */}
      <View
        onLayout={(e) => {
          const w = e.nativeEvent.layout.width;
          if (w > 0) setSliderWidth(w);
        }}
        {...panResponder.panHandlers}
        style={{
          height: 44,
          justifyContent: 'center',
        }}
      >
        {/* Track Line Background */}
        <View
          style={{
            height: 7,
            backgroundColor: isLight ? '#E2E8F0' : 'rgba(255, 255, 255, 0.15)',
            borderRadius: 3.5,
            width: '100%',
            overflow: 'hidden',
          }}
        >
          {/* Active Colored Fill Line */}
          <View
            style={{
              height: '100%',
              width: `${percentage}%`,
              backgroundColor: '#F5B800',
              borderRadius: 3.5,
            }}
          />
        </View>

        {/* Thumb Knob */}
        <View
          style={{
            position: 'absolute',
            left: `${percentage}%`,
            marginLeft: -14,
            width: 28,
            height: 28,
            borderRadius: 14,
            backgroundColor: '#F5B800',
            borderWidth: 3.5,
            borderColor: '#FFFFFF',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.28,
            shadowRadius: 4,
            elevation: 5,
          }}
        />
      </View>

      {/* Min & Max Labels */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 2, marginBottom: 8 }}>
        <Text style={{ fontSize: 11, fontWeight: '800', color: '#94A3B8' }}>₹300</Text>
        <Text style={{ fontSize: 11, fontWeight: '800', color: '#94A3B8' }}>₹10,000</Text>
      </View>

      {/* Quick Select Presets */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
        {[
          { label: '₹750', val: 750 },
          { label: '₹1,200', val: 1200 },
          { label: '₹2,500', val: 2500 },
          { label: '₹5,000', val: 5000 },
          { label: '₹10,000 (Max)', val: 10000 },
        ].map((pr) => {
          const isAct = value === pr.val;
          return (
            <TouchableOpacity
              key={pr.label}
              style={{
                backgroundColor: isAct ? '#F5B800' : isLight ? '#F1F5F9' : 'rgba(255,255,255,0.06)',
                borderColor: isAct ? '#F5B800' : isLight ? '#E2E8F0' : 'rgba(255,255,255,0.08)',
                borderWidth: 1,
                borderRadius: 8,
                paddingHorizontal: 10,
                paddingVertical: 5,
              }}
              activeOpacity={0.8}
              onPress={() => onChange(pr.val)}
            >
              <Text style={{ fontSize: 11, fontWeight: isAct ? '800' : '600', color: isAct ? '#0F172A' : '#64748B' }}>
                {pr.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

// Helper to strip emojis and clean strings for matching
const cleanStr = (str: string) => (str || '').replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}]/gu, '').toLowerCase().trim();

export default function CategoryDetails() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const route = useRoute();
  const navigation = useNavigation<any>();
  const routeParams = (route.params as any) || {};
  const categoryName = routeParams.categoryName || 'Services';

  const colors = useThemeStore((state) => state.colors);
  const isDark = useThemeStore((state) => state.isDark);
  const isLight = !isDark;
  const { t } = useTranslation();

  const loadAllOrders = useOrderStore((state) => state.loadAllOrders);

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubcat, setSelectedSubcat] = useState<string>(routeParams?.subCategoryName || 'All');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  useEffect(() => {
    setPage(1);
  }, [categoryName, selectedSubcat, searchQuery]);

  const [schedulingItem, setSchedulingItem] = useState<any | null>(null);
  const [selectedDateObj, setSelectedDateObj] = useState<any | null>(null);
  const [selectedSlotObj, setSelectedSlotObj] = useState<any | null>(null);

  // Service Scheduler Calendar Modal & Analog Rotatable Clock Modal States
  const [srvDatePickerVisible, setSrvDatePickerVisible] = useState(false);
  const [srvCalendarYear, setSrvCalendarYear] = useState<number>(() => new Date().getFullYear());
  const [srvCalendarMonth, setSrvCalendarMonth] = useState<number>(() => new Date().getMonth());
  const [srvSelectedCalendarDate, setSrvSelectedCalendarDate] = useState<Date>(() => new Date());

  const [srvTimePickerVisible, setSrvTimePickerVisible] = useState(false);
  const [srvClockMode, setSrvClockMode] = useState<'hour' | 'minute'>('hour');
  const [srvPickerHour, setSrvPickerHour] = useState('09');
  const [srvPickerMinute, setSrvPickerMinute] = useState('00');
  const [srvPickerPeriod, setSrvPickerPeriod] = useState<'AM' | 'PM'>('AM');

  const srvClockModeRef = useRef<'hour' | 'minute'>(srvClockMode);
  useEffect(() => {
    srvClockModeRef.current = srvClockMode;
  }, [srvClockMode]);

  const srvCalendarDays = useMemo(() => {
    const daysInMonth = new Date(srvCalendarYear, srvCalendarMonth + 1, 0).getDate();
    const firstDayIndex = new Date(srvCalendarYear, srvCalendarMonth, 1).getDay();

    const cells: { day: number | null; dateObj: Date | null }[] = [];
    for (let i = 0; i < firstDayIndex; i++) {
      cells.push({ day: null, dateObj: null });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({
        day: d,
        dateObj: new Date(srvCalendarYear, srvCalendarMonth, d),
      });
    }
    return cells;
  }, [srvCalendarYear, srvCalendarMonth]);

  const handleSrvPrevMonth = useCallback(() => {
    setSrvCalendarMonth((m) => {
      if (m === 0) {
        setSrvCalendarYear((y) => y - 1);
        return 11;
      }
      return m - 1;
    });
  }, []);

  const handleSrvNextMonth = useCallback(() => {
    setSrvCalendarMonth((m) => {
      if (m === 11) {
        setSrvCalendarYear((y) => y + 1);
        return 0;
      }
      return m + 1;
    });
  }, []);

  const handleSrvSelectDate = useCallback((dateObj: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const checkDate = new Date(dateObj);
    checkDate.setHours(0, 0, 0, 0);

    if (checkDate < today) {
      Alert.alert('Past Date', 'Please select a date from today onwards.');
      return;
    }

    setSrvSelectedCalendarDate(checkDate);
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dayName = dayNames[checkDate.getDay()];
    const dateNum = checkDate.getDate();
    const monthName = monthNames[checkDate.getMonth()];
    const fullDateStr = `${dayName}, ${dateNum} ${monthName} ${checkDate.getFullYear()}`;

    setSelectedDateObj({
      id: `cal_${checkDate.getTime()}`,
      dayName,
      dateNum,
      monthName,
      fullDateStr,
      isFull: false,
    });
    setSrvDatePickerVisible(false);
  }, []);

  const srvClockHandAngle = useMemo(() => {
    if (srvClockMode === 'hour') {
      const idx = SRV_CLOCK_HOURS_ITEMS.findIndex(
        (item) => item.val === srvPickerHour || parseInt(item.val, 10) === parseInt(srvPickerHour, 10)
      );
      return (idx >= 0 ? idx : 0) * 30;
    } else {
      const idx = SRV_CLOCK_MINUTES_ITEMS.findIndex(
        (item) => item.val === srvPickerMinute || parseInt(item.val, 10) === parseInt(srvPickerMinute, 10)
      );
      return (idx >= 0 ? idx : 0) * 30;
    }
  }, [srvClockMode, srvPickerHour, srvPickerMinute]);

  const updateSrvClockFromLocation = useCallback((locX: number, locY: number) => {
    const center = 125;
    const dx = locX - center;
    const dy = locY - center;
    const rad = Math.atan2(dy, dx);
    const deg = (rad * (180 / Math.PI) + 90 + 360) % 360;

    if (srvClockModeRef.current === 'hour') {
      const hIdx = Math.round(deg / 30) % 12;
      const hoursList = ['12', '01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11'];
      setSrvPickerHour(hoursList[hIdx]);
    } else {
      const mIdx = Math.round(deg / 30) % 12;
      const minutesList = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];
      setSrvPickerMinute(minutesList[mIdx]);
    }
  }, []);

  const srvClockPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt) => {
          updateSrvClockFromLocation(evt.nativeEvent.locationX, evt.nativeEvent.locationY);
        },
        onPanResponderMove: (evt) => {
          updateSrvClockFromLocation(evt.nativeEvent.locationX, evt.nativeEvent.locationY);
        },
        onPanResponderRelease: () => {
          if (srvClockModeRef.current === 'hour') {
            setSrvClockMode('minute');
          }
        },
      }),
    [updateSrvClockFromLocation]
  );

  const handleConfirmSrvTime = useCallback(() => {
    const formattedTime = `${srvPickerHour}:${srvPickerMinute} ${srvPickerPeriod}`;
    setSelectedSlotObj({
      id: `clock_${formattedTime}`,
      time: formattedTime,
      status: 'AVAILABLE',
    });
    setSrvTimePickerVisible(false);
  }, [srvPickerHour, srvPickerMinute, srvPickerPeriod]);

  const openSrvTimePicker = useCallback(() => {
    if (selectedSlotObj?.time) {
      const match = selectedSlotObj.time.match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (match) {
        setSrvPickerHour(match[1].padStart(2, '0'));
        setSrvPickerMinute(match[2].padStart(2, '0'));
        setSrvPickerPeriod(match[3].toUpperCase() as 'AM' | 'PM');
      }
    }
    setSrvClockMode('hour');
    setSrvTimePickerVisible(true);
  }, [selectedSlotObj]);

  const openSrvDatePicker = useCallback(() => {
    if (selectedDateObj?.dateNum && selectedDateObj?.monthName) {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const mIdx = monthNames.findIndex((m) => m.toLowerCase() === selectedDateObj.monthName.toLowerCase());
      if (mIdx >= 0) {
        setSrvCalendarMonth(mIdx);
      }
    }
    setSrvDatePickerVisible(true);
  }, [selectedDateObj]);

  // Service-Type Aware Field States
  const [consultationMode, setConsultationMode] = useState<'video' | 'clinic' | 'phone' | 'office'>('video');
  const [patientNameInput, setPatientNameInput] = useState('Rahul Kumar');
  const [symptomsInput, setSymptomsInput] = useState('');
  const [selectedProblemPackage, setSelectedProblemPackage] = useState('Standard Service & Jet Wash');
  const [selectedAddress, setSelectedAddress] = useState('Koramangala 5th Block, Bangalore');
  const [selectedDuration, setSelectedDuration] = useState('1 Hour Session');
  const [vehicleModelInput, setVehicleModelInput] = useState('Honda City - Petrol (KA-01-MJ-1234)');
  const [fulfillmentMode, setFulfillmentMode] = useState<'doorstep' | 'workshop'>('doorstep');
  const [stayRoomType, setStayRoomType] = useState('Deluxe Garden View');
  const [requirementBrief, setRequirementBrief] = useState('');

  // Traveler / Guest details array for each person travelling (Name, Aadhaar, Mobile Number)
  const [travelerList, setTravelerList] = useState<Array<{ name: string; aadhar: string; phone: string }>>([
    {
      name: useAuthStore.getState().currentUser?.name || '',
      aadhar: '',
      phone: useAuthStore.getState().currentUser?.phone || '',
    },
  ]);

  const travelGuests = `${travelerList.length} ${travelerList.length === 1 ? 'Guest' : 'Guests'}`;

  // Dedicated Travel Booking Steps & Boarding/Dropping selection
  const [travelBookingStep, setTravelBookingStep] = useState<'GUESTS' | 'BOARDING_DROPPING'>('GUESTS');
  const [selectedBoardingPoint, setSelectedBoardingPoint] = useState<string>('');
  const [selectedDroppingPoint, setSelectedDroppingPoint] = useState<string>('');

  const getTargetGuestCount = useCallback((_guestsStr?: string): number => {
    return Math.max(1, travelerList.length);
  }, [travelerList.length]);

  const handleAddGuest = useCallback(() => {
    setTravelerList((prev) => [
      ...prev,
      {
        name: '',
        aadhar: '',
        phone: '',
      },
    ]);
  }, []);

  const handleRemoveGuest = useCallback((indexToRemove: number) => {
    setTravelerList((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, idx) => idx !== indexToRemove);
    });
  }, []);

  const updateTravelerInfo = (index: number, field: 'name' | 'aadhar' | 'phone', val: string) => {
    setTravelerList((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: val };
      return updated;
    });
  };

  useFocusEffect(
    useCallback(() => {
      const curUser = useAuthStore.getState().currentUser;
      const isGuestMode = !curUser || curUser.isGuest || (curUser.name || '').toLowerCase().includes('guest');
      const uId = curUser?.id || 'guest_user';
      const storageKey = isGuestMode ? 'connect_guest_addresses' : `connect_user_addresses_${uId}`;

      AsyncStorage.getItem(storageKey).then((saved: string | null) => {
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const def = parsed.find((a: any) => a.isDefault) || parsed[0];
            const parts = [def.house, def.street, def.city, def.pincode].filter(Boolean);
            if (parts.length > 0) {
              setSelectedAddress(`${def.label || 'Home'} — ${parts.join(', ')}`);
              return;
            }
          }
        }
        if (curUser?.address) {
          const parts = [curUser.address.house, curUser.address.street || curUser.address.address, curUser.address.city, curUser.address.pincode].filter(Boolean);
          setSelectedAddress(parts.join(', '));
        }
      }).catch(() => {});
    }, [])
  );

  // Razorpay Test Mode States
  const [razorpayModalVisible, setRazorpayModalVisible] = useState(false);
  const [razorpayOrder, setRazorpayOrder] = useState<RazorpayOrderDetails | null>(null);
  const [pendingBookingDetails, setPendingBookingDetails] = useState<any | null>(null);

  // Cart & Wishlist Store State
  const [isCartVisible, setIsCartVisible] = useState(false);
  const cartItems = useCartStore((state) => state.cartItems);
  const addToCart = useCartStore((state) => state.addToCart);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeFromCart = useCartStore((state) => state.removeFromCart);
  const totalCartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  const wishlistItems = useWishlistStore((state) => state.wishlistItems);
  const toggleWishlist = useWishlistStore((state) => state.toggleWishlist);
  const isInWishlist = (id: string) => wishlistItems.some((w) => w.id === id);

  // --- STAY MODULE ISOLATED STATE ---
  const isStayCategory = (categoryName || '').toLowerCase().includes('stay') || (categoryName || '').toLowerCase().includes('hotel') || (categoryName || '').toLowerCase().includes('resort');

  const [selectedDestination, setSelectedDestination] = useState<string>(routeParams?.destination || 'Near me');
  const [isDestModalOpen, setIsDestModalOpen] = useState(false);
  const [destSearchQuery, setDestSearchQuery] = useState('');

  // Date Range Picker State (Dynamic Calendar)
  const [checkInDateObj, setCheckInDateObj] = useState<Date>(() => routeParams?.checkInDate ? new Date(routeParams.checkInDate) : new Date(2026, 9, 6)); // 06 Oct 2026
  const [checkOutDateObj, setCheckOutDateObj] = useState<Date>(() => routeParams?.checkOutDate ? new Date(routeParams.checkOutDate) : new Date(2026, 9, 7)); // 07 Oct 2026
  const [tempCheckInDate, setTempCheckInDate] = useState<Date>(() => routeParams?.checkInDate ? new Date(routeParams.checkInDate) : new Date(2026, 9, 6));
  const [tempCheckOutDate, setTempCheckOutDate] = useState<Date>(() => routeParams?.checkOutDate ? new Date(routeParams.checkOutDate) : new Date(2026, 9, 9));
  const [calendarYear, setCalendarYear] = useState<number>(2026);
  const [calendarMonth, setCalendarMonth] = useState<number>(9); // 0-indexed: 9 = October
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);

  // Helper date formatters
  const formatStayDateDisplay = useCallback((date: Date | null | undefined): string => {
    if (!date) return '';
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return `${day} ${monthNames[d.getMonth()]}, ${dayNames[d.getDay()]}`;
  }, []);

  const formatStayDateShort = useCallback((date: Date | null | undefined): string => {
    if (!date) return '';
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${day} ${monthNames[d.getMonth()]}`;
  }, []);

  const checkInDate = useMemo(() => formatStayDateShort(checkInDateObj), [checkInDateObj, formatStayDateShort]);
  const checkOutDate = useMemo(() => formatStayDateShort(checkOutDateObj), [checkOutDateObj, formatStayDateShort]);
  const stayNights = useMemo(() => {
    if (!checkInDateObj || !checkOutDateObj) return 1;
    const diff = checkOutDateObj.getTime() - checkInDateObj.getTime();
    return Math.max(1, Math.round(diff / (1000 * 60 * 60 * 24)));
  }, [checkInDateObj, checkOutDateObj]);

  const tempCalculatedNights = useMemo(() => {
    if (!tempCheckInDate || !tempCheckOutDate) return 1;
    const diff = tempCheckOutDate.getTime() - tempCheckInDate.getTime();
    return Math.max(1, Math.round(diff / (1000 * 60 * 60 * 24)));
  }, [tempCheckInDate, tempCheckOutDate]);

  // Guest Selector State (Default: 1 room, 1 adult, 0 children matching screenshot)
  const [stayAdults, setStayAdults] = useState(routeParams?.adults || 1);
  const [stayChildren, setStayChildren] = useState(routeParams?.children || 0);
  const [stayRooms, setStayRooms] = useState(routeParams?.rooms || 1);
  const [tempAdults, setTempAdults] = useState(routeParams?.adults || 1);
  const [tempChildren, setTempChildren] = useState(routeParams?.children || 0);
  const [tempRooms, setTempRooms] = useState(routeParams?.rooms || 1);
  const [isGuestModalOpen, setIsGuestModalOpen] = useState(false);

  // Filter, Sort & Map State
  const [isStayFilterOpen, setIsStayFilterOpen] = useState(false);
  const [selectedStaySort, setSelectedStaySort] = useState<'Recommended' | 'Price Low → High' | 'Price High → Low' | 'Rating'>('Recommended');
  const [isStaySortOpen, setIsStaySortOpen] = useState(false);
  const [isStayMapOpen, setIsStayMapOpen] = useState(false);

  // Applied Stay Filter Options
  const [selectedStayPriceRange, setSelectedStayPriceRange] = useState<string>('All');
  const [selectedStayPropTypes, setSelectedStayPropTypes] = useState<string[]>([]);
  const [selectedStayStarRatings, setSelectedStayStarRatings] = useState<number[]>([]);
  const [selectedStayGuestRating, setSelectedStayGuestRating] = useState<number | null>(null);
  const [selectedStayAmenities, setSelectedStayAmenities] = useState<string[]>([]);
  const [freeCancelOnly, setFreeCancelOnly] = useState(false);
  const [selectedStayChildCategory, setSelectedStayChildCategory] = useState<string>('All');

  // Draft Stay Filter Options (inside modal before tapping Apply)
  const [draftStayPriceRange, setDraftStayPriceRange] = useState<string>('All');
  const [draftStayPropTypes, setDraftStayPropTypes] = useState<string[]>([]);
  const [draftStayStarRatings, setDraftStayStarRatings] = useState<number[]>([]);
  const [draftStayGuestRating, setDraftStayGuestRating] = useState<number | null>(null);
  const [draftStayAmenities, setDraftStayAmenities] = useState<string[]>([]);
  const [draftFreeCancelOnly, setDraftFreeCancelOnly] = useState(false);

  const openStayFilterModal = () => {
    setDraftStayPriceRange(selectedStayPriceRange);
    setDraftStayPropTypes([...selectedStayPropTypes]);
    setDraftStayStarRatings([...selectedStayStarRatings]);
    setDraftStayGuestRating(selectedStayGuestRating);
    setDraftStayAmenities([...selectedStayAmenities]);
    setDraftFreeCancelOnly(freeCancelOnly);
    setIsStayFilterOpen(true);
  };

  const resetStayDraftFilters = () => {
    setDraftStayPriceRange('All');
    setDraftStayPropTypes([]);
    setDraftStayStarRatings([]);
    setDraftStayGuestRating(null);
    setDraftStayAmenities([]);
    setDraftFreeCancelOnly(false);
  };

  const applyStayFilters = () => {
    setSelectedStayPriceRange(draftStayPriceRange);
    setSelectedStayPropTypes(draftStayPropTypes);
    setSelectedStayStarRatings(draftStayStarRatings);
    setSelectedStayGuestRating(draftStayGuestRating);
    setSelectedStayAmenities(draftStayAmenities);
    setFreeCancelOnly(draftFreeCancelOnly);
    setIsStayFilterOpen(false);
  };

  const stayActiveFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedStayPriceRange !== 'All') count++;
    if (selectedStayPropTypes.length > 0) count += selectedStayPropTypes.length;
    if (selectedStayStarRatings.length > 0) count += selectedStayStarRatings.length;
    if (selectedStayGuestRating !== null) count++;
    if (selectedStayAmenities.length > 0) count += selectedStayAmenities.length;
    if (freeCancelOnly) count++;
    return count;
  }, [
    selectedStayPriceRange,
    selectedStayPropTypes,
    selectedStayStarRatings,
    selectedStayGuestRating,
    selectedStayAmenities,
    freeCancelOnly,
  ]);

  // Products Specific Filter & Sort States (Applied & Draft)
  const isProductsCategory = (categoryName || '').toLowerCase().includes('product');

  const [selectedProdCategory, setSelectedProdCategory] = useState<string>('All');
  const [selectedProdBrand, setSelectedProdBrand] = useState<string>('All');
  const [selectedProdPrice, setSelectedProdPrice] = useState<string>('All');
  const [selectedProdRating, setSelectedProdRating] = useState<number | null>(null);
  const [selectedProdDiscount, setSelectedProdDiscount] = useState<string>('All');
  const [selectedProdInStockOnly, setSelectedProdInStockOnly] = useState<boolean>(false);
  const [selectedProdSort, setSelectedProdSort] = useState<string>('Recommended');

  // Draft States for Products Filter Modal
  const [draftProdCategory, setDraftProdCategory] = useState<string>('All');
  const [draftProdBrand, setDraftProdBrand] = useState<string>('All');
  const [draftProdPrice, setDraftProdPrice] = useState<string>('All');
  const [draftProdRating, setDraftProdRating] = useState<number | null>(null);
  const [draftProdDiscount, setDraftProdDiscount] = useState<string>('All');
  const [draftProdInStockOnly, setDraftProdInStockOnly] = useState<boolean>(false);
  const [draftProdSort, setDraftProdSort] = useState<string>('Recommended');

  const [isProdFilterOpen, setIsProdFilterOpen] = useState(false);
  const [isCategorySortOpen, setIsCategorySortOpen] = useState(false);

  const openProdFilterModal = () => {
    setDraftProdCategory(selectedProdCategory);
    setDraftProdBrand(selectedProdBrand);
    setDraftProdPrice(selectedProdPrice);
    setDraftProdRating(selectedProdRating);
    setDraftProdDiscount(selectedProdDiscount);
    setDraftProdInStockOnly(selectedProdInStockOnly);
    setDraftProdSort(selectedProdSort);
    setIsProdFilterOpen(true);
  };

  const resetProdDraftFilters = () => {
    setDraftProdCategory('All');
    setDraftProdBrand('All');
    setDraftProdPrice('All');
    setDraftProdRating(null);
    setDraftProdDiscount('All');
    setDraftProdInStockOnly(false);
    setDraftProdSort('Recommended');
  };

  const applyProdFilters = () => {
    setSelectedProdCategory(draftProdCategory);
    setSelectedProdBrand(draftProdBrand);
    setSelectedProdPrice(draftProdPrice);
    setSelectedProdRating(draftProdRating);
    setSelectedProdDiscount(draftProdDiscount);
    setSelectedProdInStockOnly(draftProdInStockOnly);
    setSelectedProdSort(draftProdSort);
    setIsProdFilterOpen(false);
  };

  const prodActiveFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedProdCategory !== 'All') count++;
    if (selectedProdBrand !== 'All') count++;
    if (selectedProdPrice !== 'All') count++;
    if (selectedProdRating !== null) count++;
    if (selectedProdDiscount !== 'All') count++;
    if (selectedProdInStockOnly) count++;
    if (selectedProdSort !== 'Recommended') count++;
    return count;
  }, [
    selectedProdCategory,
    selectedProdBrand,
    selectedProdPrice,
    selectedProdRating,
    selectedProdDiscount,
    selectedProdInStockOnly,
    selectedProdSort,
  ]);

  // Daily Needs Specific Filter States (Applied & Draft)
  const isDailyNeedsCategory = (categoryName || '').toLowerCase().includes('daily') || (categoryName || '').toLowerCase().includes('grocery') || (categoryName || '').toLowerCase().includes('need');

  const [selectedDnCategory, setSelectedDnCategory] = useState<string>('All');
  const [selectedDnBrand, setSelectedDnBrand] = useState<string>('All');
  const [selectedDnPrice, setSelectedDnPrice] = useState<string>('All');
  const [selectedDnRating, setSelectedDnRating] = useState<number | null>(null);
  const [selectedDnPackSize, setSelectedDnPackSize] = useState<string>('All');
  const [selectedDnInStockOnly, setSelectedDnInStockOnly] = useState<boolean>(false);
  const [selectedDnDeliveryTime, setSelectedDnDeliveryTime] = useState<string>('All');
  const [selectedDnSort, setSelectedDnSort] = useState<string>('Recommended');

  // Draft States for Daily Needs Filter Modal
  const [draftDnCategory, setDraftDnCategory] = useState<string>('All');
  const [draftDnBrand, setDraftDnBrand] = useState<string>('All');
  const [draftDnPrice, setDraftDnPrice] = useState<string>('All');
  const [draftDnRating, setDraftDnRating] = useState<number | null>(null);
  const [draftDnPackSize, setDraftDnPackSize] = useState<string>('All');
  const [draftDnInStockOnly, setDraftDnInStockOnly] = useState<boolean>(false);
  const [draftDnDeliveryTime, setDraftDnDeliveryTime] = useState<string>('All');
  const [draftDnSort, setDraftDnSort] = useState<string>('Recommended');

  const [isDnFilterOpen, setIsDnFilterOpen] = useState(false);

  const openDnFilterModal = () => {
    setDraftDnCategory(selectedDnCategory);
    setDraftDnBrand(selectedDnBrand);
    setDraftDnPrice(selectedDnPrice);
    setDraftDnRating(selectedDnRating);
    setDraftDnPackSize(selectedDnPackSize);
    setDraftDnInStockOnly(selectedDnInStockOnly);
    setDraftDnDeliveryTime(selectedDnDeliveryTime);
    setDraftDnSort(selectedDnSort);
    setIsDnFilterOpen(true);
  };

  const resetDnDraftFilters = () => {
    setDraftDnCategory('All');
    setDraftDnBrand('All');
    setDraftDnPrice('All');
    setDraftDnRating(null);
    setDraftDnPackSize('All');
    setDraftDnInStockOnly(false);
    setDraftDnDeliveryTime('All');
    setDraftDnSort('Recommended');
  };

  const applyDnFilters = () => {
    setSelectedDnCategory(draftDnCategory);
    setSelectedDnBrand(draftDnBrand);
    setSelectedDnPrice(draftDnPrice);
    setSelectedDnRating(draftDnRating);
    setSelectedDnPackSize(draftDnPackSize);
    setSelectedDnInStockOnly(draftDnInStockOnly);
    setSelectedDnDeliveryTime(draftDnDeliveryTime);
    setSelectedDnSort(draftDnSort);
    setIsDnFilterOpen(false);
  };

  const dnActiveFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedDnCategory !== 'All') count++;
    if (selectedDnBrand !== 'All') count++;
    if (selectedDnPrice !== 'All') count++;
    if (selectedDnRating !== null) count++;
    if (selectedDnPackSize !== 'All') count++;
    if (selectedDnInStockOnly) count++;
    if (selectedDnDeliveryTime !== 'All') count++;
    if (selectedDnSort !== 'Recommended') count++;
    return count;
  }, [
    selectedDnCategory,
    selectedDnBrand,
    selectedDnPrice,
    selectedDnRating,
    selectedDnPackSize,
    selectedDnInStockOnly,
    selectedDnDeliveryTime,
    selectedDnSort,
  ]);

  // Food Specific Filter States (Applied & Draft)
  const isFoodCategory = (categoryName || '').toLowerCase().includes('food') || (categoryName || '').toLowerCase().includes('restaurant') || (categoryName || '').toLowerCase().includes('dining');

  const [selectedFoodCuisine, setSelectedFoodCuisine] = useState<string>('All');
  const [selectedFoodVegMode, setSelectedFoodVegMode] = useState<string>('All');
  const [selectedFoodPrice, setSelectedFoodPrice] = useState<string>('All');
  const [selectedFoodRating, setSelectedFoodRating] = useState<number | null>(null);
  const [selectedFoodDeliveryTime, setSelectedFoodDeliveryTime] = useState<string>('All');
  const [selectedFoodOffersOnly, setSelectedFoodOffersOnly] = useState<boolean>(false);
  const [selectedFoodSort, setSelectedFoodSort] = useState<string>('Recommended');

  // Draft States for Food Filter Modal
  const [draftFoodCuisine, setDraftFoodCuisine] = useState<string>('All');
  const [draftFoodVegMode, setDraftFoodVegMode] = useState<string>('All');
  const [draftFoodPrice, setDraftFoodPrice] = useState<string>('All');
  const [draftFoodRating, setDraftFoodRating] = useState<number | null>(null);
  const [draftFoodDeliveryTime, setDraftFoodDeliveryTime] = useState<string>('All');
  const [draftFoodOffersOnly, setDraftFoodOffersOnly] = useState<boolean>(false);
  const [draftFoodSort, setDraftFoodSort] = useState<string>('Recommended');

  const [isFoodFilterOpen, setIsFoodFilterOpen] = useState(false);

  const openFoodFilterModal = () => {
    setDraftFoodCuisine(selectedFoodCuisine);
    setDraftFoodVegMode(selectedFoodVegMode);
    setDraftFoodPrice(selectedFoodPrice);
    setDraftFoodRating(selectedFoodRating);
    setDraftFoodDeliveryTime(selectedFoodDeliveryTime);
    setDraftFoodOffersOnly(selectedFoodOffersOnly);
    setDraftFoodSort(selectedFoodSort);
    setIsFoodFilterOpen(true);
  };

  const resetFoodDraftFilters = () => {
    setDraftFoodCuisine('All');
    setDraftFoodVegMode('All');
    setDraftFoodPrice('All');
    setDraftFoodRating(null);
    setDraftFoodDeliveryTime('All');
    setDraftFoodOffersOnly(false);
    setDraftFoodSort('Recommended');
  };

  const applyFoodFilters = () => {
    setSelectedFoodCuisine(draftFoodCuisine);
    setSelectedFoodVegMode(draftFoodVegMode);
    setSelectedFoodPrice(draftFoodPrice);
    setSelectedFoodRating(draftFoodRating);
    setSelectedFoodDeliveryTime(draftFoodDeliveryTime);
    setSelectedFoodOffersOnly(draftFoodOffersOnly);
    setSelectedFoodSort(draftFoodSort);
    setIsFoodFilterOpen(false);
  };

  const foodActiveFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedFoodCuisine !== 'All') count++;
    if (selectedFoodVegMode !== 'All') count++;
    if (selectedFoodPrice !== 'All') count++;
    if (selectedFoodRating !== null) count++;
    if (selectedFoodDeliveryTime !== 'All') count++;
    if (selectedFoodOffersOnly) count++;
    if (selectedFoodSort !== 'Recommended') count++;
    return count;
  }, [
    selectedFoodCuisine,
    selectedFoodVegMode,
    selectedFoodPrice,
    selectedFoodRating,
    selectedFoodDeliveryTime,
    selectedFoodOffersOnly,
    selectedFoodSort,
  ]);

  // Services Specific Filter States (Applied & Draft)
  const isServicesCategory = (categoryName || '').toLowerCase().includes('service') && !(categoryName || '').toLowerCase().includes('stay');

  const [selectedSrvType, setSelectedSrvType] = useState<string>('All');
  const [selectedSrvPrice, setSelectedSrvPrice] = useState<string>('All');
  const [selectedSrvRating, setSelectedSrvRating] = useState<number | null>(null);
  const [selectedSrvAvailability, setSelectedSrvAvailability] = useState<boolean>(false);
  const [selectedSrvTime, setSelectedSrvTime] = useState<string>('All');
  const [selectedSrvBookingMode, setSelectedSrvBookingMode] = useState<string>('All');
  const [selectedSrvSort, setSelectedSrvSort] = useState<string>('Recommended');

  // Draft States for Services Filter Modal
  const [draftSrvType, setDraftSrvType] = useState<string>('All');
  const [draftSrvPrice, setDraftSrvPrice] = useState<string>('All');
  const [draftSrvRating, setDraftSrvRating] = useState<number | null>(null);
  const [draftSrvAvailability, setDraftSrvAvailability] = useState<boolean>(false);
  const [draftSrvTime, setDraftSrvTime] = useState<string>('All');
  const [draftSrvBookingMode, setDraftSrvBookingMode] = useState<string>('All');
  const [draftSrvSort, setDraftSrvSort] = useState<string>('Recommended');

  const [isSrvFilterOpen, setIsSrvFilterOpen] = useState(false);

  const openSrvFilterModal = () => {
    setDraftSrvType(selectedSrvType);
    setDraftSrvPrice(selectedSrvPrice);
    setDraftSrvRating(selectedSrvRating);
    setDraftSrvAvailability(selectedSrvAvailability);
    setDraftSrvTime(selectedSrvTime);
    setDraftSrvBookingMode(selectedSrvBookingMode);
    setDraftSrvSort(selectedSrvSort);
    setIsSrvFilterOpen(true);
  };

  const resetSrvDraftFilters = () => {
    setDraftSrvType('All');
    setDraftSrvPrice('All');
    setDraftSrvRating(null);
    setDraftSrvAvailability(false);
    setDraftSrvTime('All');
    setDraftSrvBookingMode('All');
    setDraftSrvSort('Recommended');
  };

  const applySrvFilters = () => {
    setSelectedSrvType(draftSrvType);
    setSelectedSrvPrice(draftSrvPrice);
    setSelectedSrvRating(draftSrvRating);
    setSelectedSrvAvailability(draftSrvAvailability);
    setSelectedSrvTime(draftSrvTime);
    setSelectedSrvBookingMode(draftSrvBookingMode);
    setSelectedSrvSort(draftSrvSort);
    setIsSrvFilterOpen(false);
  };

  const srvActiveFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedSrvType !== 'All') count++;
    if (selectedSrvPrice !== 'All') count++;
    if (selectedSrvRating !== null) count++;
    if (selectedSrvAvailability) count++;
    if (selectedSrvTime !== 'All') count++;
    if (selectedSrvBookingMode !== 'All') count++;
    if (selectedSrvSort !== 'Recommended') count++;
    return count;
  }, [
    selectedSrvType,
    selectedSrvPrice,
    selectedSrvRating,
    selectedSrvAvailability,
    selectedSrvTime,
    selectedSrvBookingMode,
    selectedSrvSort,
  ]);

  const [apiProducts, setApiProducts] = useState<any[]>(() => {
    try {
      const { useProductStore } = require('../../store/productStore');
      const prods = useProductStore.getState().products;
      return Array.isArray(prods) && prods.length > 0 ? prods : [];
    } catch {
      return [];
    }
  });
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [productsFetchError, setProductsFetchError] = useState<string | null>(null);

  // Travel / Bus Booking Specific Filter States (Applied & Draft)
  const isTravelCategory = (categoryName || '').toLowerCase().includes('travel') || (categoryName || '').toLowerCase().includes('bus');

  const [travelFrom, setTravelFrom] = useState<string>(routeParams?.from || '');
  const [travelTo, setTravelTo] = useState<string>(routeParams?.to || '');
  const [travelJourneyDate, setTravelJourneyDate] = useState<string>(
    routeParams?.journeyDate || formatJourneyDate(new Date())
  );
  const [travelDepartureTime, setTravelDepartureTime] = useState<string>(
    routeParams?.departureTime || 'all'
  );
  const [travelPriceRange, setTravelPriceRange] = useState<string>(
    routeParams?.priceRange || 'all'
  );
  const [travelType, setTravelType] = useState<string>(
    routeParams?.travelType || routeParams?.vehicleType || 'all'
  );
  const [travelPassengers, setTravelPassengers] = useState<number>(
    Number(routeParams?.passengers) || 1
  );
  const [isTravelSearchModalOpen, setIsTravelSearchModalOpen] = useState<boolean>(() => {
    return isTravelCategory && (!!routeParams?.openSearchModal || (!routeParams?.from && !routeParams?.to));
  });

  useEffect(() => {
    if (isTravelCategory) {
      if (routeParams?.from !== undefined) setTravelFrom(routeParams.from);
      if (routeParams?.to !== undefined) setTravelTo(routeParams.to);
      if (routeParams?.journeyDate !== undefined) setTravelJourneyDate(routeParams.journeyDate);
      if (routeParams?.departureTime !== undefined) setTravelDepartureTime(routeParams.departureTime);
      if (routeParams?.priceRange !== undefined) setTravelPriceRange(routeParams.priceRange);
      if (routeParams?.travelType !== undefined) setTravelType(routeParams.travelType);
      else if (routeParams?.vehicleType !== undefined) setTravelType(routeParams.vehicleType);
      if (routeParams?.passengers !== undefined) setTravelPassengers(Number(routeParams.passengers) || 1);
      if (routeParams?.openSearchModal) setIsTravelSearchModalOpen(true);
    }
  }, [
    isTravelCategory,
    routeParams?.from,
    routeParams?.to,
    routeParams?.journeyDate,
    routeParams?.departureTime,
    routeParams?.priceRange,
    routeParams?.travelType,
    routeParams?.vehicleType,
    routeParams?.passengers,
    routeParams?.openSearchModal,
  ]);

  const handleResetTravelSearch = useCallback(() => {
    setTravelFrom('');
    setTravelTo('');
    setTravelJourneyDate(formatJourneyDate(new Date()));
    setTravelDepartureTime('all');
    setTravelPriceRange('all');
    setTravelType('all');
    setTravelPassengers(1);
    setSelectedSubcat('All');
    setSelectedBusSort('Price Low → High');
    setSelectedBusAcType('All');
    setSelectedBusOperator('All');
    setSelectedBusDepartureTime('All');
    setSelectedBusMaxPrice(10000);
  }, []);

  const handleApplyTravelSearch = useCallback((params: TravelSearchParams) => {
    setTravelFrom(params.from);
    setTravelTo(params.to);
    setTravelJourneyDate(params.journeyDate);
    setTravelDepartureTime(params.departureTime);
    setTravelPriceRange(params.priceRange);
    setTravelType(params.travelType);
    setTravelPassengers(params.passengers);
  }, []);

  const [selectedBusDepartureTime, setSelectedBusDepartureTime] = useState<string>('All');
  const [selectedBusTypes, setSelectedBusTypes] = useState<string[]>([]);
  const [selectedBusAcType, setSelectedBusAcType] = useState<'All' | 'AC' | 'Non-AC'>('All');
  const [selectedBusOperator, setSelectedBusOperator] = useState<string>('All');
  const [selectedBusMaxPrice, setSelectedBusMaxPrice] = useState<number>(10000);
  const [selectedBusBoarding, setSelectedBusBoarding] = useState<string>('All');
  const [selectedBusDropping, setSelectedBusDropping] = useState<string>('All');
  const [selectedBusSort, setSelectedBusSort] = useState<string>('Price Low → High');

  // Draft States for Bus Filter Modal
  const [draftBusDepartureTime, setDraftBusDepartureTime] = useState<string>('All');
  const [draftBusTypes, setDraftBusTypes] = useState<string[]>([]);
  const [draftBusAcType, setDraftBusAcType] = useState<'All' | 'AC' | 'Non-AC'>('All');
  const [draftBusOperator, setDraftBusOperator] = useState<string>('All');
  const [draftBusMaxPrice, setDraftBusMaxPrice] = useState<number>(10000);
  const [draftBusBoarding, setDraftBusBoarding] = useState<string>('All');
  const [draftBusDropping, setDraftBusDropping] = useState<string>('All');
  const [draftBusSort, setDraftBusSort] = useState<string>('Price Low → High');

  const [isBusFilterOpen, setIsBusFilterOpen] = useState(false);

  // Helper to map dynamic travel items from apiProducts using authoritative database fields
  const dynamicVendorTravelItems = useMemo(() => {
    return (apiProducts || [])
      .filter(isRealTravelProduct)
      .map(mapProductToTravelItem);
  }, [apiProducts]);

  const availableTravelOrigins = useMemo(() => {
    const set = new Set<string>();
    DEFAULT_POPULAR_ORIGINS.forEach((o) => set.add(o));
    (dynamicVendorTravelItems || []).forEach((b: any) => {
      if (b.from) set.add(b.from);
      (b.boardingPoints || []).forEach((bp: string) => {
        const c = bp.split('(')[0]?.trim();
        if (c) set.add(c);
      });
    });
    return Array.from(set).filter(Boolean);
  }, [dynamicVendorTravelItems]);

  const availableTravelDestinations = useMemo(() => {
    const set = new Set<string>();
    DEFAULT_POPULAR_DESTINATIONS.forEach((d) => set.add(d));
    (dynamicVendorTravelItems || []).forEach((b: any) => {
      if (b.to) set.add(b.to);
      (b.droppingPoints || []).forEach((dp: string) => {
        const c = dp.split('(')[0]?.trim();
        if (c) set.add(c);
      });
    });
    return Array.from(set).filter(Boolean);
  }, [dynamicVendorTravelItems]);


  // Dynamic Route Buses (buses matching from & to)
  const currentRouteBuses = useMemo(() => {
    if (!isTravelCategory) return [];
    let items = dynamicVendorTravelItems || [];
    const reqFrom = (routeParams.from || '').trim().toLowerCase();
    const reqTo = (routeParams.to || '').trim().toLowerCase();
    if (reqFrom || reqTo) {
      const routeMatches = items.filter((s: any) => {
        const sFrom = (s.from || s.origin || s.route || '').toLowerCase();
        const sTo = (s.to || s.destination || s.route || '').toLowerCase();
        const sBoarding = (s.boardingPoints || []).join(' ').toLowerCase();
        const sDropping = (s.droppingPoints || []).join(' ').toLowerCase();

        const matchFrom = !reqFrom || sFrom.includes(reqFrom) || sBoarding.includes(reqFrom);
        const matchTo = !reqTo || sTo.includes(reqTo) || sDropping.includes(reqTo);
        return matchFrom && matchTo;
      });
      if (routeMatches.length > 0) return routeMatches;
    }
    return items;
  }, [isTravelCategory, routeParams.from, routeParams.to, dynamicVendorTravelItems]);

  // Dynamic Unique Bus Operators
  const availableBusOperators = useMemo(() => {
    const opsSet = new Set<string>();
    const allTravelCatalog = dynamicVendorTravelItems || [];
    allTravelCatalog.forEach((b: any) => {
      if (b.operator) opsSet.add(b.operator);
    });
    dynamicVendorTravelItems.forEach((b: any) => {
      if (b.operator) opsSet.add(b.operator);
    });
    return Array.from(opsSet).sort();
  }, [dynamicVendorTravelItems]);

  // Dynamic Unique Boarding Points for current route
  const dynamicBoardingPoints = useMemo(() => {
    const bpSet = new Set<string>();
    currentRouteBuses.forEach((b: any) => {
      (b.boardingPoints || []).forEach((pt: string) => {
        const cleanPt = pt.replace(/\s*\(.*\)/, '').trim();
        if (cleanPt) bpSet.add(cleanPt);
      });
    });
    return Array.from(bpSet).sort();
  }, [currentRouteBuses]);

  // Dynamic Unique Dropping Points for current route
  const dynamicDroppingPoints = useMemo(() => {
    const dpSet = new Set<string>();
    currentRouteBuses.forEach((b: any) => {
      (b.droppingPoints || []).forEach((pt: string) => {
        const cleanPt = pt.replace(/\s*\(.*\)/, '').trim();
        if (cleanPt) dpSet.add(cleanPt);
      });
    });
    return Array.from(dpSet).sort();
  }, [currentRouteBuses]);

  // Dynamic AC and Non-AC counts based on selected bus types
  const { dynamicAcCount, dynamicNonAcCount } = useMemo(() => {
    let pool = currentRouteBuses;
    if (draftBusTypes.length > 0) {
      pool = pool.filter((b: any) => {
        const name = (b.name || '').toLowerCase();
        const sub = (b.subcategory || '').toLowerCase();
        const bType = (b.busType || b.subType || '').toLowerCase();
        return draftBusTypes.some((t) => {
          const target = t.toLowerCase();
          if (target === 'seater') return name.includes('seater') || sub.includes('seater') || bType.includes('seater');
          if (target === 'sleeper') return name.includes('sleeper') || sub.includes('sleeper') || bType.includes('sleeper');
          if (target === 'volvo buses' || target === 'volvo') return name.includes('volvo') || sub.includes('volvo') || bType.includes('volvo');
          return false;
        });
      });
    }

    let ac = 0;
    let nonAc = 0;
    pool.forEach((b: any) => {
      const str = `${b.name} ${b.subcategory} ${b.busType || ''} ${b.subType || ''} ${(b.amenities || []).join(' ')}`.toLowerCase();
      if (str.includes('non-ac') || str.includes('non ac')) {
        nonAc++;
      } else if (str.includes('ac')) {
        ac++;
      } else {
        nonAc++;
      }
    });

    return { dynamicAcCount: ac, dynamicNonAcCount: nonAc };
  }, [currentRouteBuses, draftBusTypes]);

  const openBusFilterModal = () => {
    setDraftBusDepartureTime(selectedBusDepartureTime);
    setDraftBusTypes(selectedBusTypes);
    setDraftBusAcType(selectedBusAcType);
    setDraftBusOperator(selectedBusOperator);
    setDraftBusMaxPrice(selectedBusMaxPrice);
    setDraftBusBoarding(selectedBusBoarding);
    setDraftBusDropping(selectedBusDropping);
    setDraftBusSort(selectedBusSort);
    setIsBusFilterOpen(true);
  };

  const resetBusDraftFilters = () => {
    setDraftBusDepartureTime('All');
    setDraftBusTypes([]);
    setDraftBusAcType('All');
    setDraftBusOperator('All');
    setDraftBusMaxPrice(10000);
    setDraftBusBoarding('All');
    setDraftBusDropping('All');
    setDraftBusSort('Price Low → High');
  };

  const applyBusFilters = () => {
    setSelectedBusDepartureTime(draftBusDepartureTime);
    setSelectedBusTypes(draftBusTypes);
    setSelectedBusAcType(draftBusAcType);
    setSelectedBusOperator(draftBusOperator);
    setSelectedBusMaxPrice(draftBusMaxPrice);
    setSelectedBusBoarding(draftBusBoarding);
    setSelectedBusDropping(draftBusDropping);
    setSelectedBusSort(draftBusSort);
    setIsBusFilterOpen(false);
  };

  const busActiveFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedBusDepartureTime !== 'All') count++;
    if (selectedBusTypes.length > 0) count += selectedBusTypes.length;
    if (selectedBusAcType !== 'All') count++;
    if (selectedBusOperator !== 'All') count++;
    if (selectedBusMaxPrice < 10000) count++;
    if (selectedBusBoarding !== 'All') count++;
    if (selectedBusDropping !== 'All') count++;
    if (selectedBusSort !== 'Price Low → High') count++;
    return count;
  }, [
    selectedBusDepartureTime,
    selectedBusTypes,
    selectedBusAcType,
    selectedBusOperator,
    selectedBusMaxPrice,
    selectedBusBoarding,
    selectedBusDropping,
    selectedBusSort,
  ]);

  // Smart Back Handler: Resets subcategories/filters to 'All' before exiting category screen
  const handleHeaderBack = useCallback(() => {
    if (isProdFilterOpen) { setIsProdFilterOpen(false); return true; }
    if (isDnFilterOpen) { setIsDnFilterOpen(false); return true; }
    if (isFoodFilterOpen) { setIsFoodFilterOpen(false); return true; }
    if (isSrvFilterOpen) { setIsSrvFilterOpen(false); return true; }
    if (isBusFilterOpen) { setIsBusFilterOpen(false); return true; }
    if (isStayFilterOpen) { setIsStayFilterOpen(false); return true; }
    if (isStaySortOpen) { setIsStaySortOpen(false); return true; }
    if (isCategorySortOpen) { setIsCategorySortOpen(false); return true; }
    if (isStayMapOpen) { setIsStayMapOpen(false); return true; }
    if (isDestModalOpen) { setIsDestModalOpen(false); return true; }
    if (isCalendarModalOpen) { setIsCalendarModalOpen(false); return true; }
    if (isGuestModalOpen) { setIsGuestModalOpen(false); return true; }
    if (srvDatePickerVisible) { setSrvDatePickerVisible(false); return true; }
    if (srvTimePickerVisible) { setSrvTimePickerVisible(false); return true; }
    if (schedulingItem) { setSchedulingItem(null); return true; }
    if (razorpayModalVisible) { setRazorpayModalVisible(false); return true; }
    if (isCartVisible) { setIsCartVisible(false); return true; }

    let resetActiveFilter = false;
    if (selectedSubcat !== 'All') {
      setSelectedSubcat('All');
      resetActiveFilter = true;
    }
    if (selectedSrvType !== 'All') {
      setSelectedSrvType('All');
      resetActiveFilter = true;
    }
    if (selectedProdCategory !== 'All') {
      setSelectedProdCategory('All');
      resetActiveFilter = true;
    }
    if (selectedDnCategory !== 'All') {
      setSelectedDnCategory('All');
      resetActiveFilter = true;
    }
    if (selectedFoodCuisine !== 'All') {
      setSelectedFoodCuisine('All');
      resetActiveFilter = true;
    }
    if (selectedBusDepartureTime !== 'All' || selectedBusTypes.length > 0 || selectedBusOperator !== 'All') {
      setSelectedBusDepartureTime('All');
      setSelectedBusTypes([]);
      setSelectedBusOperator('All');
      resetActiveFilter = true;
    }
    if (selectedDestination !== 'All Destinations') {
      setSelectedDestination('All Destinations');
      resetActiveFilter = true;
    }

    if (resetActiveFilter) {
      return true;
    }

    navigation.goBack();
    return true;
  }, [
    isProdFilterOpen,
    isDnFilterOpen,
    isFoodFilterOpen,
    isSrvFilterOpen,
    isBusFilterOpen,
    isStayFilterOpen,
    isStaySortOpen,
    isCategorySortOpen,
    isStayMapOpen,
    isDestModalOpen,
    isCalendarModalOpen,
    isGuestModalOpen,
    srvDatePickerVisible,
    srvTimePickerVisible,
    schedulingItem,
    razorpayModalVisible,
    isCartVisible,
    selectedSubcat,
    selectedSrvType,
    selectedProdCategory,
    selectedDnCategory,
    selectedFoodCuisine,
    selectedBusDepartureTime,
    selectedBusTypes,
    selectedBusOperator,
    selectedDestination,
    navigation,
  ]);

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => handleHeaderBack();
      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [handleHeaderBack])
  );

  // Confirmed Stay Bookings Array
  const [myStayBookings, setMyStayBookings] = useState<Array<any>>([
    {
      id: 'CN-STAY-28491',
      hotelName: 'Coorg Heritage Villa',
      roomName: 'Deluxe Room',
      location: 'Coorg, Karnataka',
      checkIn: '12 Sep',
      checkOut: '15 Sep',
      nights: 3,
      guests: '2 Adults • 1 Room',
      totalPaid: '₹23,925',
      status: 'Confirmed',
      image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&auto=format&fit=crop&q=80',
    },
  ]);
  const [isMyBookingsOpen, setIsMyBookingsOpen] = useState(false);
  const [bookingsTab, setBookingsTab] = useState<'Upcoming' | 'Completed' | 'Cancelled'>('Upcoming');

  const getDiscountBadgeText = (priceStr?: string, origPriceStr?: string, discountNum?: number) => {
    if (typeof discountNum === 'number' && discountNum > 0) {
      return `${discountNum}% OFF`;
    }
    if (!priceStr || !origPriceStr) return '';
    const p = parseInt(priceStr.replace(/[^\d]/g, ''), 10);
    const op = parseInt(origPriceStr.replace(/[^\d]/g, ''), 10);
    if (op > p && op > 0) {
      const pct = Math.round(((op - p) / op) * 100);
      return `${pct}% OFF`;
    }
    return '';
  };

  // Voice Search Animation
  const [isVoiceListening, setIsVoiceListening] = useState(false);
  const voiceTimeoutRef = useRef<any>(null);
  const searchInputRef = useRef<TextInput>(null);
  const stayContentScrollRef = useRef<ScrollView>(null);
  const showToast = useToastStore((state) => state.showToast);
  const wave1 = useRef(new Animated.Value(6)).current;
  const wave2 = useRef(new Animated.Value(14)).current;
  const wave3 = useRef(new Animated.Value(10)).current;
  const wave4 = useRef(new Animated.Value(18)).current;

  // Category-specific metadata resolver
  const catMeta = useMemo(() => {
    const cat = (categoryName || 'Services').toLowerCase().trim();

    if (cat.includes('prod') || cat.includes('electronic') || cat.includes('tech') || cat.includes('gadget') || cat.includes('appliance')) {
      return {
        allPillLabel: 'All Products',
        sectionTitle: (sub: string) => (sub === 'All' ? 'POPULAR PRODUCTS' : `${sub.toUpperCase()} PRODUCTS`),
        countLabel: (count: number) => `${count} ${count === 1 ? 'product' : 'products'}`,
        priceLabel: 'Price',
        ctaText: 'Add to Cart',
        actionType: 'cart',
        emptyText: 'No products found',
        searchPlaceholder: 'Search products by brand, name or specs...',
      };
    }

    if (cat.includes('daily') || cat.includes('groc')) {
      return {
        allPillLabel: 'All',
        sectionTitle: (sub: string) => (sub === 'All' ? 'FRESH DAILY NEEDS & GROCERIES' : `${sub.toUpperCase()}`),
        countLabel: (count: number) => `${count} ${count === 1 ? 'item' : 'items'}`,
        priceLabel: 'Price',
        ctaText: 'Add to Cart',
        actionType: 'cart',
        emptyText: 'No matching grocery items found',
        searchPlaceholder: 'Search groceries, fruits, vegetables & more',
      };
    }

    if (cat.includes('food') || cat.includes('dine') || cat.includes('restau')) {
      return {
        allPillLabel: 'All Dishes',
        sectionTitle: (sub: string) => (sub === 'All' ? 'POPULAR FOOD' : `${sub.toUpperCase()} DISHES`),
        countLabel: (count: number) => `${count} ${count === 1 ? 'dish' : 'dishes'}`,
        priceLabel: 'Price',
        ctaText: 'Order Now',
        actionType: 'cart',
        emptyText: 'No food items found',
        searchPlaceholder: 'Search biryani, burgers, pizza, dishes...',
      };
    }

    if (cat.includes('stay') || cat.includes('hotel') || cat.includes('resort')) {
      return {
        allPillLabel: 'All Stays',
        sectionTitle: (sub: string) => (sub === 'All' ? 'POPULAR STAYS' : `${sub.toUpperCase()} STAYS`),
        countLabel: (count: number) => `${count} ${count === 1 ? 'stay' : 'stays'}`,
        priceLabel: 'Per Night',
        ctaText: 'Reserve Stay',
        actionType: 'booking',
        emptyText: 'No stays or hotels found',
        searchPlaceholder: 'Search resorts, hotels, homestays...',
      };
    }

    if (cat.includes('trav') || cat.includes('bus')) {
      return {
        allPillLabel: 'All Buses',
        sectionTitle: (sub: string) => (sub === 'All' ? 'AVAILABLE BUSES' : `${sub.toUpperCase()} BUSES`),
        countLabel: (count: number) => `${count} ${count === 1 ? 'bus' : 'buses'}`,
        priceLabel: 'Fare per seat',
        ctaText: 'Select Seats',
        actionType: 'booking',
        emptyText: 'No buses found for this route',
        searchPlaceholder: 'Search buses, operators, routes, boarding points...',
      };
    }

    if (cat.includes('job') || cat.includes('career')) {
      const incomingSub = routeParams.subCategoryName;
      const defaultHeader = incomingSub && incomingSub !== 'All' ? `${incomingSub.toUpperCase()} JOBS` : 'LATEST JOBS';
      return {
        allPillLabel: incomingSub && incomingSub !== 'All' ? 'All Roles' : 'All Jobs',
        sectionTitle: (sub: string) => (sub === 'All' ? defaultHeader : `${sub.toUpperCase()}`),
        countLabel: (count: number) => `${count} ${count === 1 ? 'opening' : 'openings'}`,
        priceLabel: 'Salary',
        ctaText: 'Apply Now',
        actionType: 'job',
        emptyText: 'No job openings found',
        searchPlaceholder: 'Search job title, skill, company, department, location...',
      };
    }

    // Default: SERVICES
    return {
      allPillLabel: 'All Services',
      sectionTitle: (sub: string) => (sub === 'All' ? 'POPULAR SERVICES' : `${sub.toUpperCase()} SERVICES`),
      countLabel: (count: number) => `${count} ${count === 1 ? 'service' : 'services'}`,
      priceLabel: 'Starting from',
      ctaText: 'Book Service',
      actionType: 'booking',
      emptyText: 'No services found',
      searchPlaceholder: 'Search home repair, doctors, legal, AC repair...',
    };
  }, [categoryName, routeParams.subCategoryName]);

  const isFocused = useIsFocused();

  const fetchDynamicProducts = useCallback(async () => {
    if (apiProducts.length === 0) {
      setIsLoadingProducts(true);
    }
    setProductsFetchError(null);
    try {
      // Ensure category hierarchy is loaded and SIDEBAR_DATA is synchronized
      fetchCategoryHierarchy().catch(() => {});
      // skipCache:true so vendor-added products appear immediately without waiting
      let res: any = await apiFetch('/products', { skipCache: true });
      let listFound = false;
      let productList: any[] = [];
      if (res && Array.isArray(res.data)) {
        productList = res.data;
        listFound = true;
      } else if (res && Array.isArray(res.products)) {
        productList = res.products;
        listFound = true;
      } else if (res && Array.isArray(res.items)) {
        productList = res.items;
        listFound = true;
      } else if (Array.isArray(res)) {
        productList = res;
        listFound = true;
      }

      if (!listFound) {
        const vRes: any = await apiFetch('/vendor/products', { skipCache: true });
        if (vRes && Array.isArray(vRes.data)) {
          productList = vRes.data;
          listFound = true;
        } else if (vRes && Array.isArray(vRes.products)) {
          productList = vRes.products;
          listFound = true;
        } else if (Array.isArray(vRes)) {
          productList = vRes;
          listFound = true;
        }
      }

      if (listFound) {
        setApiProducts(productList);
        setProductsFetchError(null);
      } else {
        setProductsFetchError('Unable to load items from server');
      }
    } catch (err: any) {
      console.warn('Failed to fetch dynamic products in CategoryDetails:', err);
      setProductsFetchError(err?.message || 'Failed to load items. Please check your network connection.');
    } finally {
      setIsLoadingProducts(false);
    }
  }, [apiProducts.length]);

  useEffect(() => {
    // Re-fetch on screen focus so vendor-added items appear immediately
    if (isFocused) {
      fetchDynamicProducts();
    }
  }, [isFocused, categoryName, fetchDynamicProducts]);

  // Subcategories / Roles list matching active category & subCategory
  const availableSubcats = useMemo(() => {
    if (categoryName === 'Jobs' || categoryName === 'Jobs & Careers') {
      const incomingSub = routeParams.subCategoryName;
      if (incomingSub && incomingSub !== 'All') {
        const set = new Set<string>();
        // Roles from SIDEBAR_DATA['Job']
        const jobSidebar = SIDEBAR_DATA['Job']?.subcategories;
        if (jobSidebar) {
          const matchKey = Object.keys(jobSidebar).find(
            (k) => k.toLowerCase() === incomingSub.toLowerCase() || k.toLowerCase().includes(incomingSub.toLowerCase()) || incomingSub.toLowerCase().includes(k.toLowerCase())
          );
          if (matchKey && jobSidebar[matchKey]?.items) {
            jobSidebar[matchKey].items.forEach((item: string) => set.add(item));
          }
        }
        // Roles / child categories from dynamic vendor jobs in apiProducts
        apiProducts.forEach((p: any) => {
          const cat = String(p.category || p.vendorType || '').toLowerCase();
          if (cat.includes('job')) {
            const pSub = String(p.subCategory || p.subcategory || '').trim().toLowerCase();
            const targetSub = incomingSub.trim().toLowerCase();
            if (pSub === targetSub || pSub.includes(targetSub) || targetSub.includes(pSub)) {
              const child = p.itemType || p.childCategory || p.role;
              if (child && typeof child === 'string' && child.trim()) {
                set.add(child.trim());
              }
            }
          }
        });
        return ['All', ...Array.from(set)];
      }

      // If no subcategory passed or it is 'All', list all Job subcategories
      const set = new Set<string>();
      const jobSidebar = SIDEBAR_DATA['Job']?.subcategories || {};
      Object.keys(jobSidebar).forEach((k) => set.add(k));
      apiProducts.forEach((p: any) => {
        const cat = String(p.category || p.vendorType || '').toLowerCase();
        if (cat.includes('job')) {
          const pSub = p.subCategory || p.subcategory;
          if (pSub && typeof pSub === 'string' && pSub.trim()) {
            set.add(pSub.trim());
          }
        }
      });
      return ['All', ...Array.from(set)];
    }
    
    // Check if categoryName is Electronics or matches Products
    if (categoryName.toLowerCase().includes('electronic') || categoryName.toLowerCase().includes('tech')) {
      const rawSubcats = Object.keys(SIDEBAR_DATA['Products']?.subcategories || SIDEBAR_DATA['Product']?.subcategories || {});
      return ['All', ...rawSubcats];
    }

    // Check if categoryName exists in SIDEBAR_DATA
    const normTarget = normalizeMainCategoryName(categoryName).toLowerCase();
    const catSidebarKey = Object.keys(SIDEBAR_DATA).find(
      (k) => k.toLowerCase() === categoryName.toLowerCase() || k.toLowerCase() === normTarget || normTarget.includes(k.toLowerCase())
    );
    const sidebarSubcats = (catSidebarKey && SIDEBAR_DATA[catSidebarKey]?.subcategories)
      ? Object.keys(SIDEBAR_DATA[catSidebarKey].subcategories)
      : [];

    // Also collect subcategories from live apiProducts matching this main category
    const apiSubcats = new Set<string>();
    (apiProducts || []).forEach((p: any) => {
      const pMainNorm = cleanStr(normalizeMainCategoryName(p.mainCategory || p.subNavbarCategory || ''));
      if (pMainNorm === normTarget || pMainNorm === categoryName.toLowerCase()) {
        const sub = p.category || p.subcategory || p.subCategory;
        if (sub && typeof sub === 'string' && sub.trim()) {
          apiSubcats.add(sub.trim());
        }
      }
    });

    const merged = Array.from(new Set([...sidebarSubcats, ...Array.from(apiSubcats)]));
    if (merged.length > 0) {
      return ['All', ...merged];
    }

    const fallbackSubcats = Object.keys(SIDEBAR_DATA['Services']?.subcategories || {});
    return ['All', ...fallbackSubcats];
  }, [categoryName, routeParams.subCategoryName, apiProducts]);

  // Sync initial subcategory / child category params
  useEffect(() => {
    if (routeParams.childCategoryName && availableSubcats.includes(routeParams.childCategoryName)) {
      setSelectedSubcat(routeParams.childCategoryName);
    } else if (routeParams.subCategoryName && availableSubcats.includes(routeParams.subCategoryName)) {
      setSelectedSubcat(routeParams.subCategoryName);
    }
  }, [routeParams.subCategoryName, routeParams.childCategoryName, availableSubcats]);

  // Voice wave animation loop
  useEffect(() => {
    let anim: Animated.CompositeAnimation | null = null;
    if (isVoiceListening) {
      anim = Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.timing(wave1, { toValue: 18, duration: 260, useNativeDriver: false }),
            Animated.timing(wave1, { toValue: 6, duration: 260, useNativeDriver: false }),
          ]),
          Animated.sequence([
            Animated.timing(wave2, { toValue: 8, duration: 220, useNativeDriver: false }),
            Animated.timing(wave2, { toValue: 22, duration: 220, useNativeDriver: false }),
          ]),
          Animated.sequence([
            Animated.timing(wave3, { toValue: 20, duration: 280, useNativeDriver: false }),
            Animated.timing(wave3, { toValue: 6, duration: 280, useNativeDriver: false }),
          ]),
          Animated.sequence([
            Animated.timing(wave4, { toValue: 8, duration: 200, useNativeDriver: false }),
            Animated.timing(wave4, { toValue: 18, duration: 200, useNativeDriver: false }),
          ]),
        ])
      );
      anim.start();
    } else {
      wave1.setValue(6);
      wave2.setValue(14);
      wave3.setValue(10);
      wave4.setValue(18);
    }
    return () => {
      if (anim) anim.stop();
    };
  }, [isVoiceListening, wave1, wave2, wave3, wave4]);

  // Register real Android Speech Recognition Listeners
  useEffect(() => {
    function onSpeechPartialResults(e: any) {
      const partialText = Array.isArray(e?.value) ? e.value[0] : (typeof e?.value === 'string' ? e.value : '');
      if (partialText) {
        setSearchQuery(partialText);
      }
    }

    function onSpeechResults(e: any) {
      if (voiceTimeoutRef.current) {
        clearTimeout(voiceTimeoutRef.current);
        voiceTimeoutRef.current = null;
      }
      const text = Array.isArray(e?.value) ? e.value[0] : (typeof e?.value === 'string' ? e.value : (e?.results?.[0] || ''));
      if (text) {
        setSearchQuery(text);
        setIsVoiceListening(false);
        showToast(`Voice search: "${text}"`);
      }
    }

    function onSpeechError(e: any) {
      console.warn('[CategoryDetails Voice] Speech error:', e.error);
      if (voiceTimeoutRef.current) {
        clearTimeout(voiceTimeoutRef.current);
        voiceTimeoutRef.current = null;
      }
      setIsVoiceListening(false);
      showToast("Couldn't hear clearly. Type to search.");
      setTimeout(() => searchInputRef.current?.focus(), 200);
    }

    function onSpeechEnd() {
      if (voiceTimeoutRef.current) {
        clearTimeout(voiceTimeoutRef.current);
        voiceTimeoutRef.current = null;
      }
      setIsVoiceListening(false);
    }

    setupVoiceListeners({
      onSpeechPartialResults,
      onSpeechResults,
      onSpeechError,
      onSpeechEnd,
    });

    return () => {
      if (voiceTimeoutRef.current) {
        clearTimeout(voiceTimeoutRef.current);
      }
      cleanupVoiceListeners();
    };
  }, [showToast]);

  const handleMicPress = async () => {
    if (isVoiceListening) {
      if (voiceTimeoutRef.current) {
        clearTimeout(voiceTimeoutRef.current);
        voiceTimeoutRef.current = null;
      }
      await stopVoiceRecording();
      setIsVoiceListening(false);
      return;
    }

    try {
      let isGranted = true;
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: 'Microphone Permission',
            message: 'Connect Mobile needs microphone access for voice search.',
            buttonNeutral: 'Ask Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'Allow',
          }
        );
        isGranted = granted === PermissionsAndroid.RESULTS.GRANTED;
      }

      if (isGranted) {
        setIsVoiceListening(true);
        setSearchQuery('');
        showToast('Listening... Speak now 🎙️');

        if (voiceTimeoutRef.current) {
          clearTimeout(voiceTimeoutRef.current);
        }

        voiceTimeoutRef.current = setTimeout(() => {
          stopVoiceRecording().catch(() => {});
          setIsVoiceListening(false);
          showToast('Voice timeout. Type your search below.');
          setTimeout(() => searchInputRef.current?.focus(), 200);
        }, 7000);

        try {
          await startVoiceRecording('en-IN');
        } catch (vErr: any) {
          console.warn('Voice start error:', vErr);
          if (voiceTimeoutRef.current) {
            clearTimeout(voiceTimeoutRef.current);
            voiceTimeoutRef.current = null;
          }
          setIsVoiceListening(false);
          showToast('Voice search unavailable on this device. Type to search.', 'Focus Input', () => {
            searchInputRef.current?.focus();
          });
          setTimeout(() => searchInputRef.current?.focus(), 200);
        }
      } else {
        Alert.alert(
          'Microphone Permission Required',
          'Please enable microphone access in settings for voice search.',
          [{ text: 'Cancel', style: 'cancel' }, { text: 'Settings', onPress: () => Linking.openSettings() }]
        );
      }
    } catch {
      if (voiceTimeoutRef.current) {
        clearTimeout(voiceTimeoutRef.current);
        voiceTimeoutRef.current = null;
      }
      setIsVoiceListening(false);
      showToast("Couldn't start microphone. Type to search.");
      setTimeout(() => searchInputRef.current?.focus(), 200);
    }
  };

  // Map dynamic API products matching target category
  const mappedApiProds = useMemo(() => {
    const rawTarget = categoryName || 'Services';
    const targetCategory = rawTarget.toLowerCase().trim();
    const normalizedTarget = normalizeMainCategoryName(rawTarget).toLowerCase();

    // Taxonomy lookup from SIDEBAR_DATA for current category
    const catSidebarKey = Object.keys(SIDEBAR_DATA).find(
      (k) => k.toLowerCase() === targetCategory || k.toLowerCase() === normalizedTarget || normalizedTarget.includes(k.toLowerCase())
    );
    const sidebarSubcatMap = catSidebarKey ? (SIDEBAR_DATA[catSidebarKey]?.subcategories || {}) : {};
    const sidebarSubcatNames = Object.keys(sidebarSubcatMap).map(cleanStr);
    const sidebarChildNames: string[] = [];
    Object.values(sidebarSubcatMap).forEach((subDef) => {
      if (Array.isArray(subDef.items)) {
        subDef.items.forEach((itemStr) => sidebarChildNames.push(cleanStr(itemStr)));
      }
    });

    return (apiProducts || [])
      .filter((p: any) => {
        if (targetCategory === 'all') return true;
        const pMain = cleanStr(p.mainCategory);
        const pSubNav = cleanStr(p.subNavbarCategory);
        const pCat = cleanStr(p.category || p.vendorType);
        const pSub = cleanStr(p.subcategory || p.subCategory);
        const pName = cleanStr(p.name);

        const normalizedPMain = cleanStr(normalizeMainCategoryName(p.mainCategory || p.subNavbarCategory || ''));

        // Prevent cross-category leakage: if item has an explicit canonical main category different from target
        const CANONICAL_MAINS = ['products', 'services', 'daily needs', 'food', 'stay', 'travel', 'jobs'];
        if (normalizedPMain && CANONICAL_MAINS.includes(normalizedPMain) && normalizedPMain !== normalizedTarget) {
          return false;
        }

        // 1. Authoritative mainCategory / subNavbarCategory match
        if (normalizedPMain && (normalizedPMain === targetCategory || normalizedPMain === normalizedTarget)) {
          return true;
        }
        if (pMain && (pMain === targetCategory || pMain === normalizedTarget || targetCategory.includes(pMain) || pMain.includes(targetCategory))) {
          return true;
        }
        if (pSubNav && (pSubNav === targetCategory || pSubNav === normalizedTarget || targetCategory.includes(pSubNav) || pSubNav.includes(targetCategory))) {
          return true;
        }

        // 2. Taxonomy tree match: check if p.category or p.subcategory belongs to this category in SIDEBAR_DATA
        if (sidebarSubcatNames.some((subName) => subName && (pCat === subName || pCat.includes(subName) || subName.includes(pCat)))) {
          return true;
        }
        if (sidebarChildNames.some((childName) => childName && (pSub === childName || pSub.includes(childName) || childName.includes(pSub) || pName.includes(childName)))) {
          return true;
        }

        // 3. Category-specific fallback matching
        if (targetCategory === 'products' || targetCategory === 'product') {
          return !['stay', 'travel', 'jobs', 'job', 'services', 'service'].includes(pMain) &&
                 !['stay', 'travel', 'jobs', 'job'].includes(pCat) &&
                 (pCat === 'products' || pCat === 'product' || pCat === 'electronics' || pCat === 'fashion' || pCat === 'beauty' || pCat === 'furniture' || pCat === '' || pSub.includes('electronic') || pSub.includes('fashion') || pSub.includes('product') || pSub.includes('furniture'));
        }

        if (targetCategory === 'daily needs') {
          return pCat === 'daily needs' || pCat.includes('daily') || pSub.includes('daily') || pSub.includes('grocery') || pCat.includes('grocer') || pCat.includes('diar') || pSub.includes('vegetable') || pSub.includes('fruit') || pSub.includes('milk') || pSub.includes('dairy') || pSub.includes('personal care') || (pSub.includes('snack') && !pCat.includes('food'));
        }

        if (targetCategory === 'food') {
          return pCat === 'food' || pCat.includes('food') || pCat.includes('indian') || pSub.includes('restaurant') || pSub.includes('biryani') || pSub.includes('bakery') || pSub.includes('fast food') || pSub.includes('snack') || pSub.includes('naan') || pSub.includes('dosa') || pSub.includes('idly') || pSub.includes('meal');
        }

        if (targetCategory === 'stay') {
          return pCat === 'stay' || pCat.includes('stay') || pCat.includes('hotel') || pCat.includes('resort') || pCat.includes('viil') || pSub.includes('hotel') || pSub.includes('resort') || pSub.includes('homestay') || pSub.includes('room') || pSub.includes('villa');
        }

        if (targetCategory === 'travel') {
          return pCat === 'travel' || pCat.includes('travel') || pCat.includes('bus') || pCat.includes('cab') || pSub.includes('bus') || pSub.includes('vehicle') || pSub.includes('sleeper');
        }

        if (targetCategory === 'jobs' || targetCategory === 'job') {
          return pCat === 'jobs' || pCat === 'job' || pCat.includes('job') || pCat === 'it' || pCat === 'non-it' || pSub.includes('job') || pSub.includes('hiring') || pSub.includes('developer') || pSub.includes('analyst') || pSub.includes('administrator');
        }

        if (targetCategory === 'services' || targetCategory === 'service') {
          return pCat === 'services' || pCat === 'service' || pCat.includes('service') || pCat.includes('plumb') || pCat.includes('electric') || pSub.includes('repair') || pSub.includes('plumb') || pSub.includes('electric') || pSub.includes('cleaning') || pSub.includes('ac');
        }

        if (targetCategory === 'electronics' || targetCategory === 'electronic') {
          return (
            pSub.includes('electronic') ||
            pCat.includes('electronic') ||
            pName.includes('laptop') ||
            pName.includes('charger') ||
            pName.includes('iphone') ||
            pName.includes('phone') ||
            pName.includes('smart') ||
            pCat === 'products'
          );
        }

        return pCat === targetCategory || pCat.includes(targetCategory) || targetCategory.includes(pCat) || pSub.includes(targetCategory);
      })
      .map((p: any) => {
        const rawSub = p.subCategory || p.subcategory || p.itemType || 'General';
        const cleanSub = cleanStr(rawSub);
        const displaySub = cleanSub.includes('electronic') ? 'Electronics' : rawSub;
        const pCat = cleanStr(p.category || p.vendorType);
        const isTravelItem = pCat === 'travel' || pCat.includes('bus') || cleanSub.includes('bus') || cleanSub.includes('sleeper');
        const operatorName = p.operator || p.operatorName || p.vendorName || p.companyName || p.businessName || 'Verified Travels';
        const boardingPointsList = Array.isArray(p.boardingPoints) && p.boardingPoints.length > 0
          ? p.boardingPoints
          : (p.boardingPoint ? [p.boardingPoint] : ['Bangalore (Majestic 21:30)']);
        const droppingPointsList = Array.isArray(p.droppingPoints) && p.droppingPoints.length > 0
          ? p.droppingPoints
          : (p.dropPoint ? [p.dropPoint] : ['Chennai (Koyambedu 06:00)']);
        const travelAmenities = Array.isArray(p.selectedAmenities) && p.selectedAmenities.length > 0
          ? p.selectedAmenities
          : (Array.isArray(p.amenities) && p.amenities.length > 0 ? p.amenities : ['AC Sleeper', 'Live GPS', 'Charging Point']);

        const resolvedFrom = p.from || p.origin || (p.boardingPoint ? p.boardingPoint.split('(')[0]?.trim() : (typeof p.boardingPoints?.[0] === 'string' ? p.boardingPoints[0].split('(')[0]?.trim() : 'Bangalore'));
        const resolvedTo = p.to || p.destination || (p.dropPoint ? p.dropPoint.split('(')[0]?.trim() : (typeof p.droppingPoints?.[0] === 'string' ? p.droppingPoints[0].split('(')[0]?.trim() : 'Chennai'));
        const resolvedBusType = p.itemType || p.busType || p.subType || (cleanSub.includes('bus') ? 'AC Sleeper' : displaySub);
        const numPrice = typeof p.price === 'number' ? p.price : (parseFloat(String(p.price || '0').replace(/[^\d.]/g, '')) || 0);
        const origPriceNum = p.originalPrice ? (typeof p.originalPrice === 'number' ? p.originalPrice : (parseFloat(String(p.originalPrice).replace(/[^\d.]/g, '')) || 0)) : 0;
        const discountNum = origPriceNum > numPrice ? Math.round(((origPriceNum - numPrice) / origPriceNum) * 100) : (p.discount ? parseInt(String(p.discount).replace(/[^\d]/g, ''), 10) || 0 : 0);

        return {
          id: p._id || p.id,
          name: p.name || 'Unnamed Product',
          subcategory: isTravelItem ? resolvedBusType : displaySub,
          category: p.category || p.subNavbarCategory || '',
          itemType: p.itemType || resolvedBusType,
          mainCategory: p.mainCategory || p.subNavbarCategory || (isTravelItem ? 'Travel' : categoryName || 'Products'),
          desc: p.description || p.desc || 'Quality product verified by Connect',
          rating: String(p.rating || '4.8'),
          reviews: String(p.ratingCount || '1.2k'),
          price: typeof p.price === 'number' ? `₹${p.price.toLocaleString('en-IN')}` : String(p.price || '₹0'),
          priceNum: numPrice,
          originalPrice: p.originalPrice ? (typeof p.originalPrice === 'number' ? `₹${p.originalPrice.toLocaleString('en-IN')}` : String(p.originalPrice)) : undefined,
          discountNum,
          image: resolveImageUrl(p.image || p.imageUrl) || 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=400&q=70',
          images: p.images,
          imageUrls: p.imageUrls,
          gallery: p.gallery,
          unit: p.unit,
          specifications: p.specifications,
          highlights: p.highlights,
          vehicleNumber: p.vehicleNumber || p.vehicleRegNo || p.busNumber,
          assured: p.assured ?? true,
          rawProduct: p,
          brand: p.brand || p.brandName || '',
          inStock: p.inStock ?? (p.stock !== undefined ? Number(p.stock) > 0 : true),
          deliveryTime: p.deliveryTime || '30 mins',
          cuisine: p.cuisine || p.foodType || '',
          isVeg: p.isVeg ?? (p.vegNonVeg === 'veg' || p.foodType === 'veg' || false),
          hasOffer: Boolean(p.hasOffer || p.discount || p.originalPrice),
          serviceType: p.serviceType || p.itemType || '',
          availableToday: p.availableToday ?? true,
          serviceTime: p.serviceTime || p.duration || '45 mins',
          bookingMode: p.bookingMode || 'Online & Home Service',
          departureSlot: p.departureSlot || p.departureTime || '',
          // Travel specific fields for customer travel card
          type: 'Bus',
          subType: resolvedBusType,
          busType: resolvedBusType,
          operator: operatorName,
          departureTime: p.departureTime || p.boardingTime || '21:30',
          arrivalTime: p.arrivalTime || '06:00',
          from: resolvedFrom,
          to: resolvedTo,
          route: `${resolvedFrom} ➔ ${resolvedTo} (${resolvedFrom} to ${resolvedTo})`,
          duration: p.duration || p.busSchedule || p.totalDistance || '8h 00m',
          boardingPoints: boardingPointsList,
          droppingPoints: droppingPointsList,
          amenities: travelAmenities,
          seatsLeft: p.stock ? Number(p.stock) : 12,
          badge: p.badge || (isTravelItem ? 'Top Rated Bus' : undefined),
        };
      });
  }, [apiProducts, categoryName]);

  // Compile active catalog items matching selected category & search query
  const displayedServices = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    let allServices: Array<any> = [...mappedApiProds];

    // Real Travel Search & Availability filter based on live criteria
    if (isTravelCategory) {
      const travelPool = (dynamicVendorTravelItems && dynamicVendorTravelItems.length > 0)
        ? (dynamicVendorTravelItems as any[])
        : allServices;

      allServices = travelPool.filter((s: any) => {
        // 1. Availability check: active, in stock, seatsLeft >= passengers
        if (s.isActive === false) return false;
        if (s.status && ['out of stock', 'inactive', 'suspended', 'unavailable'].includes(s.status.toLowerCase())) return false;
        if ((s.seatsLeft || s.stock || 0) < travelPassengers) return false;

        // 2. Departure Location Match
        if (travelFrom && travelFrom.trim()) {
          const matchFrom = matchesLocation(s.from, travelFrom, s.boardingPoints);
          if (!matchFrom) return false;
        }

        // 3. Destination Location Match
        if (travelTo && travelTo.trim()) {
          const matchTo = matchesLocation(s.to, travelTo, s.droppingPoints);
          if (!matchTo) return false;
        }

        // 4. Travel Type Match (Bus, Car, Bike)
        if (travelType && travelType.toLowerCase() !== 'all') {
          const sType = (s.type || '').toLowerCase();
          const targetType = travelType.toLowerCase();
          if (sType !== targetType) return false;
        }

        // 5. Departure Time Slot Match
        if (travelDepartureTime && travelDepartureTime.toLowerCase() !== 'all') {
          const matchTime = matchesDepartureTimeSlot(s.departureTime, travelDepartureTime);
          if (!matchTime) return false;
        }

        // 6. Price Budget Match
        if (travelPriceRange && travelPriceRange.toLowerCase() !== 'all') {
          const matchPrice = matchesPriceBudget(s.priceNum || s.price, travelPriceRange);
          if (!matchPrice) return false;
        }

        // 7. Bus filter modal refinements (AC/Non-AC, operator, price ceiling)
        if (selectedBusAcType !== 'All') {
          const isAc = (s.subType || '').toLowerCase().includes('ac') || (s.name || '').toLowerCase().includes('ac');
          if (selectedBusAcType === 'AC' && !isAc) return false;
          if (selectedBusAcType === 'Non-AC' && isAc) return false;
        }

        if (selectedBusOperator !== 'All') {
          if (s.operator !== selectedBusOperator) return false;
        }

        if (selectedBusMaxPrice < 10000) {
          const numP = s.priceNum || (typeof s.price === 'number' ? s.price : parseInt(String(s.price || '0').replace(/[^\d]/g, ''), 10)) || 0;
          if (numP > selectedBusMaxPrice) return false;
        }

        // 8. Search query matching
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchQ = (s.name || '').toLowerCase().includes(q) ||
            (s.operator || '').toLowerCase().includes(q) ||
            (s.from || '').toLowerCase().includes(q) ||
            (s.to || '').toLowerCase().includes(q) ||
            (s.subType || '').toLowerCase().includes(q);
          if (!matchQ) return false;
        }

        return true;
      });
    }

    // Filter by Subcategory with taxonomy tree & smart group matching
    if (selectedSubcat !== 'All') {
      const targetSub = cleanStr(selectedSubcat);
      // Look up targetSub in SIDEBAR_DATA hierarchy to get its known child items
      const targetSubDef = Object.values(SIDEBAR_DATA).reduce<string[]>((acc, mainDef) => {
        const found = Object.entries(mainDef?.subcategories || {}).find(
          ([subKey]) => cleanStr(subKey) === targetSub
        );
        if (found && Array.isArray(found[1]?.items)) {
          found[1].items.forEach((it) => acc.push(cleanStr(it)));
        }
        return acc;
      }, []);

      allServices = allServices.filter(
        (s: any) => {
          const sCat = cleanStr(s.category || s.rawProduct?.category);
          const sSub = cleanStr(s.subcategory || s.rawProduct?.subcategory || s.rawProduct?.subCategory);
          const iType = cleanStr(s.itemType || s.rawProduct?.itemType);
          const pName = cleanStr(s.name);
          const mCat = cleanStr(s.mainCategory || s.rawProduct?.mainCategory);
          const bType = cleanStr(s.busType || s.subType);

          if (isTravelCategory) {
            return (
              sSub === targetSub ||
              bType === targetSub ||
              sSub.includes(targetSub) ||
              targetSub.includes(sSub) ||
              bType.includes(targetSub) ||
              targetSub.includes(bType) ||
              pName.includes(targetSub)
            );
          }

          // 1. Direct match on category (e.g. s.category === 'Electrician' when selectedSubcat === 'Electrician')
          if (sCat && (sCat === targetSub || sCat.includes(targetSub) || targetSub.includes(sCat))) {
            return true;
          }

          // 2. Direct match on subcategory (e.g. s.subcategory === 'Solar Technicians')
          if (sSub && (sSub === targetSub || sSub.includes(targetSub) || targetSub.includes(sSub))) {
            return true;
          }

          // 3. Child-category match in taxonomy tree: if selectedSubcat is a parent subcategory, does item's subcategory or name belong to its child items?
          if (targetSubDef.length > 0) {
            const matchesTreeChild = targetSubDef.some(
              (childItem) => childItem && (sSub === childItem || sSub.includes(childItem) || childItem.includes(sSub) || pName.includes(childItem))
            );
            if (matchesTreeChild) return true;
          }

          // 4. Reverse check: if targetSub is a child category, check if sSub matches it
          if (sSub === targetSub || sSub.includes(targetSub) || targetSub.includes(sSub)) {
            return true;
          }

          // Smart Electronics subcategory group matching
          if (targetSub === 'electronics' || targetSub === 'electronic') {
            const isElec = ['electronic', 'laptop', 'charger', 'mobile', 'phone', 'headphone', 'watch', 'camera', 'it', 'appliance', 'computer', 'accessory', 'gadget', 'fan', 'cooler', 'tv'].some(
              (term) => sSub.includes(term) || sCat.includes(term) || iType.includes(term) || pName.includes(term) || mCat.includes(term)
            );
            if (isElec) return true;
          }

          // Smart IT & Office subcategory group matching
          if (targetSub === 'it & office' || targetSub === 'it') {
            const isIT = ['it', 'office', 'laptop', 'computer', 'desk', 'charger', 'accessory', 'software', 'hardware', 'developer', 'analyst', 'administrator'].some(
              (term) => sSub.includes(term) || sCat.includes(term) || iType.includes(term) || pName.includes(term) || mCat.includes(term)
            );
            if (isIT) return true;
          }

          return (
            mCat === targetSub ||
            iType === targetSub ||
            pName.includes(targetSub) ||
            (targetSub.includes('snack') && (sSub.includes('snack') || pName.includes('lay') || iType.includes('chip')))
          );
        }
      );
    }

    // Filter by Search Query
    if (query) {
      allServices = allServices.filter((s: any) => {
        const nameMatch = (s.name || '').toLowerCase().includes(query);
        const descMatch = (s.desc || '').toLowerCase().includes(query);
        const subcatMatch = (s.subcategory || '').toLowerCase().includes(query);
        const mainCatMatch = (s.mainCategory || '').toLowerCase().includes(query);
        const brandMatch = (s.brand || '').toLowerCase().includes(query);
        const opMatch = (s.operator || '').toLowerCase().includes(query);
        const fromMatch = (s.from || s.origin || '').toLowerCase().includes(query);
        const toMatch = (s.to || s.destination || '').toLowerCase().includes(query);
        const routeMatch = (s.route || '').toLowerCase().includes(query);
        const bpMatch = (s.boardingPoints || []).some((bp: string) => bp.toLowerCase().includes(query));
        const dpMatch = (s.droppingPoints || []).some((dp: string) => dp.toLowerCase().includes(query));

        if (nameMatch || descMatch || subcatMatch || mainCatMatch || brandMatch || opMatch || fromMatch || toMatch || routeMatch || bpMatch || dpMatch) {
          return true;
        }

        // Smart route query match e.g. "bangalore to vellore" or "bangalore vellore"
        if (isTravelCategory) {
          const parts = query.replace(/\bto\b|\b➔\b|->|-/gi, ' ').split(/\s+/).filter(Boolean);
          if (parts.length >= 2) {
            const partFrom = parts[0];
            const partTo = parts[parts.length - 1];
            const mFrom = (s.from || s.origin || '').toLowerCase().includes(partFrom) || bpMatch;
            const mTo = (s.to || s.destination || '').toLowerCase().includes(partTo) || dpMatch;
            if (mFrom && mTo) return true;
          }
        }

        return false;
      });
    }

    // Products Specific Filters
    if (isProductsCategory) {
      if (selectedProdCategory !== 'All') {
        const prodCatTarget = selectedProdCategory.toLowerCase();
        allServices = allServices.filter((s) => {
          const sSub = s.subcategory.toLowerCase();
          const pName = s.name.toLowerCase();
          return sSub.includes(prodCatTarget) || prodCatTarget.includes(sSub) || pName.includes(prodCatTarget);
        });
      }
      if (selectedProdBrand !== 'All') {
        allServices = allServices.filter(
          (s) => s.brand && s.brand.toLowerCase() === selectedProdBrand.toLowerCase()
        );
      }
      if (selectedProdPrice === 'Under ₹1,500') {
        allServices = allServices.filter(
          (s) => (s.priceNum || parseInt((s.price || '0').replace(/[^\d]/g, ''), 10)) < 1500
        );
      } else if (selectedProdPrice === '₹1,500 - ₹5,000') {
        allServices = allServices.filter((s) => {
          const p = s.priceNum || parseInt((s.price || '0').replace(/[^\d]/g, ''), 10);
          return p >= 1500 && p <= 5000;
        });
      } else if (selectedProdPrice === '₹5,000+') {
        allServices = allServices.filter(
          (s) => (s.priceNum || parseInt((s.price || '0').replace(/[^\d]/g, ''), 10)) > 5000
        );
      }
      if (selectedProdRating !== null) {
        allServices = allServices.filter((s) => parseFloat(s.rating) >= selectedProdRating);
      }
      if (selectedProdDiscount === '20%+ OFF') {
        allServices = allServices.filter((s) => (s.discountNum || 0) >= 20);
      } else if (selectedProdDiscount === '30%+ OFF') {
        allServices = allServices.filter((s) => (s.discountNum || 0) >= 30);
      } else if (selectedProdDiscount === '40%+ OFF') {
        allServices = allServices.filter((s) => (s.discountNum || 0) >= 40);
      }
      if (selectedProdInStockOnly) {
        allServices = allServices.filter((s) => s.inStock !== false);
      }
    }

    // Daily Needs Specific Filters
    if (isDailyNeedsCategory) {
      if (selectedDnCategory !== 'All') {
        allServices = allServices.filter(
          (s) => s.subcategory.toLowerCase() === selectedDnCategory.toLowerCase()
        );
      }
      if (selectedDnBrand !== 'All') {
        allServices = allServices.filter(
          (s) => s.brand && s.brand.toLowerCase() === selectedDnBrand.toLowerCase()
        );
      }
      if (selectedDnPrice === 'Under ₹50') {
        allServices = allServices.filter(
          (s) => (s.priceNum || parseInt((s.price || '0').replace(/[^\d]/g, ''), 10)) < 50
        );
      } else if (selectedDnPrice === '₹50 - ₹200') {
        allServices = allServices.filter((s) => {
          const p = s.priceNum || parseInt((s.price || '0').replace(/[^\d]/g, ''), 10);
          return p >= 50 && p <= 200;
        });
      } else if (selectedDnPrice === '₹200+') {
        allServices = allServices.filter(
          (s) => (s.priceNum || parseInt((s.price || '0').replace(/[^\d]/g, ''), 10)) > 200
        );
      }
      if (selectedDnRating !== null) {
        allServices = allServices.filter((s) => parseFloat(s.rating) >= selectedDnRating);
      }
      if (selectedDnPackSize === '500g / 1kg') {
        allServices = allServices.filter(
          (s) => s.name.toLowerCase().includes('1kg') || s.name.toLowerCase().includes('500g')
        );
      } else if (selectedDnPackSize === '5kg') {
        allServices = allServices.filter((s) => s.name.toLowerCase().includes('5kg'));
      } else if (selectedDnPackSize === 'Single Pack') {
        allServices = allServices.filter(
          (s) => s.name.toLowerCase().includes('pc') || s.name.toLowerCase().includes('pack')
        );
      }
      if (selectedDnInStockOnly) {
        allServices = allServices.filter((s) => s.inStock !== false);
      }
      if (selectedDnDeliveryTime !== 'All') {
        allServices = allServices.filter(
          (s) => s.deliveryTime && s.deliveryTime.includes(selectedDnDeliveryTime.replace('⚡ ', ''))
        );
      }
    }

    // Food Specific Filters
    if (isFoodCategory) {
      if (selectedFoodCuisine !== 'All') {
        allServices = allServices.filter(
          (s) =>
            (s.cuisine && s.cuisine.toLowerCase() === selectedFoodCuisine.toLowerCase()) ||
            s.subcategory.toLowerCase().includes(selectedFoodCuisine.toLowerCase()) ||
            s.name.toLowerCase().includes(selectedFoodCuisine.toLowerCase())
        );
      }
      if (selectedFoodVegMode === 'Pure Veg') {
        allServices = allServices.filter((s) => s.isVeg === true);
      } else if (selectedFoodVegMode === 'Non-Veg') {
        allServices = allServices.filter((s) => s.isVeg === false);
      }
      if (selectedFoodPrice === 'Under ₹200') {
        allServices = allServices.filter(
          (s) => (s.priceNum || parseInt((s.price || '0').replace(/[^\d]/g, ''), 10)) < 200
        );
      } else if (selectedFoodPrice === '₹200 - ₹500') {
        allServices = allServices.filter((s) => {
          const p = s.priceNum || parseInt((s.price || '0').replace(/[^\d]/g, ''), 10);
          return p >= 200 && p <= 500;
        });
      } else if (selectedFoodPrice === '₹500+') {
        allServices = allServices.filter(
          (s) => (s.priceNum || parseInt((s.price || '0').replace(/[^\d]/g, ''), 10)) > 500
        );
      }
      if (selectedFoodRating !== null) {
        allServices = allServices.filter((s) => parseFloat(s.rating) >= selectedFoodRating);
      }
      if (selectedFoodDeliveryTime === 'Under 30 mins') {
        allServices = allServices.filter((s) => {
          const dt = parseInt((s.deliveryTime || '30').replace(/[^\d]/g, ''), 10);
          return dt <= 30;
        });
      } else if (selectedFoodDeliveryTime === '30-45 mins') {
        allServices = allServices.filter((s) => {
          const dt = parseInt((s.deliveryTime || '30').replace(/[^\d]/g, ''), 10);
          return dt >= 30 && dt <= 45;
        });
      }
      if (selectedFoodOffersOnly) {
        allServices = allServices.filter((s) => s.hasOffer || s.originalPrice);
      }
    }

    // Services Specific Filters
    if (isServicesCategory) {
      if (selectedSrvType !== 'All') {
        allServices = allServices.filter(
          (s) =>
            (s.serviceType && s.serviceType.toLowerCase() === selectedSrvType.toLowerCase()) ||
            s.subcategory.toLowerCase().includes(selectedSrvType.toLowerCase()) ||
            s.name.toLowerCase().includes(selectedSrvType.toLowerCase())
        );
      }
      if (selectedSrvPrice === 'Under ₹500') {
        allServices = allServices.filter(
          (s) => (s.priceNum || parseInt((s.price || '0').replace(/[^\d]/g, ''), 10)) < 500
        );
      } else if (selectedSrvPrice === '₹500 - ₹1,500') {
        allServices = allServices.filter((s) => {
          const p = s.priceNum || parseInt((s.price || '0').replace(/[^\d]/g, ''), 10);
          return p >= 500 && p <= 1500;
        });
      } else if (selectedSrvPrice === '₹1,500+') {
        allServices = allServices.filter(
          (s) => (s.priceNum || parseInt((s.price || '0').replace(/[^\d]/g, ''), 10)) > 1500
        );
      }
      if (selectedSrvRating !== null) {
        allServices = allServices.filter((s) => parseFloat(s.rating) >= selectedSrvRating);
      }
      if (selectedSrvAvailability) {
        allServices = allServices.filter((s) => s.availableToday !== false);
      }
      if (selectedSrvTime !== 'All') {
        allServices = allServices.filter(
          (s) => s.serviceTime && s.serviceTime.toLowerCase().includes(selectedSrvTime.toLowerCase())
        );
      }
      if (selectedSrvBookingMode === 'Instant') {
        allServices = allServices.filter((s) => s.bookingMode === 'instant' || s.bookingMode === 'both');
      } else if (selectedSrvBookingMode === 'Scheduled') {
        allServices = allServices.filter((s) => s.bookingMode === 'scheduled' || s.bookingMode === 'both');
      }
    }

    // Travel / Bus Booking Specific Filters
    if (isTravelCategory) {
      if (selectedBusDepartureTime !== 'All') {
        allServices = allServices.filter((s) => {
          if (s.departureSlot && s.departureSlot.toLowerCase() === selectedBusDepartureTime.toLowerCase()) {
            return true;
          }
          const mins = parseTimeToMinutes(s.departureTime);
          if (selectedBusDepartureTime.startsWith('Morning')) {
            return mins >= 360 && mins < 720;
          } else if (selectedBusDepartureTime.startsWith('Afternoon')) {
            return mins >= 720 && mins < 1080;
          } else if (selectedBusDepartureTime.startsWith('Evening')) {
            return mins >= 1080 && mins < 1380;
          } else if (selectedBusDepartureTime.startsWith('Night')) {
            return mins >= 1380 || mins < 360;
          }
          return (s.departureTime && s.departureTime.includes(selectedBusDepartureTime.replace(/\s*\(.*\)/, '')));
        });
      }
      if (selectedBusTypes.length > 0) {
        allServices = allServices.filter((s) => {
          const bType = ((s.busType || '') + ' ' + (s.subcategory || '') + ' ' + (s.name || '')).toLowerCase();
          return selectedBusTypes.some((t) => {
            const tl = t.toLowerCase();
            if (tl === 'seater') return bType.includes('seater');
            if (tl === 'sleeper') return bType.includes('sleeper');
            if (tl === 'volvo buses' || tl === 'volvo') return bType.includes('volvo');
            return bType.includes(tl);
          });
        });
      }
      if (selectedBusAcType !== 'All') {
        allServices = allServices.filter((s) => {
          const str = ((s.busType || '') + ' ' + (s.subcategory || '') + ' ' + (s.name || '')).toLowerCase();
          const isNonAc = str.includes('non-ac') || str.includes('non ac');
          const isAc = str.includes('ac') && !isNonAc;
          if (selectedBusAcType === 'AC') return isAc;
          if (selectedBusAcType === 'Non-AC') return isNonAc;
          return true;
        });
      }
      if (selectedBusOperator !== 'All') {
        allServices = allServices.filter(
          (s) =>
            (s.operator && s.operator.toLowerCase().includes(selectedBusOperator.toLowerCase())) ||
            (s.name && s.name.toLowerCase().includes(selectedBusOperator.toLowerCase()))
        );
      }
      if (selectedBusMaxPrice < 10000) {
        allServices = allServices.filter((s) => {
          const p = s.priceNum || (typeof s.price === 'number' ? s.price : parseInt(String(s.price || '0').replace(/[^\d]/g, ''), 10)) || 0;
          return p <= selectedBusMaxPrice;
        });
      }
      if (selectedBusBoarding !== 'All') {
        allServices = allServices.filter(
          (s) =>
            s.boardingPoints &&
            s.boardingPoints.some((pt: string) => pt.toLowerCase().includes(selectedBusBoarding.toLowerCase()))
        );
      }
      if (selectedBusDropping !== 'All') {
        allServices = allServices.filter(
          (s) =>
            s.droppingPoints &&
            s.droppingPoints.some((pt: string) => pt.toLowerCase().includes(selectedBusDropping.toLowerCase()))
        );
      }
    }

    // Apply Active Category Sort
    const activeSort = isProductsCategory
      ? selectedProdSort
      : isDailyNeedsCategory
      ? selectedDnSort
      : isFoodCategory
      ? selectedFoodSort
      : isServicesCategory
      ? selectedSrvSort
      : isTravelCategory
      ? selectedBusSort
      : 'Recommended';

    if (activeSort === 'Price Low → High') {
      allServices.sort((a, b) => {
        const pA = a.priceNum || parseInt((a.price || '0').replace(/[^\d]/g, ''), 10) || 0;
        const pB = b.priceNum || parseInt((b.price || '0').replace(/[^\d]/g, ''), 10) || 0;
        return pA - pB;
      });
    } else if (activeSort === 'Price High → Low') {
      allServices.sort((a, b) => {
        const pA = a.priceNum || parseInt((a.price || '0').replace(/[^\d]/g, ''), 10) || 0;
        const pB = b.priceNum || parseInt((b.price || '0').replace(/[^\d]/g, ''), 10) || 0;
        return pB - pA;
      });
    } else if (activeSort === 'Rating High → Low' || activeSort === 'Rating') {
      allServices.sort((a, b) => {
        const rA = parseFloat(a.rating || '0') || 0;
        const rB = parseFloat(b.rating || '0') || 0;
        return rB - rA;
      });
    } else if (activeSort === 'Early Departure') {
      allServices.sort((a, b) => {
        const tA = parseTimeToMinutes(a.departureTime);
        const tB = parseTimeToMinutes(b.departureTime);
        return tA - tB;
      });
    } else if (activeSort === 'Late Departure') {
      allServices.sort((a, b) => {
        const tA = parseTimeToMinutes(a.departureTime);
        const tB = parseTimeToMinutes(b.departureTime);
        return tB - tA;
      });
    } else if (activeSort === 'Discount High → Low') {
      allServices.sort((a, b) => {
        const dA = a.discountNum || 0;
        const dB = b.discountNum || 0;
        return dB - dA;
      });
    } else if (activeSort === 'Delivery Time') {
      allServices.sort((a, b) => {
        const dtA = parseInt((a.deliveryTime || '30').replace(/[^\d]/g, ''), 10) || 30;
        const dtB = parseInt((b.deliveryTime || '30').replace(/[^\d]/g, ''), 10) || 30;
        return dtA - dtB;
      });
    }

    return allServices;
  }, [
    categoryName,
    selectedSubcat,
    searchQuery,
    isProductsCategory,
    selectedProdCategory,
    selectedProdBrand,
    selectedProdPrice,
    selectedProdRating,
    selectedProdDiscount,
    selectedProdInStockOnly,
    selectedProdSort,
    isDailyNeedsCategory,
    selectedDnCategory,
    selectedDnBrand,
    selectedDnPrice,
    selectedDnRating,
    selectedDnPackSize,
    selectedDnInStockOnly,
    selectedDnDeliveryTime,
    selectedDnSort,
    isFoodCategory,
    selectedFoodCuisine,
    selectedFoodVegMode,
    selectedFoodPrice,
    selectedFoodRating,
    selectedFoodDeliveryTime,
    selectedFoodOffersOnly,
    selectedFoodSort,
    isServicesCategory,
    selectedSrvType,
    selectedSrvPrice,
    selectedSrvRating,
    selectedSrvAvailability,
    selectedSrvTime,
    selectedSrvBookingMode,
    selectedSrvSort,
    isTravelCategory,
    selectedBusDepartureTime,
    selectedBusTypes,
    selectedBusAcType,
    selectedBusOperator,
    selectedBusMaxPrice,
    selectedBusBoarding,
    selectedBusDropping,
    selectedBusSort,
    apiProducts,
    routeParams,
    routeParams.from,
    routeParams.to,
    routeParams.subCategoryName,
    routeParams.childCategoryName,
  ]);

  // Draft preview products list for modal result count
  const draftProdDisplayedServices = useMemo(() => {
    if (!isProductsCategory) return [];
    let items = (mappedApiProds || []).filter((p) => {
      const cat = (p.mainCategory || '').toLowerCase();
      return cat === 'products' || cat === 'product';
    });
    const query = searchQuery.toLowerCase().trim();

    if (selectedSubcat !== 'All') {
      items = items.filter(
        (s) => s.subcategory.toLowerCase() === selectedSubcat.toLowerCase()
      );
    }
    if (query) {
      items = items.filter(
        (s) =>
          s.name.toLowerCase().includes(query) ||
          s.desc.toLowerCase().includes(query) ||
          (s.brand && s.brand.toLowerCase().includes(query))
      );
    }

    if (draftProdCategory !== 'All') {
      items = items.filter((s) => s.subcategory.toLowerCase() === draftProdCategory.toLowerCase());
    }
    if (draftProdBrand !== 'All') {
      items = items.filter((s) => s.brand && s.brand.toLowerCase() === draftProdBrand.toLowerCase());
    }
    if (draftProdPrice === 'Under ₹1,500') {
      items = items.filter((s) => (s.priceNum || parseInt((s.price || '0').replace(/[^\d]/g, ''), 10)) < 1500);
    } else if (draftProdPrice === '₹1,500 - ₹5,000') {
      items = items.filter((s) => {
        const p = s.priceNum || parseInt((s.price || '0').replace(/[^\d]/g, ''), 10);
        return p >= 1500 && p <= 5000;
      });
    } else if (draftProdPrice === '₹5,000+') {
      items = items.filter((s) => (s.priceNum || parseInt((s.price || '0').replace(/[^\d]/g, ''), 10)) > 5000);
    }
    if (draftProdRating !== null) {
      items = items.filter((s) => parseFloat(s.rating) >= draftProdRating);
    }
    if (draftProdDiscount === '20%+ OFF') {
      items = items.filter((s) => (s.discountNum || 0) >= 20);
    } else if (draftProdDiscount === '30%+ OFF') {
      items = items.filter((s) => (s.discountNum || 0) >= 30);
    } else if (draftProdDiscount === '40%+ OFF') {
      items = items.filter((s) => (s.discountNum || 0) >= 40);
    }
    if (draftProdInStockOnly) {
      items = items.filter((s) => s.inStock !== false);
    }

    return items;
  }, [
    isProductsCategory,
    selectedSubcat,
    searchQuery,
    draftProdCategory,
    draftProdBrand,
    draftProdPrice,
    draftProdRating,
    draftProdDiscount,
  ]);

  // Draft preview Daily Needs list for modal result count
  const draftDnDisplayedServices = useMemo(() => {
    if (!isDailyNeedsCategory) return [];
    let items = (mappedApiProds || []).filter((p) => (p.mainCategory || '').toLowerCase().includes('daily'));
    const query = searchQuery.toLowerCase().trim();

    if (selectedSubcat !== 'All') {
      items = items.filter(
        (s) => s.subcategory.toLowerCase() === selectedSubcat.toLowerCase()
      );
    }
    if (query) {
      items = items.filter(
        (s) =>
          s.name.toLowerCase().includes(query) ||
          s.desc.toLowerCase().includes(query) ||
          (s.brand && s.brand.toLowerCase().includes(query))
      );
    }

    if (draftDnCategory !== 'All') {
      items = items.filter((s) => s.subcategory.toLowerCase() === draftDnCategory.toLowerCase());
    }
    if (draftDnBrand !== 'All') {
      items = items.filter((s) => s.brand && s.brand.toLowerCase() === draftDnBrand.toLowerCase());
    }
    if (draftDnPrice === 'Under ₹50') {
      items = items.filter((s) => (s.priceNum || parseInt((s.price || '0').replace(/[^\d]/g, ''), 10)) < 50);
    } else if (draftDnPrice === '₹50 - ₹200') {
      items = items.filter((s) => {
        const p = s.priceNum || parseInt((s.price || '0').replace(/[^\d]/g, ''), 10);
        return p >= 50 && p <= 200;
      });
    } else if (draftDnPrice === '₹200+') {
      items = items.filter((s) => (s.priceNum || parseInt((s.price || '0').replace(/[^\d]/g, ''), 10)) > 200);
    }
    if (draftDnRating !== null) {
      items = items.filter((s) => parseFloat(s.rating) >= draftDnRating);
    }
    if (draftDnPackSize === '500g / 1kg') {
      items = items.filter((s) => s.name.toLowerCase().includes('1kg') || s.name.toLowerCase().includes('500g'));
    } else if (draftDnPackSize === '5kg') {
      items = items.filter((s) => s.name.toLowerCase().includes('5kg'));
    } else if (draftDnPackSize === 'Single Pack') {
      items = items.filter((s) => s.name.toLowerCase().includes('pc') || s.name.toLowerCase().includes('pack'));
    }
    if (draftDnInStockOnly) {
      items = items.filter((s) => s.inStock !== false);
    }
    if (draftDnDeliveryTime !== 'All') {
      items = items.filter((s) => s.deliveryTime && s.deliveryTime.includes(draftDnDeliveryTime.replace('⚡ ', '')));
    }

    return items;
  }, [
    isDailyNeedsCategory,
    selectedSubcat,
    searchQuery,
    draftDnCategory,
    draftDnBrand,
    draftDnPrice,
    draftDnRating,
    draftDnPackSize,
    draftDnInStockOnly,
  ]);

  // Draft preview Food list for modal result count
  const draftFoodDisplayedServices = useMemo(() => {
    if (!isFoodCategory) return [];
    let items = (mappedApiProds || []).filter((p) => (p.mainCategory || '').toLowerCase() === 'food');
    const query = searchQuery.toLowerCase().trim();

    if (selectedSubcat !== 'All') {
      items = items.filter(
        (s) => s.subcategory.toLowerCase() === selectedSubcat.toLowerCase()
      );
    }
    if (query) {
      items = items.filter(
        (s) =>
          s.name.toLowerCase().includes(query) ||
          s.desc.toLowerCase().includes(query) ||
          (s.cuisine && s.cuisine.toLowerCase().includes(query))
      );
    }

    if (draftFoodCuisine !== 'All') {
      items = items.filter(
        (s) =>
          (s.cuisine && s.cuisine.toLowerCase() === draftFoodCuisine.toLowerCase()) ||
          s.subcategory.toLowerCase().includes(draftFoodCuisine.toLowerCase()) ||
          s.name.toLowerCase().includes(draftFoodCuisine.toLowerCase())
      );
    }
    if (draftFoodVegMode === 'Pure Veg') {
      items = items.filter((s) => s.isVeg === true);
    } else if (draftFoodVegMode === 'Non-Veg') {
      items = items.filter((s) => s.isVeg === false);
    }
    if (draftFoodPrice === 'Under ₹200') {
      items = items.filter((s) => (s.priceNum || parseInt((s.price || '0').replace(/[^\d]/g, ''), 10)) < 200);
    } else if (draftFoodPrice === '₹200 - ₹500') {
      items = items.filter((s) => {
        const p = s.priceNum || parseInt((s.price || '0').replace(/[^\d]/g, ''), 10);
        return p >= 200 && p <= 500;
      });
    } else if (draftFoodPrice === '₹500+') {
      items = items.filter((s) => (s.priceNum || parseInt((s.price || '0').replace(/[^\d]/g, ''), 10)) > 500);
    }
    if (draftFoodRating !== null) {
      items = items.filter((s) => parseFloat(s.rating) >= draftFoodRating);
    }
    if (draftFoodDeliveryTime === 'Under 30 mins') {
      items = items.filter((s) => {
        const dt = parseInt((s.deliveryTime || '30').replace(/[^\d]/g, ''), 10);
        return dt <= 30;
      });
    } else if (draftFoodDeliveryTime === '30-45 mins') {
      items = items.filter((s) => {
        const dt = parseInt((s.deliveryTime || '30').replace(/[^\d]/g, ''), 10);
        return dt >= 30 && dt <= 45;
      });
    }
    if (draftFoodOffersOnly) {
      items = items.filter((s) => s.hasOffer || s.originalPrice);
    }

    return items;
  }, [
    isFoodCategory,
    selectedSubcat,
    searchQuery,
    draftFoodCuisine,
    draftFoodVegMode,
    draftFoodPrice,
    draftFoodRating,
    draftFoodDeliveryTime,
  ]);

  // Draft preview Services list for modal result count
  const draftSrvDisplayedServices = useMemo(() => {
    if (!isServicesCategory) return [];
    let items = (mappedApiProds || []).filter((p) => (p.mainCategory || '').toLowerCase() === 'services');
    const query = searchQuery.toLowerCase().trim();

    if (selectedSubcat !== 'All') {
      items = items.filter(
        (s) => s.subcategory.toLowerCase() === selectedSubcat.toLowerCase()
      );
    }
    if (query) {
      items = items.filter(
        (s) =>
          s.name.toLowerCase().includes(query) ||
          s.desc.toLowerCase().includes(query) ||
          (s.serviceType && s.serviceType.toLowerCase().includes(query))
      );
    }

    if (draftSrvType !== 'All') {
      items = items.filter(
        (s) =>
          (s.serviceType && s.serviceType.toLowerCase() === draftSrvType.toLowerCase()) ||
          s.subcategory.toLowerCase().includes(draftSrvType.toLowerCase()) ||
          s.name.toLowerCase().includes(draftSrvType.toLowerCase())
      );
    }
    if (draftSrvPrice === 'Under ₹500') {
      items = items.filter((s) => (s.priceNum || parseInt((s.price || '0').replace(/[^\d]/g, ''), 10)) < 500);
    } else if (draftSrvPrice === '₹500 - ₹1,500') {
      items = items.filter((s) => {
        const p = s.priceNum || parseInt((s.price || '0').replace(/[^\d]/g, ''), 10);
        return p >= 500 && p <= 1500;
      });
    } else if (draftSrvPrice === '₹1,500+') {
      items = items.filter((s) => (s.priceNum || parseInt((s.price || '0').replace(/[^\d]/g, ''), 10)) > 1500);
    }
    if (draftSrvRating !== null) {
      items = items.filter((s) => parseFloat(s.rating) >= draftSrvRating);
    }
    if (draftSrvAvailability) {
      items = items.filter((s) => s.availableToday !== false);
    }
    if (draftSrvTime !== 'All') {
      items = items.filter((s) => s.serviceTime && s.serviceTime.toLowerCase().includes(draftSrvTime.toLowerCase()));
    }
    if (draftSrvBookingMode === 'Instant') {
      items = items.filter((s) => s.bookingMode === 'instant' || s.bookingMode === 'both');
    } else if (draftSrvBookingMode === 'Scheduled') {
      items = items.filter((s) => s.bookingMode === 'scheduled' || s.bookingMode === 'both');
    }

    return items;
  }, [
    isServicesCategory,
    selectedSubcat,
    searchQuery,
    draftSrvType,
    draftSrvPrice,
    draftSrvRating,
    draftSrvAvailability,
    draftSrvTime,
  ]);

  // Draft preview Bus list for modal result count
  const draftBusDisplayedServices = useMemo(() => {
    if (!isTravelCategory) return [];
    let items = dynamicVendorTravelItems || [];
    const reqFrom = (routeParams.from || '').trim().toLowerCase();
    const reqTo = (routeParams.to || '').trim().toLowerCase();
    if (reqFrom || reqTo) {
      const routeMatches = items.filter((s: any) => {
        const sFrom = (s.from || s.origin || s.route || '').toLowerCase();
        const sTo = (s.to || s.destination || s.route || '').toLowerCase();
        const sBoarding = (s.boardingPoints || []).join(' ').toLowerCase();
        const sDropping = (s.droppingPoints || []).join(' ').toLowerCase();

        const matchFrom = !reqFrom || sFrom.includes(reqFrom) || sBoarding.includes(reqFrom);
        const matchTo = !reqTo || sTo.includes(reqTo) || sDropping.includes(reqTo);
        return matchFrom && matchTo;
      });
      if (routeMatches.length > 0) {
        items = routeMatches;
      }
    }
    const query = searchQuery.toLowerCase().trim();

    if (selectedSubcat !== 'All') {
      items = items.filter(
        (s) => ((s.subcategory || '').toLowerCase() === selectedSubcat.toLowerCase())
      );
    }
    if (query) {
      items = items.filter(
        (s) =>
          ((s.name || '').toLowerCase().includes(query)) ||
          ((s.desc || '').toLowerCase().includes(query)) ||
          (Boolean(s.operator) && s.operator!.toLowerCase().includes(query)) ||
          (Boolean(s.route) && s.route!.toLowerCase().includes(query))
      );
    }

    if (draftBusDepartureTime !== 'All') {
      items = items.filter(
        (s) =>
          (s.departureSlot && s.departureSlot.toLowerCase() === draftBusDepartureTime.toLowerCase()) ||
          (s.departureTime && s.departureTime.includes(draftBusDepartureTime.replace(/\s*\(.*\)/, '')))
      );
    }
    if (draftBusTypes.length > 0) {
      items = items.filter((s) => {
        const bType = ((s.busType || '') + ' ' + (s.subcategory || '') + ' ' + (s.name || '')).toLowerCase();
        return draftBusTypes.some((t) => {
          const tl = t.toLowerCase();
          if (tl === 'seater') return bType.includes('seater');
          if (tl === 'sleeper') return bType.includes('sleeper');
          if (tl === 'volvo buses' || tl === 'volvo') return bType.includes('volvo');
          return bType.includes(tl);
        });
      });
    }
    if (draftBusAcType !== 'All') {
      items = items.filter((s) => {
        const str = ((s.busType || '') + ' ' + (s.subcategory || '') + ' ' + (s.name || '')).toLowerCase();
        const isNonAc = str.includes('non-ac') || str.includes('non ac');
        const isAc = str.includes('ac') && !isNonAc;
        if (draftBusAcType === 'AC') return isAc;
        if (draftBusAcType === 'Non-AC') return isNonAc;
        return true;
      });
    }
    if (draftBusOperator !== 'All') {
      items = items.filter(
        (s) =>
          (s.operator && s.operator.toLowerCase() === draftBusOperator.toLowerCase()) ||
          s.name.toLowerCase().includes(draftBusOperator.toLowerCase())
      );
    }
    if (draftBusMaxPrice < 10000) {
      items = items.filter((s) => {
        const p = s.priceNum || (typeof s.price === 'number' ? s.price : parseInt(String(s.price || '0').replace(/[^\d]/g, ''), 10)) || 0;
        return p <= draftBusMaxPrice;
      });
    }
    if (draftBusBoarding !== 'All') {
      items = items.filter(
        (s) =>
          s.boardingPoints &&
          s.boardingPoints.some((pt: string) => pt.toLowerCase().includes(draftBusBoarding.toLowerCase()))
      );
    }
    if (draftBusDropping !== 'All') {
      items = items.filter(
        (s) =>
          s.droppingPoints &&
          s.droppingPoints.some((pt: string) => pt.toLowerCase().includes(draftBusDropping.toLowerCase()))
      );
    }

    return items;
  }, [
    isTravelCategory,
    routeParams.from,
    routeParams.to,
    selectedSubcat,
    searchQuery,
    draftBusDepartureTime,
    draftBusTypes,
    draftBusAcType,
    draftBusOperator,
    draftBusMaxPrice,
    draftBusBoarding,
    draftBusDropping,
  ]);

  // Helper to filter Stay items
  const filterStayList = (
    catalog: any[],
    dest: string,
    subcat: string,
    queryStr: string,
    priceRange: string,
    propTypes: string[],
    starRatings: number[],
    guestRating: number | null,
    amenitiesList: string[],
    freeCancel: boolean,
    sortOpt: string,
    childCat: string = 'All'
  ) => {
    let items = [...catalog];
    const query = queryStr.toLowerCase().trim();

    // 1. Filter by Destination
    if (dest !== 'All Destinations' && dest !== 'Near me') {
      const dLower = dest.toLowerCase();
      items = items.filter(
        (s) =>
          (s.location && s.location.toLowerCase().includes(dLower)) ||
          (s.locationCity && s.locationCity.toLowerCase().includes(dLower)) ||
          (s.stayCity && s.stayCity.toLowerCase().includes(dLower)) ||
          (s.name && s.name.toLowerCase().includes(dLower))
      );
    }

    // 2. Filter by Stay Type Chip (e.g. 'All Stays', 'Hotels', 'Resorts', 'Villas', 'Homestays', 'Apartments')
    if (subcat !== 'All' && subcat !== 'All Stays') {
      const cleanTarget = subcat.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}]/gu, '').toLowerCase().trim();
      items = items.filter((s) => {
        const sSub = String(s.subcategory || '').replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}]/gu, '').toLowerCase().trim();
        const sProp = String(s.propertyType || '').replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}]/gu, '').toLowerCase().trim();
        const sVendor = String(s.vendorCategory || s.rawSubcategory || '').replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}]/gu, '').toLowerCase().trim();
        const sChild = String(s.childCategory || s.itemType || '').toLowerCase().trim();

        if (sSub === cleanTarget || sProp === cleanTarget || sVendor === cleanTarget) return true;

        if (cleanTarget.includes('hotel')) {
          return sSub.includes('hotel') || sProp.includes('hotel') || sVendor.includes('hotel') || sChild.includes('hotel');
        }
        if (cleanTarget.includes('resort')) {
          return sSub.includes('resort') || sProp.includes('resort') || sVendor.includes('resort') || sChild.includes('resort');
        }
        if (cleanTarget.includes('villa')) {
          return sSub.includes('villa') || sProp.includes('villa') || sVendor.includes('villa') || sChild.includes('villa');
        }
        if (cleanTarget.includes('homestay')) {
          return sSub.includes('homestay') || sProp.includes('homestay') || sVendor.includes('homestay') || sChild.includes('homestay');
        }
        if (cleanTarget.includes('apartment')) {
          return sSub.includes('apartment') || sProp.includes('apartment') || sVendor.includes('apartment') || sChild.includes('apartment');
        }

        return sChild.includes(cleanTarget) || cleanTarget.includes(sChild);
      });
    }

    // 2b. Filter by Child Category (e.g. 'Luxury Hotels', 'Budget Hotels', etc.)
    if (childCat && childCat !== 'All' && !childCat.toLowerCase().startsWith('all')) {
      const cleanChild = childCat.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}]/gu, '').toLowerCase().trim();
      items = items.filter((s) => {
        const sChild = String(s.childCategory || s.itemType || '').toLowerCase();
        const sRoom = String(s.roomClass || s.roomName || s.name || '').toLowerCase();
        const sDesc = String(s.desc || '').toLowerCase();
        const sVendor = String(s.vendorCategory || '').toLowerCase();
        return (
          sChild.includes(cleanChild) ||
          cleanChild.includes(sChild) ||
          sRoom.includes(cleanChild) ||
          sDesc.includes(cleanChild) ||
          sVendor.includes(cleanChild)
        );
      });
    }

    // 3. Filter by Search Query
    if (query) {
      items = items.filter(
        (s) =>
          s.name.toLowerCase().includes(query) ||
          (s.location && s.location.toLowerCase().includes(query)) ||
          s.subcategory.toLowerCase().includes(query) ||
          (s.childCategory && s.childCategory.toLowerCase().includes(query)) ||
          s.desc.toLowerCase().includes(query)
      );
    }

    // 4. Filter by Price Range
    if (priceRange === 'Under ₹3,500') {
      items = items.filter((s) => (s.priceNum || 0) < 3500);
    } else if (priceRange === '₹3,500 - ₹6,000') {
      items = items.filter((s) => (s.priceNum || 0) >= 3500 && (s.priceNum || 0) <= 6000);
    } else if (priceRange === '₹6,000+') {
      items = items.filter((s) => (s.priceNum || 0) > 6000);
    }

    // 5. Filter by Property Types
    if (propTypes.length > 0) {
      items = items.filter((s) =>
        propTypes.some((pt) => {
          const cleanPt = pt.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}]/gu, '').toLowerCase().trim();
          const sSub = String(s.subcategory || '').replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}]/gu, '').toLowerCase().trim();
          const sProp = String(s.propertyType || '').replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}]/gu, '').toLowerCase().trim();
          const sVendor = String(s.vendorCategory || s.rawSubcategory || '').replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}]/gu, '').toLowerCase().trim();
          const sChild = String(s.childCategory || s.itemType || '').toLowerCase().trim();

          if (sSub === cleanPt || sProp === cleanPt || sVendor === cleanPt) return true;

          if (cleanPt.includes('hotel')) {
            return sSub.includes('hotel') || sProp.includes('hotel') || sVendor.includes('hotel') || sChild.includes('hotel');
          }
          if (cleanPt.includes('resort')) {
            return sSub.includes('resort') || sProp.includes('resort') || sVendor.includes('resort') || sChild.includes('resort');
          }
          if (cleanPt.includes('villa')) {
            return sSub.includes('villa') || sProp.includes('villa') || sVendor.includes('villa') || sChild.includes('villa');
          }
          if (cleanPt.includes('homestay')) {
            return sSub.includes('homestay') || sProp.includes('homestay') || sVendor.includes('homestay') || sChild.includes('homestay');
          }
          if (cleanPt.includes('apartment')) {
            return sSub.includes('apartment') || sProp.includes('apartment') || sVendor.includes('apartment') || sChild.includes('apartment');
          }
          return false;
        })
      );
    }

    // 6. Filter by Star Ratings
    if (starRatings.length > 0) {
      items = items.filter((s) => s.starRating && starRatings.includes(s.starRating));
    }

    // 7. Filter by Guest Rating
    if (guestRating !== null) {
      items = items.filter((s) => parseFloat(s.rating) >= guestRating);
    }

    // 8. Filter by Amenities
    if (amenitiesList.length > 0) {
      items = items.filter((s) =>
        s.amenities && amenitiesList.every((a) => s.amenities?.includes(a))
      );
    }

    // 9. Filter by Free Cancellation
    if (freeCancel) {
      items = items.filter((s) => s.deliveryTime === 'Free cancellation');
    }

    // 10. Sort
    if (sortOpt === 'Price Low → High') {
      items.sort((a, b) => (a.priceNum || 0) - (b.priceNum || 0));
    } else if (sortOpt === 'Price High → Low') {
      items.sort((a, b) => (b.priceNum || 0) - (a.priceNum || 0));
    } else if (sortOpt === 'Rating') {
      items.sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating));
    }

    return items;
  };

  // Dynamic vendor stays mapped from apiProducts
  const dynamicVendorStayItems = useMemo(() => {
    return (apiProducts || [])
      .filter((p: any) => {
        const mainCat = String(p.mainCategory || p.subNavbarCategory || '').toLowerCase();
        const cat = String(p.category || p.vendorType || '').toLowerCase();
        const sub = String(p.subcategory || p.subCategory || '').toLowerCase();
        const isNotDeleted = p.isDeleted !== true && p.status !== 'deleted' && p.isActive !== false && p.status !== 'Inactive';
        return (mainCat === 'stay' || mainCat.includes('stay') || cat.includes('stay') || cat.includes('hotel') || cat.includes('viil') || cat.includes('resort') || sub.includes('hotel') || sub.includes('resort') || sub.includes('room') || sub.includes('villa')) && isNotDeleted;
      })
      .map((p: any) => {
        const numPrice = typeof p.price === 'number' ? p.price : (parseFloat(String(p.price || '0').replace(/[^\d.]/g, '')) || 0);
        const origNum = p.originalPrice ? (typeof p.originalPrice === 'number' ? p.originalPrice : (parseFloat(String(p.originalPrice).replace(/[^\d.]/g, '')) || 0)) : (numPrice > 0 ? Math.round(numPrice * 1.35) : 0);
        const discountPct = origNum > numPrice ? Math.round(((origNum - numPrice) / origNum) * 100) : 0;
        const resolvedCity = p.stayCity || p.locationCity || p.city || (p.location ? p.location.split(',')[0]?.trim() : 'Bangalore');
        const resolvedAddress = p.stayAddress || p.location || `${resolvedCity}, India`;
        const resolvedName = p.hotelName || p.businessName || p.name || 'Boutique Stay';
        const rawAmenities = Array.isArray(p.selectedAmenities) && p.selectedAmenities.length > 0
          ? p.selectedAmenities
          : (Array.isArray(p.amenities) && p.amenities.length > 0 ? p.amenities : ['Free Wi-Fi', 'AC', 'Room Service']);
        const isFreeCancel = p.freeCancellation !== undefined ? p.freeCancellation : true;
        const star = Number(p.starRating) || 4;

        const rawSub = p.subCategory || p.subcategory || 'Hotels';
        const rawChild = p.itemType || p.roomType || p.roomClass || '';
        const cleanSub = String(rawSub).replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}]/gu, '').trim();
        const normSub = cleanSub.toLowerCase();

        // Normalize to standard stay accommodation types: 'Hotels', 'Resorts', 'Villas', 'Homestays', 'Apartments'
        let standardType = 'Hotels';
        if (normSub.includes('resort')) standardType = 'Resorts';
        else if (normSub.includes('villa')) standardType = 'Villas';
        else if (normSub.includes('homestay') || normSub.includes('cottage') || normSub.includes('farm stay')) standardType = 'Homestays';
        else if (normSub.includes('apartment')) standardType = 'Apartments';
        else standardType = 'Hotels';

        return {
          id: p._id || p.id || `stay_vendor_${Math.random()}`,
          name: resolvedName,
          hotelName: resolvedName,
          roomName: p.name,
          subcategory: standardType,
          propertyType: standardType,
          vendorCategory: cleanSub || standardType,
          rawSubcategory: rawSub,
          childCategory: rawChild,
          itemType: rawChild,
          starRating: star,
          location: resolvedAddress,
          locationCity: resolvedCity,
          stayCity: resolvedCity,
          stayAddress: resolvedAddress,
          desc: p.detail || p.description || p.desc || 'Premium comfortable stay with world class hospitality and top tier amenities.',
          rating: String(p.rating || '4.8'),
          reviews: String(p.reviewsCount || p.ratingCount || '320'),
          price: `₹${numPrice.toLocaleString('en-IN')} / night`,
          priceNum: numPrice,
          originalPrice: `₹${origNum.toLocaleString('en-IN')}`,
          discount: `${discountPct > 0 ? discountPct : 20}% OFF`,
          image: resolveImageUrl(p.image || p.imageUrl) || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&auto=format&fit=crop&q=80',
          assured: true,
          amenities: rawAmenities,
          deliveryTime: isFreeCancel ? 'Free cancellation' : 'Standard cancellation',
          freeCancellation: isFreeCancel,
          freeBreakfast: p.freeBreakfast !== undefined ? p.freeBreakfast : rawAmenities.includes('Free Breakfast'),
          coupleFriendly: p.coupleFriendly !== undefined ? p.coupleFriendly : true,
          payAtHotel: p.payAtHotel !== undefined ? p.payAtHotel : true,
          roomClass: p.roomClass || rawChild || 'Deluxe Room',
          bedType: p.bedType || '1 King Bed',
          numberOfGuests: p.numberOfGuests || '2 Guests',
          roomSize: p.roomSize || '280 sq.ft',
          roomView: p.roomView || 'City View',
          checkInTime: p.checkInTime || '12:00 PM',
          checkOutTime: p.checkOutTime || '11:00 AM',
          rawProduct: p,
        };
      });
  }, [apiProducts]);

  // Available destinations merged with vendor property cities
  const availableDestinations = useMemo(() => {
    const defaultDests = ['Near me', 'Jntu, Hyderabad', 'Bangalore', 'Mumbai', 'Chennai', 'Goa', 'Ooty', 'Hyderabad', 'Delhi', 'Jaipur', 'Coimbatore', 'Kodaikanal'];
    const vendorCities = dynamicVendorStayItems.map((s: any) => s.stayCity || s.locationCity).filter(Boolean);
    const set = new Set([...defaultDests, ...vendorCities]);
    return Array.from(set);
  }, [dynamicVendorStayItems]);

  // Dynamic live destination and hotel search results for Modal 1 (Screenshot 2)
  const filteredDestinationResults = useMemo(() => {
    const q = destSearchQuery.toLowerCase().trim();
    if (!q) return [];
    const results: Array<{ type: 'city' | 'hotel'; title: string; subtitle: string }> = [];

    const popularCities = ['Near me', 'Jntu, Hyderabad', 'Bangalore', 'Mumbai', 'Chennai', 'Goa', 'Ooty', 'Hyderabad', 'Delhi', 'Jaipur', 'Coimbatore', 'Kodaikanal'];
    const vendorCities = dynamicVendorStayItems.map((s: any) => s.stayCity || s.locationCity).filter(Boolean);
    const allCities = Array.from(new Set([...popularCities, ...vendorCities]));

    allCities.forEach((c) => {
      if (c.toLowerCase().includes(q)) {
        results.push({ type: 'city', title: c, subtitle: 'City / Destination' });
      }
    });

    const catalog = dynamicVendorStayItems || [];
    catalog.forEach((s) => {
      if (s.name.toLowerCase().includes(q) || (s.location && s.location.toLowerCase().includes(q))) {
        if (!results.some((r) => r.title.toLowerCase() === s.name.toLowerCase())) {
          results.push({
            type: 'hotel',
            title: s.name,
            subtitle: s.location || s.locationCity || s.stayCity || 'Hotel property',
          });
        }
      }
    });

    return results;
  }, [destSearchQuery, dynamicVendorStayItems]);

  // Dynamic child categories for Stay (e.g. 'Luxury Hotels', 'Budget Hotels', etc.)
  const stayChildCategories = useMemo(() => {
    const cleanSub = selectedSubcat.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}]/gu, '').toLowerCase().trim();
    if (cleanSub === 'all' || cleanSub === 'all stays') return [];

    let defaults: string[] = [];
    if (cleanSub.includes('hotel')) {
      defaults = ['All Hotels', 'Luxury Hotels', 'Budget Hotels', 'Business Hotels', 'Boutique Hotels'];
    } else if (cleanSub.includes('resort')) {
      defaults = ['All Resorts', 'Beach Resorts', 'Hill Station Resorts', 'Family Resorts', 'Luxury Resorts'];
    } else if (cleanSub.includes('homestay')) {
      defaults = ['All Homestays', 'Family Homestays', 'Village Homestays', 'Farm Stays'];
    } else if (cleanSub.includes('apartment')) {
      defaults = ['All Apartments', 'Studio Apartment', 'Daily Rental', 'Weekly Rental'];
    } else if (cleanSub.includes('villa')) {
      defaults = ['All Villas', 'Luxury Villas', 'Private Pool Villas', 'Beach Villas'];
    }

    // Dynamic child categories from vendor-added items matching this category
    const dynamicSet = new Set<string>();
    dynamicVendorStayItems.forEach((s: any) => {
      const sSub = String(s.subcategory || '').toLowerCase();
      if (sSub.includes(cleanSub) || cleanSub.includes(sSub)) {
        if (s.childCategory && typeof s.childCategory === 'string' && s.childCategory.trim()) {
          dynamicSet.add(s.childCategory.trim());
        }
      }
    });

    return Array.from(new Set([...defaults, ...Array.from(dynamicSet)]));
  }, [selectedSubcat, dynamicVendorStayItems]);

  // Main screen stays (committed applied filter state)
  const displayedStays = useMemo(() => {
    const catalog = dynamicVendorStayItems || [];
    return filterStayList(
      catalog,
      selectedDestination,
      selectedSubcat,
      searchQuery,
      selectedStayPriceRange,
      selectedStayPropTypes,
      selectedStayStarRatings,
      selectedStayGuestRating,
      selectedStayAmenities,
      freeCancelOnly,
      selectedStaySort,
      selectedStayChildCategory
    );
  }, [
    selectedDestination,
    selectedSubcat,
    searchQuery,
    selectedStayPriceRange,
    selectedStayPropTypes,
    selectedStayStarRatings,
    selectedStayGuestRating,
    selectedStayAmenities,
    freeCancelOnly,
    selectedStaySort,
    selectedStayChildCategory,
    dynamicVendorStayItems,
  ]);

  // Modal preview stays count (draft uncommitted filter state)
  const draftDisplayedStays = useMemo(() => {
    const catalog = dynamicVendorStayItems || [];
    return filterStayList(
      catalog,
      selectedDestination,
      selectedSubcat,
      searchQuery,
      draftStayPriceRange,
      draftStayPropTypes,
      draftStayStarRatings,
      draftStayGuestRating,
      draftStayAmenities,
      draftFreeCancelOnly,
      selectedStaySort,
      selectedStayChildCategory
    );
  }, [
    selectedDestination,
    selectedSubcat,
    searchQuery,
    draftStayPriceRange,
    draftStayPropTypes,
    draftStayStarRatings,
    draftStayGuestRating,
    draftStayAmenities,
    draftFreeCancelOnly,
    selectedStaySort,
    selectedStayChildCategory,
    dynamicVendorStayItems,
  ]);

  // Dynamic vendor jobs mapped from apiProducts
  const dynamicVendorJobs = useMemo((): JobItem[] => {
    return apiProducts
      .filter((p: any) => {
        const mainCat = String(p.mainCategory || p.subNavbarCategory || '').toLowerCase();
        const cat = String(p.category || p.vendorType || '').toLowerCase();
        const isNotDeleted = p.isDeleted !== true && p.status !== 'deleted' && p.isActive !== false && p.status !== 'Inactive';
        return (mainCat === 'jobs' || mainCat.includes('job') || cat.includes('job') || cat === 'it' || cat === 'non-it' || cat === 'delivery & field') && isNotDeleted;
      })
      .map((p: any) => {
        const sub = p.category || p.subCategory || p.subcategory || 'General';
        const roleName = p.subcategory || p.subCategory || p.itemType || p.childCategory || p.role || p.name || 'Job Role';
        const rawSalary = p.salaryPackage || p.price || '';
        const salaryStr = rawSalary ? (String(rawSalary).startsWith('₹') ? String(rawSalary) : `₹${rawSalary}`) : 'Competitive';

        let skills: string[] = [];
        if (Array.isArray(p.skillsRequirement)) {
          skills = p.skillsRequirement;
        } else if (typeof p.skillsRequirement === 'string' && p.skillsRequirement.trim()) {
          skills = p.skillsRequirement.split(',').map((s: string) => s.trim()).filter(Boolean);
        } else {
          skills = [roleName, sub];
        }

        const workLoc = String(p.jobLocation || p.location || 'On-site');
        let workMode = 'On-site';
        if (workLoc.toLowerCase().includes('remote') || workLoc.toLowerCase().includes('wfh')) {
          workMode = 'Remote';
        } else if (workLoc.toLowerCase().includes('hybrid')) {
          workMode = 'Hybrid';
        }

        return {
          id: p.id || p._id || `vjob_${Math.random()}`,
          jobID: p.jobID || (`JOB-${String(p.id || p._id || '').replace(/[^\d]/g, '').slice(-5) || '10482'}`),
          title: p.name || roleName,
          company: p.companyName || p.vendorName || p.businessName || p.vendor || 'Verified Employer',
          companyName: p.companyName || p.vendorName || p.businessName || p.vendor || 'Verified Employer',
          companyWebsite: p.companyWebsite || p.linkedProfileUrl || '',
          logo: '',
          isVerified: true,
          location: workLoc,
          workMode,
          experience: p.experienceRequired || '1–3 yrs',
          salary: salaryStr,
          employmentType: p.jobType || 'Full-time',
          department: sub,
          itemType: roleName,
          skills,
          postedDate: p.createdAt ? 'Recently' : 'Today',
          deadline: p.deadlineDate || 'Open',
          openings: Number(p.vacancies || p.stock || 1),
          description: p.jobDescription || p.detail || p.description || 'Job opportunities posted by verified company.',
          keyResponsibilities: p.keyResponsibilities || p.responsibilities || '',
          companyInfo: {
            industry: sub,
            rating: '4.8',
            website: p.companyWebsite || p.linkedProfileUrl || '',
          },
        };
      });
  }, [apiProducts]);

  const filteredJobs = useMemo(() => {
    const allJobs = dynamicVendorJobs || [];
    const incomingSub = routeParams.subCategoryName;

    return allJobs.filter((job: JobItem) => {
      // 1. Department / SubCategory filter (e.g. 'IT', 'Non-IT')
      if (incomingSub && incomingSub !== 'All') {
        const normIncoming = incomingSub.trim().toLowerCase();
        const normDept = (job.department || '').trim().toLowerCase();
        const matchDept =
          normDept === normIncoming ||
          normDept.includes(normIncoming) ||
          normIncoming.includes(normDept) ||
          (normIncoming === 'it' && (normDept.includes('it') || normDept.includes('tech') || normDept.includes('software')));
        if (!matchDept) return false;
      }

      // 2. Child Category / Role filter or Tab Filter
      if (selectedSubcat !== 'All') {
        const normSelected = selectedSubcat.trim().toLowerCase();
        const normRole = (job.itemType || '').trim().toLowerCase();
        const normTitle = (job.title || '').trim().toLowerCase();
        const normDept = (job.department || '').trim().toLowerCase();
        const matchRoleOrSkill =
          normRole === normSelected ||
          normRole.includes(normSelected) ||
          normSelected.includes(normRole) ||
          normTitle.includes(normSelected) ||
          normDept.includes(normSelected) ||
          job.skills.some((s) => s.toLowerCase().includes(normSelected));

        const isIntern = job.itemType === 'INTERNSHIP' || (job.employmentType || '').toLowerCase().includes('intern');
        if (selectedSubcat === 'Internships' && !isIntern) return false;
        if (selectedSubcat === 'Full-Time Jobs' && isIntern) return false;

        if (selectedSubcat !== 'Internships' && selectedSubcat !== 'Full-Time Jobs' && !matchRoleOrSkill) {
          return false;
        }
      }

      // 3. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = job.title.toLowerCase().includes(q);
        const matchCompany = job.company.toLowerCase().includes(q);
        const matchDept = (job.department || '').toLowerCase().includes(q);
        const matchLoc = job.location.toLowerCase().includes(q);
        const matchSkill = job.skills.some((s) => s.toLowerCase().includes(q));
        const matchRole = (job.itemType || '').toLowerCase().includes(q);
        if (!matchTitle && !matchCompany && !matchDept && !matchLoc && !matchSkill && !matchRole) {
          return false;
        }
      }

      return true;
    });
  }, [dynamicVendorJobs, routeParams.subCategoryName, selectedSubcat, searchQuery]);

  const NEXT_7_DAYS = STATIC_NEXT_7_DAYS;
  const TIMINGS_GRID = STATIC_TIMINGS_GRID;

  const getEffectiveCategory = useCallback((item: any) => {
    if (!item) return 'Home Services';
    const catName = categoryName || item.mainCategory || item.category || 'Services';
    if (catName.includes('Health') || (item.id && item.id.startsWith('srv_hc'))) return 'Healthcare';
    if (catName.includes('Legal') || (item.id && item.id.startsWith('srv_leg'))) return 'Legal';
    if (catName.includes('Edu') || (item.id && item.id.startsWith('srv_edu'))) return 'Education';
    if (catName.includes('Auto') || (item.id && item.id.startsWith('srv_auto'))) return 'Automobile';
    if (catName.includes('Digit') || (item.id && item.id.startsWith('srv_dig'))) return 'IT/Digital';
    if (catName.includes('Finan') || (item.id && item.id.startsWith('srv_fin'))) return 'Financial';
    if (catName.includes('Travel') || (item.id && item.id.startsWith('srv_trv'))) return 'Travel';
    if (catName.includes('Stay') || (item.id && item.id.startsWith('srv_sty'))) return 'Stay';
    if (catName.includes('Job') || item.itemType === 'JOB') return 'Jobs';
    return 'Home Services';
  }, [categoryName]);

  const getCalculatedServicePrice = useCallback((item: any) => {
    if (!item) return { numPrice: 499, priceStr: '₹499', packageLabel: '' };

    const cat = getEffectiveCategory(item);

    if (cat === 'Education') {
      if (selectedDuration.includes('899') || selectedDuration.includes('2 Hours')) {
        return { numPrice: 899, priceStr: '₹899', packageLabel: '2 Hours Intensive (₹899)' };
      }
      return { numPrice: 499, priceStr: '₹499', packageLabel: '1 Hour Session (₹499)' };
    }

    if (cat === 'Healthcare') {
      if (consultationMode === 'clinic') {
        return { numPrice: 699, priceStr: '₹699', packageLabel: 'In-Clinic Visit (₹699)' };
      }
      return { numPrice: 399, priceStr: '₹399', packageLabel: 'Video Call (₹399)' };
    }

    const basePriceNum = typeof item.price === 'number'
      ? item.price
      : (parseFloat(String(item.price || '0').replace(/[^\d.]/g, '')) || 0);

    if (cat === 'Home Services' || cat === 'Automobile') {
      if (selectedProblemPackage.includes('350') || selectedProblemPackage.includes('Jet Wash')) {
        const total = basePriceNum + 350;
        return { numPrice: total, priceStr: `₹${total.toLocaleString('en-IN')}`, packageLabel: selectedProblemPackage };
      }
      if (selectedProblemPackage.includes('500') || selectedProblemPackage.includes('Gas Leak')) {
        const total = basePriceNum + 500;
        return { numPrice: total, priceStr: `₹${total.toLocaleString('en-IN')}`, packageLabel: selectedProblemPackage };
      }
      return { numPrice: basePriceNum, priceStr: `₹${basePriceNum.toLocaleString('en-IN')}`, packageLabel: selectedProblemPackage };
    }

    if (cat === 'Travel' || cat === 'Stay') {
      const guestMultiplier = Math.max(1, travelerList.length);
      const total = basePriceNum * guestMultiplier;
      return {
        numPrice: total,
        priceStr: `₹${total.toLocaleString('en-IN')}`,
        packageLabel: `${travelGuests} (${guestMultiplier}x)`,
      };
    }

    return { numPrice: basePriceNum, priceStr: `₹${basePriceNum.toLocaleString('en-IN')}`, packageLabel: '' };
  }, [getEffectiveCategory, selectedDuration, consultationMode, selectedProblemPackage, travelGuests, getTargetGuestCount, travelerList.length]);

  const getConfirmCtaLabel = useCallback((item: any) => {
    if (!item) return 'Confirm Booking';
    const cat = getEffectiveCategory(item);
    const { priceStr } = getCalculatedServicePrice(item);
    switch (cat) {
      case 'Healthcare':
      case 'Legal':
      case 'Financial':
        return `Book Consultation • ${priceStr}`;
      case 'Education':
        return `Book Session • ${priceStr}`;
      case 'Automobile':
      case 'Home Services':
        return `Book Service • ${priceStr}`;
      case 'IT/Digital':
        return `Request Service • ${priceStr}`;
      case 'Travel':
        return `Book Trip • ${priceStr}`;
      case 'Stay':
        return `Reserve Stay • ${priceStr}`;
      default:
        return `Book Service • ${priceStr}`;
    }
  }, [getEffectiveCategory, getCalculatedServicePrice]);

  const handleConfirmBooking = async () => {
    if (!useAuthStore.getState().currentUser) {
      setSchedulingItem(null);
      setTravelBookingStep('GUESTS');
      useAuthGuardStore.getState().showAuthModal('book this service or item');
      return;
    }
    if (!schedulingItem) return;
    const effectiveCat = getEffectiveCategory(schedulingItem);
    if (effectiveCat !== 'Travel' && (!selectedDateObj || !selectedSlotObj)) return;
    if (effectiveCat === 'Travel' && (!selectedBoardingPoint || !selectedDroppingPoint)) {
      Alert.alert('Selection Required', 'Please select both Boarding and Dropping points to continue.');
      return;
    }

    if (effectiveCat === 'Stay' || effectiveCat === 'Travel') {
      const targetCount = travelerList.length;
      for (let i = 0; i < targetCount; i++) {
        const trv = travelerList[i];
        if (!trv || !trv.name || trv.name.trim().length < 2) {
          Alert.alert('Missing Name', `Please enter full name for Person ${i + 1}.`);
          return;
        }
        if (!trv.aadhar || trv.aadhar.replace(/[^\d]/g, '').length !== 12) {
          Alert.alert('Validation Error', `Please enter a valid 12-digit Aadhaar Card Number for Person ${i + 1} (${trv.name || 'Person ' + (i + 1)}).`);
          return;
        }
        if (!trv.phone || trv.phone.replace(/[^\d]/g, '').length !== 10) {
          Alert.alert('Validation Error', `Please enter a valid 10-digit Mobile Number for Person ${i + 1} (${trv.name || 'Person ' + (i + 1)}).`);
          return;
        }
      }
    }

    // Live backend availability revalidation for Travel bookings
    if (effectiveCat === 'Travel') {
      const travelProdId = schedulingItem.rawProduct?._id || schedulingItem.rawProduct?.id || schedulingItem.id;
      if (travelProdId) {
        try {
          const checkRes: any = await apiFetch(`/products/${travelProdId}`, { skipCache: true });
          const liveProd = checkRes?.data || checkRes?.product || checkRes;
          if (liveProd && typeof liveProd === 'object') {
            const isSuspended = liveProd.isActive === false || liveProd.isAvailable === false || ['out of stock', 'inactive', 'suspended', 'unavailable'].includes(String(liveProd.status || '').toLowerCase());
            if (isSuspended) {
              Alert.alert('Service Unavailable', 'This travel service is currently unavailable or inactive. Please choose an alternate option.');
              setSchedulingItem(null);
              setTravelBookingStep('GUESTS');
              return;
            }
            const liveStock = typeof liveProd.stock === 'number' ? liveProd.stock : parseInt(String(liveProd.stock || '0'), 10);
            if (liveStock > 0 && liveStock < travelerList.length) {
              Alert.alert('Insufficient Seats', `Only ${liveStock} seat(s) available for this ride, but ${travelerList.length} passenger(s) selected.`);
              return;
            }
          }
        } catch (e) {
          console.warn('Live product availability check notice:', e);
        }
      }
    }

    const currentUserName = useAuthStore.getState().currentUser?.name || patientNameInput || 'Guest User';
    const currentUserPhone = useAuthStore.getState().currentUser?.phone || '';
    const currentUserEmail = useAuthStore.getState().currentUser?.email || 'guest@example.com';
    
    const { numPrice, priceStr, packageLabel } = getCalculatedServicePrice(schedulingItem);
    const bookedItemName = schedulingItem.name;
    const bookedDateStr = (effectiveCat === 'Travel' && routeParams.journeyDate)
      ? routeParams.journeyDate
      : (selectedDateObj ? selectedDateObj.fullDateStr : 'Today');
    const bookedSlotTime = (effectiveCat === 'Travel' && schedulingItem.departureTime)
      ? schedulingItem.departureTime
      : (selectedSlotObj ? selectedSlotObj.time : 'Direct Express');

    // Cache pending booking details with updated price & package
    setPendingBookingDetails({
      item: schedulingItem,
      name: bookedItemName,
      price: priceStr,
      numPrice,
      effectiveCat,
      date: bookedDateStr,
      slot: bookedSlotTime,
      vehicleNumber: schedulingItem.vehicleNumber || schedulingItem.vehicleRegNo || schedulingItem.busNumber || '',
      boardingPoint: selectedBoardingPoint,
      droppingPoint: selectedDroppingPoint,
      address: selectedAddress,
      problemPackage: packageLabel || selectedProblemPackage || selectedDuration,
      travelers: (effectiveCat === 'Stay' || effectiveCat === 'Travel') ? travelerList : [],
      customerName: currentUserName,
      customerPhone: currentUserPhone,
      customerEmail: currentUserEmail,
    });

    // Close the scheduler sheet
    setSchedulingItem(null);
    setTravelBookingStep('GUESTS');

    // Open Razorpay Test Mode Checkout
    const orderId = `order_srv_${Date.now()}`;
    setRazorpayOrder({
      orderId,
      amount: numPrice * 100, // in paise
      currency: 'INR',
      keyId: 'rzp_test_THLM17MgXLM2tP',
      planType: 'service_booking',
      planName: bookedItemName,
      priceText: priceStr,
    });
    setRazorpayModalVisible(true);
  };

  const handleAddToCartFromScheduler = useCallback(() => {
    if (!schedulingItem) return;
    const effectiveCat = getEffectiveCategory(schedulingItem);
    const { priceStr } = getCalculatedServicePrice(schedulingItem);

    const bookedDateStr = (effectiveCat === 'Travel' && routeParams.journeyDate)
      ? routeParams.journeyDate
      : (selectedDateObj ? selectedDateObj.fullDateStr : 'Today');
    const bookedSlotTime = (effectiveCat === 'Travel' && schedulingItem.departureTime)
      ? schedulingItem.departureTime
      : (selectedSlotObj ? selectedSlotObj.time : 'Direct Express');

    const configDetails = [
      effectiveCat === 'Travel' && selectedBoardingPoint ? `Boarding: ${selectedBoardingPoint}` : '',
      effectiveCat === 'Travel' && selectedDroppingPoint ? `Dropping: ${selectedDroppingPoint}` : '',
      selectedProblemPackage ? `Package: ${selectedProblemPackage}` : '',
      selectedDuration ? `Duration: ${selectedDuration}` : '',
    ].filter(Boolean).join(' | ');

    addToCart({
      id: schedulingItem.id,
      productId: schedulingItem.id || schedulingItem._id,
      vendorId: schedulingItem.vendorId || schedulingItem.vendor_id,
      vendor_id: schedulingItem.vendorId || schedulingItem.vendor_id,
      name: schedulingItem.name,
      price: priceStr || String(schedulingItem.price || '₹299'),
      category: categoryName || schedulingItem.mainCategory || effectiveCat || 'Services',
      image: schedulingItem.image,
      quantity: 1,
      bookingDate: bookedDateStr,
      bookingTime: bookedSlotTime,
      seller: schedulingItem.vendorName || schedulingItem.brand,
      vehicleNumber: schedulingItem.vehicleNumber || schedulingItem.vehicleRegNo || schedulingItem.busNumber,
      configurationDetails: configDetails || undefined,
    });

    setSchedulingItem(null);
    setTravelBookingStep('GUESTS');
    showToast('Added to cart · View Cart', 'View Cart', () => setIsCartVisible(true));
  }, [schedulingItem, selectedDateObj, selectedSlotObj, selectedBoardingPoint, selectedDroppingPoint, selectedProblemPackage, selectedDuration, routeParams.journeyDate, categoryName, showToast, addToCart, setIsCartVisible]);

  const handleRazorpaySuccess = async (paymentResult: {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  }) => {
    setRazorpayModalVisible(false);
    const bookingInfo = pendingBookingDetails;
    if (!bookingInfo) return;

    const bookingId = `BK-${Date.now().toString().slice(-6)}`;

    const travelerSummaryStr = bookingInfo.travelers && bookingInfo.travelers.length > 0
      ? ` • ${bookingInfo.travelers.length} Person(s): ` + bookingInfo.travelers.map((t: any, i: number) => `P${i+1}: ${t.name} (Aadhaar: ${t.aadhar}, Mob: ${t.phone})`).join('; ')
      : '';

    const boardingDroppingSummary = bookingInfo.boardingPoint && bookingInfo.droppingPoint
      ? ` • Boarding: ${bookingInfo.boardingPoint} ➔ Dropping: ${bookingInfo.droppingPoint}`
      : '';

    const resolvedVendorName = (bookingInfo.effectiveCat === 'Travel')
      ? (bookingInfo.name || bookingInfo.operator || 'Bus Operator')
      : (bookingInfo.effectiveCat === 'Stay')
      ? (bookingInfo.name || 'Hotel Stay')
      : (bookingInfo.name || 'Connect Expert Pro');

    const isTravelBooking = bookingInfo.effectiveCat === 'Travel';
    const initialStatus = isTravelBooking ? 'Pending' : 'Confirmed';
    const initialSeatStatus = isTravelBooking ? 'Pending Allocation' : 'Allocated';
    const initialTravelers = (bookingInfo.travelers || []).map((t: any) => ({
      ...t,
      seat: isTravelBooking ? '' : (t.seat || 'U4'),
    }));

    const curAuthUser = useAuthStore.getState().currentUser;
    const resolvedCustId = curAuthUser?.customerId || curAuthUser?.registrationId || curAuthUser?.id || '';
    const resolvedCustEmail = curAuthUser?.email || '';
    const effectiveCategory = bookingInfo.effectiveCat === 'Stay' ? 'Stay' : isTravelBooking ? 'Travel' : (bookingInfo.effectiveCat || 'Services');
    const resolvedVendorId = bookingInfo.item?.vendorId || bookingInfo.item?.vendor_id || '';
    const bookingProductId = bookingInfo.item?.id || bookingInfo.item?._id || '';

    const newServiceOrder: any = {
      id: bookingId,
      order_number: bookingId,
      vendor_id: resolvedVendorId,
      vendorId: resolvedVendorId,
      productId: bookingProductId,
      vendor_name: resolvedVendorName,
      category: effectiveCategory,
      order_type: 'booking',
      type: effectiveCategory,
      customerId: resolvedCustId,
      customer_id: resolvedCustId,
      customer_email: resolvedCustEmail,
      customer_name: bookingInfo.customerName || curAuthUser?.name || 'Connect Customer',
      customer_phone: bookingInfo.customerPhone || curAuthUser?.phone || '',
      customer_address: bookingInfo.address || 'Indiranagar, Bangalore',
      customer_latitude: 12.9498,
      customer_longitude: 77.6289,
      product_details: `${bookingInfo.name} (${bookingInfo.problemPackage} • ${bookingInfo.date} at ${bookingInfo.slot}${boardingDroppingSummary}${travelerSummaryStr})`,
      provider_name: bookingInfo.operator || bookingInfo.name,
      operator_name: bookingInfo.operator || '',
      bus_name: bookingInfo.name || '',
      bus_type: bookingInfo.subType || bookingInfo.problemPackage || '',
      vehicle_number: bookingInfo.vehicleNumber || '',
      vehicleNumber: bookingInfo.vehicleNumber || '',
      busNumber: bookingInfo.vehicleNumber || '',
      appointment_slot: `${bookingInfo.date} at ${bookingInfo.slot}`,
      boarding_point: bookingInfo.boardingPoint,
      dropping_point: bookingInfo.droppingPoint,
      travelers: initialTravelers,
      seat: isTravelBooking ? '' : 'U4',
      seat_status: initialSeatStatus,
      items: [{
        productId: bookingProductId,
        vendorId: resolvedVendorId,
        vendor_id: resolvedVendorId,
        name: `${bookingInfo.name} (${bookingInfo.problemPackage})`,
        quantity: 1,
        price: bookingInfo.numPrice
      }],
      item_count: 1,
      amount: bookingInfo.numPrice,
      status: initialStatus,
      payment_id: paymentResult.razorpay_payment_id,
      payment_status: 'Paid',
      payment_method: 'Razorpay Test Mode (Online)',
      created_at: new Date().toISOString(),
      image: getRelevantProductImage(bookingInfo.name, bookingInfo.subcategory, categoryName),
    };

    // 1. Immediately record in local state
    useOrderStore.getState().addLocalOrder(newServiceOrder);

    // Notification Center Dispatch based on category
    if (bookingInfo.effectiveCat === 'Travel') {
      dispatchCustomerNotification({
        title: 'Ticket Booked! Payment Complete 🚍',
        body: `Your bus ticket #${bookingId} (${bookingInfo.name}${bookingInfo.vehicleNumber ? ` • Reg: ${bookingInfo.vehicleNumber}` : ''}) is booked! Seat allocation pending from operator.`,
        icon: 'Bus',
        category: 'order',
        actionLabel: 'View Booking',
        actionType: 'booking',
        orderType: 'booking',
        bookingId: bookingId,
        orderId: bookingId,
        targetScreen: 'Orders',
        targetParams: { activeTab: 'my bookings', category: 'Travel', orderId: bookingId },
      });
    } else if (bookingInfo.effectiveCat === 'Stay') {
      dispatchCustomerNotification({
        title: 'Stay Booked! Payment Complete 🏨',
        body: `Your hotel stay #${bookingId} for ${bookingInfo.name} on ${bookingInfo.date} is booked and confirmed!`,
        icon: 'Hotel',
        category: 'order',
        actionLabel: 'View Booking',
        actionType: 'booking',
        orderType: 'booking',
        bookingId: bookingId,
        orderId: bookingId,
        targetScreen: 'Orders',
        targetParams: { activeTab: 'my bookings', category: 'Stay', orderId: bookingId },
      });
    } else {
      dispatchCustomerNotification({
        title: 'Service Booked! Payment Complete 🛠️',
        body: `Your appointment #${bookingId} for ${bookingInfo.name} is booked for ${bookingInfo.date} at ${bookingInfo.slot}.`,
        icon: 'Wrench',
        category: 'order',
        actionLabel: 'View Booking',
        actionType: 'booking',
        orderType: 'booking',
        bookingId: bookingId,
        orderId: bookingId,
        targetScreen: 'Orders',
        targetParams: { activeTab: 'my bookings', category: 'Services', orderId: bookingId },
      });
    }

    // 2. Asynchronously verify payment on backend
    apiFetch('/razorpay/verify-payment', {
      method: 'POST',
      body: {
        ...paymentResult,
        planType: 'service_booking',
        amount: bookingInfo.numPrice,
        userId: resolvedCustId || 'guest_user',
      },
    }).catch((err) => console.warn('Background service payment verify notice:', err));

    // 3. Create the service/travel booking record in the database
    apiFetch('/orders', {
      method: 'POST',
      body: {
        ...newServiceOrder,
        id: bookingId,
        order_number: bookingId,
        customerId: resolvedCustId,
        customer_id: resolvedCustId,
        customer_email: resolvedCustEmail,
        type: effectiveCategory,
      },
    }).catch((err) => {
      console.warn('Background service booking sync notice:', err);
    });

    // 3. Navigate to Booking Confirmation
    navigation.navigate('BookingConfirmation', {
      bookingId: bookingId,
      items: [{ name: bookingInfo.name, price: bookingInfo.price, vehicleNumber: bookingInfo.vehicleNumber }],
      totalAmount: bookingInfo.numPrice,
      paymentMethod: 'Razorpay (Online Paid)',
      type: bookingInfo.effectiveCat === 'Stay' ? 'stay' : bookingInfo.effectiveCat === 'Travel' ? 'travel' : 'service',
      date: bookingInfo.date,
      slot: bookingInfo.slot,
      boardingPoint: bookingInfo.boardingPoint,
      droppingPoint: bookingInfo.droppingPoint,
      travelers: bookingInfo.travelers,
      vehicleNumber: bookingInfo.vehicleNumber,
    });

    setPendingBookingDetails(null);
    setRazorpayOrder(null);
    setSelectedDateObj(null);
    setSelectedSlotObj(null);
  };

  const handleRazorpayCancel = () => {
    setRazorpayModalVisible(false);
    setRazorpayOrder(null);
    setPendingBookingDetails(null);
  };

  const renderCategoryIcon = (subName: string, color = '#0F172A') => {
    const iconName = getCategoryIconName(subName);
    const IconComp = (Icons as any)[iconName] || Icons.Wrench;
    return <IconComp color={color} size={15} />;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={colors.statusBarStyle}
        backgroundColor={isLight ? '#FFF1C7' : colors.background}
        translucent={false}
      />
      {/* Top Header (#FFF1C7 / Warm Branded) */}
      <View
        style={[
          styles.headerWrapper,
          {
            paddingTop: Math.max(insets.top, 20) + 4,
            backgroundColor: isLight ? '#FFF1C7' : colors.background,
            borderBottomColor: isLight ? 'rgba(242, 183, 5, 0.25)' : colors.cardBorder,
            paddingBottom: 8,
          },
        ]}
      >
        {isStayCategory ? (
          /* Clean Stay Top Bar matching Categories */
          <View style={styles.stayTopNavRow}>
            <TouchableOpacity
              style={styles.stayHeaderBackBtn}
              onPress={handleHeaderBack}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Icons.ArrowLeft color={colors.text} size={22} />
            </TouchableOpacity>

            <Text style={[styles.stayHeaderTitleLarge, { color: colors.text }]}>
              {selectedSubcat && selectedSubcat !== 'All' ? selectedSubcat : (categoryName || 'Stay')}
            </Text>

            <TouchableOpacity
              style={styles.headerCartBtn}
              activeOpacity={0.7}
              onPress={() => setIsCartVisible(true)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Icons.ShoppingCart color={colors.text} size={20} />
              {totalCartCount > 0 && (
                <View style={styles.cartBadge}>
                  <Text style={styles.cartBadgeText}>{totalCartCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          /* Non-Stay Categories Header */
          <>
            <View style={styles.headerTopRow}>
              <TouchableOpacity
                style={styles.headerBackBtn}
                onPress={handleHeaderBack}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Icons.ArrowLeft color={colors.text} size={20} />
              </TouchableOpacity>

              <Text style={[styles.headerTitle, { color: colors.text }]}>
                {t(categoryName || 'Services')}
              </Text>

              <TouchableOpacity
                style={styles.headerCartBtn}
                activeOpacity={0.7}
                onPress={() => {
                  if (categoryName === 'Jobs' || categoryName === 'Jobs & Careers') {
                    navigation.navigate('Wishlist');
                  } else {
                    setIsCartVisible(true);
                  }
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                {categoryName === 'Jobs' || categoryName === 'Jobs & Careers' ? (
                  <Icons.Bookmark color={colors.text} size={20} />
                ) : (
                  <>
                    <Icons.ShoppingCart color={colors.text} size={20} />
                    {totalCartCount > 0 && (
                      <View style={styles.cartBadge}>
                        <Text style={styles.cartBadgeText}>{totalCartCount}</Text>
                      </View>
                    )}
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Search Bar */}
            <View
              style={[
                styles.searchBarWrapper,
                {
                  backgroundColor: isLight ? '#FFFFFF' : 'rgba(255, 255, 255, 0.08)',
                  borderColor: isVoiceListening ? '#F5B800' : isLight ? '#FCD34D' : colors.cardBorder,
                },
              ]}
            >
              {isVoiceListening ? (
                <View style={[styles.waveformContainer, { marginRight: 6 }]}>
                  <Animated.View style={[styles.waveBar, { height: wave1 }]} />
                  <Animated.View style={[styles.waveBar, { height: wave2 }]} />
                  <Animated.View style={[styles.waveBar, { height: wave3 }]} />
                  <Animated.View style={[styles.waveBar, { height: wave4 }]} />
                </View>
              ) : (
                <Icons.Search color="#F5B800" size={18} />
              )}

              <TextInput
                ref={searchInputRef}
                style={[styles.searchInput, { color: colors.text, flex: 1 }]}
                placeholder={isVoiceListening ? "Listening... Speak now 🎙️" : catMeta.searchPlaceholder}
                placeholderTextColor={isVoiceListening ? "#D97706" : isLight ? '#64748B' : 'rgba(255, 255, 255, 0.5)'}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCorrect={false}
              />

              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')} style={{ marginRight: 6 }}>
                  <Icons.X color={isLight ? '#94A3B8' : 'rgba(255, 255, 255, 0.5)'} size={16} />
                </TouchableOpacity>
              )}

              <TouchableOpacity onPress={handleMicPress} style={styles.micIconBtn} activeOpacity={0.7}>
                <Icons.Mic color={isVoiceListening ? '#F59E0B' : colors.text} size={18} />
              </TouchableOpacity>
            </View>

            {/* Subcategory Chips */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryChipsScroll}
            >
              {availableSubcats.map((subName) => {
                const isSelected = selectedSubcat.toLowerCase() === subName.toLowerCase();
                return (
                  <TouchableOpacity
                    key={subName}
                    style={[
                      styles.categoryChip,
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
                    activeOpacity={0.85}
                    onPress={() => {
                      setSelectedSubcat(subName);
                      setSearchQuery('');
                    }}
                  >
                    {subName !== 'All' && (
                      <View style={{ marginRight: 5 }}>
                        {renderCategoryIcon(subName, isSelected ? '#0F172A' : isLight ? '#D97706' : '#F5B800')}
                      </View>
                    )}
                    <Text
                      style={[
                        styles.categoryChipText,
                        { color: isSelected ? '#0F172A' : colors.text },
                        isSelected && { fontWeight: '800' },
                      ]}
                    >
                      {t(subName === 'All' ? catMeta.allPillLabel : subName)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </>
        )}
      </View>

      {/* Main Cards List */}
      <ScrollView
        ref={stayContentScrollRef}
        contentContainerStyle={[
          styles.contentScroll,
          isStayCategory && { paddingHorizontal: 14, paddingTop: 10 },
          { paddingBottom: Math.max(insets.bottom, 20) + 70 },
        ]}
        showsVerticalScrollIndicator={false}
        onScroll={({ nativeEvent }) => {
          const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
          if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 150) {
            setPage((prev) => prev + 1);
          }
        }}
        scrollEventThrottle={200}
      >
        {isStayCategory ? (
          <View style={{ width: '100%' }}>
            {/* Accommodation Type Chips */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.stayChipsScroll}
            >
              {['All Stays', 'Hotels', 'Resorts', 'Villas', 'Homestays', 'Apartments'].map((chip) => {
                const isSel = selectedSubcat === chip || (chip === 'All Stays' && selectedSubcat === 'All');
                const IconComp =
                  chip.includes('Hotel') ? Icons.Building2 :
                  chip.includes('Resort') ? Icons.Trees :
                  chip.includes('Villa') ? Icons.Home :
                  chip.includes('Homestay') ? Icons.Home :
                  chip.includes('Apartment') ? Icons.Building :
                  Icons.Bed;

                return (
                  <TouchableOpacity
                    key={chip}
                    style={[
                      styles.categoryChip,
                      {
                        backgroundColor: isSel
                          ? '#F5B800'
                          : isLight
                          ? '#FFFFFF'
                          : 'rgba(255, 255, 255, 0.06)',
                        borderColor: isSel
                          ? '#F5B800'
                          : isLight
                          ? '#F1EAD8'
                          : colors.cardBorder,
                      },
                    ]}
                    activeOpacity={0.85}
                    onPress={() => {
                      const newSub = chip === 'All Stays' ? 'All' : chip;
                      setSelectedSubcat(newSub);
                      setSelectedStayChildCategory('All');
                    }}
                  >
                    <IconComp
                      color={isSel ? '#0F172A' : isLight ? '#D97706' : '#F5B800'}
                      size={14}
                      style={{ marginRight: 6 }}
                    />
                    <Text
                      style={[
                        styles.categoryChipText,
                        { color: isSel ? '#0F172A' : colors.text },
                        isSel && { fontWeight: '800' },
                      ]}
                    >
                      {chip}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Child Category / Sub-Category Filter Pills */}
            {stayChildCategories.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 4, paddingTop: 6, paddingBottom: 6, gap: 8 }}
                style={{ marginBottom: 4 }}
              >
                {stayChildCategories.map((subItem) => {
                  const isSel = selectedStayChildCategory === subItem || (subItem.toLowerCase().startsWith('all') && (selectedStayChildCategory === 'All' || selectedStayChildCategory === subItem));
                  return (
                    <TouchableOpacity
                      key={subItem}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 5.5,
                        borderRadius: 20,
                        backgroundColor: isSel
                          ? (isLight ? '#0F172A' : '#F5B800')
                          : (isLight ? '#F1F5F9' : 'rgba(255, 255, 255, 0.06)'),
                        borderColor: isSel
                          ? (isLight ? '#0F172A' : '#F5B800')
                          : (isLight ? '#E2E8F0' : 'rgba(255, 255, 255, 0.1)'),
                        borderWidth: 1,
                      }}
                      activeOpacity={0.8}
                      onPress={() => setSelectedStayChildCategory(subItem)}
                    >
                      <Text
                        style={{
                          fontSize: 11.5,
                          fontWeight: isSel ? '800' : '600',
                          color: isSel ? (isLight ? '#FFFFFF' : '#0F172A') : colors.text,
                        }}
                      >
                        {subItem}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            {/* Toolbar [ Filter ] [ Sort ] */}
            <View style={styles.stayToolbarRow}>
              <TouchableOpacity
                style={[
                  styles.stayToolbarBtn,
                  {
                    backgroundColor: isLight ? '#FFFFFF' : colors.cardBgSecondary,
                    borderColor: isLight ? '#F1EAD8' : colors.border,
                  },
                  stayActiveFiltersCount > 0 && {
                    backgroundColor: '#FEF3C7',
                    borderColor: '#F5B800',
                  },
                ]}
                onPress={openStayFilterModal}
              >
                <Icons.Sliders
                  color={stayActiveFiltersCount > 0 ? '#D97706' : colors.text}
                  size={14}
                />
                <Text
                  style={[
                    styles.stayToolbarBtnText,
                    { color: stayActiveFiltersCount > 0 ? '#B45309' : colors.text },
                    stayActiveFiltersCount > 0 && { fontWeight: '800' },
                  ]}
                >
                  Filter{stayActiveFiltersCount > 0 ? ` (${stayActiveFiltersCount})` : ''}
                </Text>
                {stayActiveFiltersCount > 0 && (
                  <View style={[styles.stayFilterCountDot, { backgroundColor: '#F5B800' }]}>
                    <Text style={[styles.stayFilterCountDotText, { color: '#0F172A' }]}>
                      {stayActiveFiltersCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.stayToolbarBtn,
                  {
                    backgroundColor: isLight ? '#FFFFFF' : colors.cardBgSecondary,
                    borderColor: isLight ? '#F1EAD8' : colors.border,
                  },
                ]}
                onPress={() => setIsStaySortOpen(true)}
              >
                <Icons.ArrowUpDown color={colors.text} size={14} />
                <Text style={[styles.stayToolbarBtnText, { color: colors.text }]}>
                  Sort: {selectedStaySort}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Results Title & Count */}
            <View style={styles.resultsHeaderRow}>
              <Text style={[styles.resultsTitle, { color: colors.text }]}>
                {selectedSubcat === 'All' || selectedSubcat === 'All Stays'
                  ? 'AVAILABLE STAYS'
                  : `${selectedSubcat.toUpperCase()} STAYS`}
              </Text>
              <Text style={[styles.resultsCount, { color: isLight ? '#64748B' : 'rgba(255, 255, 255, 0.5)' }]}>
                {displayedStays.length} {displayedStays.length === 1 ? 'stay' : 'stays'}
              </Text>
            </View>

            {displayedStays.length > 0 ? (
              <>
                <View style={styles.compact2ColGrid}>
                {displayedStays.slice(0, page * PAGE_SIZE).map((hotel) => {
                  const isWishlisted = isInWishlist(hotel.id);
                  return (
                    <TouchableOpacity
                      key={hotel.id}
                      style={[
                        styles.compactCard,
                        {
                          width: (width - 28 - 12) / 2,
                          backgroundColor: isLight ? '#FFFFFF' : 'rgba(13, 22, 54, 0.65)',
                          borderColor: isLight ? '#F1EAD8' : colors.cardBorder,
                        },
                      ]}
                      activeOpacity={0.88}
                      onPress={() =>
                        navigation.navigate('StayDetails', {
                          stay: hotel,
                          checkIn: checkInDate,
                          checkOut: checkOutDate,
                          nights: stayNights,
                          adults: stayAdults,
                          rooms: stayRooms,
                        })
                      }
                    >
                      <View style={styles.compactImageWrapper}>
                        <Image source={{ uri: hotel.image }} style={styles.compactImage} resizeMode="cover" />
                        <View style={styles.compactDiscountBadge}>
                          <Text style={styles.compactDiscountBadgeText}>{hotel.discount || '24% OFF'}</Text>
                        </View>
                        <TouchableOpacity
                          style={styles.compactWishlistBtn}
                          activeOpacity={0.8}
                          onPress={(e) => {
                            e.stopPropagation();
                            toggleWishlist({
                              id: hotel.id,
                              name: hotel.name,
                              price: hotel.price,
                              category: 'Stay',
                              image: hotel.image,
                            });
                          }}
                        >
                          <Icons.Heart
                            color={isWishlisted ? '#EF4444' : '#64748B'}
                            size={15}
                            fill={isWishlisted ? '#EF4444' : 'none'}
                          />
                        </TouchableOpacity>
                      </View>

                      <View style={styles.compactBody}>
                        <Text style={[styles.compactTitle, { color: colors.text }]} numberOfLines={1}>
                          {hotel.name}
                        </Text>

                        <Text style={styles.compactCategorySub} numberOfLines={1}>
                          {hotel.location || `${hotel.subcategory} • ${hotel.locationCity || 'India'}`}
                        </Text>

                        <View style={styles.compactRatingRow}>
                          <Icons.Star color="#F5B800" size={11} fill="#F5B800" />
                          <Text style={styles.compactRatingText}>{hotel.rating}</Text>
                          <Text style={styles.compactReviewsText}> ({hotel.reviews} reviews)</Text>
                        </View>

                        <Text style={styles.stayAmenitiesSummaryText} numberOfLines={1}>
                          {(hotel.amenities || ['Pool', 'Free Wi-Fi', 'Breakfast']).join(' • ')}
                        </Text>

                        <View style={styles.compactPriceRow}>
                          <Text style={[styles.compactCurrentPrice, { color: isLight ? '#0F172A' : '#F5B800' }]}>
                            {hotel.price}
                          </Text>
                          {hotel.originalPrice && (
                            <Text style={styles.compactOriginalPrice}>{hotel.originalPrice}</Text>
                          )}
                        </View>

                        <Text style={styles.stayFreeCancelTag}>Free cancellation</Text>

                        <View style={styles.compactActionRow}>
                          {(() => {
                            const isStayInCart = cartItems.some((c) => c.id === hotel.id);
                            return (
                              <TouchableOpacity
                                style={[
                                  styles.compactOutlineBtn,
                                  isStayInCart ? styles.compactOutlineBtnActive : null
                                ]}
                                activeOpacity={0.85}
                                onPress={(e) => {
                                  e.stopPropagation?.();
                                  if (isStayInCart) {
                                    showToast('Already in your cart', 'View Cart', () => setIsCartVisible(true));
                                  } else {
                                    addToCart({
                                      id: hotel.id,
                                      productId: hotel.id,
                                      vendorId: hotel.vendorId || (hotel as any).vendor_id,
                                      vendor_id: hotel.vendorId || (hotel as any).vendor_id,
                                      name: hotel.name,
                                      price: hotel.price || `₹${hotel.pricePerNight || 1999}`,
                                      originalPrice: hotel.originalPrice || hotel.mrp,
                                      category: 'Stay',
                                      image: hotel.image || hotel.imageUrl,
                                      seller: hotel.vendorName || hotel.seller || 'Stay Partner',
                                      checkInDate: formatStayDateDisplay(checkInDateObj),
                                      checkOutDate: formatStayDateDisplay(checkOutDateObj),
                                      configurationDetails: `${stayNights} Night(s) • ${stayRooms} Room(s) • ${stayAdults} Adult(s)`,
                                    });
                                    showToast('Stay added to cart · View Cart', 'View Cart', () => setIsCartVisible(true));
                                  }
                                }}
                              >
                                {isStayInCart ? (
                                  <>
                                    <Icons.Check color="#16A34A" size={11} strokeWidth={3} />
                                    <Text style={[styles.compactOutlineBtnText, { color: '#16A34A' }]} numberOfLines={1}>Added</Text>
                                  </>
                                ) : (
                                  <>
                                    <Icons.ShoppingCart color="#FF6A00" size={11} strokeWidth={2.5} />
                                    <Text style={styles.compactOutlineBtnText} numberOfLines={1}>Add to Cart</Text>
                                  </>
                                )}
                              </TouchableOpacity>
                            );
                          })()}

                          <TouchableOpacity
                            style={styles.compactPrimaryBtn}
                            activeOpacity={0.85}
                            onPress={(e) => {
                              e.stopPropagation?.();
                              navigation.navigate('StayDetails', {
                                stay: hotel,
                                checkIn: formatStayDateDisplay(checkInDateObj),
                                checkOut: formatStayDateDisplay(checkOutDateObj),
                                nights: stayNights,
                                adults: stayAdults,
                                children: stayChildren,
                                rooms: stayRooms,
                              });
                            }}
                          >
                            <Icons.Calendar color="#FFFFFF" size={11} strokeWidth={2.5} />
                            <Text style={styles.compactPrimaryBtnText} numberOfLines={1}>Book Now</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {displayedStays.length > page * PAGE_SIZE && (
                <TouchableOpacity
                  style={styles.loadMoreBtn}
                  activeOpacity={0.8}
                  onPress={() => setPage((prev) => prev + 1)}
                >
                  <Text style={styles.loadMoreBtnText}>
                    Load More ({Math.min(page * PAGE_SIZE, displayedStays.length)} of {displayedStays.length})
                  </Text>
                </TouchableOpacity>
              )}
              </>
            ) : (
              <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                <Icons.Bed color="#94A3B8" size={36} />
                <Text style={{ fontSize: 14, fontWeight: '800', color: colors.text, marginTop: 10 }}>
                  No stays or hotels found
                </Text>
                <Text style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>
                  Try resetting filters or searching another destination.
                </Text>
              </View>
            )}
          </View>
        ) : categoryName === 'Jobs' || categoryName === 'Jobs & Careers' ? (
          <View style={{ paddingHorizontal: 4 }}>
            {/* Results Header */}
            <View style={styles.resultsHeaderRow}>
              <Text style={[styles.resultsTitle, { color: colors.text }]}>
                {catMeta.sectionTitle(selectedSubcat)}
              </Text>
              <Text style={[styles.resultsCount, { color: isLight ? '#64748B' : 'rgba(255, 255, 255, 0.5)' }]}>
                {catMeta.countLabel(filteredJobs.length)}
              </Text>
            </View>

            {filteredJobs.length > 0 ? (
              <>
                {filteredJobs.slice(0, page * PAGE_SIZE).map((job) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    onPress={() => navigation.navigate('JobDetails', { job })}
                  />
                ))}
                {filteredJobs.length > page * PAGE_SIZE && (
                  <TouchableOpacity
                    style={styles.loadMoreBtn}
                    activeOpacity={0.8}
                    onPress={() => setPage((prev) => prev + 1)}
                  >
                    <Text style={styles.loadMoreBtnText}>
                      Load More ({Math.min(page * PAGE_SIZE, filteredJobs.length)} of {filteredJobs.length})
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            ) : (
              <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                <Icons.Briefcase color="#94A3B8" size={36} />
                <Text style={{ fontSize: 14, fontWeight: '800', color: colors.text, marginTop: 10 }}>
                  {catMeta.emptyText}
                </Text>
                <Text style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>
                  Try searching with a different keyword or location.
                </Text>
              </View>
            )}
          </View>
        ) : (
          <>
            {/* Results Header */}
            <View style={styles.resultsHeaderRow}>
              <Text
                style={[
                  styles.resultsTitle,
                  { color: colors.text, flex: 1, marginRight: 8, fontSize: 13 },
                ]}
                numberOfLines={1}
              >
                {catMeta.sectionTitle(selectedSubcat)}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                {isProductsCategory && (
                  <>
                    <TouchableOpacity
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4,
                        backgroundColor: prodActiveFiltersCount > 0 ? '#F5B800' : isLight ? '#F1F5F9' : 'rgba(255,255,255,0.08)',
                        borderColor: prodActiveFiltersCount > 0 ? '#F5B800' : isLight ? '#E2E8F0' : 'rgba(255,255,255,0.12)',
                        borderWidth: 1,
                        borderRadius: 18,
                        paddingHorizontal: 10,
                        paddingVertical: 5.5,
                      }}
                      activeOpacity={0.8}
                      onPress={openProdFilterModal}
                    >
                      <Icons.Sliders color={prodActiveFiltersCount > 0 ? '#0F172A' : colors.text} size={13} />
                      <Text style={{ fontSize: 11, fontWeight: '800', color: prodActiveFiltersCount > 0 ? '#0F172A' : colors.text }}>
                        Filter{prodActiveFiltersCount > 0 ? ` (${prodActiveFiltersCount})` : ''}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4,
                        backgroundColor: selectedProdSort !== 'Recommended' ? '#F5B800' : isLight ? '#F1F5F9' : 'rgba(255,255,255,0.08)',
                        borderColor: selectedProdSort !== 'Recommended' ? '#F5B800' : isLight ? '#E2E8F0' : 'rgba(255,255,255,0.12)',
                        borderWidth: 1,
                        borderRadius: 18,
                        paddingHorizontal: 10,
                        paddingVertical: 5.5,
                      }}
                      activeOpacity={0.8}
                      onPress={() => setIsCategorySortOpen(true)}
                    >
                      <Icons.ArrowUpDown color={selectedProdSort !== 'Recommended' ? '#0F172A' : colors.text} size={13} />
                      <Text style={{ fontSize: 11, fontWeight: '800', color: selectedProdSort !== 'Recommended' ? '#0F172A' : colors.text }}>
                        Sort{selectedProdSort !== 'Recommended' ? `: ${selectedProdSort}` : ''}
                      </Text>
                    </TouchableOpacity>
                  </>
                )}
                {isDailyNeedsCategory && (
                  <>
                    <TouchableOpacity
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4,
                        backgroundColor: dnActiveFiltersCount > 0 ? '#F5B800' : isLight ? '#F1F5F9' : 'rgba(255,255,255,0.08)',
                        borderColor: dnActiveFiltersCount > 0 ? '#F5B800' : isLight ? '#E2E8F0' : 'rgba(255,255,255,0.12)',
                        borderWidth: 1,
                        borderRadius: 18,
                        paddingHorizontal: 10,
                        paddingVertical: 5.5,
                      }}
                      activeOpacity={0.8}
                      onPress={openDnFilterModal}
                    >
                      <Icons.Sliders color={dnActiveFiltersCount > 0 ? '#0F172A' : colors.text} size={13} />
                      <Text style={{ fontSize: 11, fontWeight: '800', color: dnActiveFiltersCount > 0 ? '#0F172A' : colors.text }}>
                        Filter{dnActiveFiltersCount > 0 ? ` (${dnActiveFiltersCount})` : ''}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4,
                        backgroundColor: selectedDnSort !== 'Recommended' ? '#F5B800' : isLight ? '#F1F5F9' : 'rgba(255,255,255,0.08)',
                        borderColor: selectedDnSort !== 'Recommended' ? '#F5B800' : isLight ? '#E2E8F0' : 'rgba(255,255,255,0.12)',
                        borderWidth: 1,
                        borderRadius: 18,
                        paddingHorizontal: 10,
                        paddingVertical: 5.5,
                      }}
                      activeOpacity={0.8}
                      onPress={() => setIsCategorySortOpen(true)}
                    >
                      <Icons.ArrowUpDown color={selectedDnSort !== 'Recommended' ? '#0F172A' : colors.text} size={13} />
                      <Text style={{ fontSize: 11, fontWeight: '800', color: selectedDnSort !== 'Recommended' ? '#0F172A' : colors.text }}>
                        Sort{selectedDnSort !== 'Recommended' ? `: ${selectedDnSort}` : ''}
                      </Text>
                    </TouchableOpacity>
                  </>
                )}
                {isFoodCategory && (
                  <>
                    <TouchableOpacity
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4,
                        backgroundColor: foodActiveFiltersCount > 0 ? '#F5B800' : isLight ? '#F1F5F9' : 'rgba(255,255,255,0.08)',
                        borderColor: foodActiveFiltersCount > 0 ? '#F5B800' : isLight ? '#E2E8F0' : 'rgba(255,255,255,0.12)',
                        borderWidth: 1,
                        borderRadius: 18,
                        paddingHorizontal: 10,
                        paddingVertical: 5.5,
                      }}
                      activeOpacity={0.8}
                      onPress={openFoodFilterModal}
                    >
                      <Icons.Sliders color={foodActiveFiltersCount > 0 ? '#0F172A' : colors.text} size={13} />
                      <Text style={{ fontSize: 11, fontWeight: '800', color: foodActiveFiltersCount > 0 ? '#0F172A' : colors.text }}>
                        Filter{foodActiveFiltersCount > 0 ? ` (${foodActiveFiltersCount})` : ''}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4,
                        backgroundColor: selectedFoodSort !== 'Recommended' ? '#F5B800' : isLight ? '#F1F5F9' : 'rgba(255,255,255,0.08)',
                        borderColor: selectedFoodSort !== 'Recommended' ? '#F5B800' : isLight ? '#E2E8F0' : 'rgba(255,255,255,0.12)',
                        borderWidth: 1,
                        borderRadius: 18,
                        paddingHorizontal: 10,
                        paddingVertical: 5.5,
                      }}
                      activeOpacity={0.8}
                      onPress={() => setIsCategorySortOpen(true)}
                    >
                      <Icons.ArrowUpDown color={selectedFoodSort !== 'Recommended' ? '#0F172A' : colors.text} size={13} />
                      <Text style={{ fontSize: 11, fontWeight: '800', color: selectedFoodSort !== 'Recommended' ? '#0F172A' : colors.text }}>
                        Sort{selectedFoodSort !== 'Recommended' ? `: ${selectedFoodSort}` : ''}
                      </Text>
                    </TouchableOpacity>
                  </>
                )}
                {isServicesCategory && (
                  <>
                    <TouchableOpacity
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4,
                        backgroundColor: srvActiveFiltersCount > 0 ? '#F5B800' : isLight ? '#F1F5F9' : 'rgba(255,255,255,0.08)',
                        borderColor: srvActiveFiltersCount > 0 ? '#F5B800' : isLight ? '#E2E8F0' : 'rgba(255,255,255,0.12)',
                        borderWidth: 1,
                        borderRadius: 18,
                        paddingHorizontal: 11,
                        paddingVertical: 5.5,
                      }}
                      activeOpacity={0.8}
                      onPress={openSrvFilterModal}
                    >
                      <Icons.Sliders color={srvActiveFiltersCount > 0 ? '#0F172A' : colors.text} size={13} />
                      <Text style={{ fontSize: 11, fontWeight: '800', color: srvActiveFiltersCount > 0 ? '#0F172A' : colors.text }}>
                        Filter{srvActiveFiltersCount > 0 ? ` (${srvActiveFiltersCount})` : ''}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4,
                        backgroundColor: selectedSrvSort !== 'Recommended' ? '#F5B800' : isLight ? '#F1F5F9' : 'rgba(255,255,255,0.08)',
                        borderColor: selectedSrvSort !== 'Recommended' ? '#F5B800' : isLight ? '#E2E8F0' : 'rgba(255,255,255,0.12)',
                        borderWidth: 1,
                        borderRadius: 18,
                        paddingHorizontal: 11,
                        paddingVertical: 5.5,
                      }}
                      activeOpacity={0.8}
                      onPress={() => setIsCategorySortOpen(true)}
                    >
                      <Icons.ArrowUpDown color={selectedSrvSort !== 'Recommended' ? '#0F172A' : colors.text} size={13} />
                      <Text style={{ fontSize: 11, fontWeight: '800', color: selectedSrvSort !== 'Recommended' ? '#0F172A' : colors.text }}>
                        Sort{selectedSrvSort !== 'Recommended' ? `: ${selectedSrvSort}` : ''}
                      </Text>
                    </TouchableOpacity>
                  </>
                )}
                {isTravelCategory && (
                  <TouchableOpacity
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 5,
                      backgroundColor: busActiveFiltersCount > 0 ? '#F5B800' : isLight ? '#F1F5F9' : 'rgba(255,255,255,0.08)',
                      borderColor: busActiveFiltersCount > 0 ? '#F5B800' : isLight ? '#E2E8F0' : 'rgba(255,255,255,0.12)',
                      borderWidth: 1,
                      borderRadius: 18,
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                    }}
                    activeOpacity={0.8}
                    onPress={openBusFilterModal}
                  >
                    <Icons.Sliders color={busActiveFiltersCount > 0 ? '#0F172A' : colors.text} size={13} />
                    <Text style={{ fontSize: 11, fontWeight: '800', color: busActiveFiltersCount > 0 ? '#0F172A' : colors.text }}>
                      Filter & Sort{busActiveFiltersCount > 0 ? ` (${busActiveFiltersCount})` : ''}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {displayedServices.length > 0 ? (
              isTravelCategory ? (
                <>
                  <TouchableOpacity
                    style={styles.travelRouteBanner}
                    activeOpacity={0.85}
                    onPress={() => setIsTravelSearchModalOpen(true)}
                  >
                    <Icons.Compass size={18} color="#D97706" style={{ marginRight: 8 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.travelRouteBannerText}>
                        Showing verified travel options for{' '}
                        <Text style={{ fontWeight: '800', color: '#B45309' }}>
                          {travelFrom || 'All Cities'} ➔ {travelTo || 'All Destinations'}
                        </Text>
                        {travelJourneyDate ? (
                          <>
                            {' '}•{' '}
                            <Text style={{ fontWeight: '700', color: '#B45309' }}>
                              {travelJourneyDate}
                            </Text>
                          </>
                        ) : null}
                        {travelPassengers > 1 ? (
                          <>
                            {' '}•{' '}
                            <Text style={{ fontWeight: '700', color: '#B45309' }}>
                              {travelPassengers} Passengers
                            </Text>
                          </>
                        ) : null}
                      </Text>
                      <Text style={{ fontSize: 11, color: '#B45309', marginTop: 2, fontWeight: '600' }}>
                        {displayedServices.length} {displayedServices.length === 1 ? 'option' : 'options'} found • Tap to edit search
                      </Text>
                    </View>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: '#F5B800',
                        paddingHorizontal: 10,
                        paddingVertical: 5,
                        borderRadius: 10,
                        gap: 4,
                        marginLeft: 6,
                      }}
                    >
                      <Icons.SlidersHorizontal size={12} color="#0F172A" />
                      <Text style={{ fontSize: 11.5, fontWeight: '800', color: '#0F172A' }}>Edit</Text>
                    </View>
                  </TouchableOpacity>

                  <View style={styles.travelListContainer}>
                    {displayedServices.slice(0, page * PAGE_SIZE).map((service: any) => {
                      return (
                        <View
                          key={service.id}
                          style={[
                            styles.travelCard,
                            {
                              backgroundColor: isLight ? '#FFFFFF' : 'rgba(15, 23, 42, 0.9)',
                              borderColor: isLight ? '#F1E8D9' : 'rgba(255, 255, 255, 0.1)',
                            },
                          ]}
                        >
                          {/* TOP ROW: Vehicle badge & Rating/Certification badge */}
                          <View style={styles.travelCardTopRow}>
                            <View style={styles.travelVehicleBadge}>
                              <Icons.Bus size={12} color="#D97706" style={{ marginRight: 4 }} />
                              <Text style={styles.travelVehicleBadgeText}>
                                {(service.type || 'BUS').toUpperCase()} • {service.subType || service.busType || service.subcategory || 'AC Sleeper'}
                              </Text>
                            </View>
                            {service.badge ? (
                              <View style={styles.travelBadgeRight}>
                                <Text style={styles.travelBadgeRightText}>{service.badge}</Text>
                              </View>
                            ) : null}
                          </View>

                          {/* MAIN INFO ROW: Thumbnail & Title/Operator/Rating */}
                          <View style={styles.travelMainInfoRow}>
                            <Image
                              source={{ uri: service.image }}
                              style={styles.travelThumbImage}
                              resizeMode="cover"
                            />
                            <View style={styles.travelMainDetails}>
                              <Text
                                style={[styles.travelCardTitle, { color: isLight ? '#0F172A' : '#F8FAFC' }]}
                                numberOfLines={2}
                              >
                                {service.name}
                              </Text>
                              <Text style={[styles.travelCardOperator, { color: isLight ? '#64748B' : '#94A3B8' }]}>
                                By {service.operator || 'Verified Travels'}
                              </Text>
                              {service.vehicleNumber ? (
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 3 }}>
                                  <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isLight ? '#FEF3C7' : 'rgba(245, 158, 11, 0.15)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: isLight ? '#FDE68A' : 'rgba(245, 158, 11, 0.3)' }}>
                                    <Icons.ShieldCheck size={10} color="#D97706" style={{ marginRight: 4 }} />
                                    <Text style={{ fontSize: 10, fontWeight: '800', color: isLight ? '#92400E' : '#FCD34D', letterSpacing: 0.5 }}>
                                      Reg: {service.vehicleNumber}
                                    </Text>
                                  </View>
                                </View>
                              ) : null}
                              <View style={styles.travelRatingRow}>
                                <View style={styles.travelRatingBadge}>
                                  <Icons.Star size={11} color="#0F172A" fill="#0F172A" style={{ marginRight: 3 }} />
                                  <Text style={styles.travelRatingText}>{service.rating || '4.8'}</Text>
                                </View>
                                <Text style={[styles.travelReviewsText, { color: isLight ? '#64748B' : '#94A3B8' }]}>
                                  ({service.reviews || '1200+ reviews'})
                                </Text>
                              </View>
                            </View>
                          </View>

                          {/* ROUTE & TIMING BOX */}
                          <View
                            style={[
                              styles.travelTimingBox,
                              { backgroundColor: isLight ? '#F8FAFC' : 'rgba(255, 255, 255, 0.04)' },
                            ]}
                          >
                            {/* Departure */}
                            <View style={styles.travelTimingCol}>
                              <Text style={[styles.travelTimeText, { color: isLight ? '#0F172A' : '#F8FAFC' }]}>
                                {service.departureTime || '21:30'}
                              </Text>
                              <Text style={[styles.travelCityText, { color: isLight ? '#64748B' : '#94A3B8' }]}>
                                {service.from || routeParams.from || 'Bangalore'}
                              </Text>
                            </View>

                            {/* Duration Line */}
                            <View style={styles.travelDurationCol}>
                              <Text style={styles.travelDurationText}>{service.duration || '8h 00m'}</Text>
                              <View style={styles.travelRouteLineContainer}>
                                <View style={styles.travelDot} />
                                <View style={styles.travelLine} />
                                <Icons.ChevronRight size={14} color="#F59E0B" style={{ marginLeft: -4 }} />
                              </View>
                              <Text style={styles.travelDirectText}>Direct Express</Text>
                            </View>

                            {/* Arrival */}
                            <View style={[styles.travelTimingCol, { alignItems: 'flex-end' }]}>
                              <Text style={[styles.travelTimeText, { color: isLight ? '#0F172A' : '#F8FAFC' }]}>
                                {service.arrivalTime || '05:30'}
                              </Text>
                              <Text style={[styles.travelCityText, { color: isLight ? '#64748B' : '#94A3B8' }]}>
                                {service.to || routeParams.to || 'Chennai'}
                              </Text>
                            </View>
                          </View>

                          {/* BOARDING POINT ROW */}
                          {service.boardingPoints && service.boardingPoints.length > 0 && (
                            <View style={styles.travelBoardingRow}>
                              <Icons.Navigation size={13} color="#64748B" style={{ marginRight: 6 }} />
                              <Text
                                style={[styles.travelBoardingText, { color: isLight ? '#475569' : '#CBD5E1' }]}
                                numberOfLines={1}
                              >
                                Boarding: {service.boardingPoints[0]}
                              </Text>
                            </View>
                          )}

                          {/* AMENITIES ROW */}
                          {service.amenities && service.amenities.length > 0 && (
                            <View style={styles.travelAmenitiesRow}>
                              {service.amenities.slice(0, 3).map((amenity: string, idx: number) => (
                                <View
                                  key={idx}
                                  style={[
                                    styles.travelAmenityChip,
                                    { backgroundColor: isLight ? '#F0FDF4' : 'rgba(34, 197, 94, 0.12)' },
                                  ]}
                                >
                                  <Icons.CheckCircle2 size={11} color="#16A34A" style={{ marginRight: 3 }} />
                                  <Text style={styles.travelAmenityChipText}>{amenity}</Text>
                                </View>
                              ))}
                              {service.amenities.length > 3 && (
                                <View
                                  style={[
                                    styles.travelAmenityChip,
                                    { backgroundColor: isLight ? '#F1F5F9' : 'rgba(255, 255, 255, 0.08)' },
                                  ]}
                                >
                                  <Text style={[styles.travelAmenityChipText, { color: isLight ? '#64748B' : '#94A3B8' }]}>
                                    +{service.amenities.length - 3} more
                                  </Text>
                                </View>
                              )}
                            </View>
                          )}

                          {/* BOTTOM PRICE & SELECT SEATS CTA */}
                          <View
                            style={[
                              styles.travelBottomRow,
                              { borderTopColor: isLight ? '#F1F5F9' : 'rgba(255, 255, 255, 0.08)' },
                            ]}
                          >
                            <View style={styles.travelPriceCol}>
                              <View style={styles.travelPriceRow}>
                                <Text style={[styles.travelPriceAmount, { color: isLight ? '#0F172A' : '#F8FAFC' }]}>
                                  {service.price}
                                </Text>
                                {service.originalPrice && (
                                  <Text style={styles.travelOriginalPrice}>{service.originalPrice}</Text>
                                )}
                              </View>
                              <Text style={styles.travelSeatsLeftText}>
                                {service.seatsLeft || service.seatsAvailable || 12} seats left
                              </Text>
                            </View>

                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, justifyContent: 'flex-end' }}>
                              {(() => {
                                const isTravelInCart = cartItems.some((c) => c.id === service.id);
                                return (
                                  <TouchableOpacity
                                    style={[
                                      styles.compactOutlineBtn,
                                      isTravelInCart ? styles.compactOutlineBtnActive : null
                                    ]}
                                    activeOpacity={0.85}
                                    onPress={(e) => {
                                      e.stopPropagation?.();
                                      if (isTravelInCart) {
                                        showToast('Already in your cart', 'View Cart', () => setIsCartVisible(true));
                                      } else {
                                        const nextDays = NEXT_7_DAYS;
                                        const firstAvailDay = nextDays.find((d) => !d.isFull) || nextDays[0];
                                        const firstAvailSlot = TIMINGS_GRID.find((t) => t.status === 'AVAILABLE') || TIMINGS_GRID[0];
                                        const defBoarding = service.boardingPoints?.[0] || `${service.from || 'Bangalore'} Central Station (10:15 PM)`;
                                        const defDropping = service.droppingPoints?.[0] || `${service.to || 'Chennai'} CMBT Bus Stand (06:00 AM)`;
                                        addToCart({
                                          id: service.id,
                                          productId: service.id || service._id,
                                          vendorId: service.vendorId || (service as any).vendor_id,
                                          vendor_id: service.vendorId || (service as any).vendor_id,
                                          name: service.name,
                                          price: service.price || '₹499',
                                          category: 'Travel',
                                          image: service.image,
                                          seller: service.operator || service.vendorName || service.brand || 'Travel Partner',
                                          bookingDate: firstAvailDay?.fullDateStr || 'Today',
                                          bookingTime: firstAvailSlot?.time || '10:00 PM',
                                          vehicleNumber: service.vehicleNumber || service.vehicleRegNo || service.busNumber,
                                          configurationDetails: `${defBoarding} → ${defDropping}`,
                                        });
                                        showToast('Travel ticket added to cart · View Cart', 'View Cart', () => setIsCartVisible(true));
                                      }
                                    }}
                                  >
                                    {isTravelInCart ? (
                                      <>
                                        <Icons.Check color="#16A34A" size={11} strokeWidth={3} />
                                        <Text style={[styles.compactOutlineBtnText, { color: '#16A34A' }]} numberOfLines={1}>Added</Text>
                                      </>
                                    ) : (
                                      <>
                                        <Icons.ShoppingCart color="#FF6A00" size={11} strokeWidth={2.5} />
                                        <Text style={styles.compactOutlineBtnText} numberOfLines={1}>Add to Cart</Text>
                                      </>
                                    )}
                                  </TouchableOpacity>
                                );
                              })()}

                              <TouchableOpacity
                                style={styles.compactPrimaryBtn}
                                activeOpacity={0.88}
                                onPress={() => {
                                  const nextDays = NEXT_7_DAYS;
                                  const firstAvailDay = nextDays.find((d) => !d.isFull) || nextDays[0];
                                  const firstAvailSlot = TIMINGS_GRID.find((t) => t.status === 'AVAILABLE') || TIMINGS_GRID[0];
                                  setSelectedDateObj(firstAvailDay);
                                  setSelectedSlotObj(firstAvailSlot);
                                  setTravelBookingStep('GUESTS');
                                  const defBoarding = service.boardingPoints?.[0] || `${service.from || 'Bangalore'} Central Station (10:15 PM)`;
                                  const defDropping = service.droppingPoints?.[0] || `${service.to || 'Chennai'} CMBT Bus Stand (06:00 AM)`;
                                  setSelectedBoardingPoint(defBoarding);
                                  setSelectedDroppingPoint(defDropping);
                                  setSchedulingItem(service);
                                }}
                              >
                                <Icons.Calendar size={11} color="#FFFFFF" strokeWidth={2.5} />
                                <Text style={styles.compactPrimaryBtnText} numberOfLines={1}>Book Now</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                  {displayedServices.length > page * PAGE_SIZE && (
                    <TouchableOpacity
                      style={styles.loadMoreBtn}
                      activeOpacity={0.8}
                      onPress={() => setPage((prev) => prev + 1)}
                    >
                      <Text style={styles.loadMoreBtnText}>
                        Load More ({Math.min(page * PAGE_SIZE, displayedServices.length)} of {displayedServices.length})
                      </Text>
                    </TouchableOpacity>
                  )}
                </>
              ) : (
                <>
                  <View style={styles.compact2ColGrid}>
                {displayedServices.slice(0, page * PAGE_SIZE).map((service) => {
                  const isWishlisted = wishlistItems.some((w) => w.id === service.id);
                  const discBadge = getDiscountBadgeText(service.price, service.originalPrice, service.discountNum);
                  const isCartCategory = catMeta.actionType === 'cart';
                  const cardWidth = Math.floor((width - 32 - 12) / 2);

                  return (
                    <TouchableOpacity
                      key={service.id}
                      style={[
                        styles.compactCard,
                        {
                          width: cardWidth,
                          backgroundColor: isLight ? '#FFFFFF' : 'rgba(13, 22, 54, 0.65)',
                          borderColor: isLight ? '#F1EAD8' : colors.cardBorder,
                        },
                      ]}
                      activeOpacity={0.92}
                      onPress={() => {
                        if (catMeta.actionType === 'cart') {
                          navigation.navigate('ProductDetails', { item: service, category: categoryName });
                        } else if (catMeta.actionType === 'job') {
                          navigation.navigate('JobDetails', { job: service });
                        } else {
                          const nextDays = NEXT_7_DAYS;
                          const firstAvailDay = nextDays.find((d) => !d.isFull) || nextDays[0];
                          const firstAvailSlot = TIMINGS_GRID.find((t) => t.status === 'AVAILABLE') || TIMINGS_GRID[0];
                          setSelectedDateObj(firstAvailDay);
                          setSelectedSlotObj(firstAvailSlot);
                          setSchedulingItem(service);
                        }
                      }}
                    >
                      {/* Image Wrapper with Discount & Wishlist */}
                      <View style={styles.compactImageWrapper}>
                        <Image source={{ uri: service.image }} style={styles.compactImage} resizeMode="cover" />
                        
                        {/* Top-Left Discount Badge */}
                        {Boolean(discBadge) && (
                          <View style={styles.compactDiscountBadge}>
                            <Text style={styles.compactDiscountBadgeText}>{discBadge}</Text>
                          </View>
                        )}

                        {/* Top-Right Circle Wishlist Button */}
                        <TouchableOpacity
                          style={styles.compactWishlistBtn}
                          activeOpacity={0.8}
                          onPress={() => {
                            toggleWishlist({
                              id: service.id,
                              name: service.name,
                              price: service.price,
                              category: categoryName || service.mainCategory || 'Product',
                              image: service.image,
                            });
                          }}
                        >
                          <Icons.Heart
                            color={isWishlisted ? '#FF2E93' : '#0F172A'}
                            size={13}
                            fill={isWishlisted ? '#FF2E93' : 'transparent'}
                          />
                        </TouchableOpacity>
                      </View>

                      {/* Card Body */}
                      <View style={styles.compactBody}>
                        <Text style={[styles.compactTitle, { color: colors.text }]} numberOfLines={2}>
                          {service.name}
                        </Text>

                        <Text style={styles.compactCategorySub} numberOfLines={1}>
                          {service.brand
                            ? `${service.brand} • ${service.subcategory}`
                            : `${service.subcategory || service.mainCategory || categoryName}`}
                        </Text>

                        {/* Rating */}
                        <View style={styles.compactRatingRow}>
                          <Icons.Star color="#F5B800" size={11} fill="#F5B800" />
                          <Text style={styles.compactRatingText}>{service.rating}</Text>
                          <Text style={styles.compactReviewsText}> ({service.reviews})</Text>
                        </View>

                        {/* Pricing Row */}
                        <View style={{ marginBottom: 8 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 5 }}>
                            <Text style={[styles.compactCurrentPrice, { color: isLight ? '#0F172A' : '#F5B800' }]}>
                              {service.price}
                            </Text>
                            {service.originalPrice && (
                              <Text style={styles.compactOriginalPrice}>{service.originalPrice}</Text>
                            )}
                          </View>
                          <Text style={[styles.compactFreeDeliveryText, { marginLeft: 0, marginTop: 2 }]} numberOfLines={1}>
                            {service.deliveryTime || (isCartCategory ? 'Free Delivery' : '⚡ 15-30 mins')}
                          </Text>
                        </View>

                        {/* Action Row */}
                        <View style={styles.compactActionRow}>
                          {(() => {
                            const cartItem = cartItems.find((c) => c.id === service.id);
                            const isInCart = cartItem && cartItem.quantity > 0;

                            if (catMeta.actionType === 'cart') {
                              return (
                                <>
                                  <TouchableOpacity
                                    style={[
                                      styles.compactOutlineBtn,
                                      isInCart ? styles.compactOutlineBtnActive : null
                                    ]}
                                    activeOpacity={0.85}
                                    onPress={(e) => {
                                      e.stopPropagation?.();
                                      if (isInCart) {
                                        showToast('Already in your cart', 'View Cart', () => setIsCartVisible(true));
                                      } else {
                                        addToCart({
                                          id: service.id,
                                          name: service.name,
                                          price: String(service.price || '₹299'),
                                          category: categoryName,
                                          image: service.image,
                                          quantity: 1,
                                        });
                                        showToast('Added to cart · View Cart', 'View Cart', () => setIsCartVisible(true));
                                      }
                                    }}
                                  >
                                    {isInCart ? (
                                      <>
                                        <Icons.Check color="#16A34A" size={11} strokeWidth={3} />
                                        <Text style={[styles.compactOutlineBtnText, { color: '#16A34A' }]} numberOfLines={1}>Added</Text>
                                      </>
                                    ) : (
                                      <>
                                        <Icons.ShoppingCart color="#FF6A00" size={11} strokeWidth={2.5} />
                                        <Text style={styles.compactOutlineBtnText} numberOfLines={1}>Add to Cart</Text>
                                      </>
                                    )}
                                  </TouchableOpacity>

                                  <TouchableOpacity
                                    style={styles.compactPrimaryBtn}
                                    activeOpacity={0.85}
                                    onPress={(e) => {
                                      e.stopPropagation?.();
                                      if (!isInCart) {
                                        addToCart({
                                          id: service.id,
                                          name: service.name,
                                          price: String(service.price || '₹299'),
                                          category: categoryName,
                                          image: service.image,
                                          quantity: 1,
                                        });
                                      }
                                      navigation.navigate('Checkout', { item: service });
                                    }}
                                  >
                                    <Icons.Zap color="#FFFFFF" size={11} strokeWidth={2.5} fill="#FFFFFF" />
                                    <Text style={styles.compactPrimaryBtnText} numberOfLines={1}>Buy Now</Text>
                                  </TouchableOpacity>
                                </>
                              );
                            }

                            return (
                              <>
                                <TouchableOpacity
                                  style={[
                                    styles.compactOutlineBtn,
                                    isInCart ? styles.compactOutlineBtnActive : null,
                                  ]}
                                  activeOpacity={0.85}
                                  onPress={(e) => {
                                    e.stopPropagation?.();
                                    if (isInCart) {
                                      showToast('Already in your cart', 'View Cart', () => setIsCartVisible(true));
                                    } else {
                                      const nextDays = NEXT_7_DAYS;
                                      const firstAvailDay = nextDays.find((d) => !d.isFull) || nextDays[0];
                                      const firstAvailSlot = TIMINGS_GRID.find((t) => t.status === 'AVAILABLE') || TIMINGS_GRID[0];
                                      const { priceStr } = getCalculatedServicePrice(service);

                                      addToCart({
                                        id: service.id,
                                        name: service.name,
                                        price: priceStr || String(service.price || '₹299'),
                                        category: categoryName || service.mainCategory || 'Services',
                                        image: service.image,
                                        quantity: 1,
                                        bookingDate: firstAvailDay?.fullDateStr || 'Today',
                                        bookingTime: firstAvailSlot?.time || '10:00 AM - 12:00 PM',
                                        seller: service.vendorName || service.brand,
                                        vehicleNumber: service.vehicleNumber || service.vehicleRegNo,
                                      });
                                      showToast('Added to cart · View Cart', 'View Cart', () => setIsCartVisible(true));
                                    }
                                  }}
                                >
                                  {isInCart ? (
                                    <>
                                      <Icons.Check color="#16A34A" size={11} strokeWidth={3} />
                                      <Text style={[styles.compactOutlineBtnText, { color: '#16A34A' }]} numberOfLines={1}>Added</Text>
                                    </>
                                  ) : (
                                    <>
                                      <Icons.ShoppingCart color="#FF6A00" size={11} strokeWidth={2.5} />
                                      <Text style={styles.compactOutlineBtnText} numberOfLines={1}>Add to Cart</Text>
                                    </>
                                  )}
                                </TouchableOpacity>

                                <TouchableOpacity
                                  style={styles.compactPrimaryBtn}
                                  activeOpacity={0.85}
                                  onPress={(e) => {
                                    e.stopPropagation?.();
                                    const nextDays = NEXT_7_DAYS;
                                    const firstAvailDay = nextDays.find((d) => !d.isFull) || nextDays[0];
                                    const firstAvailSlot = TIMINGS_GRID.find((t) => t.status === 'AVAILABLE') || TIMINGS_GRID[0];
                                    setSelectedDateObj(firstAvailDay);
                                    setSelectedSlotObj(firstAvailSlot);
                                    setSchedulingItem(service);
                                  }}
                                >
                                  <Icons.Calendar color="#FFFFFF" size={11} strokeWidth={2.5} />
                                  <Text style={styles.compactPrimaryBtnText} numberOfLines={1}>Book Now</Text>
                                </TouchableOpacity>
                              </>
                            );
                          })()}
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {displayedServices.length > page * PAGE_SIZE && (
                <TouchableOpacity
                  style={styles.loadMoreBtn}
                  activeOpacity={0.8}
                  onPress={() => setPage((prev) => prev + 1)}
                >
                  <Text style={styles.loadMoreBtnText}>
                    Load More ({Math.min(page * PAGE_SIZE, displayedServices.length)} of {displayedServices.length})
                  </Text>
                </TouchableOpacity>
              )}
                </>
              )
          ) : (
              isTravelCategory ? (
                <View style={styles.travelEmptyContainer}>
                  <View style={[styles.travelEmptyIconCircle, { backgroundColor: 'rgba(245, 184, 0, 0.12)' }]}>
                    <Icons.Compass color="#D97706" size={38} />
                  </View>
                  <Text style={[styles.emptyTitle, { color: colors.text, marginTop: 14 }]}>
                    No Available Travel Options
                  </Text>
                  <Text style={[styles.emptySubtitle, { color: isLight ? '#64748B' : 'rgba(255, 255, 255, 0.6)', textAlign: 'center', marginHorizontal: 24, marginTop: 6, lineHeight: 20 }]}>
                    No available travel options match your selected route, date, time, and budget. Please adjust your search criteria.
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 12, marginTop: 22 }}>
                    <TouchableOpacity
                      style={[styles.emptyResetBtn, { backgroundColor: '#F5B800' }]}
                      onPress={() => setIsTravelSearchModalOpen(true)}
                    >
                      <Icons.Search size={14} color="#0F172A" />
                      <Text style={[styles.emptyResetBtnText, { color: '#0F172A', fontWeight: '800' }]}>Edit Search</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.emptyResetBtn, { backgroundColor: isLight ? '#F1F5F9' : 'rgba(255, 255, 255, 0.08)' }]}
                      onPress={handleResetTravelSearch}
                    >
                      <Icons.RotateCcw size={14} color={isLight ? '#475569' : '#CBD5E1'} />
                      <Text style={[styles.emptyResetBtnText, { color: isLight ? '#475569' : '#CBD5E1', fontWeight: '800' }]}>Reset All</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : isLoadingProducts ? (
                <View style={[styles.emptyContainer, { paddingVertical: 48 }]}>
                  <ActivityIndicator size="large" color="#F5B800" />
                  <Text style={[styles.emptySubtitle, { color: isLight ? '#64748B' : 'rgba(255, 255, 255, 0.6)', marginTop: 12, fontWeight: '600' }]}>
                    Loading {categoryName || 'items'}...
                  </Text>
                </View>
              ) : productsFetchError ? (
                <View style={styles.emptyContainer}>
                  <Icons.AlertTriangle color="#EF4444" size={40} />
                  <Text style={[styles.emptyTitle, { color: colors.text, marginTop: 8 }]}>Unable to load items</Text>
                  <Text style={[styles.emptySubtitle, { color: isLight ? '#64748B' : 'rgba(255, 255, 255, 0.5)', marginTop: 4 }]}>
                    {productsFetchError}
                  </Text>
                  <TouchableOpacity
                    style={[styles.emptyResetBtn, { backgroundColor: '#F5B800', marginTop: 16 }]}
                    onPress={fetchDynamicProducts}
                  >
                    <Text style={[styles.emptyResetBtnText, { color: '#0F172A', fontWeight: '800' }]}>Retry</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.emptyContainer}>
                  <Icons.SearchX color={isLight ? '#94A3B8' : 'rgba(255, 255, 255, 0.35)'} size={40} />
                  <Text style={[styles.emptyTitle, { color: colors.text }]}>{catMeta.emptyText}</Text>
                  <Text style={[styles.emptySubtitle, { color: isLight ? '#64748B' : 'rgba(255, 255, 255, 0.5)' }]}>
                    We couldn't find anything matching "{searchQuery}".
                  </Text>
                  <TouchableOpacity
                    style={styles.emptyResetBtn}
                    onPress={() => {
                      setSearchQuery('');
                      setSelectedSubcat('All');
                    }}
                  >
                    <Text style={styles.emptyResetBtnText}>View All Items</Text>
                  </TouchableOpacity>
                </View>
              )
            )}
          </>
        )}
      </ScrollView>

      {/* Service-Type Aware Booking Modal Sheet */}
      <Modal
        visible={schedulingItem !== null}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setSchedulingItem(null);
          setTravelBookingStep('GUESTS');
        }}
      >
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => {
              setSchedulingItem(null);
              setTravelBookingStep('GUESTS');
            }}
          />
          <View
            style={[
              styles.schedulerCard,
              {
                backgroundColor: isLight ? '#FFFDF5' : '#0B1530',
                borderColor: isLight ? '#FDE68A' : colors.cardBorder,
              },
            ]}
          >
            {/* Modal Header */}
            {getEffectiveCategory(schedulingItem) === 'Travel' && travelBookingStep === 'BOARDING_DROPPING' ? (
              <View style={[styles.schedulerHeader, { borderBottomColor: isLight ? '#F1EAD8' : 'rgba(255, 255, 255, 0.08)' }]}>
                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 4, paddingRight: 8 }}
                  onPress={() => setTravelBookingStep('GUESTS')}
                  activeOpacity={0.7}
                >
                  <Icons.ArrowLeft color={colors.text} size={20} />
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text, marginLeft: 4 }}>Guests</Text>
                </TouchableOpacity>
                <View style={{ flex: 1, marginLeft: 6, marginRight: 8 }}>
                  <Text style={[styles.schedulerModalTitle, { color: colors.text, fontSize: 15.5 }]} numberOfLines={1}>
                    Boarding & Dropping
                  </Text>
                  <Text style={[styles.schedulerItemName, { color: '#D97706', fontSize: 11.5 }]} numberOfLines={1}>
                    {schedulingItem?.name}
                  </Text>
                  {schedulingItem?.vehicleNumber ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isLight ? '#FEF3C7' : 'rgba(245, 158, 11, 0.15)', paddingHorizontal: 5, paddingVertical: 1.5, borderRadius: 5, borderWidth: 1, borderColor: isLight ? '#FDE68A' : 'rgba(245, 158, 11, 0.3)' }}>
                        <Icons.ShieldCheck size={9} color="#D97706" style={{ marginRight: 3 }} />
                        <Text style={{ fontSize: 9.5, fontWeight: '800', color: isLight ? '#92400E' : '#FCD34D' }}>
                          Reg: {schedulingItem.vehicleNumber}
                        </Text>
                      </View>
                    </View>
                  ) : null}
                </View>
                <TouchableOpacity
                  style={styles.schedulerCloseBtn}
                  onPress={() => {
                    setSchedulingItem(null);
                    setTravelBookingStep('GUESTS');
                  }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Icons.X color={colors.text} size={20} />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={[styles.schedulerHeader, { borderBottomColor: isLight ? '#F1EAD8' : 'rgba(255, 255, 255, 0.08)' }]}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    <Text style={styles.modalCategoryBadge}>
                      {getEffectiveCategory(schedulingItem).toUpperCase()}
                    </Text>
                    <Text style={{ fontSize: 10, color: '#10B981', fontWeight: '800' }}>● LIVE SLOTS</Text>
                  </View>
                  <Text style={[styles.schedulerModalTitle, { color: colors.text }]} numberOfLines={1}>
                    {schedulingItem?.name}
                  </Text>
                  <Text style={[styles.schedulerItemName, { color: '#D97706' }]} numberOfLines={1}>
                    Starting at {schedulingItem?.price || '₹499'} • Certified Provider
                  </Text>
                  {schedulingItem?.vehicleNumber ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 3 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isLight ? '#FEF3C7' : 'rgba(245, 158, 11, 0.15)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: isLight ? '#FDE68A' : 'rgba(245, 158, 11, 0.3)' }}>
                        <Icons.ShieldCheck size={10} color="#D97706" style={{ marginRight: 4 }} />
                        <Text style={{ fontSize: 10, fontWeight: '800', color: isLight ? '#92400E' : '#FCD34D', letterSpacing: 0.5 }}>
                          Reg: {schedulingItem.vehicleNumber}
                        </Text>
                      </View>
                    </View>
                  ) : null}
                </View>
                <TouchableOpacity
                  style={styles.schedulerCloseBtn}
                  onPress={() => {
                    setSchedulingItem(null);
                    setTravelBookingStep('GUESTS');
                  }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Icons.X color={colors.text} size={20} />
                </TouchableOpacity>
              </View>
            )}

            {/* Travel Step 2: Boarding & Dropping Points Selection */}
            {getEffectiveCategory(schedulingItem) === 'Travel' && travelBookingStep === 'BOARDING_DROPPING' ? (
              <>
                <ScrollView showsVerticalScrollIndicator={true} style={{ maxHeight: Math.min(560, height * 0.65) }} keyboardShouldPersistTaps="handled">
                  {/* Route & Passenger Card */}
                  <View
                    style={{
                      backgroundColor: isLight ? '#FFFBEB' : 'rgba(245, 184, 0, 0.1)',
                      borderColor: isLight ? '#FDE68A' : 'rgba(245, 184, 0, 0.25)',
                      borderWidth: 1,
                      borderRadius: 14,
                      padding: 12,
                      marginBottom: 14,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text style={{ fontSize: 14, fontWeight: '800', color: isLight ? '#0F172A' : '#F8FAFC' }}>
                        {schedulingItem?.from || routeParams.from || 'Bangalore'} ➔ {schedulingItem?.to || routeParams.to || 'Chennai'}
                      </Text>
                      <View style={{ backgroundColor: '#F5B800', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 }}>
                        <Text style={{ fontSize: 11, fontWeight: '800', color: '#0F172A' }}>
                          {routeParams.journeyDate || 'Today'}
                        </Text>
                      </View>
                    </View>
                    <Text style={{ fontSize: 12, color: isLight ? '#475569' : '#CBD5E1', marginBottom: 4 }}>
                      Bus: <Text style={{ fontWeight: '700' }}>{schedulingItem?.name}</Text>
                      {schedulingItem?.vehicleNumber ? ` (Reg: ${schedulingItem.vehicleNumber})` : ''} • Departure: <Text style={{ fontWeight: '700' }}>{schedulingItem?.departureTime || 'Direct Express'}</Text>
                    </Text>
                    <Text style={{ fontSize: 11.5, color: '#D97706', fontWeight: '700' }}>
                      👥 {travelerList.map((t, idx) => `P${idx+1}: ${t.name || 'Guest'}`).join(', ')} ({travelerList.length} {travelerList.length === 1 ? 'Person' : 'Persons'})
                    </Text>
                  </View>

                  {/* Section 1: Boarding Points */}
                  <View style={{ marginBottom: 16 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                      <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#10B981', justifyContent: 'center', alignItems: 'center' }}>
                        <Icons.Navigation size={12} color="#FFF" />
                      </View>
                      <Text style={{ fontSize: 12, fontWeight: '800', color: colors.text, textTransform: 'uppercase' }}>
                        Select Boarding Point ({schedulingItem?.from || 'Pickup'})
                      </Text>
                    </View>

                    {(schedulingItem?.boardingPoints && schedulingItem.boardingPoints.length > 0
                      ? schedulingItem.boardingPoints
                      : [
                          `${schedulingItem?.from || 'Bangalore'} Central Station (10:15 PM)`,
                          `${schedulingItem?.from || 'Bangalore'} Highway Toll (10:45 PM)`,
                          `${schedulingItem?.from || 'Bangalore'} Electronic City (11:15 PM)`,
                        ]
                    ).map((bp: string, bIdx: number) => {
                      const isSelected = selectedBoardingPoint === bp;
                      return (
                        <TouchableOpacity
                          key={`bp_${bIdx}`}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            padding: 12,
                            borderRadius: 12,
                            borderWidth: 1.5,
                            borderColor: isSelected ? '#F5B800' : isLight ? '#E2E8F0' : colors.cardBorder,
                            backgroundColor: isSelected ? (isLight ? '#FFFDF5' : 'rgba(245, 184, 0, 0.12)') : (isLight ? '#FFFFFF' : 'rgba(255,255,255,0.04)'),
                            marginBottom: 8,
                          }}
                          activeOpacity={0.8}
                          onPress={() => setSelectedBoardingPoint(bp)}
                        >
                          <View
                            style={{
                              width: 20,
                              height: 20,
                              borderRadius: 10,
                              borderWidth: 2,
                              borderColor: isSelected ? '#F5B800' : isLight ? '#94A3B8' : '#64748B',
                              justifyContent: 'center',
                              alignItems: 'center',
                              marginRight: 10,
                            }}
                          >
                            {isSelected && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#F5B800' }} />}
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 13, fontWeight: isSelected ? '800' : '600', color: isSelected ? (isLight ? '#0F172A' : '#FFF') : colors.text }}>
                              {bp}
                            </Text>
                          </View>
                          {isSelected && <Icons.Check size={16} color="#D97706" />}
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Section 2: Dropping Points */}
                  <View style={{ marginBottom: 14 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                      <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center' }}>
                        <Icons.MapPin size={12} color="#FFF" />
                      </View>
                      <Text style={{ fontSize: 12, fontWeight: '800', color: colors.text, textTransform: 'uppercase' }}>
                        Select Dropping Point ({schedulingItem?.to || 'Destination'})
                      </Text>
                    </View>

                    {(schedulingItem?.droppingPoints && schedulingItem.droppingPoints.length > 0
                      ? schedulingItem.droppingPoints
                      : [
                          `${schedulingItem?.to || 'Chennai'} Bypass (05:15 AM)`,
                          `${schedulingItem?.to || 'Chennai'} CMBT Bus Stand (06:00 AM)`,
                        ]
                    ).map((dp: string, dIdx: number) => {
                      const isSelected = selectedDroppingPoint === dp;
                      return (
                        <TouchableOpacity
                          key={`dp_${dIdx}`}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            padding: 12,
                            borderRadius: 12,
                            borderWidth: 1.5,
                            borderColor: isSelected ? '#F5B800' : isLight ? '#E2E8F0' : colors.cardBorder,
                            backgroundColor: isSelected ? (isLight ? '#FFFDF5' : 'rgba(245, 184, 0, 0.12)') : (isLight ? '#FFFFFF' : 'rgba(255,255,255,0.04)'),
                            marginBottom: 8,
                          }}
                          activeOpacity={0.8}
                          onPress={() => setSelectedDroppingPoint(dp)}
                        >
                          <View
                            style={{
                              width: 20,
                              height: 20,
                              borderRadius: 10,
                              borderWidth: 2,
                              borderColor: isSelected ? '#F5B800' : isLight ? '#94A3B8' : '#64748B',
                              justifyContent: 'center',
                              alignItems: 'center',
                              marginRight: 10,
                            }}
                          >
                            {isSelected && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#F5B800' }} />}
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 13, fontWeight: isSelected ? '800' : '600', color: isSelected ? (isLight ? '#0F172A' : '#FFF') : colors.text }}>
                              {dp}
                            </Text>
                          </View>
                          {isSelected && <Icons.Check size={16} color="#D97706" />}
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Summary Box */}
                  <View
                    style={{
                      backgroundColor: isLight ? '#F8FAFC' : 'rgba(255,255,255,0.05)',
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: isLight ? '#E2E8F0' : colors.cardBorder,
                      padding: 12,
                      marginBottom: 10,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                      <Text style={{ fontSize: 11, fontWeight: '800', color: '#10B981', width: 80 }}>BOARDING:</Text>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text, flex: 1 }} numberOfLines={1}>
                        {selectedBoardingPoint || 'Please select boarding point'}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                      <Text style={{ fontSize: 11, fontWeight: '800', color: '#EF4444', width: 80 }}>DROPPING:</Text>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text, flex: 1 }} numberOfLines={1}>
                        {selectedDroppingPoint || 'Please select dropping point'}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: isLight ? '#E2E8F0' : 'rgba(255,255,255,0.1)', paddingTop: 6, marginTop: 4 }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: colors.subtext }}>Total Fare ({travelerList.length} Person{travelerList.length > 1 ? 's' : ''}):</Text>
                      <Text style={{ fontSize: 16, fontWeight: '900', color: '#D97706' }}>
                        {getCalculatedServicePrice(schedulingItem).priceStr}
                      </Text>
                    </View>
                  </View>
                </ScrollView>

                {/* Footer CTA: Add to Cart + Proceed to Payment */}
                <View style={[styles.schedulerFooter, { borderTopColor: isLight ? '#F1EAD8' : 'rgba(255, 255, 255, 0.08)', flexDirection: 'row', gap: 10 }]}>
                  <TouchableOpacity
                    disabled={!selectedBoardingPoint || !selectedDroppingPoint}
                    style={[
                      styles.confirmBookingBtn,
                      { flex: 1, backgroundColor: 'transparent', borderWidth: 1.5, borderColor: '#FF6A00' },
                      (!selectedBoardingPoint || !selectedDroppingPoint) && { opacity: 0.5 },
                    ]}
                    onPress={handleAddToCartFromScheduler}
                  >
                    <Text style={[styles.confirmBookingBtnText, { color: '#FF6A00' }]}>
                      Add to Cart
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    disabled={!selectedBoardingPoint || !selectedDroppingPoint}
                    style={[
                      styles.confirmBookingBtn,
                      { flex: 1.3 },
                      (!selectedBoardingPoint || !selectedDroppingPoint) && styles.disabledConfirmBtn,
                    ]}
                    onPress={handleConfirmBooking}
                  >
                    <Text style={styles.confirmBookingBtnText}>
                      {!selectedBoardingPoint
                        ? 'Select Boarding'
                        : !selectedDroppingPoint
                        ? 'Select Dropping'
                        : 'Proceed to Pay'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              /* Standard / Guest Details View */
              <>
                <ScrollView showsVerticalScrollIndicator={true} style={{ maxHeight: Math.min(560, height * 0.65) }} keyboardShouldPersistTaps="handled">
                  {/* --- CATEGORY SPECIFIC CUSTOM CONTROLS --- */}

                  {/* 1. HEALTHCARE FIELDS */}
                  {getEffectiveCategory(schedulingItem) === 'Healthcare' && (
                    <View style={styles.customFieldsSection}>
                      <View style={[styles.providerInfoCard, { backgroundColor: isLight ? '#FEF3C7' : 'rgba(245, 184, 0, 0.1)', borderColor: isLight ? '#FDE68A' : 'rgba(245, 184, 0, 0.25)' }]}>
                        <Icons.UserCheck color="#D97706" size={16} />
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.providerTitle, { color: colors.text }]}>Dr. Ananya Sharma • MBBS, MD</Text>
                          <Text style={[styles.providerSubtitle, { color: isLight ? '#475569' : 'rgba(255,255,255,0.7)' }]}>Senior Cardiologist • 15+ yrs Exp • 4.9 ★ (120+ Reviews)</Text>
                        </View>
                      </View>

                      <Text style={[styles.fieldLabel, { color: colors.text }]}>CONSULTATION TYPE</Text>
                      <View style={styles.chipOptionsRow}>
                        <TouchableOpacity
                          style={[styles.chipBtn, consultationMode === 'video' && styles.chipBtnActive]}
                          onPress={() => setConsultationMode('video')}
                        >
                          <Icons.Video color={consultationMode === 'video' ? '#0F172A' : colors.text} size={14} />
                          <Text style={[styles.chipBtnText, consultationMode === 'video' && styles.chipBtnTextActive, { color: consultationMode === 'video' ? '#0F172A' : colors.text }]}>Video Call (₹399)</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.chipBtn, consultationMode === 'clinic' && styles.chipBtnActive]}
                          onPress={() => setConsultationMode('clinic')}
                        >
                          <Icons.Building color={consultationMode === 'clinic' ? '#0F172A' : colors.text} size={14} />
                          <Text style={[styles.chipBtnText, consultationMode === 'clinic' && styles.chipBtnTextActive, { color: consultationMode === 'clinic' ? '#0F172A' : colors.text }]}>In-Clinic Visit (₹699)</Text>
                        </TouchableOpacity>
                      </View>

                      <Text style={[styles.fieldLabel, { color: colors.text, marginTop: 12 }]}>PATIENT DETAILS</Text>
                      <TextInput
                        style={[styles.customTextInput, { backgroundColor: isLight ? '#FFFFFF' : 'rgba(255,255,255,0.06)', color: colors.text, borderColor: isLight ? '#F1EAD8' : colors.cardBorder }]}
                        value={patientNameInput}
                        onChangeText={setPatientNameInput}
                        placeholder="Patient Name"
                        placeholderTextColor="#94A3B8"
                      />
                      <TextInput
                        style={[styles.customTextInput, { backgroundColor: isLight ? '#FFFFFF' : 'rgba(255,255,255,0.06)', color: colors.text, borderColor: isLight ? '#F1EAD8' : colors.cardBorder, marginTop: 8 }]}
                        value={symptomsInput}
                        onChangeText={setSymptomsInput}
                        placeholder="Symptoms or reason for visit (optional)"
                        placeholderTextColor="#94A3B8"
                      />
                    </View>
                  )}

                  {/* 2. HOME SERVICES / AUTOMOBILE FIELDS */}
                  {(getEffectiveCategory(schedulingItem) === 'Home Services' || getEffectiveCategory(schedulingItem) === 'Automobile') && (
                    <View style={styles.customFieldsSection}>
                      <Text style={[styles.fieldLabel, { color: colors.text }]}>SERVICE PACKAGE</Text>
                      <View style={styles.chipOptionsRow}>
                        {['Standard Cleaning (₹499)', 'Deep Jet Wash (+₹350)', 'Gas Leak Fix (+₹500)'].map((pkg) => (
                          <TouchableOpacity
                            key={pkg}
                            style={[styles.chipBtn, selectedProblemPackage === pkg && styles.chipBtnActive]}
                            onPress={() => setSelectedProblemPackage(pkg)}
                          >
                            <Text style={[styles.chipBtnText, selectedProblemPackage === pkg && styles.chipBtnTextActive, { color: selectedProblemPackage === pkg ? '#0F172A' : colors.text }]}>{pkg}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>

                      <Text style={[styles.fieldLabel, { color: colors.text, marginTop: 12 }]}>SERVICE LOCATION</Text>
                      <View style={[styles.addressCard, { backgroundColor: isLight ? '#FFFFFF' : 'rgba(255,255,255,0.06)', borderColor: isLight ? '#F1EAD8' : colors.cardBorder }]}>
                        <Icons.MapPin color="#F5B800" size={16} />
                        <Text style={[styles.addressText, { color: colors.text }]} numberOfLines={1}>{selectedAddress}</Text>
                        <TouchableOpacity onPress={() => navigation.navigate('MyAddresses')}>
                          <Text style={{ fontSize: 11, fontWeight: '800', color: '#D97706' }}>CHANGE</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}

                  {/* 3. LEGAL FIELDS */}
                  {getEffectiveCategory(schedulingItem) === 'Legal' && (
                    <View style={styles.customFieldsSection}>
                      <View style={[styles.providerInfoCard, { backgroundColor: isLight ? '#FEF3C7' : 'rgba(245, 184, 0, 0.1)', borderColor: isLight ? '#FDE68A' : 'rgba(245, 184, 0, 0.25)' }]}>
                        <Icons.Scale color="#D97706" size={16} />
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.providerTitle, { color: colors.text }]}>Adv. Rajesh Varma • High Court Advocate</Text>
                          <Text style={[styles.providerSubtitle, { color: isLight ? '#475569' : 'rgba(255,255,255,0.7)' }]}>Corporate & Property Law • 18+ yrs Exp • 4.9 ★</Text>
                        </View>
                      </View>
                      <Text style={[styles.fieldLabel, { color: colors.text, marginTop: 10 }]}>CASE BRIEF & REQUIREMENTS</Text>
                      <TextInput
                        style={[styles.customTextInput, { backgroundColor: isLight ? '#FFFFFF' : 'rgba(255,255,255,0.06)', color: colors.text, borderColor: isLight ? '#F1EAD8' : colors.cardBorder }]}
                        value={symptomsInput}
                        onChangeText={setSymptomsInput}
                        placeholder="Briefly describe your legal query or deed verification..."
                        placeholderTextColor="#94A3B8"
                      />
                    </View>
                  )}

                  {/* 4. EDUCATION FIELDS */}
                  {getEffectiveCategory(schedulingItem) === 'Education' && (
                    <View style={styles.customFieldsSection}>
                      <Text style={[styles.fieldLabel, { color: colors.text }]}>SESSION DURATION</Text>
                      <View style={styles.chipOptionsRow}>
                        {['1 Hour Session (₹499)', '2 Hours Intensive (₹899)'].map((dur) => (
                          <TouchableOpacity
                            key={dur}
                            style={[styles.chipBtn, selectedDuration === dur && styles.chipBtnActive]}
                            onPress={() => setSelectedDuration(dur)}
                          >
                            <Text style={[styles.chipBtnText, selectedDuration === dur && styles.chipBtnTextActive, { color: selectedDuration === dur ? '#0F172A' : colors.text }]}>{dur}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* 5. STAY / TRAVEL FIELDS */}
                  {(getEffectiveCategory(schedulingItem) === 'Stay' || getEffectiveCategory(schedulingItem) === 'Travel') && (
                    <View style={styles.customFieldsSection}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                        <View>
                          <Text style={[styles.fieldLabel, { color: colors.text, marginBottom: 2 }]}>
                            NUMBER OF TRAVELLERS / GUESTS
                          </Text>
                          <Text style={{ fontSize: 13, fontWeight: '700', color: '#F5B800' }}>
                            {travelerList.length} {travelerList.length === 1 ? 'Guest' : 'Guests'} Added
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            backgroundColor: '#F5B800',
                            paddingHorizontal: 16,
                            paddingVertical: 9,
                            borderRadius: 20,
                            shadowColor: '#F5B800',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.25,
                            shadowRadius: 4,
                            elevation: 3,
                          }}
                          onPress={handleAddGuest}
                          activeOpacity={0.8}
                        >
                          <Icons.UserPlus color="#0F172A" size={16} />
                          <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A', marginLeft: 6 }}>+ Add Guest</Text>
                        </TouchableOpacity>
                      </View>

                      {/* DYNAMIC TRAVELLER / GUEST DETAILS INPUTS */}
                      <Text style={[styles.fieldLabel, { color: colors.text, marginTop: 4, marginBottom: 10 }]}>
                        TRAVELLER / GUEST DETAILS ({travelerList.length} {travelerList.length === 1 ? 'PERSON' : 'PERSONS'})
                      </Text>
                      {travelerList.map((trv, idx) => (
                        <View
                          key={`trv_${idx}`}
                          style={{
                            backgroundColor: isLight ? '#FFFFFF' : 'rgba(255,255,255,0.05)',
                            borderColor: isLight ? '#E2E8F0' : colors.cardBorder,
                            borderWidth: 1,
                            borderRadius: 14,
                            padding: 14,
                            marginBottom: 12,
                          }}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                              <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: isLight ? '#FEF3C7' : 'rgba(245, 184, 0, 0.15)', justifyContent: 'center', alignItems: 'center', marginRight: 8 }}>
                                <Icons.User color="#F4C400" size={14} />
                              </View>
                              <Text style={{ fontSize: 13, fontWeight: '800', color: colors.text }}>
                                {idx === 0
                                  ? 'Person 1 (Primary Traveller)'
                                  : `Person ${idx + 1} Details`}
                              </Text>
                            </View>
                            {idx > 0 && (
                              <TouchableOpacity
                                onPress={() => handleRemoveGuest(idx)}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                style={{
                                  flexDirection: 'row',
                                  alignItems: 'center',
                                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                  paddingHorizontal: 10,
                                  paddingVertical: 4,
                                  borderRadius: 8,
                                  borderWidth: 1,
                                  borderColor: 'rgba(239, 68, 68, 0.25)',
                                }}
                              >
                                <Icons.Trash2 color="#EF4444" size={13} />
                                <Text style={{ color: '#EF4444', fontSize: 11, fontWeight: '700', marginLeft: 4 }}>Remove</Text>
                              </TouchableOpacity>
                            )}
                          </View>

                          {/* Full Name */}
                          <Text style={{ fontSize: 11, fontWeight: '700', color: colors.subtext, marginBottom: 4 }}>
                            FULL NAME *
                          </Text>
                          <TextInput
                            style={[
                              styles.customTextInput,
                              {
                                backgroundColor: isLight ? '#F8FAFC' : 'rgba(255,255,255,0.06)',
                                color: colors.text,
                                borderColor: isLight ? '#CBD5E1' : colors.cardBorder,
                                marginBottom: 10,
                              },
                            ]}
                            value={trv.name}
                            onChangeText={(val) => updateTravelerInfo(idx, 'name', val)}
                            placeholder="Enter full name (e.g. Rajesh Kumar)"
                            placeholderTextColor="#94A3B8"
                          />

                          {/* Aadhaar Card Number */}
                          <Text style={{ fontSize: 11, fontWeight: '700', color: colors.subtext, marginBottom: 4 }}>
                            AADHAAR CARD NUMBER (12 DIGITS) *
                          </Text>
                          <TextInput
                            style={[
                              styles.customTextInput,
                              {
                                backgroundColor: isLight ? '#F8FAFC' : 'rgba(255,255,255,0.06)',
                                color: colors.text,
                                borderColor: isLight ? '#CBD5E1' : colors.cardBorder,
                                marginBottom: 10,
                              },
                            ]}
                            value={trv.aadhar}
                            onChangeText={(val) => updateTravelerInfo(idx, 'aadhar', val.replace(/[^\d]/g, '').slice(0, 12))}
                            placeholder="12-digit Aadhaar Card number"
                            placeholderTextColor="#94A3B8"
                            keyboardType="number-pad"
                            maxLength={12}
                          />

                          {/* Mobile Number */}
                          <Text style={{ fontSize: 11, fontWeight: '700', color: colors.subtext, marginBottom: 4 }}>
                            MOBILE NUMBER (10 DIGITS) *
                          </Text>
                          <TextInput
                            style={[
                              styles.customTextInput,
                              {
                                backgroundColor: isLight ? '#F8FAFC' : 'rgba(255,255,255,0.06)',
                                color: colors.text,
                                borderColor: isLight ? '#CBD5E1' : colors.cardBorder,
                              },
                            ]}
                            value={trv.phone}
                            onChangeText={(val) => updateTravelerInfo(idx, 'phone', val.replace(/[^\d]/g, '').slice(0, 10))}
                            placeholder="10-digit mobile number"
                            placeholderTextColor="#94A3B8"
                            keyboardType="phone-pad"
                            maxLength={10}
                          />
                        </View>
                      ))}

                      {/* + ADD ANOTHER GUEST BUTTON */}
                      <TouchableOpacity
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderWidth: 1.5,
                          borderStyle: 'dashed',
                          borderColor: '#F5B800',
                          backgroundColor: isLight ? 'rgba(245, 184, 0, 0.08)' : 'rgba(245, 184, 0, 0.12)',
                          borderRadius: 12,
                          paddingVertical: 12,
                          marginTop: 4,
                          marginBottom: 16,
                        }}
                        onPress={handleAddGuest}
                        activeOpacity={0.8}
                      >
                        <Icons.UserPlus color="#F5B800" size={16} />
                        <Text style={{ fontSize: 13, fontWeight: '800', color: '#F5B800', marginLeft: 8 }}>
                          + Add Another Guest (Person {travelerList.length + 1})
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* --- DATE & TIME APPOINTMENT SCHEDULE (ONLY FOR NON-TRAVEL SERVICES) --- */}
                  {getEffectiveCategory(schedulingItem) !== 'Travel' && (
                    <>
                      {/* Section Header */}
                      <View style={{ marginBottom: 12, marginTop: 4 }}>
                        <Text style={[styles.schedulerSectionTitle, { color: colors.text, marginBottom: 2, marginTop: 0 }]}>
                          APPOINTMENT SCHEDULE
                        </Text>
                        <Text style={{ fontSize: 12, color: isLight ? '#64748B' : '#94A3B8' }}>
                          Choose your preferred doorstep visit date and time slot
                        </Text>
                      </View>

                      {/* 1. Interactive Date Selection Card (Tapping opens Calendar modal) */}
                      <TouchableOpacity
                        activeOpacity={0.85}
                        onPress={openSrvDatePicker}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          backgroundColor: isLight ? '#FFFFFF' : 'rgba(255, 255, 255, 0.05)',
                          borderWidth: 1.5,
                          borderColor: isLight ? '#FDE68A' : 'rgba(245, 184, 0, 0.35)',
                          borderRadius: 16,
                          padding: 14,
                          marginBottom: 12,
                          gap: 12,
                          shadowColor: '#F5B800',
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: 0.08,
                          shadowRadius: 6,
                          elevation: 2,
                        }}
                      >
                        <View
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: 22,
                            backgroundColor: '#F5B800',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Icons.Calendar color="#0F172A" size={22} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 10.5, fontWeight: '800', color: isLight ? '#92400E' : '#FCD34D', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            Selected Service Date
                          </Text>
                          <Text style={{ fontSize: 16, fontWeight: '900', color: colors.text, marginTop: 2 }}>
                            {selectedDateObj ? selectedDateObj.fullDateStr : 'Wed, 7 Oct 2026'}
                          </Text>
                          <Text style={{ fontSize: 11, color: isLight ? '#64748B' : '#94A3B8', marginTop: 2 }}>
                            Tap to open calendar
                          </Text>
                        </View>
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            backgroundColor: isLight ? '#FEF3C7' : 'rgba(245, 184, 0, 0.2)',
                            paddingHorizontal: 10,
                            paddingVertical: 7,
                            borderRadius: 10,
                            gap: 4,
                          }}
                        >
                          <Text style={{ fontSize: 11.5, fontWeight: '800', color: isLight ? '#92400E' : '#FCD34D' }}>Calendar</Text>
                          <Icons.ChevronRight size={14} color={isLight ? '#92400E' : '#FCD34D'} />
                        </View>
                      </TouchableOpacity>

                      {/* 2. Interactive Time Selection Card (Tapping opens Rotatable Clock modal) */}
                      <TouchableOpacity
                        activeOpacity={0.85}
                        onPress={openSrvTimePicker}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          backgroundColor: isLight ? '#FFFFFF' : 'rgba(255, 255, 255, 0.05)',
                          borderWidth: 1.5,
                          borderColor: isLight ? '#FDE68A' : 'rgba(245, 184, 0, 0.35)',
                          borderRadius: 16,
                          padding: 14,
                          marginBottom: 12,
                          gap: 12,
                          shadowColor: '#F5B800',
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: 0.08,
                          shadowRadius: 6,
                          elevation: 2,
                        }}
                      >
                        <View
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: 22,
                            backgroundColor: '#F5B800',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Icons.Clock color="#0F172A" size={22} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 10.5, fontWeight: '800', color: isLight ? '#92400E' : '#FCD34D', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            Selected Service Time
                          </Text>
                          <Text style={{ fontSize: 16, fontWeight: '900', color: colors.text, marginTop: 2 }}>
                            {selectedSlotObj ? selectedSlotObj.time : '09:00 AM'}
                          </Text>
                          <Text style={{ fontSize: 11, color: isLight ? '#64748B' : '#94A3B8', marginTop: 2 }}>
                            Tap to rotate clock hands
                          </Text>
                        </View>
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            backgroundColor: isLight ? '#FEF3C7' : 'rgba(245, 184, 0, 0.2)',
                            paddingHorizontal: 10,
                            paddingVertical: 7,
                            borderRadius: 10,
                            gap: 4,
                          }}
                        >
                          <Text style={{ fontSize: 11.5, fontWeight: '800', color: isLight ? '#92400E' : '#FCD34D' }}>Rotate Clock</Text>
                          <Icons.ChevronRight size={14} color={isLight ? '#92400E' : '#FCD34D'} />
                        </View>
                      </TouchableOpacity>

                      {/* 3. Schedule Guarantee & Doorstep Banner */}
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          backgroundColor: isLight ? '#FFFBEB' : 'rgba(245, 184, 0, 0.08)',
                          borderWidth: 1,
                          borderColor: isLight ? '#FDE68A' : 'rgba(245, 184, 0, 0.25)',
                          borderRadius: 12,
                          padding: 10,
                          marginBottom: 14,
                          gap: 8,
                        }}
                      >
                        <Icons.Sparkles color="#D97706" size={16} />
                        <Text style={{ flex: 1, fontSize: 11.5, color: isLight ? '#92400E' : '#FCD34D', fontWeight: '700' }}>
                          Doorstep expert arrives in this selected slot • Free cancellation up to 2 hrs prior
                        </Text>
                      </View>
                    </>
                  )}

                  {/* --- LIVE BOOKING SUMMARY CARD --- */}
                  <View style={[styles.bookingSummaryCard, { backgroundColor: isLight ? '#FEF9E7' : 'rgba(245, 184, 0, 0.08)', borderColor: isLight ? '#FDE68A' : 'rgba(245, 184, 0, 0.3)' }]}>
                    <View style={styles.summaryRow}>
                      {getEffectiveCategory(schedulingItem) === 'Travel' ? (
                        <Icons.Bus color="#D97706" size={14} />
                      ) : (
                        <Icons.Calendar color="#D97706" size={14} />
                      )}
                      <Text style={[styles.summaryLabel, { color: isLight ? '#0F172A' : '#FFF' }]}>
                        {getEffectiveCategory(schedulingItem) === 'Travel'
                          ? `${schedulingItem?.from || routeParams.from || 'Bangalore'} ➔ ${schedulingItem?.to || routeParams.to || 'Chennai'} • ${routeParams.journeyDate || 'Today'} • ${getCalculatedServicePrice(schedulingItem).priceStr}`
                          : `${selectedDateObj ? selectedDateObj.fullDateStr : 'Select Date'} • ${selectedSlotObj ? selectedSlotObj.time : 'Select Slot'} • ${getCalculatedServicePrice(schedulingItem).priceStr}`}
                      </Text>
                    </View>
                    <View style={styles.summaryRow}>
                      <Icons.ShieldCheck color="#10B981" size={14} />
                      <Text style={[styles.summarySubText, { color: isLight ? '#475569' : 'rgba(255,255,255,0.7)' }]}>
                        {getEffectiveCategory(schedulingItem) === 'Travel'
                          ? `Departure: ${schedulingItem?.departureTime || 'Direct Express'} • ${travelerList.length} ${travelerList.length === 1 ? 'Guest' : 'Guests'} • Free cancellation up to 2 hrs before`
                          : `${getCalculatedServicePrice(schedulingItem).packageLabel ? `${getCalculatedServicePrice(schedulingItem).packageLabel} • ` : ''}Free cancellation up to 2 hrs before`}
                      </Text>
                    </View>
                  </View>
                </ScrollView>

                {/* Confirm CTA */}
                <View style={[styles.schedulerFooter, { borderTopColor: isLight ? '#F1EAD8' : 'rgba(255, 255, 255, 0.08)' }]}>
                  {getEffectiveCategory(schedulingItem) === 'Travel' ? (
                    <TouchableOpacity
                      style={styles.confirmBookingBtn}
                      activeOpacity={0.88}
                      onPress={() => {
                        // Validate Guest Details
                        const targetCount = travelerList.length;
                        for (let i = 0; i < targetCount; i++) {
                          const trv = travelerList[i];
                          if (!trv || !trv.name || trv.name.trim().length < 2) {
                            Alert.alert('Missing Name', `Please enter full name for Person ${i + 1}.`);
                            return;
                          }
                          if (!trv.aadhar || trv.aadhar.replace(/[^\d]/g, '').length !== 12) {
                            Alert.alert('Validation Error', `Please enter a valid 12-digit Aadhaar Card Number for Person ${i + 1} (${trv.name || 'Person ' + (i + 1)}).`);
                            return;
                          }
                          if (!trv.phone || trv.phone.replace(/[^\d]/g, '').length !== 10) {
                            Alert.alert('Validation Error', `Please enter a valid 10-digit Mobile Number for Person ${i + 1} (${trv.name || 'Person ' + (i + 1)}).`);
                            return;
                          }
                        }
                        if (!selectedBoardingPoint) {
                          setSelectedBoardingPoint(schedulingItem?.boardingPoints?.[0] || `${schedulingItem?.from || 'Bangalore'} Central Station (10:15 PM)`);
                        }
                        if (!selectedDroppingPoint) {
                          setSelectedDroppingPoint(schedulingItem?.droppingPoints?.[0] || `${schedulingItem?.to || 'Chennai'} CMBT Bus Stand (06:00 AM)`);
                        }
                        setTravelBookingStep('BOARDING_DROPPING');
                      }}
                    >
                      <Text style={styles.confirmBookingBtnText}>
                        Select Boarding & Dropping Points ➔
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}>
                      <TouchableOpacity
                        disabled={!selectedDateObj || !selectedSlotObj}
                        style={[
                          styles.confirmBookingBtn,
                          { flex: 1, backgroundColor: 'transparent', borderWidth: 1.5, borderColor: '#FF6A00' },
                          (!selectedDateObj || !selectedSlotObj) && { opacity: 0.5 },
                        ]}
                        onPress={handleAddToCartFromScheduler}
                      >
                        <Text style={[styles.confirmBookingBtnText, { color: '#FF6A00' }]}>
                          Add to Cart
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        disabled={!selectedDateObj || !selectedSlotObj}
                        style={[
                          styles.confirmBookingBtn,
                          { flex: 1.3 },
                          (!selectedDateObj || !selectedSlotObj) && styles.disabledConfirmBtn,
                        ]}
                        onPress={handleConfirmBooking}
                      >
                        <Text style={styles.confirmBookingBtnText}>
                          {!selectedDateObj
                            ? 'Select Date'
                            : !selectedSlotObj
                            ? 'Select Slot'
                            : getConfirmCtaLabel(schedulingItem)}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* ========================================================================= */}
      {/* --- SERVICE SCHEDULER: INTERACTIVE CALENDAR MODAL --- */}
      {/* ========================================================================= */}
      <Modal
        visible={srvDatePickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSrvDatePickerVisible(false)}
      >
        <View style={styles.srvPickerBackdrop}>
          <View style={styles.srvCalendarCard}>
            {/* Header */}
            <View style={styles.srvPickerHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={[styles.srvStatusDot, { backgroundColor: '#F5B800' }]} />
                <Text style={styles.srvPickerHeaderTitle}>Select Service Date</Text>
              </View>
              <TouchableOpacity
                onPress={() => setSrvDatePickerVisible(false)}
                style={styles.srvPickerCloseBtn}
              >
                <Icons.X color="#64748B" size={18} />
              </TouchableOpacity>
            </View>

            {/* Selected Preview Bar */}
            <View style={styles.srvCalendarPreviewBar}>
              <Icons.Calendar color="#B45309" size={16} />
              <Text style={styles.srvCalendarPreviewText}>
                {selectedDateObj ? selectedDateObj.fullDateStr : 'Please pick an appointment date'}
              </Text>
            </View>

            {/* Calendar Month Navigation Header */}
            <View style={styles.srvCalendarMonthNavRow}>
              <TouchableOpacity
                style={styles.srvCalendarNavBtn}
                onPress={handleSrvPrevMonth}
                activeOpacity={0.7}
              >
                <Icons.ChevronLeft color="#0F172A" size={18} />
              </TouchableOpacity>
              <Text style={styles.srvCalendarMonthTitle}>
                {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][srvCalendarMonth]} {srvCalendarYear}
              </Text>
              <TouchableOpacity
                style={styles.srvCalendarNavBtn}
                onPress={handleSrvNextMonth}
                activeOpacity={0.7}
              >
                <Icons.ChevronRight color="#0F172A" size={18} />
              </TouchableOpacity>
            </View>

            {/* Weekday Row */}
            <View style={styles.srvCalendarWeekRow}>
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((w, idx) => (
                <View key={`srv_wk_${idx}`} style={styles.srvCalendarWeekCell}>
                  <Text style={styles.srvCalendarWeekText}>{w}</Text>
                </View>
              ))}
            </View>

            {/* Days Grid */}
            <View style={styles.srvCalendarGrid}>
              {srvCalendarDays.map((cell, idx) => {
                if (!cell.day || !cell.dateObj) {
                  return <View key={`srv_empty_${idx}`} style={styles.srvCalendarDayCell} />;
                }

                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const cellDate = new Date(cell.dateObj);
                cellDate.setHours(0, 0, 0, 0);

                const isPast = cellDate < today;
                const isSelected =
                  srvSelectedCalendarDate &&
                  cellDate.getDate() === srvSelectedCalendarDate.getDate() &&
                  cellDate.getMonth() === srvSelectedCalendarDate.getMonth() &&
                  cellDate.getFullYear() === srvSelectedCalendarDate.getFullYear();

                return (
                  <TouchableOpacity
                    key={`srv_day_${cell.day}_${idx}`}
                    style={styles.srvCalendarDayCell}
                    activeOpacity={0.75}
                    disabled={isPast}
                    onPress={() => handleSrvSelectDate(cell.dateObj!)}
                  >
                    <View
                      style={[
                        styles.srvCalendarDayCircle,
                        isSelected && styles.srvCalendarDayCircleSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.srvCalendarDayNum,
                          isPast && styles.srvCalendarDayNumPast,
                          isSelected && styles.srvCalendarDayNumSelected,
                        ]}
                      >
                        {cell.day}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Actions Row */}
            <View style={styles.srvPickerActionsRow}>
              <TouchableOpacity
                style={styles.srvPickerCancelBtn}
                onPress={() => setSrvDatePickerVisible(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.srvPickerCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.srvPickerConfirmBtn}
                onPress={() => setSrvDatePickerVisible(false)}
                activeOpacity={0.85}
              >
                <Text style={styles.srvPickerConfirmBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ========================================================================= */}
      {/* --- SERVICE SCHEDULER: ROUND ANALOG CLOCK MODAL (ROTATABLE CLOCK HAND) --- */}
      {/* ========================================================================= */}
      <Modal
        visible={srvTimePickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSrvTimePickerVisible(false)}
      >
        <View style={styles.srvPickerBackdrop}>
          <View style={styles.srvClockCard}>
            {/* Header */}
            <View style={styles.srvPickerHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={[styles.srvStatusDot, { backgroundColor: '#F5B800' }]} />
                <Text style={styles.srvPickerHeaderTitle}>Select Service Time</Text>
              </View>
              <TouchableOpacity
                onPress={() => setSrvTimePickerVisible(false)}
                style={styles.srvPickerCloseBtn}
              >
                <Icons.X color="#64748B" size={18} />
              </TouchableOpacity>
            </View>

            {/* Interactive Digital Header with Hour / Minute / AM-PM Selectors */}
            <View style={styles.srvClockPreview}>
              {/* Hour Box */}
              <TouchableOpacity
                style={[
                  styles.srvClockBox,
                  srvClockMode === 'hour' && styles.srvClockBoxActive,
                ]}
                activeOpacity={0.8}
                onPress={() => setSrvClockMode('hour')}
              >
                <Text style={styles.srvClockDigit}>{srvPickerHour}</Text>
                <Text
                  style={[
                    styles.srvClockSub,
                    srvClockMode === 'hour' && { color: '#B45309', fontWeight: '900' },
                  ]}
                >
                  HOUR
                </Text>
              </TouchableOpacity>

              <Text style={styles.srvClockColon}>:</Text>

              {/* Minute Box */}
              <TouchableOpacity
                style={[
                  styles.srvClockBox,
                  srvClockMode === 'minute' && styles.srvClockBoxActive,
                ]}
                activeOpacity={0.8}
                onPress={() => setSrvClockMode('minute')}
              >
                <Text style={styles.srvClockDigit}>{srvPickerMinute}</Text>
                <Text
                  style={[
                    styles.srvClockSub,
                    srvClockMode === 'minute' && { color: '#B45309', fontWeight: '900' },
                  ]}
                >
                  MIN
                </Text>
              </TouchableOpacity>

              {/* AM / PM Toggle Pills */}
              <View style={styles.srvPeriodToggleCol}>
                <TouchableOpacity
                  style={[
                    styles.srvPeriodToggleBtn,
                    srvPickerPeriod === 'AM' && styles.srvPeriodToggleBtnActive,
                  ]}
                  activeOpacity={0.8}
                  onPress={() => setSrvPickerPeriod('AM')}
                >
                  <Text
                    style={[
                      styles.srvPeriodToggleBtnText,
                      srvPickerPeriod === 'AM' && styles.srvPeriodToggleBtnTextActive,
                    ]}
                  >
                    AM
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.srvPeriodToggleBtn,
                    srvPickerPeriod === 'PM' && styles.srvPeriodToggleBtnActive,
                  ]}
                  activeOpacity={0.8}
                  onPress={() => setSrvPickerPeriod('PM')}
                >
                  <Text
                    style={[
                      styles.srvPeriodToggleBtnText,
                      srvPickerPeriod === 'PM' && styles.srvPeriodToggleBtnTextActive,
                    ]}
                  >
                    PM
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Mode Switcher Tabs */}
            <View style={styles.srvClockModeTabRow}>
              <TouchableOpacity
                style={[
                  styles.srvClockModeTab,
                  srvClockMode === 'hour' && styles.srvClockModeTabActive,
                ]}
                activeOpacity={0.8}
                onPress={() => setSrvClockMode('hour')}
              >
                <Text
                  style={[
                    styles.srvClockModeTabText,
                    srvClockMode === 'hour' && styles.srvClockModeTabTextActive,
                  ]}
                >
                  Pick Hour (1 - 12)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.srvClockModeTab,
                  srvClockMode === 'minute' && styles.srvClockModeTabActive,
                ]}
                activeOpacity={0.8}
                onPress={() => setSrvClockMode('minute')}
              >
                <Text
                  style={[
                    styles.srvClockModeTabText,
                    srvClockMode === 'minute' && styles.srvClockModeTabTextActive,
                  ]}
                >
                  Pick Minute (00 - 55)
                </Text>
              </TouchableOpacity>
            </View>

            {/* Sub-instruction label */}
            <Text style={styles.srvClockDialSubInstruction}>
              {srvClockMode === 'hour'
                ? 'Rotate the clock hand to select hour:'
                : 'Rotate the clock hand to select minute:'}
            </Text>

            {/* THE ROUND ANALOG CLOCK FACE WITH ROTATABLE CLOCK HAND */}
            <View style={styles.srvClockDialWrapper}>
              <View
                style={styles.srvClockDialCircle}
                {...srvClockPanResponder.panHandlers}
              >
                {/* Rotatable Clock Hand */}
                <View
                  pointerEvents="none"
                  style={[
                    styles.srvClockHandPivotWrap,
                    {
                      transform: [{ rotate: `${srvClockHandAngle}deg` }],
                    },
                  ]}
                >
                  {/* Hand Shaft */}
                  <View style={styles.srvClockHandShaft} />
                  {/* Hand Tip Knob */}
                  <View style={styles.srvClockHandTipKnob} />
                </View>

                {/* Center Pivot Pin */}
                <View pointerEvents="none" style={styles.srvClockCenterPin}>
                  <View style={styles.srvClockCenterPinDot} />
                </View>

                {/* 12 Numbers arranged radially at radius 86px */}
                {(srvClockMode === 'hour' ? SRV_CLOCK_HOURS_ITEMS : SRV_CLOCK_MINUTES_ITEMS).map((item, idx) => {
                  const isSelected =
                    srvClockMode === 'hour'
                      ? srvPickerHour === item.val || parseInt(srvPickerHour, 10) === parseInt(item.val, 10)
                      : srvPickerMinute === item.val || parseInt(srvPickerMinute, 10) === parseInt(item.val, 10);

                  const angleRad = (idx * 30 - 90) * (Math.PI / 180);
                  const posX = 125 + 86 * Math.cos(angleRad) - 18;
                  const posY = 125 + 86 * Math.sin(angleRad) - 18;

                  return (
                    <View
                      key={`srv_dial_node_${srvClockMode}_${item.val}`}
                      style={[
                        styles.srvClockDialNumberPill,
                        { left: posX, top: posY },
                      ]}
                      pointerEvents="none"
                    >
                      <Text
                        style={[
                          styles.srvClockDialNumberText,
                          isSelected && styles.srvClockDialNumberTextSelected,
                        ]}
                      >
                        {item.label}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.srvPickerActionsRow}>
              <TouchableOpacity
                style={styles.srvPickerCancelBtn}
                onPress={() => setSrvTimePickerVisible(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.srvPickerCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.srvPickerConfirmBtn}
                onPress={handleConfirmSrvTime}
                activeOpacity={0.85}
              >
                <Text style={styles.srvPickerConfirmBtnText}>
                  Set Time ({srvPickerHour}:{srvPickerMinute} {srvPickerPeriod})
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* --- STAY MODULE DYNAMIC MODALS --- */}
      {/* 1. Dynamic City & Location Search Modal (Screenshot 2) */}
      <Modal visible={isDestModalOpen} animationType="slide" onRequestClose={() => setIsDestModalOpen(false)}>
        <SafeAreaView style={[styles.destModalContainer, { backgroundColor: isLight ? '#FFFFFF' : colors.cardBg }]} edges={['top', 'bottom']}>
          {/* Header with Back Arrow and Search Input */}
          <View style={styles.destModalHeader}>
            <TouchableOpacity
              style={styles.destModalBackBtn}
              onPress={() => {
                setDestSearchQuery('');
                setIsDestModalOpen(false);
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Icons.ArrowLeft color={colors.text} size={22} />
            </TouchableOpacity>

            <View style={[styles.destSearchInputWrapper, { backgroundColor: isLight ? '#F1F5F9' : 'rgba(255,255,255,0.08)' }]}>
              <TextInput
                style={[styles.destSearchTextInput, { color: colors.text }]}
                placeholder="City, area or hotel name"
                placeholderTextColor={isLight ? '#94A3B8' : '#64748B'}
                value={destSearchQuery}
                onChangeText={setDestSearchQuery}
                autoFocus
                autoCorrect={false}
              />
              {destSearchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setDestSearchQuery('')} style={{ padding: 4 }}>
                  <Icons.X color={isLight ? '#64748B' : '#94A3B8'} size={18} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {destSearchQuery.trim().length > 0 ? (
              /* Live Search Results matching text input */
              <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
                <Text style={styles.destSectionHeaderTitle}>SEARCH RESULTS ({filteredDestinationResults.length})</Text>
                {filteredDestinationResults.length > 0 ? (
                  filteredDestinationResults.map((item, idx) => (
                    <TouchableOpacity
                      key={`${item.title}-${idx}`}
                      style={[styles.destResultRow, { borderBottomColor: isLight ? '#F1F5F9' : 'rgba(255,255,255,0.06)' }]}
                      activeOpacity={0.7}
                      onPress={() => {
                        setSelectedDestination(item.title);
                        if (item.type === 'hotel') {
                          setSearchQuery(item.title);
                        } else {
                          setSearchQuery('');
                        }
                        setDestSearchQuery('');
                        setIsDestModalOpen(false);
                      }}
                    >
                      <View style={[styles.destIconBox, item.type === 'hotel' && { backgroundColor: '#FEE2E2' }]}>
                        {item.type === 'hotel' ? (
                          <Icons.Hotel color="#E11D48" size={20} />
                        ) : (
                          <Icons.Building2 color="#475569" size={20} />
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.destResultTitle, { color: colors.text }]}>{item.title}</Text>
                        <Text style={styles.destResultSub}>{item.subtitle}</Text>
                      </View>
                      <Icons.ChevronRight color="#94A3B8" size={18} />
                    </TouchableOpacity>
                  ))
                ) : (
                  <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                    <Icons.Search color="#94A3B8" size={32} />
                    <Text style={{ marginTop: 12, color: colors.text, fontSize: 15, fontWeight: '700' }}>No places found</Text>
                    <Text style={{ color: '#64748B', fontSize: 13, marginTop: 4 }}>Try searching for a different city or hotel name</Text>
                  </View>
                )}
              </View>
            ) : (
              /* Default Options Matching Screenshot 2 */
              <View style={{ paddingHorizontal: 16 }}>
                {/* 1. Near Me */}
                <TouchableOpacity
                  style={[styles.destFeaturedRow, { borderBottomColor: isLight ? '#F1F5F9' : 'rgba(255,255,255,0.06)' }]}
                  activeOpacity={0.7}
                  onPress={() => {
                    setSelectedDestination('Near me');
                    setSearchQuery('');
                    setIsDestModalOpen(false);
                  }}
                >
                  <View style={styles.destIconBox}>
                    <Icons.Navigation color="#0F172A" size={22} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.destFeaturedTitle, { color: colors.text }]}>Near me</Text>
                    <Text style={styles.destFeaturedSub}>Properties near your current location</Text>
                  </View>
                </TouchableOpacity>

                {/* 2. Hotels near Your preferred drop point: Jntu, Hyderabad */}
                <TouchableOpacity
                  style={[styles.destFeaturedRow, { borderBottomColor: isLight ? '#F1F5F9' : 'rgba(255,255,255,0.06)' }]}
                  activeOpacity={0.7}
                  onPress={() => {
                    setSelectedDestination('Jntu, Hyderabad');
                    setSearchQuery('');
                    setIsDestModalOpen(false);
                  }}
                >
                  <View style={styles.destIconBox}>
                    <Icons.Building2 color="#0F172A" size={22} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                      <Text style={styles.destDropPointLabel}>Hotels near </Text>
                      <View style={styles.destDropPointPill}>
                        <Text style={styles.destDropPointPillText}>Your preferred drop point</Text>
                      </View>
                    </View>
                    <Text style={[styles.destFeaturedTitle, { color: colors.text }]}>Jntu, Hyderabad</Text>
                  </View>
                  <Icons.ChevronRight color="#0F172A" size={18} />
                </TouchableOpacity>

                {/* Recent Searches Header */}
                <View style={styles.destSectionHeader}>
                  <Text style={[styles.destSectionTitle, { color: colors.text }]}>Recent Searches</Text>
                </View>

                {/* Recent item: Jntu, Hyderabad Landmark */}
                <TouchableOpacity
                  style={[styles.destRecentRow, { borderBottomColor: isLight ? '#F1F5F9' : 'rgba(255,255,255,0.06)' }]}
                  activeOpacity={0.7}
                  onPress={() => {
                    setSelectedDestination('Jntu, Hyderabad');
                    setSearchQuery('');
                    setIsDestModalOpen(false);
                  }}
                >
                  <Icons.Clock color="#0F172A" size={20} style={{ marginRight: 14 }} />
                  <Text style={[styles.destRecentTitle, { color: colors.text }]}>Jntu, Hyderabad</Text>
                  <Text style={styles.destRecentTag}>Landmark</Text>
                </TouchableOpacity>

                {/* Popular Cities Header */}
                <View style={styles.destSectionHeader}>
                  <Text style={[styles.destSectionTitle, { color: colors.text }]}>Popular Cities</Text>
                </View>

                {/* Popular Cities List */}
                {['Bangalore', 'Mumbai', 'Chennai', 'Goa', 'Ooty', 'Hyderabad', 'Delhi', 'Jaipur', 'Coimbatore', 'Kodaikanal'].map((city) => (
                  <TouchableOpacity
                    key={city}
                    style={[styles.destPopularRow, { borderBottomColor: isLight ? '#F1F5F9' : 'rgba(255,255,255,0.06)' }]}
                    activeOpacity={0.7}
                    onPress={() => {
                      setSelectedDestination(city);
                      setSearchQuery('');
                      setIsDestModalOpen(false);
                    }}
                  >
                    <View style={styles.destIconBox}>
                      <Icons.Building2 color="#0F172A" size={20} />
                    </View>
                    <Text style={[styles.destPopularTitle, { color: colors.text }]}>{city}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* 2. Dynamic Calendar Range Picker Modal (Screenshot 3) */}
      <Modal visible={isCalendarModalOpen} transparent animationType="slide" onRequestClose={() => setIsCalendarModalOpen(false)}>
        <View style={styles.calendarModalBackdrop}>
          <View style={[styles.calendarModalSheet, { backgroundColor: isLight ? '#FFFFFF' : colors.cardBg }]}>
            {/* Header: Select dates and Close button */}
            <View style={styles.calendarHeaderRow}>
              <Text style={[styles.calendarTitle, { color: colors.text }]}>Select dates</Text>
              <TouchableOpacity
                onPress={() => setIsCalendarModalOpen(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Icons.X color={colors.text} size={22} />
              </TouchableOpacity>
            </View>

            {/* Offer Banner: Lowest Fare or 5x refund */}
            <View style={styles.calendarOfferBanner}>
              <View style={styles.calendarPriceTagBadge}>
                <Text style={styles.calendarPriceTagText}>LOWEST{"\n"}FARE</Text>
              </View>
              <Text style={styles.calendarOfferText}>Lowest Fare or 5x refund</Text>
            </View>

            {/* Weekdays Row: Mon Tue Wed Thu Fri Sat Sun (Monday First) */}
            <View style={styles.calendarWeekdaysRow}>
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                <Text key={day} style={styles.calendarWeekdayText}>{day}</Text>
              ))}
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 380 }}>
              {/* Month Header with navigation */}
              <View style={styles.calendarMonthHeaderRow}>
                <View>
                  <Text style={[styles.calendarMonthTitle, { color: colors.text }]}>
                    {new Date(calendarYear, calendarMonth).toLocaleString('default', { month: 'long', year: 'numeric' })}
                  </Text>
                  {calendarMonth === 9 && calendarYear === 2026 && (
                    <Text style={styles.calendarHolidaysSubtitle}>2 Holidays</Text>
                  )}
                </View>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <TouchableOpacity
                    onPress={() => {
                      if (calendarMonth === 0) {
                        setCalendarMonth(11);
                        setCalendarYear((y) => y - 1);
                      } else {
                        setCalendarMonth((m) => m - 1);
                      }
                    }}
                    style={styles.calendarMonthNavBtn}
                  >
                    <Icons.ChevronLeft color={colors.text} size={20} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      if (calendarMonth === 11) {
                        setCalendarMonth(0);
                        setCalendarYear((y) => y + 1);
                      } else {
                        setCalendarMonth((m) => m + 1);
                      }
                    }}
                    style={styles.calendarMonthNavBtn}
                  >
                    <Icons.ChevronRight color={colors.text} size={20} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Special Long Weekend Badge if October 2026 */}
              {calendarMonth === 9 && calendarYear === 2026 && (
                <View style={styles.calendarLongWeekendBannerContainer}>
                  <View style={styles.calendarLongWeekendTag}>
                    <Text style={styles.calendarLongWeekendTagText}>Long Weekend</Text>
                  </View>
                </View>
              )}

              {/* Days Grid */}
              <View style={styles.calendarDaysGrid}>
                {/* Blank Offset Cells (Monday first) */}
                {Array.from({ length: (new Date(calendarYear, calendarMonth, 1).getDay() + 6) % 7 }).map((_, idx) => (
                  <View key={`empty-${idx}`} style={styles.calendarDayCell} />
                ))}

                {/* Day Cells */}
                {Array.from({ length: new Date(calendarYear, calendarMonth + 1, 0).getDate() }, (_, i) => i + 1).map((dayNum) => {
                  const dayDate = new Date(calendarYear, calendarMonth, dayNum);
                  const isPast = dayDate.getTime() < new Date(2026, 9, 1).getTime();

                  const isStart = tempCheckInDate &&
                    dayDate.getFullYear() === tempCheckInDate.getFullYear() &&
                    dayDate.getMonth() === tempCheckInDate.getMonth() &&
                    dayDate.getDate() === tempCheckInDate.getDate();

                  const isEnd = tempCheckOutDate &&
                    dayDate.getFullYear() === tempCheckOutDate.getFullYear() &&
                    dayDate.getMonth() === tempCheckOutDate.getMonth() &&
                    dayDate.getDate() === tempCheckOutDate.getDate();

                  const isInBetween = tempCheckInDate && tempCheckOutDate &&
                    dayDate.getTime() > tempCheckInDate.getTime() &&
                    dayDate.getTime() < tempCheckOutDate.getTime();

                  const isSelectedRange = isStart || isEnd || isInBetween;

                  const isOct2 = calendarMonth === 9 && calendarYear === 2026 && dayNum === 2;
                  const isOct20 = calendarMonth === 9 && calendarYear === 2026 && dayNum === 20;
                  const isLongWeekendDay = calendarMonth === 9 && calendarYear === 2026 && (dayNum >= 2 && dayNum <= 4);
                  const dayOfWeek = (dayDate.getDay() + 6) % 7;
                  const isWeekendDay = dayOfWeek === 5 || dayOfWeek === 6;

                  return (
                    <TouchableOpacity
                      key={`day-${dayNum}`}
                      style={[
                        styles.calendarDayCell,
                        isLongWeekendDay && !isSelectedRange && styles.calendarDayCellLongWeekend,
                        isInBetween && styles.calendarDayCellRangeBetween,
                        isStart && styles.calendarDayCellRangeStart,
                        isEnd && styles.calendarDayCellRangeEnd,
                      ]}
                      disabled={isPast}
                      activeOpacity={0.7}
                      onPress={() => {
                        const clicked = new Date(calendarYear, calendarMonth, dayNum);
                        if (!tempCheckInDate || (tempCheckInDate && tempCheckOutDate)) {
                          setTempCheckInDate(clicked);
                          setTempCheckOutDate(null as any);
                        } else {
                          if (clicked.getTime() < tempCheckInDate.getTime()) {
                            setTempCheckInDate(clicked);
                          } else if (clicked.getTime() === tempCheckInDate.getTime()) {
                            const next = new Date(clicked);
                            next.setDate(next.getDate() + 1);
                            setTempCheckOutDate(next);
                          } else {
                            setTempCheckOutDate(clicked);
                          }
                        }
                      }}
                    >
                      {isOct2 && !isSelectedRange && (
                        <View style={styles.holidayAvatarSmall}>
                          <Text style={{ fontSize: 9 }}>🕊️</Text>
                        </View>
                      )}
                      {isOct20 && !isSelectedRange && (
                        <View style={styles.holidayAvatarSmall}>
                          <Text style={{ fontSize: 9 }}>🏹</Text>
                        </View>
                      )}

                      <View
                        style={[
                          styles.calendarDayCircle,
                          (isStart || isEnd) && styles.calendarDayCircleSelected,
                          dayNum === 5 && !isSelectedRange && styles.calendarDayCircleCurrent,
                        ]}
                      >
                        <Text
                          style={[
                            styles.calendarDayNumText,
                            (isStart || isEnd || isInBetween) && styles.calendarDayNumTextSelected,
                            !isSelectedRange && isWeekendDay && { color: '#E11D48' },
                            isPast && { color: '#CBD5E1' },
                          ]}
                        >
                          {dayNum}
                        </Text>
                      </View>

                      {isOct2 && (
                        <Text style={styles.holidayNameText} numberOfLines={1}>Gandhi...</Text>
                      )}
                      {isOct20 && (
                        <Text style={styles.holidayNameText} numberOfLines={1}>Dusseha...</Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            {/* Bottom Summary Cards: Check-in, nights arrow, Check-out */}
            <View style={styles.calendarSummaryRow}>
              <View style={styles.calendarSummaryBox}>
                <Text style={styles.calendarSummaryBoxLabel}>Check in</Text>
                <Text style={styles.calendarSummaryBoxValue}>{formatStayDateDisplay(tempCheckInDate)}</Text>
              </View>

              <View style={styles.calendarSummaryArrowCol}>
                <Icons.ArrowRight color="#0F172A" size={18} />
                <Text style={styles.calendarSummaryNightsText}>
                  {tempCalculatedNights} {tempCalculatedNights === 1 ? 'night' : 'nights'}
                </Text>
              </View>

              <View style={styles.calendarSummaryBox}>
                <Text style={styles.calendarSummaryBoxLabel}>Check out</Text>
                <Text style={styles.calendarSummaryBoxValue}>
                  {formatStayDateDisplay(tempCheckOutDate || new Date(tempCheckInDate.getTime() + 86400000))}
                </Text>
              </View>
            </View>

            {/* Action Button: Select dates */}
            <TouchableOpacity
              style={styles.calendarSelectDatesBtn}
              activeOpacity={0.88}
              onPress={() => {
                const effOut = tempCheckOutDate || new Date(tempCheckInDate.getTime() + 86400000);
                setCheckInDateObj(new Date(tempCheckInDate));
                setCheckOutDateObj(new Date(effOut));
                setIsCalendarModalOpen(false);
              }}
            >
              <Text style={styles.calendarSelectDatesBtnText}>Select dates</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 3. Dynamic Rooms & Guests Stepper Modal (Screenshot 4) */}
      <Modal visible={isGuestModalOpen} transparent animationType="slide" onRequestClose={() => setIsGuestModalOpen(false)}>
        <View style={styles.guestModalBackdrop}>
          <View style={[styles.guestModalSheet, { backgroundColor: isLight ? '#FFFFFF' : colors.cardBg }]}>
            {/* Header */}
            <View style={styles.guestModalHeader}>
              <Text style={[styles.guestModalTitle, { color: colors.text }]}>Select rooms & guests</Text>
              <TouchableOpacity
                onPress={() => setIsGuestModalOpen(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Icons.X color={colors.text} size={22} />
              </TouchableOpacity>
            </View>

            <View style={{ gap: 20, marginVertical: 20 }}>
              {/* Row 1: Rooms */}
              <View style={styles.guestItemRow}>
                <View style={styles.guestIconBox}>
                  <Icons.DoorClosed color="#0F172A" size={24} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.guestItemTitle, { color: colors.text }]}>Rooms</Text>
                </View>
                <View style={styles.guestStepperContainer}>
                  <TouchableOpacity
                    style={[styles.guestStepBtn, tempRooms === 1 && styles.guestStepBtnDisabled]}
                    onPress={() => setTempRooms((r: number) => Math.max(1, r - 1))}
                    disabled={tempRooms <= 1}
                  >
                    {tempRooms === 1 ? (
                      <Icons.Trash2 color="#94A3B8" size={18} />
                    ) : (
                      <Icons.Minus color="#0F172A" size={18} />
                    )}
                  </TouchableOpacity>
                  <Text style={[styles.guestStepVal, { color: colors.text }]}>{tempRooms}</Text>
                  <TouchableOpacity
                    style={[styles.guestStepBtn, styles.guestStepBtnPlus]}
                    onPress={() => setTempRooms((r: number) => Math.min(10, r + 1))}
                  >
                    <Icons.Plus color="#0F172A" size={18} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Row 2: Adults */}
              <View style={styles.guestItemRow}>
                <View style={styles.guestIconBox}>
                  <Icons.Users color="#0F172A" size={24} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.guestItemTitle, { color: colors.text }]}>Adults</Text>
                  <Text style={styles.guestItemSub}>18 years & above</Text>
                </View>
                <View style={styles.guestStepperContainer}>
                  <TouchableOpacity
                    style={[styles.guestStepBtn, tempAdults === 1 && styles.guestStepBtnDisabled]}
                    onPress={() => setTempAdults((a: number) => Math.max(1, a - 1))}
                    disabled={tempAdults <= 1}
                  >
                    {tempAdults === 1 ? (
                      <Icons.Trash2 color="#94A3B8" size={18} />
                    ) : (
                      <Icons.Minus color="#0F172A" size={18} />
                    )}
                  </TouchableOpacity>
                  <Text style={[styles.guestStepVal, { color: colors.text }]}>{tempAdults}</Text>
                  <TouchableOpacity
                    style={[styles.guestStepBtn, styles.guestStepBtnPlus]}
                    onPress={() => setTempAdults((a: number) => Math.min(20, a + 1))}
                  >
                    <Icons.Plus color="#0F172A" size={18} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Row 3: Children */}
              <View style={styles.guestItemRow}>
                <View style={styles.guestIconBox}>
                  <Icons.Smile color="#0F172A" size={24} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.guestItemTitle, { color: colors.text }]}>Children</Text>
                  <Text style={styles.guestItemSub}>0-17 years</Text>
                </View>

                {tempChildren === 0 ? (
                  <TouchableOpacity
                    style={styles.guestAddChildBtn}
                    activeOpacity={0.8}
                    onPress={() => setTempChildren(1)}
                  >
                    <Icons.Plus color="#0F172A" size={18} />
                    <Text style={styles.guestAddChildBtnText}>Add</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.guestStepperContainer}>
                    <TouchableOpacity
                      style={styles.guestStepBtn}
                      onPress={() => setTempChildren((c: number) => Math.max(0, c - 1))}
                    >
                      <Icons.Minus color="#0F172A" size={18} />
                    </TouchableOpacity>
                    <Text style={[styles.guestStepVal, { color: colors.text }]}>{tempChildren}</Text>
                    <TouchableOpacity
                      style={[styles.guestStepBtn, styles.guestStepBtnPlus]}
                      onPress={() => setTempChildren((c: number) => Math.min(10, c + 1))}
                    >
                      <Icons.Plus color="#0F172A" size={18} />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>

            {/* Proceed Action Button */}
            <TouchableOpacity
              style={styles.guestProceedBtn}
              activeOpacity={0.88}
              onPress={() => {
                setStayRooms(tempRooms);
                setStayAdults(tempAdults);
                setStayChildren(tempChildren);
                setIsGuestModalOpen(false);
              }}
            >
              <Text style={styles.guestProceedBtnText}>Proceed</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 4. Stay Filter Modal */}
      <Modal visible={isStayFilterOpen} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheetContainer, { backgroundColor: colors.cardBg, maxHeight: '88%', paddingHorizontal: 18, paddingTop: 12, paddingBottom: 20 }]}>
            <View style={styles.sheetDragHandle} />
            {/* Header */}
            <View style={[styles.modalSheetHeader, { borderBottomWidth: 1, borderBottomColor: isLight ? '#F1F5F9' : 'rgba(255,255,255,0.06)', paddingBottom: 12 }]}>
              <View>
                <Text style={[styles.modalSheetTitle, { color: colors.text, fontSize: 18, fontWeight: '900' }]}>Filter Stays</Text>
                <Text style={{ fontSize: 11.5, color: '#64748B', fontWeight: '600', marginTop: 2 }}>
                  {stayActiveFiltersCount > 0 ? `⚡ ${stayActiveFiltersCount} filter(s) active` : 'Select preferences to refine results'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsStayFilterOpen(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={{ padding: 4, borderRadius: 20, backgroundColor: isLight ? '#F1F5F9' : 'rgba(255,255,255,0.08)' }}
              >
                <Icons.X color={colors.text} size={18} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ marginVertical: 6 }}>
              {/* 1. PRICE PER NIGHT WITH VISUAL RANGE CARDS */}
              <View style={{ marginTop: 8 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={[styles.schedulerSectionTitle, { color: colors.text, marginBottom: 0 }]}>PRICE PER NIGHT</Text>
                  <Text style={{ fontSize: 11.5, fontWeight: '800', color: '#F5B800' }}>
                    {draftStayPriceRange === 'All' ? 'All Prices' : draftStayPriceRange}
                  </Text>
                </View>

                {/* Price Step Cards */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {[
                    { label: 'All', icon: '🏷️' },
                    { label: 'Under ₹3,500', icon: '💰' },
                    { label: '₹3,500 - ₹6,000', icon: '✨' },
                    { label: '₹6,000+', icon: '👑' },
                  ].map((prOpt) => {
                    const isSel = draftStayPriceRange === prOpt.label;
                    return (
                      <TouchableOpacity
                        key={prOpt.label}
                        style={{
                          backgroundColor: isSel ? '#F5B800' : isLight ? '#F8FAFC' : 'rgba(255,255,255,0.04)',
                          borderColor: isSel ? '#F5B800' : isLight ? '#E2E8F0' : 'rgba(255,255,255,0.08)',
                          borderWidth: 1.5,
                          borderRadius: 12,
                          paddingHorizontal: 12,
                          paddingVertical: 9,
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 6,
                        }}
                        activeOpacity={0.8}
                        onPress={() => setDraftStayPriceRange(prOpt.label)}
                      >
                        <Text style={{ fontSize: 12 }}>{prOpt.icon}</Text>
                        <Text style={{ fontSize: 12, fontWeight: isSel ? '900' : '600', color: isSel ? '#0F172A' : colors.text }}>
                          {prOpt.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* 2. PROPERTY TYPE */}
              <View style={{ marginTop: 16 }}>
                <Text style={[styles.schedulerSectionTitle, { color: colors.text, marginBottom: 8 }]}>PROPERTY TYPE</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {[
                    { type: 'Hotels', icon: '🏨' },
                    { type: 'Resorts', icon: '🌴' },
                    { type: 'Villas', icon: '🏡' },
                    { type: 'Homestays', icon: '🌅' },
                    { type: 'Apartments', icon: '🏢' },
                  ].map((item) => {
                    const isSel = draftStayPropTypes.includes(item.type);
                    return (
                      <TouchableOpacity
                        key={item.type}
                        style={{
                          backgroundColor: isSel ? '#FFFBEB' : isLight ? '#F8FAFC' : 'rgba(255,255,255,0.04)',
                          borderColor: isSel ? '#F5B800' : isLight ? '#E2E8F0' : 'rgba(255,255,255,0.08)',
                          borderWidth: 1.5,
                          borderRadius: 12,
                          paddingHorizontal: 12,
                          paddingVertical: 9,
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 6,
                        }}
                        activeOpacity={0.8}
                        onPress={() => {
                          if (isSel) {
                            setDraftStayPropTypes((prev) => prev.filter((p) => p !== item.type));
                          } else {
                            setDraftStayPropTypes((prev) => [...prev, item.type]);
                          }
                        }}
                      >
                        <View style={{
                          width: 16,
                          height: 16,
                          borderRadius: 4,
                          borderWidth: 1.5,
                          borderColor: isSel ? '#F5B800' : '#94A3B8',
                          backgroundColor: isSel ? '#F5B800' : 'transparent',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                          {isSel && <Icons.Check color="#0F172A" size={11} strokeWidth={3} />}
                        </View>
                        <Text style={{ fontSize: 12 }}>{item.icon}</Text>
                        <Text style={{ fontSize: 12, fontWeight: isSel ? '800' : '600', color: isSel ? '#0F172A' : colors.text }}>
                          {item.type}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* 3. STAR RATING */}
              <View style={{ marginTop: 16 }}>
                <Text style={[styles.schedulerSectionTitle, { color: colors.text, marginBottom: 8 }]}>STAR RATING</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {[
                    { star: 5, label: '5 Star ★★★★★' },
                    { star: 4, label: '4 Star ★★★★' },
                    { star: 3, label: '3 Star ★★★' },
                  ].map((stObj) => {
                    const isSel = draftStayStarRatings.includes(stObj.star);
                    return (
                      <TouchableOpacity
                        key={`star_${stObj.star}`}
                        style={{
                          backgroundColor: isSel ? '#FFFBEB' : isLight ? '#F8FAFC' : 'rgba(255,255,255,0.04)',
                          borderColor: isSel ? '#F5B800' : isLight ? '#E2E8F0' : 'rgba(255,255,255,0.08)',
                          borderWidth: 1.5,
                          borderRadius: 12,
                          paddingHorizontal: 12,
                          paddingVertical: 9,
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 6,
                        }}
                        activeOpacity={0.8}
                        onPress={() => {
                          if (isSel) {
                            setDraftStayStarRatings((prev) => prev.filter((s) => s !== stObj.star));
                          } else {
                            setDraftStayStarRatings((prev) => [...prev, stObj.star]);
                          }
                        }}
                      >
                        <Icons.Star color={isSel ? '#F5B800' : '#94A3B8'} size={13} fill={isSel ? '#F5B800' : 'transparent'} />
                        <Text style={{ fontSize: 12, fontWeight: isSel ? '800' : '600', color: isSel ? '#0F172A' : colors.text }}>
                          {stObj.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* 4. GUEST RATING */}
              <View style={{ marginTop: 16 }}>
                <Text style={[styles.schedulerSectionTitle, { color: colors.text, marginBottom: 8 }]}>GUEST RATING</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {[
                    { val: 4.8, label: '4.8+ Exceptional' },
                    { val: 4.5, label: '4.5+ Wonderful' },
                    { val: 4.0, label: '4.0+ Very Good' },
                  ].map((grObj) => {
                    const isSel = draftStayGuestRating === grObj.val;
                    return (
                      <TouchableOpacity
                        key={`gr_${grObj.val}`}
                        style={{
                          backgroundColor: isSel ? '#F5B800' : isLight ? '#F8FAFC' : 'rgba(255,255,255,0.04)',
                          borderColor: isSel ? '#F5B800' : isLight ? '#E2E8F0' : 'rgba(255,255,255,0.08)',
                          borderWidth: 1.5,
                          borderRadius: 12,
                          paddingHorizontal: 12,
                          paddingVertical: 9,
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 6,
                        }}
                        activeOpacity={0.8}
                        onPress={() => setDraftStayGuestRating(isSel ? null : grObj.val)}
                      >
                        <Text style={{ fontSize: 12, fontWeight: isSel ? '900' : '600', color: isSel ? '#0F172A' : colors.text }}>
                          {isSel ? '✓ ' : ''}{grObj.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* 5. AMENITIES */}
              <View style={{ marginTop: 16 }}>
                <Text style={[styles.schedulerSectionTitle, { color: colors.text, marginBottom: 8 }]}>AMENITIES</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {[
                    { amen: 'Pool', icon: '🏊' },
                    { amen: 'Free Wi-Fi', icon: '📶' },
                    { amen: 'Breakfast', icon: '🍳' },
                    { amen: 'Parking', icon: '🅿️' },
                    { amen: 'AC', icon: '❄️' },
                    { amen: 'Spa', icon: '💆' },
                    { amen: 'Gym', icon: '💪' },
                    { amen: 'Kitchen', icon: '🍳' },
                    { amen: 'Restaurant', icon: '🍽️' },
                  ].map((item) => {
                    const isSel = draftStayAmenities.includes(item.amen);
                    return (
                      <TouchableOpacity
                        key={item.amen}
                        style={{
                          backgroundColor: isSel ? '#FFFBEB' : isLight ? '#F8FAFC' : 'rgba(255,255,255,0.04)',
                          borderColor: isSel ? '#F5B800' : isLight ? '#E2E8F0' : 'rgba(255,255,255,0.08)',
                          borderWidth: 1.5,
                          borderRadius: 12,
                          paddingHorizontal: 11,
                          paddingVertical: 8,
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 5,
                        }}
                        activeOpacity={0.8}
                        onPress={() => {
                          if (isSel) {
                            setDraftStayAmenities((prev) => prev.filter((a) => a !== item.amen));
                          } else {
                            setDraftStayAmenities((prev) => [...prev, item.amen]);
                          }
                        }}
                      >
                        <Text style={{ fontSize: 11.5 }}>{item.icon}</Text>
                        <Text style={{ fontSize: 11.5, fontWeight: isSel ? '800' : '600', color: isSel ? '#0F172A' : colors.text }}>
                          {item.amen}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* 6. CANCELLATION POLICY */}
              <View style={{ marginTop: 16 }}>
                <Text style={[styles.schedulerSectionTitle, { color: colors.text, marginBottom: 8 }]}>CANCELLATION POLICY</Text>
                <TouchableOpacity
                  style={{
                    backgroundColor: draftFreeCancelOnly ? '#ECFDF5' : isLight ? '#F8FAFC' : 'rgba(255,255,255,0.04)',
                    borderColor: draftFreeCancelOnly ? '#10B981' : isLight ? '#E2E8F0' : 'rgba(255,255,255,0.08)',
                    borderWidth: 1.5,
                    borderRadius: 12,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                  activeOpacity={0.8}
                  onPress={() => setDraftFreeCancelOnly(!draftFreeCancelOnly)}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={{
                      width: 20,
                      height: 20,
                      borderRadius: 6,
                      borderWidth: 1.5,
                      borderColor: draftFreeCancelOnly ? '#10B981' : '#94A3B8',
                      backgroundColor: draftFreeCancelOnly ? '#10B981' : 'transparent',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      {draftFreeCancelOnly && <Icons.Check color="#FFFFFF" size={13} strokeWidth={3} />}
                    </View>
                    <Text style={{ fontSize: 13, fontWeight: draftFreeCancelOnly ? '800' : '600', color: colors.text }}>
                      Free Cancellation Only
                    </Text>
                  </View>
                  <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#10B981', backgroundColor: '#D1FAE5', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                    100% Refundable
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>

            {/* Bottom Actions Bar */}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 14, paddingTop: 10, borderTopWidth: 1, borderTopColor: isLight ? '#F1F5F9' : 'rgba(255,255,255,0.06)' }}>
              <TouchableOpacity
                style={[
                  styles.modalPrimaryBtn,
                  {
                    flex: 1,
                    backgroundColor: isLight ? '#F1F5F9' : 'rgba(255,255,255,0.1)',
                  },
                ]}
                activeOpacity={0.8}
                onPress={resetStayDraftFilters}
              >
                <Text style={[styles.modalPrimaryBtnText, { color: colors.text }]}>Reset</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalPrimaryBtn, { flex: 2.2 }]}
                activeOpacity={0.85}
                onPress={applyStayFilters}
              >
                <Text style={styles.modalPrimaryBtnText}>
                  Show {draftDisplayedStays.length} Stays
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Products Filter Modal */}
      <Modal visible={isProdFilterOpen} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheetContainer, { backgroundColor: colors.cardBg, maxHeight: '88%', paddingHorizontal: 18, paddingTop: 12, paddingBottom: 20 }]}>
            <View style={styles.sheetDragHandle} />
            {/* Header */}
            <View style={[styles.modalSheetHeader, { borderBottomWidth: 1, borderBottomColor: isLight ? '#F1F5F9' : 'rgba(255,255,255,0.06)', paddingBottom: 12 }]}>
              <View>
                <Text style={[styles.modalSheetTitle, { color: colors.text, fontSize: 18, fontWeight: '900' }]}>Filter Products</Text>
                <Text style={{ fontSize: 11.5, color: '#64748B', fontWeight: '600', marginTop: 2 }}>
                  {prodActiveFiltersCount > 0 ? `⚡ ${prodActiveFiltersCount} filter(s) active` : 'Select filters to refine product list'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsProdFilterOpen(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={{ padding: 4, borderRadius: 20, backgroundColor: isLight ? '#F1F5F9' : 'rgba(255,255,255,0.08)' }}
              >
                <Icons.X color={colors.text} size={18} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ marginVertical: 6 }}>
              {/* 0. SORT BY */}
              <View style={{ marginTop: 8 }}>
                <Text style={[styles.schedulerSectionTitle, { color: colors.text, marginBottom: 8 }]}>SORT BY</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {['Recommended', 'Price Low → High', 'Price High → Low', 'Rating High → Low', 'Discount High → Low'].map((sOpt) => {
                    const isSel = draftProdSort === sOpt;
                    return (
                      <TouchableOpacity
                        key={sOpt}
                        style={{
                          backgroundColor: isSel ? '#F5B800' : isLight ? '#F8FAFC' : 'rgba(255,255,255,0.04)',
                          borderColor: isSel ? '#F5B800' : isLight ? '#E2E8F0' : 'rgba(255,255,255,0.08)',
                          borderWidth: 1.5,
                          borderRadius: 12,
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                        }}
                        activeOpacity={0.8}
                        onPress={() => setDraftProdSort(sOpt)}
                      >
                        <Text style={{ fontSize: 12, fontWeight: isSel ? '900' : '600', color: isSel ? '#0F172A' : colors.text }}>
                          {isSel ? '✓ ' : ''}{sOpt}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* 1. CATEGORY */}
              <View style={{ marginTop: 8 }}>
                <Text style={[styles.schedulerSectionTitle, { color: colors.text, marginBottom: 8 }]}>CATEGORY</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {['All', 'Electronics', 'IT & Office', 'Home Appliances'].map((catOpt) => {
                    const isSel = draftProdCategory === catOpt;
                    return (
                      <TouchableOpacity
                        key={catOpt}
                        style={{
                          backgroundColor: isSel ? '#F5B800' : isLight ? '#F8FAFC' : 'rgba(255,255,255,0.04)',
                          borderColor: isSel ? '#F5B800' : isLight ? '#E2E8F0' : 'rgba(255,255,255,0.08)',
                          borderWidth: 1.5,
                          borderRadius: 12,
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                        }}
                        activeOpacity={0.8}
                        onPress={() => setDraftProdCategory(catOpt)}
                      >
                        <Text style={{ fontSize: 12, fontWeight: isSel ? '900' : '600', color: isSel ? '#0F172A' : colors.text }}>
                          {isSel ? '✓ ' : ''}{catOpt}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* 2. BRAND */}
              <View style={{ marginTop: 16 }}>
                <Text style={[styles.schedulerSectionTitle, { color: colors.text, marginBottom: 8 }]}>BRAND</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {['All', 'Sony', 'Fitbit', 'Logitech', 'Philips', 'Bose', 'Polaroid'].map((bOpt) => {
                    const isSel = draftProdBrand === bOpt;
                    return (
                      <TouchableOpacity
                        key={bOpt}
                        style={{
                          backgroundColor: isSel ? '#FFFBEB' : isLight ? '#F8FAFC' : 'rgba(255,255,255,0.04)',
                          borderColor: isSel ? '#F5B800' : isLight ? '#E2E8F0' : 'rgba(255,255,255,0.08)',
                          borderWidth: 1.5,
                          borderRadius: 12,
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                        }}
                        activeOpacity={0.8}
                        onPress={() => setDraftProdBrand(bOpt)}
                      >
                        <Text style={{ fontSize: 12, fontWeight: isSel ? '900' : '600', color: isSel ? '#0F172A' : colors.text }}>
                          {isSel ? '✓ ' : ''}{bOpt}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* 3. PRICE */}
              <View style={{ marginTop: 16 }}>
                <Text style={[styles.schedulerSectionTitle, { color: colors.text, marginBottom: 8 }]}>PRICE</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {['All', 'Under ₹1,500', '₹1,500 - ₹5,000', '₹5,000+'].map((pOpt) => {
                    const isSel = draftProdPrice === pOpt;
                    return (
                      <TouchableOpacity
                        key={pOpt}
                        style={{
                          backgroundColor: isSel ? '#F5B800' : isLight ? '#F8FAFC' : 'rgba(255,255,255,0.04)',
                          borderColor: isSel ? '#F5B800' : isLight ? '#E2E8F0' : 'rgba(255,255,255,0.08)',
                          borderWidth: 1.5,
                          borderRadius: 12,
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                        }}
                        activeOpacity={0.8}
                        onPress={() => setDraftProdPrice(pOpt)}
                      >
                        <Text style={{ fontSize: 12, fontWeight: isSel ? '900' : '600', color: isSel ? '#0F172A' : colors.text }}>
                          {isSel ? '✓ ' : ''}{pOpt}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* 4. RATING */}
              <View style={{ marginTop: 16 }}>
                <Text style={[styles.schedulerSectionTitle, { color: colors.text, marginBottom: 8 }]}>MINIMUM RATING</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {[
                    { val: 4.8, label: '4.8+ Exceptional' },
                    { val: 4.5, label: '4.5+ Wonderful' },
                    { val: 4.0, label: '4.0+ Very Good' },
                  ].map((rObj) => {
                    const isSel = draftProdRating === rObj.val;
                    return (
                      <TouchableOpacity
                        key={`pr_rating_${rObj.val}`}
                        style={{
                          backgroundColor: isSel ? '#F5B800' : isLight ? '#F8FAFC' : 'rgba(255,255,255,0.04)',
                          borderColor: isSel ? '#F5B800' : isLight ? '#E2E8F0' : 'rgba(255,255,255,0.08)',
                          borderWidth: 1.5,
                          borderRadius: 12,
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                        }}
                        activeOpacity={0.8}
                        onPress={() => setDraftProdRating(isSel ? null : rObj.val)}
                      >
                        <Text style={{ fontSize: 12, fontWeight: isSel ? '900' : '600', color: isSel ? '#0F172A' : colors.text }}>
                          {isSel ? '✓ ' : ''}{rObj.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* 5. DISCOUNT */}
              <View style={{ marginTop: 16 }}>
                <Text style={[styles.schedulerSectionTitle, { color: colors.text, marginBottom: 8 }]}>DISCOUNT</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {['All', '20%+ OFF', '30%+ OFF', '40%+ OFF'].map((dOpt) => {
                    const isSel = draftProdDiscount === dOpt;
                    return (
                      <TouchableOpacity
                        key={dOpt}
                        style={{
                          backgroundColor: isSel ? '#F5B800' : isLight ? '#F8FAFC' : 'rgba(255,255,255,0.04)',
                          borderColor: isSel ? '#F5B800' : isLight ? '#E2E8F0' : 'rgba(255,255,255,0.08)',
                          borderWidth: 1.5,
                          borderRadius: 12,
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                        }}
                        activeOpacity={0.8}
                        onPress={() => setDraftProdDiscount(dOpt)}
                      >
                        <Text style={{ fontSize: 12, fontWeight: isSel ? '900' : '600', color: isSel ? '#0F172A' : colors.text }}>
                          {isSel ? '✓ ' : ''}{dOpt}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* 6. AVAILABILITY */}
              <View style={{ marginTop: 16 }}>
                <Text style={[styles.schedulerSectionTitle, { color: colors.text, marginBottom: 8 }]}>AVAILABILITY</Text>
                <TouchableOpacity
                  style={{
                    backgroundColor: draftProdInStockOnly ? '#ECFDF5' : isLight ? '#F8FAFC' : 'rgba(255,255,255,0.04)',
                    borderColor: draftProdInStockOnly ? '#10B981' : isLight ? '#E2E8F0' : 'rgba(255,255,255,0.08)',
                    borderWidth: 1.5,
                    borderRadius: 12,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                  activeOpacity={0.8}
                  onPress={() => setDraftProdInStockOnly(!draftProdInStockOnly)}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={{
                      width: 20,
                      height: 20,
                      borderRadius: 6,
                      borderWidth: 1.5,
                      borderColor: draftProdInStockOnly ? '#10B981' : '#94A3B8',
                      backgroundColor: draftProdInStockOnly ? '#10B981' : 'transparent',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      {draftProdInStockOnly && <Icons.Check color="#FFFFFF" size={13} strokeWidth={3} />}
                    </View>
                    <Text style={{ fontSize: 13, fontWeight: draftProdInStockOnly ? '800' : '600', color: colors.text }}>
                      In Stock Only
                    </Text>
                  </View>
                  <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#10B981', backgroundColor: '#D1FAE5', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                    Ready to Ship
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>

            {/* Bottom Actions Bar */}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 14, paddingTop: 10, borderTopWidth: 1, borderTopColor: isLight ? '#F1F5F9' : 'rgba(255,255,255,0.06)' }}>
              <TouchableOpacity
                style={[
                  styles.modalPrimaryBtn,
                  {
                    flex: 1,
                    backgroundColor: isLight ? '#F1F5F9' : 'rgba(255,255,255,0.1)',
                  },
                ]}
                activeOpacity={0.8}
                onPress={resetProdDraftFilters}
              >
                <Text style={[styles.modalPrimaryBtnText, { color: colors.text }]}>Reset</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalPrimaryBtn, { flex: 2.2 }]}
                activeOpacity={0.85}
                onPress={applyProdFilters}
              >
                <Text style={styles.modalPrimaryBtnText}>
                  Show {draftProdDisplayedServices.length} Products
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Daily Needs Filter Modal */}
      <Modal visible={isDnFilterOpen} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheetContainer, { backgroundColor: colors.cardBg, maxHeight: '88%', paddingHorizontal: 18, paddingTop: 12, paddingBottom: 20 }]}>
            <View style={styles.sheetDragHandle} />
            {/* Header */}
            <View style={[styles.modalSheetHeader, { borderBottomWidth: 1, borderBottomColor: isLight ? '#F1F5F9' : 'rgba(255,255,255,0.06)', paddingBottom: 12 }]}>
              <View>
                <Text style={[styles.modalSheetTitle, { color: colors.text, fontSize: 18, fontWeight: '900' }]}>Filter Daily Needs</Text>
                <Text style={{ fontSize: 11.5, color: '#64748B', fontWeight: '600', marginTop: 2 }}>
                  {dnActiveFiltersCount > 0 ? `⚡ ${dnActiveFiltersCount} filter(s) active` : 'Select filters to refine grocery list'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsDnFilterOpen(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={{ padding: 4, borderRadius: 20, backgroundColor: isLight ? '#F1F5F9' : 'rgba(255,255,255,0.08)' }}
              >
                <Icons.X color={colors.text} size={18} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ marginVertical: 6 }}>
              {/* 0. SORT BY */}
              <View style={{ marginTop: 8 }}>
                <Text style={[styles.schedulerSectionTitle, { color: colors.text, marginBottom: 8 }]}>SORT BY</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {['Recommended', 'Price Low → High', 'Price High → Low', 'Rating High → Low', 'Discount High → Low'].map((sOpt) => {
                    const isSel = draftDnSort === sOpt;
                    return (
                      <TouchableOpacity
                        key={sOpt}
                        style={{
                          backgroundColor: isSel ? '#F5B800' : isLight ? '#F8FAFC' : 'rgba(255,255,255,0.04)',
                          borderColor: isSel ? '#F5B800' : isLight ? '#E2E8F0' : 'rgba(255,255,255,0.08)',
                          borderWidth: 1.5,
                          borderRadius: 12,
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                        }}
                        activeOpacity={0.8}
                        onPress={() => setDraftDnSort(sOpt)}
                      >
                        <Text style={{ fontSize: 12, fontWeight: isSel ? '900' : '600', color: isSel ? '#0F172A' : colors.text }}>
                          {isSel ? '✓ ' : ''}{sOpt}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* 1. GROCERY CATEGORY */}
              <View style={{ marginTop: 8 }}>
                <Text style={[styles.schedulerSectionTitle, { color: colors.text, marginBottom: 8 }]}>GROCERY CATEGORY</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {['All', 'Fruits & Vegetables', 'Grocery & Staples', 'Dairy, Bread & Eggs', 'Snacks & Beverages'].map((catOpt) => {
                    const isSel = draftDnCategory === catOpt;
                    return (
                      <TouchableOpacity
                        key={catOpt}
                        style={{
                          backgroundColor: isSel ? '#F5B800' : isLight ? '#F8FAFC' : 'rgba(255,255,255,0.04)',
                          borderColor: isSel ? '#F5B800' : isLight ? '#E2E8F0' : 'rgba(255,255,255,0.08)',
                          borderWidth: 1.5,
                          borderRadius: 12,
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                        }}
                        activeOpacity={0.8}
                        onPress={() => setDraftDnCategory(catOpt)}
                      >
                        <Text style={{ fontSize: 12, fontWeight: isSel ? '900' : '600', color: isSel ? '#0F172A' : colors.text }}>
                          {isSel ? '✓ ' : ''}{catOpt}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* 2. BRAND */}
              <View style={{ marginTop: 16 }}>
                <Text style={[styles.schedulerSectionTitle, { color: colors.text, marginBottom: 8 }]}>BRAND</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {['All', 'Farm Fresh', 'Local Farms', 'Shimla Fresh', 'Aashirvaad', 'Fortune', 'Tata Sampann', 'Madhur', 'Tata', 'Rajdhani'].map((bOpt) => {
                    const isSel = draftDnBrand === bOpt;
                    return (
                      <TouchableOpacity
                        key={bOpt}
                        style={{
                          backgroundColor: isSel ? '#FFFBEB' : isLight ? '#F8FAFC' : 'rgba(255,255,255,0.04)',
                          borderColor: isSel ? '#F5B800' : isLight ? '#E2E8F0' : 'rgba(255,255,255,0.08)',
                          borderWidth: 1.5,
                          borderRadius: 12,
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                        }}
                        activeOpacity={0.8}
                        onPress={() => setDraftDnBrand(bOpt)}
                      >
                        <Text style={{ fontSize: 12, fontWeight: isSel ? '900' : '600', color: isSel ? '#0F172A' : colors.text }}>
                          {isSel ? '✓ ' : ''}{bOpt}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* 3. PRICE */}
              <View style={{ marginTop: 16 }}>
                <Text style={[styles.schedulerSectionTitle, { color: colors.text, marginBottom: 8 }]}>PRICE</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {['All', 'Under ₹50', '₹50 - ₹200', '₹200+'].map((pOpt) => {
                    const isSel = draftDnPrice === pOpt;
                    return (
                      <TouchableOpacity
                        key={pOpt}
                        style={{
                          backgroundColor: isSel ? '#F5B800' : isLight ? '#F8FAFC' : 'rgba(255,255,255,0.04)',
                          borderColor: isSel ? '#F5B800' : isLight ? '#E2E8F0' : 'rgba(255,255,255,0.08)',
                          borderWidth: 1.5,
                          borderRadius: 12,
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                        }}
                        activeOpacity={0.8}
                        onPress={() => setDraftDnPrice(pOpt)}
                      >
                        <Text style={{ fontSize: 12, fontWeight: isSel ? '900' : '600', color: isSel ? '#0F172A' : colors.text }}>
                          {isSel ? '✓ ' : ''}{pOpt}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* 4. RATING */}
              <View style={{ marginTop: 16 }}>
                <Text style={[styles.schedulerSectionTitle, { color: colors.text, marginBottom: 8 }]}>MINIMUM RATING</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {[
                    { val: 4.8, label: '4.8+ Exceptional' },
                    { val: 4.5, label: '4.5+ Wonderful' },
                    { val: 4.0, label: '4.0+ Very Good' },
                  ].map((rObj) => {
                    const isSel = draftDnRating === rObj.val;
                    return (
                      <TouchableOpacity
                        key={`dn_rating_${rObj.val}`}
                        style={{
                          backgroundColor: isSel ? '#F5B800' : isLight ? '#F8FAFC' : 'rgba(255,255,255,0.04)',
                          borderColor: isSel ? '#F5B800' : isLight ? '#E2E8F0' : 'rgba(255,255,255,0.08)',
                          borderWidth: 1.5,
                          borderRadius: 12,
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                        }}
                        activeOpacity={0.8}
                        onPress={() => setDraftDnRating(isSel ? null : rObj.val)}
                      >
                        <Text style={{ fontSize: 12, fontWeight: isSel ? '900' : '600', color: isSel ? '#0F172A' : colors.text }}>
                          {isSel ? '✓ ' : ''}{rObj.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* 5. PACK SIZE */}
              <View style={{ marginTop: 16 }}>
                <Text style={[styles.schedulerSectionTitle, { color: colors.text, marginBottom: 8 }]}>PACK SIZE</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {['All', '500g / 1kg', '5kg', 'Single Pack'].map((psOpt) => {
                    const isSel = draftDnPackSize === psOpt;
                    return (
                      <TouchableOpacity
                        key={psOpt}
                        style={{
                          backgroundColor: isSel ? '#F5B800' : isLight ? '#F8FAFC' : 'rgba(255,255,255,0.04)',
                          borderColor: isSel ? '#F5B800' : isLight ? '#E2E8F0' : 'rgba(255,255,255,0.08)',
                          borderWidth: 1.5,
                          borderRadius: 12,
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                        }}
                        activeOpacity={0.8}
                        onPress={() => setDraftDnPackSize(psOpt)}
                      >
                        <Text style={{ fontSize: 12, fontWeight: isSel ? '900' : '600', color: isSel ? '#0F172A' : colors.text }}>
                          {isSel ? '✓ ' : ''}{psOpt}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* 6. DELIVERY TIME */}
              <View style={{ marginTop: 16 }}>
                <Text style={[styles.schedulerSectionTitle, { color: colors.text, marginBottom: 8 }]}>DELIVERY TIME</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {['All', '⚡ 15 mins', '⚡ 15-30 mins'].map((dtOpt) => {
                    const isSel = draftDnDeliveryTime === dtOpt;
                    return (
                      <TouchableOpacity
                        key={dtOpt}
                        style={{
                          backgroundColor: isSel ? '#F5B800' : isLight ? '#F8FAFC' : 'rgba(255,255,255,0.04)',
                          borderColor: isSel ? '#F5B800' : isLight ? '#E2E8F0' : 'rgba(255,255,255,0.08)',
                          borderWidth: 1.5,
                          borderRadius: 12,
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                        }}
                        activeOpacity={0.8}
                        onPress={() => setDraftDnDeliveryTime(dtOpt)}
                      >
                        <Text style={{ fontSize: 12, fontWeight: isSel ? '900' : '600', color: isSel ? '#0F172A' : colors.text }}>
                          {isSel ? '✓ ' : ''}{dtOpt}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* 7. AVAILABILITY */}
              <View style={{ marginTop: 16 }}>
                <Text style={[styles.schedulerSectionTitle, { color: colors.text, marginBottom: 8 }]}>AVAILABILITY</Text>
                <TouchableOpacity
                  style={{
                    backgroundColor: draftDnInStockOnly ? '#ECFDF5' : isLight ? '#F8FAFC' : 'rgba(255,255,255,0.04)',
                    borderColor: draftDnInStockOnly ? '#10B981' : isLight ? '#E2E8F0' : 'rgba(255,255,255,0.08)',
                    borderWidth: 1.5,
                    borderRadius: 12,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                  activeOpacity={0.8}
                  onPress={() => setDraftDnInStockOnly(!draftDnInStockOnly)}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={{
                      width: 20,
                      height: 20,
                      borderRadius: 6,
                      borderWidth: 1.5,
                      borderColor: draftDnInStockOnly ? '#10B981' : '#94A3B8',
                      backgroundColor: draftDnInStockOnly ? '#10B981' : 'transparent',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      {draftDnInStockOnly && <Icons.Check color="#FFFFFF" size={13} strokeWidth={3} />}
                    </View>
                    <Text style={{ fontSize: 13, fontWeight: draftDnInStockOnly ? '800' : '600', color: colors.text }}>
                      In Stock Only
                    </Text>
                  </View>
                  <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#10B981', backgroundColor: '#D1FAE5', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                    Instant Delivery
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>

            {/* Bottom Actions Bar */}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 14, paddingTop: 10, borderTopWidth: 1, borderTopColor: isLight ? '#F1F5F9' : 'rgba(255,255,255,0.06)' }}>
              <TouchableOpacity
                style={[
                  styles.modalPrimaryBtn,
                  {
                    flex: 1,
                    backgroundColor: isLight ? '#F1F5F9' : 'rgba(255,255,255,0.1)',
                  },
                ]}
                activeOpacity={0.8}
                onPress={resetDnDraftFilters}
              >
                <Text style={[styles.modalPrimaryBtnText, { color: colors.text }]}>Reset</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalPrimaryBtn, { flex: 2.2 }]}
                activeOpacity={0.85}
                onPress={applyDnFilters}
              >
                <Text style={styles.modalPrimaryBtnText}>
                  Show {draftDnDisplayedServices.length} Items
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Food Filter Modal */}
      <Modal visible={isFoodFilterOpen} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheetContainer, { backgroundColor: colors.cardBg, maxHeight: '88%', paddingHorizontal: 18, paddingTop: 12, paddingBottom: 20 }]}>
            <View style={styles.sheetDragHandle} />
            {/* Header */}
            <View style={[styles.modalSheetHeader, { borderBottomWidth: 1, borderBottomColor: isLight ? '#F1F5F9' : 'rgba(255,255,255,0.06)', paddingBottom: 12 }]}>
              <View>
                <Text style={[styles.modalSheetTitle, { color: colors.text, fontSize: 18, fontWeight: '900' }]}>Filter Food & Restaurants</Text>
                <Text style={{ fontSize: 11.5, color: '#64748B', fontWeight: '600', marginTop: 2 }}>
                  {foodActiveFiltersCount > 0 ? `⚡ ${foodActiveFiltersCount} filter(s) active` : 'Select filters to refine food list'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsFoodFilterOpen(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={{ padding: 4, borderRadius: 20, backgroundColor: isLight ? '#F1F5F9' : 'rgba(255,255,255,0.08)' }}
              >
                <Icons.X color={colors.text} size={18} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ marginVertical: 6 }}>
              {/* 0. SORT BY */}
              <View style={{ marginTop: 8 }}>
                <Text style={[styles.schedulerSectionTitle, { color: colors.text, marginBottom: 8 }]}>SORT BY</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {['Recommended', 'Price Low → High', 'Price High → Low', 'Rating High → Low', 'Delivery Time'].map((sOpt) => {
                    const isSel = draftFoodSort === sOpt;
                    return (
                      <TouchableOpacity
                        key={sOpt}
                        style={{
                          backgroundColor: isSel ? '#F5B800' : isLight ? '#F8FAFC' : 'rgba(255,255,255,0.04)',
                          borderColor: isSel ? '#F5B800' : isLight ? '#E2E8F0' : 'rgba(255,255,255,0.08)',
                          borderWidth: 1.5,
                          borderRadius: 12,
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                        }}
                        activeOpacity={0.8}
                        onPress={() => setDraftFoodSort(sOpt)}
                      >
                        <Text style={{ fontSize: 12, fontWeight: isSel ? '900' : '600', color: isSel ? '#0F172A' : colors.text }}>
                          {isSel ? '✓ ' : ''}{sOpt}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* 1. CUISINE */}
              <View style={{ marginTop: 8 }}>
                <Text style={[styles.schedulerSectionTitle, { color: colors.text, marginBottom: 8 }]}>CUISINE</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {['All', 'North Indian', 'South Indian', 'Biryani', 'Chinese', 'Italian', 'Desserts', 'Fast Food'].map((cOpt) => {
                    const isSel = draftFoodCuisine === cOpt;
                    return (
                      <TouchableOpacity
                        key={cOpt}
                        style={{
                          backgroundColor: isSel ? '#F5B800' : isLight ? '#F8FAFC' : 'rgba(255,255,255,0.04)',
                          borderColor: isSel ? '#F5B800' : isLight ? '#E2E8F0' : 'rgba(255,255,255,0.08)',
                          borderWidth: 1.5,
                          borderRadius: 12,
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                        }}
                        activeOpacity={0.8}
                        onPress={() => setDraftFoodCuisine(cOpt)}
                      >
                        <Text style={{ fontSize: 12, fontWeight: isSel ? '900' : '600', color: isSel ? '#0F172A' : colors.text }}>
                          {isSel ? '✓ ' : ''}{cOpt}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* 2. VEG / NON-VEG */}
              <View style={{ marginTop: 16 }}>
                <Text style={[styles.schedulerSectionTitle, { color: colors.text, marginBottom: 8 }]}>DIETARY PREFERENCE</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {[
                    { key: 'All', label: 'All Dishes' },
                    { key: 'Pure Veg', label: 'Pure Veg 🌱' },
                    { key: 'Non-Veg', label: 'Non-Veg 🍗' },
                  ].map((vObj) => {
                    const isSel = draftFoodVegMode === vObj.key;
                    return (
                      <TouchableOpacity
                        key={vObj.key}
                        style={{
                          backgroundColor: isSel ? '#F5B800' : isLight ? '#F8FAFC' : 'rgba(255,255,255,0.04)',
                          borderColor: isSel ? '#F5B800' : isLight ? '#E2E8F0' : 'rgba(255,255,255,0.08)',
                          borderWidth: 1.5,
                          borderRadius: 12,
                          paddingHorizontal: 14,
                          paddingVertical: 8,
                        }}
                        activeOpacity={0.8}
                        onPress={() => setDraftFoodVegMode(vObj.key)}
                      >
                        <Text style={{ fontSize: 12, fontWeight: isSel ? '900' : '600', color: isSel ? '#0F172A' : colors.text }}>
                          {isSel ? '✓ ' : ''}{vObj.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* 3. PRICE */}
              <View style={{ marginTop: 16 }}>
                <Text style={[styles.schedulerSectionTitle, { color: colors.text, marginBottom: 8 }]}>PRICE FOR TWO</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {['All', 'Under ₹200', '₹200 - ₹500', '₹500+'].map((pOpt) => {
                    const isSel = draftFoodPrice === pOpt;
                    return (
                      <TouchableOpacity
                        key={pOpt}
                        style={{
                          backgroundColor: isSel ? '#F5B800' : isLight ? '#F8FAFC' : 'rgba(255,255,255,0.04)',
                          borderColor: isSel ? '#F5B800' : isLight ? '#E2E8F0' : 'rgba(255,255,255,0.08)',
                          borderWidth: 1.5,
                          borderRadius: 12,
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                        }}
                        activeOpacity={0.8}
                        onPress={() => setDraftFoodPrice(pOpt)}
                      >
                        <Text style={{ fontSize: 12, fontWeight: isSel ? '900' : '600', color: isSel ? '#0F172A' : colors.text }}>
                          {isSel ? '✓ ' : ''}{pOpt}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* 4. RATING */}
              <View style={{ marginTop: 16 }}>
                <Text style={[styles.schedulerSectionTitle, { color: colors.text, marginBottom: 8 }]}>MINIMUM RATING</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {[
                    { val: 4.8, label: '4.8+ Exceptional' },
                    { val: 4.5, label: '4.5+ Wonderful' },
                    { val: 4.0, label: '4.0+ Very Good' },
                  ].map((rObj) => {
                    const isSel = draftFoodRating === rObj.val;
                    return (
                      <TouchableOpacity
                        key={`food_rating_${rObj.val}`}
                        style={{
                          backgroundColor: isSel ? '#F5B800' : isLight ? '#F8FAFC' : 'rgba(255,255,255,0.04)',
                          borderColor: isSel ? '#F5B800' : isLight ? '#E2E8F0' : 'rgba(255,255,255,0.08)',
                          borderWidth: 1.5,
                          borderRadius: 12,
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                        }}
                        activeOpacity={0.8}
                        onPress={() => setDraftFoodRating(isSel ? null : rObj.val)}
                      >
                        <Text style={{ fontSize: 12, fontWeight: isSel ? '900' : '600', color: isSel ? '#0F172A' : colors.text }}>
                          {isSel ? '✓ ' : ''}{rObj.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* 5. DELIVERY TIME */}
              <View style={{ marginTop: 16 }}>
                <Text style={[styles.schedulerSectionTitle, { color: colors.text, marginBottom: 8 }]}>DELIVERY TIME</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {['All', 'Under 30 mins', '30-45 mins'].map((dtOpt) => {
                    const isSel = draftFoodDeliveryTime === dtOpt;
                    return (
                      <TouchableOpacity
                        key={dtOpt}
                        style={{
                          backgroundColor: isSel ? '#F5B800' : isLight ? '#F8FAFC' : 'rgba(255,255,255,0.04)',
                          borderColor: isSel ? '#F5B800' : isLight ? '#E2E8F0' : 'rgba(255,255,255,0.08)',
                          borderWidth: 1.5,
                          borderRadius: 12,
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                        }}
                        activeOpacity={0.8}
                        onPress={() => setDraftFoodDeliveryTime(dtOpt)}
                      >
                        <Text style={{ fontSize: 12, fontWeight: isSel ? '900' : '600', color: isSel ? '#0F172A' : colors.text }}>
                          {isSel ? '✓ ' : ''}{dtOpt}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* 6. OFFERS & DISCOUNTS */}
              <View style={{ marginTop: 16 }}>
                <Text style={[styles.schedulerSectionTitle, { color: colors.text, marginBottom: 8 }]}>OFFERS & DISCOUNTS</Text>
                <TouchableOpacity
                  style={{
                    backgroundColor: draftFoodOffersOnly ? '#FFFBEB' : isLight ? '#F8FAFC' : 'rgba(255,255,255,0.04)',
                    borderColor: draftFoodOffersOnly ? '#F5B800' : isLight ? '#E2E8F0' : 'rgba(255,255,255,0.08)',
                    borderWidth: 1.5,
                    borderRadius: 12,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                  activeOpacity={0.8}
                  onPress={() => setDraftFoodOffersOnly(!draftFoodOffersOnly)}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={{
                      width: 20,
                      height: 20,
                      borderRadius: 6,
                      borderWidth: 1.5,
                      borderColor: draftFoodOffersOnly ? '#F5B800' : '#94A3B8',
                      backgroundColor: draftFoodOffersOnly ? '#F5B800' : 'transparent',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      {draftFoodOffersOnly && <Icons.Check color="#0F172A" size={13} strokeWidth={3} />}
                    </View>
                    <Text style={{ fontSize: 13, fontWeight: draftFoodOffersOnly ? '800' : '600', color: colors.text }}>
                      Offers & Discounts Only
                    </Text>
                  </View>
                  <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#D97706', backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                    Up to 25% OFF
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>

            {/* Bottom Actions Bar */}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 14, paddingTop: 10, borderTopWidth: 1, borderTopColor: isLight ? '#F1F5F9' : 'rgba(255,255,255,0.06)' }}>
              <TouchableOpacity
                style={[
                  styles.modalPrimaryBtn,
                  {
                    flex: 1,
                    backgroundColor: isLight ? '#F1F5F9' : 'rgba(255,255,255,0.1)',
                  },
                ]}
                activeOpacity={0.8}
                onPress={resetFoodDraftFilters}
              >
                <Text style={[styles.modalPrimaryBtnText, { color: colors.text }]}>Reset</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalPrimaryBtn, { flex: 2.2 }]}
                activeOpacity={0.85}
                onPress={applyFoodFilters}
              >
                <Text style={styles.modalPrimaryBtnText}>
                  Show {draftFoodDisplayedServices.length} Dishes
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Services Filter Modal */}
      <Modal visible={isSrvFilterOpen} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheetContainer, { backgroundColor: colors.cardBg, maxHeight: '88%', paddingHorizontal: 18, paddingTop: 12, paddingBottom: 20 }]}>
            <View style={styles.sheetDragHandle} />
            {/* Header */}
            <View style={[styles.modalSheetHeader, { borderBottomWidth: 1, borderBottomColor: isLight ? '#F1F5F9' : 'rgba(255,255,255,0.06)', paddingBottom: 12 }]}>
              <View>
                <Text style={[styles.modalSheetTitle, { color: colors.text, fontSize: 18, fontWeight: '900' }]}>Filter Home Services</Text>
                <Text style={{ fontSize: 11.5, color: '#64748B', fontWeight: '600', marginTop: 2 }}>
                  {srvActiveFiltersCount > 0 ? `⚡ ${srvActiveFiltersCount} filter(s) active` : 'Select filters to refine services'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsSrvFilterOpen(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={{ padding: 4, borderRadius: 20, backgroundColor: isLight ? '#F1F5F9' : 'rgba(255,255,255,0.08)' }}
              >
                <Icons.X color={colors.text} size={18} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ marginVertical: 6 }}>
              {/* 0. SORT BY */}
              <View style={{ marginTop: 8 }}>
                <Text style={[styles.schedulerSectionTitle, { color: colors.text, marginBottom: 8 }]}>SORT BY</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {['Recommended', 'Price Low → High', 'Price High → Low', 'Rating High → Low'].map((sOpt) => {
                    const isSel = draftSrvSort === sOpt;
                    return (
                      <TouchableOpacity
                        key={sOpt}
                        style={{
                          backgroundColor: isSel ? '#F5B800' : isLight ? '#F8FAFC' : 'rgba(255,255,255,0.04)',
                          borderColor: isSel ? '#F5B800' : isLight ? '#E2E8F0' : 'rgba(255,255,255,0.08)',
                          borderWidth: 1.5,
                          borderRadius: 12,
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                        }}
                        activeOpacity={0.8}
                        onPress={() => setDraftSrvSort(sOpt)}
                      >
                        <Text style={{ fontSize: 12, fontWeight: isSel ? '900' : '600', color: isSel ? '#0F172A' : colors.text }}>
                          {isSel ? '✓ ' : ''}{sOpt}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* 1. SERVICE CATEGORY / TYPE */}
              <View style={{ marginTop: 8 }}>
                <Text style={[styles.schedulerSectionTitle, { color: colors.text, marginBottom: 8 }]}>SERVICE CATEGORY</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {['All', 'Cleaning', 'AC Service', 'Plumber', 'Electrician', 'Appliance Repair', 'Beauty & Wellness'].map((sType) => {
                    const isSel = draftSrvType === sType;
                    return (
                      <TouchableOpacity
                        key={sType}
                        style={{
                          backgroundColor: isSel ? '#F5B800' : isLight ? '#F8FAFC' : 'rgba(255,255,255,0.04)',
                          borderColor: isSel ? '#F5B800' : isLight ? '#E2E8F0' : 'rgba(255,255,255,0.08)',
                          borderWidth: 1.5,
                          borderRadius: 12,
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                        }}
                        activeOpacity={0.8}
                        onPress={() => setDraftSrvType(sType)}
                      >
                        <Text style={{ fontSize: 12, fontWeight: isSel ? '900' : '600', color: isSel ? '#0F172A' : colors.text }}>
                          {isSel ? '✓ ' : ''}{sType}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* 2. PRICE */}
              <View style={{ marginTop: 16 }}>
                <Text style={[styles.schedulerSectionTitle, { color: colors.text, marginBottom: 8 }]}>PRICE</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {['All', 'Under ₹500', '₹500 - ₹1,500', '₹1,500+'].map((pOpt) => {
                    const isSel = draftSrvPrice === pOpt;
                    return (
                      <TouchableOpacity
                        key={pOpt}
                        style={{
                          backgroundColor: isSel ? '#F5B800' : isLight ? '#F8FAFC' : 'rgba(255,255,255,0.04)',
                          borderColor: isSel ? '#F5B800' : isLight ? '#E2E8F0' : 'rgba(255,255,255,0.08)',
                          borderWidth: 1.5,
                          borderRadius: 12,
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                        }}
                        activeOpacity={0.8}
                        onPress={() => setDraftSrvPrice(pOpt)}
                      >
                        <Text style={{ fontSize: 12, fontWeight: isSel ? '900' : '600', color: isSel ? '#0F172A' : colors.text }}>
                          {isSel ? '✓ ' : ''}{pOpt}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* 3. MINIMUM RATING */}
              <View style={{ marginTop: 16 }}>
                <Text style={[styles.schedulerSectionTitle, { color: colors.text, marginBottom: 8 }]}>MINIMUM RATING</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {[
                    { val: 4.8, label: '4.8+ Exceptional' },
                    { val: 4.5, label: '4.5+ Wonderful' },
                    { val: 4.0, label: '4.0+ Very Good' },
                  ].map((rObj) => {
                    const isSel = draftSrvRating === rObj.val;
                    return (
                      <TouchableOpacity
                        key={`srv_rating_${rObj.val}`}
                        style={{
                          backgroundColor: isSel ? '#F5B800' : isLight ? '#F8FAFC' : 'rgba(255,255,255,0.04)',
                          borderColor: isSel ? '#F5B800' : isLight ? '#E2E8F0' : 'rgba(255,255,255,0.08)',
                          borderWidth: 1.5,
                          borderRadius: 12,
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                        }}
                        activeOpacity={0.8}
                        onPress={() => setDraftSrvRating(isSel ? null : rObj.val)}
                      >
                        <Text style={{ fontSize: 12, fontWeight: isSel ? '900' : '600', color: isSel ? '#0F172A' : colors.text }}>
                          {isSel ? '✓ ' : ''}{rObj.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* 4. AVAILABILITY */}
              <View style={{ marginTop: 16 }}>
                <Text style={[styles.schedulerSectionTitle, { color: colors.text, marginBottom: 8 }]}>AVAILABILITY</Text>
                <TouchableOpacity
                  style={{
                    backgroundColor: draftSrvAvailability ? '#ECFDF5' : isLight ? '#F8FAFC' : 'rgba(255,255,255,0.04)',
                    borderColor: draftSrvAvailability ? '#10B981' : isLight ? '#E2E8F0' : 'rgba(255,255,255,0.08)',
                    borderWidth: 1.5,
                    borderRadius: 12,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                  activeOpacity={0.8}
                  onPress={() => setDraftSrvAvailability(!draftSrvAvailability)}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={{
                      width: 20,
                      height: 20,
                      borderRadius: 6,
                      borderWidth: 1.5,
                      borderColor: draftSrvAvailability ? '#10B981' : '#94A3B8',
                      backgroundColor: draftSrvAvailability ? '#10B981' : 'transparent',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      {draftSrvAvailability && <Icons.Check color="#FFFFFF" size={13} strokeWidth={3} />}
                    </View>
                    <Text style={{ fontSize: 13, fontWeight: draftSrvAvailability ? '800' : '600', color: colors.text }}>
                      Available Today Only ⚡
                    </Text>
                  </View>
                  <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#059669', backgroundColor: '#D1FAE5', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                    Same Day Service
                  </Text>
                </TouchableOpacity>
              </View>

              {/* 5. SERVICE TIME */}
              <View style={{ marginTop: 16 }}>
                <Text style={[styles.schedulerSectionTitle, { color: colors.text, marginBottom: 8 }]}>SERVICE DURATION</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {['All', '30-45 mins', '1-2 hours'].map((stOpt) => {
                    const isSel = draftSrvTime === stOpt;
                    return (
                      <TouchableOpacity
                        key={stOpt}
                        style={{
                          backgroundColor: isSel ? '#F5B800' : isLight ? '#F8FAFC' : 'rgba(255,255,255,0.04)',
                          borderColor: isSel ? '#F5B800' : isLight ? '#E2E8F0' : 'rgba(255,255,255,0.08)',
                          borderWidth: 1.5,
                          borderRadius: 12,
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                        }}
                        activeOpacity={0.8}
                        onPress={() => setDraftSrvTime(stOpt)}
                      >
                        <Text style={{ fontSize: 12, fontWeight: isSel ? '900' : '600', color: isSel ? '#0F172A' : colors.text }}>
                          {isSel ? '✓ ' : ''}{stOpt}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* 6. INSTANT / SCHEDULED */}
              <View style={{ marginTop: 16 }}>
                <Text style={[styles.schedulerSectionTitle, { color: colors.text, marginBottom: 8 }]}>BOOKING MODE</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {[
                    { key: 'All', label: 'All Modes' },
                    { key: 'Instant', label: 'Instant Booking ⚡' },
                    { key: 'Scheduled', label: 'Scheduled Booking 📅' },
                  ].map((bMode) => {
                    const isSel = draftSrvBookingMode === bMode.key;
                    return (
                      <TouchableOpacity
                        key={bMode.key}
                        style={{
                          backgroundColor: isSel ? '#F5B800' : isLight ? '#F8FAFC' : 'rgba(255,255,255,0.04)',
                          borderColor: isSel ? '#F5B800' : isLight ? '#E2E8F0' : 'rgba(255,255,255,0.08)',
                          borderWidth: 1.5,
                          borderRadius: 12,
                          paddingHorizontal: 14,
                          paddingVertical: 8,
                        }}
                        activeOpacity={0.8}
                        onPress={() => setDraftSrvBookingMode(bMode.key)}
                      >
                        <Text style={{ fontSize: 12, fontWeight: isSel ? '900' : '600', color: isSel ? '#0F172A' : colors.text }}>
                          {isSel ? '✓ ' : ''}{bMode.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </ScrollView>

            {/* Bottom Actions Bar */}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 14, paddingTop: 10, borderTopWidth: 1, borderTopColor: isLight ? '#F1F5F9' : 'rgba(255,255,255,0.06)' }}>
              <TouchableOpacity
                style={[
                  styles.modalPrimaryBtn,
                  {
                    flex: 1,
                    backgroundColor: isLight ? '#F1F5F9' : 'rgba(255,255,255,0.1)',
                  },
                ]}
                activeOpacity={0.8}
                onPress={resetSrvDraftFilters}
              >
                <Text style={[styles.modalPrimaryBtnText, { color: colors.text }]}>Reset</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalPrimaryBtn, { flex: 2.2 }]}
                activeOpacity={0.85}
                onPress={applySrvFilters}
              >
                <Text style={styles.modalPrimaryBtnText}>
                  Show {draftSrvDisplayedServices.length} Services
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Bus Booking Filter Modal */}
      <Modal visible={isBusFilterOpen} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheetContainer, { backgroundColor: colors.cardBg, maxHeight: '88%', paddingHorizontal: 18, paddingTop: 12, paddingBottom: 20 }]}>
            <View style={styles.sheetDragHandle} />
            {/* Header */}
            <View style={[styles.modalSheetHeader, { borderBottomWidth: 1, borderBottomColor: isLight ? '#F1F5F9' : 'rgba(255,255,255,0.06)', paddingBottom: 12 }]}>
              <View>
                <Text style={[styles.modalSheetTitle, { color: colors.text, fontSize: 18, fontWeight: '900' }]}>Filter & Sort Buses</Text>
                <Text style={{ fontSize: 11.5, color: '#64748B', fontWeight: '600', marginTop: 2 }}>
                  {busActiveFiltersCount > 0 ? `⚡ ${busActiveFiltersCount} filter(s) active` : 'Refine bus options for your route'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsBusFilterOpen(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={{ padding: 4, borderRadius: 20, backgroundColor: isLight ? '#F1F5F9' : 'rgba(255,255,255,0.08)' }}
              >
                <Icons.X color={colors.text} size={18} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ marginVertical: 6 }}>
              {/* 1. SORT BY */}
              <View style={{ marginTop: 8 }}>
                <Text style={[styles.schedulerSectionTitle, { color: colors.text, marginBottom: 8 }]}>SORT BY</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {['Price Low → High', 'Price High → Low', 'Rating High → Low', 'Early Departure', 'Late Departure'].map((sOpt) => {
                    const isSel = draftBusSort === sOpt;
                    return (
                      <TouchableOpacity
                        key={sOpt}
                        style={{
                          backgroundColor: isSel ? '#F5B800' : isLight ? '#F8FAFC' : 'rgba(255,255,255,0.04)',
                          borderColor: isSel ? '#F5B800' : isLight ? '#E2E8F0' : 'rgba(255,255,255,0.08)',
                          borderWidth: 1.5,
                          borderRadius: 12,
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                        }}
                        activeOpacity={0.8}
                        onPress={() => setDraftBusSort(sOpt)}
                      >
                        <Text style={{ fontSize: 12, fontWeight: isSel ? '900' : '600', color: isSel ? '#0F172A' : colors.text }}>
                          {isSel ? '✓ ' : ''}{sOpt}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* 2. DEPARTURE TIME */}
              <View style={{ marginTop: 16 }}>
                <Text style={[styles.schedulerSectionTitle, { color: colors.text, marginBottom: 8 }]}>DEPARTURE TIME</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {[
                    'All',
                    'Morning (6 AM - 12 PM)',
                    'Afternoon (12 PM - 6 PM)',
                    'Evening (6 PM - 11 PM)',
                    'Night (After 11 PM)',
                  ].map((dSlot) => {
                    const isSel = draftBusDepartureTime === dSlot;
                    return (
                      <TouchableOpacity
                        key={dSlot}
                        style={{
                          backgroundColor: isSel ? '#F5B800' : isLight ? '#F8FAFC' : 'rgba(255,255,255,0.04)',
                          borderColor: isSel ? '#F5B800' : isLight ? '#E2E8F0' : 'rgba(255,255,255,0.08)',
                          borderWidth: 1.5,
                          borderRadius: 12,
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                        }}
                        activeOpacity={0.8}
                        onPress={() => setDraftBusDepartureTime(dSlot)}
                      >
                        <Text style={{ fontSize: 12, fontWeight: isSel ? '900' : '600', color: isSel ? '#0F172A' : colors.text }}>
                          {isSel ? '✓ ' : ''}{dSlot}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* 3. BUS TYPE & AC / NON-AC */}
              <View style={{ marginTop: 16 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={[styles.schedulerSectionTitle, { color: colors.text }]}>BUS TYPE</Text>
                  {draftBusTypes.length > 0 && (
                    <TouchableOpacity onPress={() => setDraftBusTypes([])}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#EAB308' }}>Clear Types</Text>
                    </TouchableOpacity>
                  )}
                </View>
                
                {/* Category Types (Seater, Sleeper, Volvo Buses) */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                  {['Seater', 'Sleeper', 'Volvo Buses'].map((bType) => {
                    const isSel = draftBusTypes.includes(bType);
                    return (
                      <TouchableOpacity
                        key={bType}
                        style={{
                          backgroundColor: isSel ? '#F5B800' : isLight ? '#F8FAFC' : 'rgba(255,255,255,0.04)',
                          borderColor: isSel ? '#F5B800' : isLight ? '#E2E8F0' : 'rgba(255,255,255,0.08)',
                          borderWidth: 1.5,
                          borderRadius: 12,
                          paddingHorizontal: 13,
                          paddingVertical: 8,
                        }}
                        activeOpacity={0.8}
                        onPress={() => {
                          if (isSel) {
                            setDraftBusTypes(draftBusTypes.filter((t) => t !== bType));
                          } else {
                            setDraftBusTypes([...draftBusTypes, bType]);
                          }
                        }}
                      >
                        <Text style={{ fontSize: 12, fontWeight: isSel ? '900' : '600', color: isSel ? '#0F172A' : colors.text }}>
                          {isSel ? '✓ ' : ''}{bType}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Dynamic AC / Non-AC Counts */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {[
                    { key: 'All' as const, label: `All (${dynamicAcCount + dynamicNonAcCount})` },
                    { key: 'AC' as const, label: `AC (${dynamicAcCount})` },
                    { key: 'Non-AC' as const, label: `Non-AC (${dynamicNonAcCount})` },
                  ].map((acOpt) => {
                    const isSel = draftBusAcType === acOpt.key;
                    return (
                      <TouchableOpacity
                        key={acOpt.key}
                        style={{
                          backgroundColor: isSel ? '#0F172A' : isLight ? '#F1F5F9' : 'rgba(255,255,255,0.06)',
                          borderColor: isSel ? '#0F172A' : isLight ? '#E2E8F0' : 'rgba(255,255,255,0.1)',
                          borderWidth: 1.5,
                          borderRadius: 10,
                          paddingHorizontal: 12,
                          paddingVertical: 7,
                        }}
                        activeOpacity={0.8}
                        onPress={() => setDraftBusAcType(acOpt.key)}
                      >
                        <Text style={{ fontSize: 11.5, fontWeight: isSel ? '900' : '700', color: isSel ? '#FFFFFF' : colors.text }}>
                          {isSel ? '✓ ' : ''}{acOpt.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* 4. BUS OPERATOR */}
              <View style={{ marginTop: 16 }}>
                <Text style={[styles.schedulerSectionTitle, { color: colors.text, marginBottom: 8 }]}>BUS OPERATOR</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {['All', ...availableBusOperators].map((op) => {
                    const isSel = draftBusOperator === op;
                    return (
                      <TouchableOpacity
                        key={op}
                        style={{
                          backgroundColor: isSel ? '#F5B800' : isLight ? '#F8FAFC' : 'rgba(255,255,255,0.04)',
                          borderColor: isSel ? '#F5B800' : isLight ? '#E2E8F0' : 'rgba(255,255,255,0.08)',
                          borderWidth: 1.5,
                          borderRadius: 12,
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                        }}
                        activeOpacity={0.8}
                        onPress={() => setDraftBusOperator(op)}
                      >
                        <Text style={{ fontSize: 12, fontWeight: isSel ? '900' : '600', color: isSel ? '#0F172A' : colors.text }}>
                          {isSel ? '✓ ' : ''}{op}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* 5. PRICE FARE SLIDER */}
              <View style={{ marginTop: 16 }}>
                <TravelPriceSlider
                  min={300}
                  max={10000}
                  value={draftBusMaxPrice}
                  onChange={setDraftBusMaxPrice}
                  isLight={isLight}
                />
              </View>

              {/* 6. BOARDING POINT */}
              <View style={{ marginTop: 16 }}>
                <Text style={[styles.schedulerSectionTitle, { color: colors.text, marginBottom: 8 }]}>BOARDING POINT</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {['All', ...dynamicBoardingPoints].map((bp) => {
                    const isSel = draftBusBoarding === bp;
                    return (
                      <TouchableOpacity
                        key={bp}
                        style={{
                          backgroundColor: isSel ? '#F5B800' : isLight ? '#F8FAFC' : 'rgba(255,255,255,0.04)',
                          borderColor: isSel ? '#F5B800' : isLight ? '#E2E8F0' : 'rgba(255,255,255,0.08)',
                          borderWidth: 1.5,
                          borderRadius: 12,
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                        }}
                        activeOpacity={0.8}
                        onPress={() => setDraftBusBoarding(bp)}
                      >
                        <Text style={{ fontSize: 12, fontWeight: isSel ? '900' : '600', color: isSel ? '#0F172A' : colors.text }}>
                          {isSel ? '✓ ' : ''}{bp}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* 7. DROPPING POINT */}
              <View style={{ marginTop: 16 }}>
                <Text style={[styles.schedulerSectionTitle, { color: colors.text, marginBottom: 8 }]}>DROPPING POINT</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {['All', ...dynamicDroppingPoints].map((dp) => {
                    const isSel = draftBusDropping === dp;
                    return (
                      <TouchableOpacity
                        key={dp}
                        style={{
                          backgroundColor: isSel ? '#F5B800' : isLight ? '#F8FAFC' : 'rgba(255,255,255,0.04)',
                          borderColor: isSel ? '#F5B800' : isLight ? '#E2E8F0' : 'rgba(255,255,255,0.08)',
                          borderWidth: 1.5,
                          borderRadius: 12,
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                        }}
                        activeOpacity={0.8}
                        onPress={() => setDraftBusDropping(dp)}
                      >
                        <Text style={{ fontSize: 12, fontWeight: isSel ? '900' : '600', color: isSel ? '#0F172A' : colors.text }}>
                          {isSel ? '✓ ' : ''}{dp}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </ScrollView>

            {/* Bottom Actions Bar */}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 14, paddingTop: 10, borderTopWidth: 1, borderTopColor: isLight ? '#F1F5F9' : 'rgba(255,255,255,0.06)' }}>
              <TouchableOpacity
                style={[
                  styles.modalPrimaryBtn,
                  {
                    flex: 1,
                    backgroundColor: isLight ? '#F1F5F9' : 'rgba(255,255,255,0.1)',
                  },
                ]}
                activeOpacity={0.8}
                onPress={resetBusDraftFilters}
              >
                <Text style={[styles.modalPrimaryBtnText, { color: colors.text }]}>Reset</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalPrimaryBtn, { flex: 2.2 }]}
                activeOpacity={0.85}
                onPress={applyBusFilters}
              >
                <Text style={styles.modalPrimaryBtnText}>
                  Show {draftBusDisplayedServices.length} Buses
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 5. Stay Sort Modal */}
      <Modal visible={isStaySortOpen} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheetContainer, { backgroundColor: colors.cardBg }]}>
            <View style={styles.modalSheetHeader}>
              <Text style={[styles.modalSheetTitle, { color: colors.text }]}>Sort Stays By</Text>
              <TouchableOpacity onPress={() => setIsStaySortOpen(false)}>
                <Icons.X color={colors.text} size={20} />
              </TouchableOpacity>
            </View>

            <View style={{ gap: 8, marginVertical: 12 }}>
              {(['Recommended', 'Price Low → High', 'Price High → Low', 'Rating'] as const).map((sortOpt) => {
                const isSel = selectedStaySort === sortOpt;
                return (
                  <TouchableOpacity
                    key={sortOpt}
                    style={[
                      styles.destItemRow,
                      {
                        backgroundColor: isSel ? '#FFFBEB' : isLight ? '#F8FAFC' : 'rgba(255,255,255,0.04)',
                        borderColor: isSel ? '#F5B800' : 'transparent',
                        borderWidth: 1,
                        borderRadius: 12,
                        paddingHorizontal: 12,
                        paddingVertical: 12,
                      },
                    ]}
                    onPress={() => {
                      setSelectedStaySort(sortOpt);
                      setIsStaySortOpen(false);
                    }}
                  >
                    <Text style={[styles.destItemText, { color: isSel ? '#0F172A' : colors.text, fontWeight: isSel ? '800' : '600', flex: 1 }]}>
                      {sortOpt}
                    </Text>
                    {isSel && <Icons.Check color="#F5B800" size={18} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>

      {/* 5b. Category Quick Sort Modal */}
      <Modal visible={isCategorySortOpen} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheetContainer, { backgroundColor: colors.cardBg }]}>
            <View style={styles.modalSheetHeader}>
              <Text style={[styles.modalSheetTitle, { color: colors.text }]}>
                Sort {categoryName || 'Items'} By
              </Text>
              <TouchableOpacity onPress={() => setIsCategorySortOpen(false)}>
                <Icons.X color={colors.text} size={20} />
              </TouchableOpacity>
            </View>

            <View style={{ gap: 8, marginVertical: 12 }}>
              {(() => {
                const sortOptions = isTravelCategory
                  ? ['Price Low → High', 'Price High → Low', 'Rating High → Low', 'Early Departure', 'Late Departure']
                  : isFoodCategory
                  ? ['Recommended', 'Price Low → High', 'Price High → Low', 'Rating High → Low', 'Delivery Time']
                  : isProductsCategory || isDailyNeedsCategory
                  ? ['Recommended', 'Price Low → High', 'Price High → Low', 'Rating High → Low', 'Discount High → Low']
                  : ['Recommended', 'Price Low → High', 'Price High → Low', 'Rating High → Low'];

                const activeSort = isProductsCategory
                  ? selectedProdSort
                  : isDailyNeedsCategory
                  ? selectedDnSort
                  : isFoodCategory
                  ? selectedFoodSort
                  : isServicesCategory
                  ? selectedSrvSort
                  : isTravelCategory
                  ? selectedBusSort
                  : 'Recommended';

                return sortOptions.map((sortOpt) => {
                  const isSel = activeSort === sortOpt;
                  return (
                    <TouchableOpacity
                      key={sortOpt}
                      style={[
                        styles.destItemRow,
                        {
                          backgroundColor: isSel ? '#FFFBEB' : isLight ? '#F8FAFC' : 'rgba(255,255,255,0.04)',
                          borderColor: isSel ? '#F5B800' : 'transparent',
                          borderWidth: 1,
                          borderRadius: 12,
                          paddingHorizontal: 14,
                          paddingVertical: 12,
                        },
                      ]}
                      onPress={() => {
                        if (isProductsCategory) setSelectedProdSort(sortOpt);
                        else if (isDailyNeedsCategory) setSelectedDnSort(sortOpt);
                        else if (isFoodCategory) setSelectedFoodSort(sortOpt);
                        else if (isServicesCategory) setSelectedSrvSort(sortOpt);
                        else if (isTravelCategory) setSelectedBusSort(sortOpt);
                        setIsCategorySortOpen(false);
                      }}
                    >
                      <Text style={[styles.destItemText, { color: isSel ? '#0F172A' : colors.text, fontWeight: isSel ? '800' : '600', flex: 1 }]}>
                        {sortOpt}
                      </Text>
                      {isSel && <Icons.Check color="#F5B800" size={18} />}
                    </TouchableOpacity>
                  );
                });
              })()}
            </View>
          </View>
        </View>
      </Modal>

      {/* 6. Stay Map Modal */}
      <Modal visible={isStayMapOpen} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: '#0F172A' }}>
          <View style={[styles.headerWrapper, { paddingTop: Math.max(insets.top, 20), backgroundColor: '#0F172A', borderBottomColor: 'rgba(255,255,255,0.1)' }]}>
            <View style={styles.headerTopRow}>
              <TouchableOpacity style={styles.headerBackBtn} onPress={() => setIsStayMapOpen(false)}>
                <Icons.ArrowLeft color="#FFFFFF" size={20} />
              </TouchableOpacity>
              <Text style={[styles.headerTitle, { color: '#FFFFFF' }]}>Stay Map ({displayedStays.length} Stays)</Text>
              <View style={{ width: 36 }} />
            </View>
          </View>

          <View style={{ flex: 1, position: 'relative', backgroundColor: '#1E293B', alignItems: 'center', justifyContent: 'center' }}>
            <Image
              source={{ uri: 'https://images.unsplash.com/photo-1524661135-423995f22d0b?w=1000&auto=format&fit=crop&q=80' }}
              style={{ width: '100%', height: '100%', opacity: 0.7 }}
              resizeMode="cover"
            />
            {displayedStays.map((st, idx) => (
              <TouchableOpacity
                key={st.id}
                style={{
                  position: 'absolute',
                  top: `${20 + (idx * 9) % 65}%`,
                  left: `${15 + (idx * 13) % 70}%`,
                  backgroundColor: '#F5B800',
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 12,
                  elevation: 6,
                }}
                onPress={() => {
                  setIsStayMapOpen(false);
                  navigation.navigate('StayDetails', {
                    stay: st,
                    checkIn: checkInDate,
                    checkOut: checkOutDate,
                    nights: stayNights,
                    adults: stayAdults,
                    rooms: stayRooms,
                  });
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: '900', color: '#0F172A' }}>{st.price.split('/')[0]}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* 9. My Bookings Sheet */}
      <Modal visible={isMyBookingsOpen} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheetContainer, { backgroundColor: colors.cardBg, maxHeight: '85%' }]}>
            <View style={styles.modalSheetHeader}>
              <Text style={[styles.modalSheetTitle, { color: colors.text }]}>My Stay Bookings</Text>
              <TouchableOpacity onPress={() => setIsMyBookingsOpen(false)}>
                <Icons.X color={colors.text} size={20} />
              </TouchableOpacity>
            </View>

            {/* Bookings Tabs */}
            <View style={{ flexDirection: 'row', gap: 8, marginVertical: 10 }}>
              {(['Upcoming', 'Completed', 'Cancelled'] as const).map((tab) => (
                <TouchableOpacity
                  key={tab}
                  style={[
                    styles.categoryChip,
                    {
                      backgroundColor: bookingsTab === tab ? '#F5B800' : isLight ? '#F1F5F9' : 'rgba(255,255,255,0.06)',
                      borderColor: bookingsTab === tab ? '#F5B800' : 'transparent',
                    },
                  ]}
                  onPress={() => setBookingsTab(tab)}
                >
                  <Text style={[styles.categoryChipText, { color: bookingsTab === tab ? '#0F172A' : colors.text }]}>{tab}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <ScrollView style={{ flex: 1 }}>
              {bookingsTab === 'Upcoming' ? (
                myStayBookings.length > 0 ? (
                  myStayBookings.map((bk) => (
                    <View key={bk.id} style={[styles.bookingCardItem, { borderColor: isLight ? '#F1EAD8' : colors.cardBorder }]}>
                      <Image source={{ uri: bk.image }} style={styles.bookingCardImg} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.roomTitle, { color: colors.text }]}>{bk.hotelName}</Text>
                        <Text style={styles.roomSub}>{bk.roomName} • {bk.location}</Text>
                        <Text style={styles.bookingSummaryDates}>{bk.checkIn} → {bk.checkOut} ({bk.nights} nights)</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                          <Text style={styles.priceRowTotalVal}>{bk.totalPaid}</Text>
                          <View style={styles.confirmedStatusTag}>
                            <Text style={styles.confirmedStatusTagText}>{bk.status}</Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  ))
                ) : (
                  <View style={{ padding: 24, alignItems: 'center' }}>
                    <Text style={{ color: colors.text, fontWeight: '700' }}>No upcoming bookings</Text>
                  </View>
                )
              ) : (
                <View style={{ padding: 24, alignItems: 'center' }}>
                  <Text style={{ color: colors.text, fontWeight: '700' }}>No {bookingsTab.toLowerCase()} bookings</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Cart Modal Dialog Sheet */}
      <CartModal visible={isCartVisible} onClose={() => setIsCartVisible(false)} navigation={navigation} />

      {/* Floating Bottom Cart Bar */}
      {totalCartCount > 0 && !isStayCategory && !(categoryName === 'Jobs' || categoryName === 'Jobs & Careers') && (
        <View style={styles.floatingCartBar}>
          <View style={styles.floatingCartLeft}>
            <View style={styles.floatingCartCountBadge}>
              <Text style={styles.floatingCartCountText}>{totalCartCount}</Text>
            </View>
            <Text style={styles.floatingCartPriceText}>
              ₹{cartItems.reduce((sum, item) => {
                const p = parseInt(String(item.price || '0').replace(/[^\d]/g, ''), 10) || 0;
                return sum + p * item.quantity;
              }, 0)}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.floatingCartViewBtn}
            activeOpacity={0.85}
            onPress={() => setIsCartVisible(true)}
          >
            <Text style={styles.floatingCartViewBtnText}>View Cart</Text>
            <Icons.ChevronRight color="#0F172A" size={16} />
          </TouchableOpacity>
        </View>
      )}

      {/* Razorpay Test Mode Checkout Modal */}
      <RazorpayModal
        visible={razorpayModalVisible}
        orderData={razorpayOrder}
        userInfo={{
          name: useAuthStore.getState().currentUser?.name || patientNameInput || 'Guest User',
          email: useAuthStore.getState().currentUser?.email || 'guest@example.com',
          phone: useAuthStore.getState().currentUser?.phone || '',
        }}
        merchantName="Forge India Connect • Services"
        onSuccess={handleRazorpaySuccess}
        onCancel={handleRazorpayCancel}
      />

      {/* Dedicated Travel Search & Availability Modal */}
      {isTravelCategory && (
        <TravelSearchModal
          visible={isTravelSearchModalOpen}
          onClose={() => setIsTravelSearchModalOpen(false)}
          onSearch={handleApplyTravelSearch}
          initialParams={{
            from: travelFrom,
            to: travelTo,
            journeyDate: travelJourneyDate,
            departureTime: travelDepartureTime,
            priceRange: travelPriceRange,
            travelType: travelType,
            passengers: travelPassengers,
          }}
          popularOrigins={availableTravelOrigins}
          popularDestinations={availableTravelDestinations}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerWrapper: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  headerBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  headerCartBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  cartBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#EF4444',
    borderRadius: 6,
    minWidth: 14,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  cartBadgeText: {
    color: '#FFFFFF',
    fontSize: 8.5,
    fontWeight: 'bold',
  },
  searchBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    borderRadius: 14,
    borderWidth: 1.2,
    paddingLeft: 12,
    paddingRight: 6,
    gap: 8,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    paddingVertical: 0,
  },
  micIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceListeningRow: {
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
    paddingLeft: 2,
    paddingRight: 6,
  },
  waveBar: {
    width: 3.5,
    backgroundColor: '#F5B800',
    borderRadius: 2,
  },
  voiceListeningText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#F5B800',
  },
  categoryChipsScroll: {
    gap: 8,
    paddingVertical: 2,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6.5,
    borderRadius: 16,
    borderWidth: 1,
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  contentScroll: {
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  resultsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 0,
  },
  resultsTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  resultsCount: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  serviceCardsGrid: {
    gap: 14,
  },
  serviceCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2,
  },
  cardImageWrapper: {
    position: 'relative',
    width: '100%',
    height: 140,
    backgroundColor: '#E2E8F0',
  },
  serviceImage: {
    width: '100%',
    height: '100%',
  },
  assuredBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#F5B800',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  assuredBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: 0.5,
  },
  serviceBody: {
    padding: 14,
  },
  ratingAndSubcatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  serviceSubcatText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#D97706',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  ratingBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(245, 184, 0, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  ratingBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0F172A',
  },
  reviewsText: {
    fontSize: 9.5,
    color: '#64748B',
    fontWeight: '500',
  },
  serviceNameText: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4,
  },
  serviceDescText: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 12,
  },
  serviceFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
    paddingTop: 10,
  },
  startingAtLabel: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  servicePriceText: {
    fontSize: 16,
    fontWeight: '900',
  },
  serviceOriginalPrice: {
    fontSize: 12,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
    fontWeight: '500',
  },
  bookNowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F5B800',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  bookNowButtonText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  emptyResetBtn: {
    backgroundColor: '#F5B800',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
    marginTop: 8,
  },
  emptyResetBtnText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(5, 11, 30, 0.65)',
    justifyContent: 'flex-end',
  },
  schedulerCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    paddingTop: 18,
    paddingBottom: 28,
  },
  schedulerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  schedulerModalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  schedulerItemName: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  schedulerCloseBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  schedulerSectionTitle: {
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 0.5,
    paddingHorizontal: 20,
    marginTop: 14,
    marginBottom: 8,
  },
  modalCategoryBadge: {
    fontSize: 9,
    fontWeight: '900',
    color: '#D97706',
    backgroundColor: 'rgba(217, 119, 6, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    letterSpacing: 0.5,
  },
  customFieldsSection: {
    paddingHorizontal: 20,
    marginTop: 10,
    marginBottom: 8,
  },
  providerInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
    marginBottom: 10,
  },
  providerTitle: {
    fontSize: 12.5,
    fontWeight: '800',
  },
  providerSubtitle: {
    fontSize: 10.5,
    marginTop: 1,
  },
  fieldLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  chipOptionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chipBtnActive: {
    backgroundColor: '#F5B800',
    borderColor: '#F5B800',
  },
  chipBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  chipBtnTextActive: {
    color: '#0F172A',
  },
  customTextInput: {
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 12,
  },
  addressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  addressText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
  },
  dateCarouselContent: {
    paddingHorizontal: 20,
    gap: 8,
    paddingVertical: 4,
  },
  dateCardPill: {
    width: 68,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateDayName: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  dateNumText: {
    fontSize: 16,
    fontWeight: '900',
    marginVertical: 1,
  },
  dateMonthText: {
    fontSize: 9.5,
    fontWeight: '700',
  },
  dateStatusBadge: {
    marginTop: 4,
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  dateStatusBadgeText: {
    fontSize: 7.5,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  timeSlotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 20,
  },
  timeSlotCard: {
    width: '31%',
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeSlotText: {
    fontSize: 12,
    fontWeight: '700',
  },
  timeSlotStatusText: {
    fontSize: 8.5,
    fontWeight: '800',
    marginTop: 2,
  },
  bookingSummaryCard: {
    marginHorizontal: 20,
    marginTop: 16,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '800',
  },
  summarySubText: {
    fontSize: 10.5,
    fontWeight: '500',
  },
  schedulerFooter: {
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: 1,
    marginTop: 14,
  },
  confirmBookingBtn: {
    backgroundColor: '#F5B800',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledConfirmBtn: {
    opacity: 0.5,
  },
  confirmBookingBtnText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
  },

  // 2-Column Compact Grid Styles (Matching Home Screen)
  compact2ColGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 4,
  },
  compactCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F1EAD8',
    backgroundColor: '#FFFFFF',
    marginBottom: 4,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  compactImageWrapper: {
    width: '100%',
    height: 105,
    backgroundColor: '#F8FAFC',
    position: 'relative',
  },
  compactImage: {
    width: '100%',
    height: '100%',
  },
  compactDiscountBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#FF3B30',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  compactDiscountBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  compactWishlistBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  compactBody: {
    padding: 10,
    flex: 1,
    justifyContent: 'space-between',
  },
  compactTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    lineHeight: 16,
    minHeight: 32,
    marginBottom: 2,
  },
  compactCategorySub: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '500',
    marginBottom: 4,
  },
  compactRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  compactRatingText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
  },
  compactReviewsText: {
    fontSize: 10,
    color: '#64748B',
  },
  compactPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 8,
  },
  compactCurrentPrice: {
    fontSize: 13.5,
    fontWeight: '900',
    color: '#0F172A',
  },
  compactOriginalPrice: {
    fontSize: 10.5,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  compactFreeDeliveryText: {
    fontSize: 9.5,
    fontWeight: '600',
    color: '#64748B',
    marginLeft: 'auto',
  },
  compactActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
  },
  compactOutlineBtn: {
    flex: 1,
    height: 31,
    borderRadius: 7,
    borderWidth: 1.4,
    borderColor: '#FF6A00',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
    gap: 3,
  },
  compactOutlineBtnActive: {
    borderColor: '#16A34A',
    backgroundColor: '#DCFCE7',
  },
  compactOutlineBtnText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#FF6A00',
  },
  compactPrimaryBtn: {
    flex: 1,
    height: 31,
    borderRadius: 7,
    backgroundColor: '#FF6A00',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
    gap: 3,
  },
  compactPrimaryBtnText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  compactCartIconButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactCtaButton: {
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FF6A00',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  compactCtaButtonText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFBEB',
    borderColor: '#F59E0B',
    borderWidth: 1.2,
    borderRadius: 8,
    height: 32,
    flex: 1,
    paddingHorizontal: 4,
  },
  stepperBtn: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#D97706',
  },
  stepperQtyText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
    paddingHorizontal: 4,
  },
  compactAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#FF6A00',
    flex: 1,
    shadowColor: '#FF6A00',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 2,
  },
  compactAddBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  floatingCartBar: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    height: 52,
    backgroundColor: '#0F172A',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  floatingCartLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  floatingCartCountBadge: {
    backgroundColor: '#F5B800',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  floatingCartCountText: {
    color: '#0F172A',
    fontSize: 12,
    fontWeight: '900',
  },
  floatingCartPriceText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  floatingCartViewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F5B800',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  floatingCartViewBtnText: {
    color: '#0F172A',
    fontSize: 12.5,
    fontWeight: '800',
  },
  // --- STAY MODULE STYLES ---
  myBookingsHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    gap: 4,
  },
  myBookingsHeaderBtnText: {
    color: '#F5B800',
    fontSize: 11,
    fontWeight: '800',
  },
  myBookingsCountBadge: {
    backgroundColor: '#F5B800',
    borderRadius: 8,
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  myBookingsCountBadgeText: {
    color: '#0F172A',
    fontSize: 9,
    fontWeight: '900',
  },
  staySearchContainer: {
    marginTop: 8,
    marginBottom: 4,
  },
  staySearchField: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#FCD34D',
    borderWidth: 1.2,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  staySearchLabel: {
    fontSize: 8.5,
    fontWeight: '900',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  staySearchValue: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  staySearchValueSmall: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  stayToolbarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  stayToolbarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F1EAD8',
  },
  stayToolbarBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  stayFilterCountDot: {
    backgroundColor: '#EF4444',
    borderRadius: 7,
    width: 14,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stayFilterCountDotText: {
    color: '#FFFFFF',
    fontSize: 8.5,
    fontWeight: 'bold',
  },
  stayAmenitiesSummaryText: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: 4,
  },
  stayFreeCancelTag: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#10B981',
    marginBottom: 6,
  },
  stayViewRoomsBtn: {
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F5B800',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stayViewRoomsBtnText: {
    fontSize: 11.5,
    fontWeight: '900',
    color: '#0F172A',
  },
  sheetDragHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 10,
  },
  modalSheetContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 16,
  },
  modalSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalSheetTitle: {
    fontSize: 16,
    fontWeight: '900',
  },
  destItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  destItemText: {
    fontSize: 13.5,
  },
  modalPrimaryBtn: {
    backgroundColor: '#F5B800',
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  modalPrimaryBtnText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#0F172A',
  },
  stayDateSummaryBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderColor: '#F5B800',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  stayDateSummaryLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: '#64748B',
  },
  stayDateSummaryValue: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0F172A',
  },
  stayDateNightsPill: {
    backgroundColor: '#F5B800',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  stayDateNightsPillText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#0F172A',
  },
  guestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  guestRowTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  guestRowSub: {
    fontSize: 11,
    color: '#64748B',
  },
  guestStepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  guestStepperBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FFFBEB',
    borderColor: '#F59E0B',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guestStepperBtnText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#D97706',
  },
  guestCountText: {
    fontSize: 14,
    fontWeight: '800',
  },
  filterCheckRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  filterCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#64748B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterCheckboxActive: {
    backgroundColor: '#F5B800',
    borderColor: '#F5B800',
  },
  filterCheckText: {
    fontSize: 13,
    fontWeight: '600',
  },
  hotelDetailsSheet: {
    height: '92%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  hotelDetailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  hotelDetailsBackBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hotelDetailsTitleHeader: {
    fontSize: 15,
    fontWeight: '800',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  hotelDetailsHeroImg: {
    width: '100%',
    height: 220,
  },
  hotelDetailsTitle: {
    fontSize: 18,
    fontWeight: '900',
  },
  hotelDetailsPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 6,
  },
  hotelDetailsPriceText: {
    fontSize: 17,
    fontWeight: '900',
  },
  amenityCheckItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  amenityCheckText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#065F46',
  },
  hotelDetailsDescText: {
    fontSize: 12.5,
    lineHeight: 18,
    marginTop: 4,
  },
  policyBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    gap: 4,
    marginTop: 6,
  },
  policyText: {
    fontSize: 11.5,
    color: '#64748B',
    fontWeight: '500',
  },
  roomCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  roomTitle: {
    fontSize: 14,
    fontWeight: '900',
  },
  roomSub: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 4,
  },
  roomInclusion: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '600',
  },
  roomPriceText: {
    fontSize: 14,
    fontWeight: '900',
    marginTop: 6,
  },
  selectRoomBtn: {
    backgroundColor: '#F5B800',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  selectRoomBtnText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#0F172A',
  },
  bookingSummaryBox: {
    backgroundColor: '#FFFBEB',
    borderColor: '#F5B800',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 3,
  },
  bookingSummaryHotel: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0F172A',
  },
  bookingSummaryRoom: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#D97706',
  },
  bookingSummaryDates: {
    fontSize: 11.5,
    color: '#475569',
    fontWeight: '600',
  },
  bookingSummaryGuests: {
    fontSize: 11,
    color: '#64748B',
  },
  priceBreakdownBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  priceRowLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  priceRowVal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  priceRowTotalLabel: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0F172A',
  },
  priceRowTotalVal: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
  },
  inputLabelText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  formInput: {
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 13,
  },
  successCheckCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookingConfirmedTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#10B981',
  },
  bookingIdText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  bookingCardItem: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 10,
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  bookingCardImg: {
    width: 70,
    height: 70,
    borderRadius: 10,
  },
  confirmedStatusTag: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  confirmedStatusTagText: {
    color: '#059669',
    fontSize: 10,
    fontWeight: '800',
  },

  // Travel Specific Styles (Screenshot 1 Format)
  travelRouteBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF9C3',
    borderColor: '#FDE68A',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 6,
    marginBottom: 14,
  },
  travelRouteBannerText: {
    flex: 1,
    fontSize: 12.5,
    color: '#92400E',
    fontWeight: '600',
    lineHeight: 18,
  },
  travelListContainer: {
    paddingHorizontal: 2,
    marginTop: 4,
    gap: 14,
  },
  travelCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 14,
  },
  travelCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  travelVehicleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 8,
  },
  travelVehicleBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#B45309',
    letterSpacing: 0.4,
  },
  travelBadgeRight: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 8,
  },
  travelBadgeRightText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#0284C7',
  },
  travelMainInfoRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  travelThumbImage: {
    width: 68,
    height: 68,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
  },
  travelMainDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  travelCardTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    lineHeight: 20,
    marginBottom: 2,
  },
  travelCardOperator: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  travelRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  travelRatingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5B800',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  travelRatingText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#0F172A',
  },
  travelReviewsText: {
    fontSize: 11,
    fontWeight: '500',
  },
  travelTimingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 10,
  },
  travelTimingCol: {
    flex: 1,
  },
  travelTimeText: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  travelCityText: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  travelDurationCol: {
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  travelDurationText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#D97706',
    marginBottom: 2,
  },
  travelRouteLineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  travelDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#F59E0B',
  },
  travelLine: {
    width: 60,
    height: 1.5,
    backgroundColor: '#F59E0B',
  },
  travelDirectText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#16A34A',
    marginTop: 2,
  },
  travelBoardingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  travelBoardingText: {
    fontSize: 11.5,
    fontWeight: '600',
    flex: 1,
  },
  travelAmenitiesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  travelAmenityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 8,
  },
  travelAmenityChipText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#16A34A',
  },
  travelBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
  },
  travelPriceCol: {
    flexDirection: 'column',
  },
  travelPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  travelPriceAmount: {
    fontSize: 18,
    fontWeight: '900',
  },
  travelOriginalPrice: {
    fontSize: 12.5,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
    fontWeight: '600',
  },
  travelSeatsLeftText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#16A34A',
    marginTop: 2,
  },
  travelSelectSeatsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5B800',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    shadowColor: '#F5B800',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  travelSelectSeatsBtnText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#0F172A',
  },

  /* --- STAY DYNAMIC FRONT PAGE & MODALS STYLES --- */
  stayTopNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  stayHeaderBackBtn: {
    padding: 6,
    marginRight: 6,
  },
  stayHeaderTitle: {
    fontSize: 20,
    fontWeight: '800',
    flex: 1,
  },
  stayHeaderTitleLarge: {
    fontSize: 27,
    fontWeight: '900',
    flex: 1,
    letterSpacing: -0.5,
  },
  stayHotelDealRow: {
    paddingHorizontal: 16,
    marginTop: 2,
    marginBottom: 6,
    alignItems: 'flex-start',
  },
  staySingleHotelDealBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF1F2',
    borderRadius: 14,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    borderColor: '#E11D48',
  },
  staySwitcherTabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 8,
    marginTop: 4,
    marginBottom: 4,
  },
  staySwitcherTabInactive: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  staySwitcherTabActive: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF1F2',
    borderRadius: 12,
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderWidth: 1.5,
    borderColor: '#E11D48',
  },
  staySwitcherTabTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  staySwitcherTabOffer: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
  },
  staySwitcherTabTitleActive: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#E11D48',
  },
  staySwitcherTabOfferActive: {
    fontSize: 10,
    fontWeight: '800',
    color: '#059669',
  },
  stayHeroSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  stayHeroTextCol: {
    flex: 1,
  },
  stayHeroTitle: {
    fontSize: 23,
    fontWeight: '900',
    color: '#0F172A',
    lineHeight: 29,
    letterSpacing: -0.5,
  },
  stayHeroTravelerImage: {
    width: 125,
    height: 115,
    borderRadius: 16,
  },
  staySearchCardContainer: {
    borderRadius: 20,
    overflow: 'hidden',
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  stayVerifiedBanner: {
    backgroundColor: '#1E40AF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 6,
  },
  stayVerifiedBannerText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  stayWhiteCardBody: {
    backgroundColor: '#FFFFFF',
  },
  stayCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  stayCardRowIconBox: {
    width: 36,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  stayCardRowLabel: {
    fontSize: 11.5,
    fontWeight: '500',
    color: '#64748B',
    marginBottom: 2,
  },
  stayCardRowValue: {
    fontSize: 15.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  stayCardRowDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 16,
  },
  stayCardVerticalDivider: {
    width: 1,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 4,
  },
  staySearchRedBtn: {
    backgroundColor: '#E11D48',
    borderRadius: 28,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
    shadowColor: '#E11D48',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  staySearchRedBtnText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  stayEarlyCheckInBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  stayAlarmClockCol: {
    width: 36,
    alignItems: 'center',
  },
  stayEarlyCheckInSub: {
    fontSize: 11,
    fontWeight: '600',
    color: '#78350F',
  },
  stayEarlyCheckInTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#78350F',
  },
  stayEarlyCheckInPill: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  stayEarlyCheckInPillText: {
    fontSize: 11.5,
    fontWeight: '900',
    color: '#0F172A',
  },
  stayChipsScroll: {
    paddingVertical: 6,
    paddingBottom: 8,
    gap: 8,
  },
  stayEmptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  stayEmptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: 12,
  },
  stayEmptySub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  stayEmptyResetBtn: {
    marginTop: 16,
    backgroundColor: '#E11D48',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  stayEmptyResetBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },

  /* Dest Modal Styles (Screenshot 2) */
  destModalContainer: {
    flex: 1,
  },
  destModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  destModalBackBtn: {
    padding: 6,
    marginRight: 6,
  },
  destSearchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 24,
    paddingHorizontal: 12,
    height: 42,
  },
  destSearchTextInput: {
    flex: 1,
    fontSize: 14.5,
    fontWeight: '600',
    paddingVertical: 0,
  },
  destSectionHeaderTitle: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#64748B',
    marginBottom: 8,
  },
  destResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  destIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  destResultTitle: {
    fontSize: 14.5,
    fontWeight: '700',
  },
  destResultSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  destFeaturedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  destFeaturedTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  destFeaturedSub: {
    fontSize: 12.5,
    color: '#64748B',
    marginTop: 2,
  },
  destDropPointLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  destDropPointPill: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 4,
  },
  destDropPointPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#166534',
  },
  destSectionHeader: {
    paddingTop: 18,
    paddingBottom: 8,
  },
  destSectionTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  destRecentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    borderBottomWidth: 1,
  },
  destRecentTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    flex: 1,
  },
  destRecentTag: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },
  destPopularRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    borderBottomWidth: 1,
  },
  destPopularTitle: {
    fontSize: 14.5,
    fontWeight: '700',
  },

  /* Calendar Modal Styles (Screenshot 3) */
  calendarModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  calendarModalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 16,
    paddingBottom: 24,
    maxHeight: '92%',
  },
  calendarHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  calendarTitle: {
    fontSize: 19,
    fontWeight: '800',
  },
  calendarOfferBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EDE9FE',
    marginHorizontal: 16,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginVertical: 8,
  },
  calendarPriceTagBadge: {
    backgroundColor: '#E11D48',
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 2,
    marginRight: 10,
  },
  calendarPriceTagText: {
    color: '#FFFFFF',
    fontSize: 8.5,
    fontWeight: '900',
    textAlign: 'center',
  },
  calendarOfferText: {
    color: '#4C1D95',
    fontSize: 13,
    fontWeight: '700',
  },
  calendarWeekdaysRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 6,
  },
  calendarWeekdayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  calendarMonthHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  calendarMonthTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  calendarHolidaysSubtitle: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#7C3AED',
    marginTop: 2,
  },
  calendarMonthNavBtn: {
    padding: 4,
  },
  calendarLongWeekendBannerContainer: {
    paddingHorizontal: 16,
    marginBottom: 4,
    alignItems: 'center',
  },
  calendarLongWeekendTag: {
    backgroundColor: '#CCFBF1',
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 12,
  },
  calendarLongWeekendTagText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#0F766E',
  },
  calendarDaysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
  },
  calendarDayCell: {
    width: '14.28%',
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarDayCellLongWeekend: {
    backgroundColor: 'rgba(204, 251, 241, 0.4)',
  },
  calendarDayCellRangeBetween: {
    backgroundColor: '#0F172A',
  },
  calendarDayCellRangeStart: {
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
  },
  calendarDayCellRangeEnd: {
    backgroundColor: '#0F172A',
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
  },
  holidayAvatarSmall: {
    position: 'absolute',
    top: 2,
  },
  calendarDayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarDayCircleSelected: {
    backgroundColor: '#0F172A',
  },
  calendarDayCircleCurrent: {
    borderWidth: 1.5,
    borderColor: '#0F172A',
  },
  calendarDayNumText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  calendarDayNumTextSelected: {
    color: '#FFFFFF',
  },
  holidayNameText: {
    fontSize: 8,
    fontWeight: '600',
    color: '#7C3AED',
    marginTop: -2,
  },
  calendarSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 12,
    gap: 10,
  },
  calendarSummaryBox: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#0F172A',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  calendarSummaryBoxLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  calendarSummaryBoxValue: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  calendarSummaryArrowCol: {
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  calendarSummaryNightsText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 2,
  },
  calendarSelectDatesBtn: {
    backgroundColor: '#E11D48',
    marginHorizontal: 16,
    borderRadius: 25,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  },
  calendarSelectDatesBtnText: {
    color: '#FFFFFF',
    fontSize: 15.5,
    fontWeight: '800',
  },

  /* Guests Modal Styles (Screenshot 4) */
  guestModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  guestModalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 28,
  },
  guestModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
  },
  guestModalTitle: {
    fontSize: 19,
    fontWeight: '800',
  },
  guestItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  guestIconBox: {
    width: 36,
    alignItems: 'flex-start',
  },
  guestItemTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  guestItemSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  guestStepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    overflow: 'hidden',
  },
  guestStepBtn: {
    width: 44,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  guestStepBtnDisabled: {
    opacity: 0.5,
  },
  guestStepBtnPlus: {
    backgroundColor: '#FFE4E6',
  },
  guestStepVal: {
    fontSize: 15.5,
    fontWeight: '800',
    minWidth: 36,
    textAlign: 'center',
  },
  guestAddChildBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFE4E6',
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FECDD3',
  },
  guestAddChildBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginLeft: 4,
  },
  guestProceedBtn: {
    backgroundColor: '#E11D48',
    borderRadius: 25,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  guestProceedBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },

  // --- Service Scheduler Calendar & Round Analog Clock Styles ---
  srvPickerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  srvCalendarCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
  },
  srvClockCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
  },
  srvPickerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  srvStatusDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
  },
  srvPickerHeaderTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
  },
  srvPickerCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  srvCalendarPreviewBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF9E7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  srvCalendarPreviewText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#92400E',
    flex: 1,
  },
  srvCalendarMonthNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  srvCalendarNavBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  srvCalendarMonthTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0F172A',
  },
  srvCalendarWeekRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 6,
    marginBottom: 6,
  },
  srvCalendarWeekCell: {
    flex: 1,
    alignItems: 'center',
  },
  srvCalendarWeekText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94A3B8',
  },
  srvCalendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  srvCalendarDayCell: {
    width: '14.28%',
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 2,
  },
  srvCalendarDayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  srvCalendarDayCircleSelected: {
    backgroundColor: '#F5B800',
  },
  srvCalendarDayNum: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  srvCalendarDayNumPast: {
    color: '#CBD5E1',
  },
  srvCalendarDayNumSelected: {
    color: '#0F172A',
    fontWeight: '900',
  },
  srvPickerActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 12,
  },
  srvPickerCancelBtn: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  srvPickerCancelBtnText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#64748B',
  },
  srvPickerConfirmBtn: {
    flex: 2,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#F5B800',
    alignItems: 'center',
    justifyContent: 'center',
  },
  srvPickerConfirmBtnText: {
    fontSize: 12.5,
    fontWeight: '900',
    color: '#0F172A',
  },
  srvClockPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FDE68A',
    backgroundColor: '#FEF9E7',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 12,
  },
  srvClockBox: {
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    minWidth: 54,
  },
  srvClockBoxActive: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F5B800',
    borderWidth: 1.5,
  },
  srvClockDigit: {
    fontSize: 26,
    fontWeight: '900',
    color: '#B45309',
    letterSpacing: 0.5,
  },
  srvClockSub: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748B',
    marginTop: 1,
  },
  srvClockColon: {
    fontSize: 24,
    fontWeight: '900',
    color: '#B45309',
    marginTop: -4,
  },
  srvPeriodToggleCol: {
    gap: 4,
    marginLeft: 4,
  },
  srvPeriodToggleBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
  },
  srvPeriodToggleBtnActive: {
    backgroundColor: '#F5B800',
    borderColor: '#F5B800',
  },
  srvPeriodToggleBtnText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#475569',
  },
  srvPeriodToggleBtnTextActive: {
    color: '#0F172A',
    fontWeight: '900',
  },
  srvClockModeTabRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  srvClockModeTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  srvClockModeTabActive: {
    backgroundColor: '#F5B800',
    borderColor: '#F5B800',
  },
  srvClockModeTabText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#64748B',
  },
  srvClockModeTabTextActive: {
    color: '#0F172A',
    fontWeight: '900',
  },
  srvClockDialSubInstruction: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 6,
  },
  srvClockDialWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  srvClockDialCircle: {
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: '#F8FAFC',
    borderWidth: 2,
    borderColor: '#FDE68A',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  srvClockHandPivotWrap: {
    position: 'absolute',
    left: 125,
    top: 125,
    width: 0,
    height: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 6,
  },
  srvClockHandShaft: {
    position: 'absolute',
    left: -1.5,
    bottom: 0,
    width: 3,
    height: 86,
    borderRadius: 1.5,
    backgroundColor: '#F5B800',
  },
  srvClockHandTipKnob: {
    position: 'absolute',
    left: -19,
    top: -86 - 19,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F5B800',
    elevation: 6,
    shadowColor: '#F5B800',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.45,
    shadowRadius: 5,
  },
  srvClockCenterPin: {
    position: 'absolute',
    left: 125 - 7,
    top: 125 - 7,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#F5B800',
    zIndex: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  srvClockCenterPinDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#0F172A',
  },
  srvClockDialNumberPill: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 8,
  },
  srvClockDialNumberText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#334155',
  },
  srvClockDialNumberTextSelected: {
    color: '#0F172A',
    fontWeight: '900',
  },
  travelSearchHeaderCard: {
    marginHorizontal: 16,
    marginBottom: 14,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  travelSearchHeaderInfo: {
    flex: 1,
  },
  travelRouteBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  travelRouteBadgeText: {
    fontSize: 13,
    fontWeight: '800',
  },
  travelRouteMetaRow: {
    marginTop: 3,
  },
  travelRouteMetaText: {
    fontSize: 11,
    fontWeight: '600',
  },
  travelEditSearchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
  },
  travelEditSearchBtnText: {
    fontSize: 11.5,
    fontWeight: '800',
  },
  travelEmptyContainer: {
    paddingVertical: 48,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  travelEmptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadMoreBtn: {
    marginVertical: 18,
    marginHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5B800',
  },
  loadMoreBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
});
