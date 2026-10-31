import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  TextInput,
  Modal,
  Share,
  Alert,
  useWindowDimensions,
  StatusBar,
  PanResponder,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import * as Icons from 'lucide-react-native';
import { useThemeStore } from '../../store/themeStore';
import { useWishlistStore } from '../../store/wishlistStore';
import { useAuthStore, isUserAuthenticated } from '../../store/authStore';
import { useAuthGuardStore } from '../../store/authGuardStore';
import { useOrderStore, Order } from '../../store/orderStore';
import { apiFetch, resolveImageUrl } from '../../services/api';
import RazorpayModal, { RazorpayOrderDetails } from '../../components/RazorpayModal';
import { prepareRazorpayOrder } from '../../services/razorpayService';
import { RAZORPAY_KEY_ID } from '../../services/env';
import { useTranslation } from '../../store/languageStore';
import { dispatchCustomerNotification } from '../../services/notificationService';

// Guest Information interface for each person travelling
export interface GuestInfo {
  fullName: string;
  aadhaarNumber: string;
  phoneNumber: string;
}

// 14-day calendar date item
interface DateItem {
  dayName: string; // 'SAT'
  dateNum: number; // 29
  monthStr: string; // 'AUG'
  fullDateStr: string; // 'Sat, 29 Aug 2026'
  dateObj: Date;
  status: 'AVAILABLE' | 'FULL';
}

export default function StayDetails() {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const route = useRoute();
  const navigation = useNavigation<any>();
  const routeParams = (route.params as any) || {};
  const colors = useThemeStore((state) => state.colors);
  const themeMode = useThemeStore((state) => state.themeMode);
  const isLight = colors.background === '#FFFDF5' || colors.background === '#FFFFFF' || colors.background === '#F8FAFC' || colors.background === '#FFF8E8' || themeMode === 'light';

  const stay = routeParams.stay || null;

  if (!stay) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top, justifyContent: 'center', alignItems: 'center', padding: 24 }]}>
        <Icons.Hotel color={colors.subtext} size={56} style={{ marginBottom: 16 }} />
        <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 8 }}>
          Stay Not Found
        </Text>
        <Text style={{ fontSize: 14, color: colors.subtext, textAlign: 'center', marginBottom: 20 }}>
          This property listing is unavailable or has been removed.
        </Text>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{ paddingHorizontal: 20, paddingVertical: 10, backgroundColor: colors.primary, borderRadius: 8 }}
        >
          <Text style={{ color: '#000', fontWeight: 'bold' }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const currentUser = useAuthStore((state) => state.currentUser);
  const isWishlisted = useWishlistStore((state) => state.wishlistItems.some((w) => w.id === stay.id));
  const toggleWishlist = useWishlistStore((state) => state.toggleWishlist);

  // Gallery State
  const galleryImages = useMemo(() => [
    stay.image,
    'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800&auto=format&fit=crop&q=80',
  ], [stay.image]);

  const [selectedImgIndex, setSelectedImgIndex] = useState(0);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);

  const defaultCheckInTime = stay.checkInTime || '12:00 PM';
  const defaultCheckOutTime = stay.checkOutTime || '11:00 AM';

  const defaultRoomName = (stay.roomClass || 'Deluxe Room').toUpperCase();
  const defaultRoomGuests = `${stay.numberOfGuests || '2 Guests'} • ${stay.bedType || '1 King Bed'}${stay.roomView ? ` • ${stay.roomView}` : ''}`;
  const defaultRoomInclusions = [
    stay.freeBreakfast !== false && (stay.freeBreakfast || stay.amenities?.includes('Breakfast') || stay.amenities?.includes('Free Breakfast')) ? 'Breakfast included' : null,
    stay.freeCancellation !== false ? 'Free cancellation' : null,
    'Free Wi-Fi',
    stay.roomSize ? `${stay.roomSize}` : null,
  ].filter(Boolean) as string[];

  const parsedStayPrice = typeof stay.priceNum === 'number'
    ? stay.priceNum
    : (typeof stay.price === 'number'
        ? stay.price
        : (parseFloat(String(stay.price || '0').replace(/[^\d.]/g, '')) || 0));

  const parsedStayPriceStr = typeof stay.price === 'string' && stay.price.trim()
    ? stay.price
    : (parsedStayPrice > 0 ? `₹${parsedStayPrice.toLocaleString('en-IN')}` : 'Price on request');

  // Room State
  const [selectedRoom, setSelectedRoom] = useState<{
    id: string;
    name: string;
    guests: string;
    priceNum: number;
    priceStr: string;
    inclusions: string[];
  }>({
    id: 'deluxe',
    name: defaultRoomName,
    guests: defaultRoomGuests,
    priceNum: parsedStayPrice,
    priceStr: parsedStayPriceStr,
    inclusions: defaultRoomInclusions.length > 0 ? defaultRoomInclusions : ['Breakfast included', 'Free cancellation', 'Free Wi-Fi'],
  });

  // Booking Configuration Modal State
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [bookingStep, setBookingStep] = useState<1 | 2 | 3 | 4>(1); // 1: Dates & Guests, 2: Guest Details, 3: Payment & Summary, 4: Confirmed
  const [razorpayModalVisible, setRazorpayModalVisible] = useState(false);
  const [razorpayOrder, setRazorpayOrder] = useState<RazorpayOrderDetails | null>(null);

  // --- Dynamic Dates Generator (14 Days) & Calendar State ---
  const [calendarMonth, setCalendarMonth] = useState<number>(new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState<number>(new Date().getFullYear());
  const [checkInDateObj, setCheckInDateObj] = useState<Date>(() => new Date());
  const [checkOutDateObj, setCheckOutDateObj] = useState<Date>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d;
  });

  const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const WEEKDAYS_SHORT = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  const dayNamesShort = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const monthNamesShort = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

  const selectedCheckInItem = useMemo(() => {
    const d = checkInDateObj;
    return {
      dayName: dayNamesShort[d.getDay()],
      dateNum: d.getDate(),
      monthStr: monthNamesShort[d.getMonth()],
      fullDateStr: `${dayNamesShort[d.getDay()]}, ${d.getDate()} ${monthNamesShort[d.getMonth()]} ${d.getFullYear()}`,
      dateObj: d,
      status: 'AVAILABLE' as const,
    };
  }, [checkInDateObj]);

  const selectedCheckOutItem = useMemo(() => {
    const d = checkOutDateObj;
    return {
      dayName: dayNamesShort[d.getDay()],
      dateNum: d.getDate(),
      monthStr: monthNamesShort[d.getMonth()],
      fullDateStr: `${dayNamesShort[d.getDay()]}, ${d.getDate()} ${monthNamesShort[d.getMonth()]} ${d.getFullYear()}`,
      dateObj: d,
      status: 'AVAILABLE' as const,
    };
  }, [checkOutDateObj]);

  const computedNights = useMemo(() => {
    const diffTime = checkOutDateObj.getTime() - checkInDateObj.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(1, diffDays);
  }, [checkInDateObj, checkOutDateObj]);

  const calendarDays = useMemo(() => {
    const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
    const firstDayIndex = new Date(calendarYear, calendarMonth, 1).getDay();

    const cells: { day: number | null; dateObj: Date | null }[] = [];
    for (let i = 0; i < firstDayIndex; i++) {
      cells.push({ day: null, dateObj: null });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({
        day: d,
        dateObj: new Date(calendarYear, calendarMonth, d),
      });
    }
    return cells;
  }, [calendarYear, calendarMonth]);

  const handlePrevMonth = () => {
    if (calendarMonth === 0) {
      setCalendarMonth(11);
      setCalendarYear((y) => y - 1);
    } else {
      setCalendarMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (calendarMonth === 11) {
      setCalendarMonth(0);
      setCalendarYear((y) => y + 1);
    } else {
      setCalendarMonth((m) => m + 1);
    }
  };

  const handleCalendarSelectDate = (dateObj: Date, target: 'checkIn' | 'checkOut') => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const checkDate = new Date(dateObj);
    checkDate.setHours(0, 0, 0, 0);

    if (checkDate < today) {
      Alert.alert('Past Date', 'Please select a date from today onwards.');
      return;
    }

    if (target === 'checkIn') {
      setCheckInDateObj(checkDate);
      const currentOut = new Date(checkOutDateObj);
      currentOut.setHours(0, 0, 0, 0);
      if (currentOut <= checkDate) {
        const nextDay = new Date(checkDate);
        nextDay.setDate(nextDay.getDate() + 1);
        setCheckOutDateObj(nextDay);
      }
    } else {
      const currentIn = new Date(checkInDateObj);
      currentIn.setHours(0, 0, 0, 0);
      if (checkDate <= currentIn) {
        Alert.alert('Invalid Check-Out Date', 'Check-out date must be at least 1 day after check-in date.');
        return;
      }
      setCheckOutDateObj(checkDate);
    }
  };

  // Check-In & Departure Timings State
  const [checkInIndex, setCheckInIndex] = useState<number>(0);
  const [checkInTimeSlot, setCheckInTimeSlot] = useState<string>(defaultCheckInTime);
  const [manualCheckInTime, setManualCheckInTime] = useState<string>(defaultCheckInTime);
  const [departureTimeSlot, setDepartureTimeSlot] = useState<string>('04:00 PM');
  const [manualDepartureTime, setManualDepartureTime] = useState<string>('04:00 PM');

  // Check-Out State (default to next day index 1)
  const [checkOutIndex, setCheckOutIndex] = useState<number>(1);
  const [checkOutTimeSlot, setCheckOutTimeSlot] = useState<string>(defaultCheckOutTime);
  const [manualCheckOutTime, setManualCheckOutTime] = useState<string>(defaultCheckOutTime);

  // Guests & Rooms Configuration State
  const [adultsCount, setAdultsCount] = useState<number>(2);
  const [childrenCount, setChildrenCount] = useState<number>(0);
  const [roomsCount, setRoomsCount] = useState<number>(1);

  // Time Slot Options
  const departureTimeOptions = ['04:00 PM', '05:00 PM', '06:00 PM'];
  const checkInTimeOptions = ['12:00 PM', '01:00 PM', '02:00 PM'];
  const checkOutTimeOptions = ['10:00 AM', '11:00 AM', '12:00 PM'];

  // Round Clock Dial Modal State
  const CLOCK_HOURS_ITEMS = [
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
  const CLOCK_MINUTES_ITEMS = [
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

  // Calendar Modal State (Opened on clicking Date field)
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [datePickerTarget, setDatePickerTarget] = useState<'checkIn' | 'checkOut'>('checkIn');

  // Round Clock Dial Modal State (Opened on clicking Time field)
  const [timePickerVisible, setTimePickerVisible] = useState(false);
  const [timePickerTarget, setTimePickerTarget] = useState<'checkIn' | 'checkOut'>('checkIn');
  const [clockMode, setClockMode] = useState<'hour' | 'minute'>('hour');
  const [pickerHour, setPickerHour] = useState('12');
  const [pickerMinute, setPickerMinute] = useState('00');
  const [pickerPeriod, setPickerPeriod] = useState<'AM' | 'PM'>('PM');

  // Keep ref synchronized with clockMode for PanResponder callbacks
  const clockModeRef = useRef<'hour' | 'minute'>(clockMode);
  useEffect(() => {
    clockModeRef.current = clockMode;
  }, [clockMode]);

  // Compute angle of Clock Hand based on selected hour or minute
  const clockHandAngle = useMemo(() => {
    if (clockMode === 'hour') {
      const idx = CLOCK_HOURS_ITEMS.findIndex(
        (item) => item.val === pickerHour || parseInt(item.val, 10) === parseInt(pickerHour, 10)
      );
      return (idx >= 0 ? idx : 0) * 30;
    } else {
      const idx = CLOCK_MINUTES_ITEMS.findIndex(
        (item) => item.val === pickerMinute || parseInt(item.val, 10) === parseInt(pickerMinute, 10)
      );
      return (idx >= 0 ? idx : 0) * 30;
    }
  }, [clockMode, pickerHour, pickerMinute, CLOCK_HOURS_ITEMS, CLOCK_MINUTES_ITEMS]);

  // Rotate & Select handler based on touch coordinates on the 250px clock face
  const updateClockFromLocation = (locX: number, locY: number) => {
    const center = 125; // 250px dial width / 2
    const dx = locX - center;
    const dy = locY - center;
    // Angle in degrees from 12 o'clock (0 degrees is straight UP)
    const rad = Math.atan2(dy, dx);
    const deg = (rad * (180 / Math.PI) + 90 + 360) % 360;

    if (clockModeRef.current === 'hour') {
      const hIdx = Math.round(deg / 30) % 12;
      const hoursList = ['12', '01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11'];
      setPickerHour(hoursList[hIdx]);
    } else {
      const mIdx = Math.round(deg / 30) % 12;
      const minutesList = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];
      setPickerMinute(minutesList[mIdx]);
    }
  };

  // PanResponder to rotate the clock hands with drag gestures on the clock face
  const clockPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt) => {
          updateClockFromLocation(evt.nativeEvent.locationX, evt.nativeEvent.locationY);
        },
        onPanResponderMove: (evt) => {
          updateClockFromLocation(evt.nativeEvent.locationX, evt.nativeEvent.locationY);
        },
        onPanResponderRelease: () => {
          // If user just rotated and selected an hour, smoothly advance to minute face
          if (clockModeRef.current === 'hour') {
            setClockMode('minute');
          }
        },
      }),
    []
  );

  const handleOpenTimePicker = (target: 'checkIn' | 'checkOut') => {
    setTimePickerTarget(target);
    setClockMode('hour');
    const rawTime = target === 'checkIn' ? (checkInTimeSlot || '12:00 PM') : (checkOutTimeSlot || '11:00 AM');
    const match = rawTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    if (match) {
      setPickerHour(match[1].padStart(2, '0'));
      setPickerMinute(match[2]);
      setPickerPeriod((match[3] || 'PM').toUpperCase() as 'AM' | 'PM');
    } else {
      setPickerHour(target === 'checkIn' ? '12' : '11');
      setPickerMinute('00');
      setPickerPeriod(target === 'checkIn' ? 'PM' : 'AM');
    }
    setTimePickerVisible(true);
  };

  const handleConfirmTimePicker = () => {
    const formatted = `${pickerHour}:${pickerMinute} ${pickerPeriod}`;
    if (timePickerTarget === 'checkIn') {
      setCheckInTimeSlot(formatted);
      setManualCheckInTime(formatted);
    } else {
      setCheckOutTimeSlot(formatted);
      setManualCheckOutTime(formatted);
    }
    setTimePickerVisible(false);
  };

  // Form Details
  const [guestName, setGuestName] = useState(currentUser?.name || '');
  const [guestMobile, setGuestMobile] = useState(currentUser?.phone || '');
  const [guestEmail, setGuestEmail] = useState(currentUser?.email || '');
  const [guestSpecialNote, setGuestSpecialNote] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'Card' | 'Net Banking' | 'Pay at Hotel'>('UPI');
  const [confirmedBookingId, setConfirmedBookingId] = useState('');

  // Multi-Guest Details state (for each person traveling)
  const totalGuestsCount = adultsCount + childrenCount;
  const [guestList, setGuestList] = useState<GuestInfo[]>([
    { fullName: currentUser?.name || '', aadhaarNumber: '', phoneNumber: currentUser?.phone || '' },
    { fullName: '', aadhaarNumber: '', phoneNumber: '' },
  ]);

  // Keep guestList length synchronized with totalGuestsCount (Adults + Children)
  React.useEffect(() => {
    setGuestList((prev) => {
      const updated = [...prev];
      if (updated.length < totalGuestsCount) {
        for (let i = updated.length; i < totalGuestsCount; i++) {
          updated.push({
            fullName: '',
            aadhaarNumber: '',
            phoneNumber: '',
          });
        }
      } else if (updated.length > totalGuestsCount) {
        return updated.slice(0, totalGuestsCount);
      }
      return updated;
    });
  }, [totalGuestsCount]);

  const handleUpdateGuestInfo = (index: number, field: keyof GuestInfo, value: string) => {
    setGuestList((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  // Dynamic Price Calculations based on number of persons (Adults & Children)
  const adultPricePerNight = selectedRoom.priceNum;
  const childPricePerNight = Math.round(selectedRoom.priceNum * 0.5); // 50% for children
  const nightlyTotalPerRoom = (adultsCount * adultPricePerNight) + (childrenCount * childPricePerNight);
  const baseRoomCharge = nightlyTotalPerRoom * computedNights * roomsCount;
  const rawTaxRate = typeof stay.taxRate === 'number' ? stay.taxRate : (typeof stay.taxPercent === 'number' ? stay.taxPercent : null);
  const rawTaxAmount = typeof stay.taxAmount === 'number' ? stay.taxAmount : (typeof stay.tax === 'number' ? stay.tax : null);
  const taxesAndFees = rawTaxRate !== null && rawTaxRate > 0
    ? Math.round(baseRoomCharge * (rawTaxRate / 100))
    : (rawTaxAmount !== null && rawTaxAmount > 0
        ? Math.round(rawTaxAmount * computedNights * roomsCount)
        : 0);
  const grandTotal = baseRoomCharge + taxesAndFees;

  // Handle Share
  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out ${stay.name} in ${stay.location} on Connect! ${stay.price}`,
        title: stay.name,
      });
    } catch (e) {
      console.warn('Share error:', e);
    }
  };

  // Amenities list icon resolver
  const renderAmenityIcon = (amen: string) => {
    const a = amen.toLowerCase();
    if (a.includes('pool') || a.includes('swim')) return <Icons.Waves color="#059669" size={16} />;
    if (a.includes('wifi') || a.includes('internet')) return <Icons.Wifi color="#059669" size={16} />;
    if (a.includes('breakfast') || a.includes('food') || a.includes('dining')) return <Icons.Coffee color="#059669" size={16} />;
    if (a.includes('park')) return <Icons.Car color="#059669" size={16} />;
    if (a.includes('ac') || a.includes('air') || a.includes('condition')) return <Icons.Wind color="#059669" size={16} />;
    if (a.includes('gym') || a.includes('fit')) return <Icons.Dumbbell color="#059669" size={16} />;
    if (a.includes('spa')) return <Icons.Sparkles color="#059669" size={16} />;
    return <Icons.CheckCircle2 color="#059669" size={16} />;
  };

  return (
    <View style={[styles.container, { backgroundColor: isLight ? '#FFFDF5' : colors.background }]}>
      <StatusBar
        barStyle={colors.statusBarStyle}
        backgroundColor={isLight ? '#FFF1C7' : colors.cardBg}
        translucent={false}
      />
      {/* Top Header */}
      <View
        style={[
          styles.headerWrapper,
          {
            paddingTop: Math.max(insets.top, 16) + 6,
            backgroundColor: isLight ? '#FFF1C7' : colors.cardBg,
            borderBottomColor: isLight ? 'rgba(242, 183, 5, 0.25)' : colors.cardBorder,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.headerIconBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Icons.ArrowLeft color={colors.text} size={22} />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
          {stay.name}
        </Text>

        <View style={styles.headerRightActions}>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() =>
              toggleWishlist({
                id: stay.id,
                name: stay.name,
                price: stay.price,
                category: 'Stay',
                image: stay.image,
              })
            }
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Icons.Heart
              color={isWishlisted ? '#EF4444' : colors.text}
              size={22}
              fill={isWishlisted ? '#EF4444' : 'none'}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={handleShare}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Icons.Share2 color={colors.text} size={20} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content Scroll */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 16) + 85 },
        ]}
      >
        {/* IMAGE GALLERY */}
        <View style={styles.galleryContainer}>
          <Image
            source={{ uri: galleryImages[selectedImgIndex] }}
            style={styles.mainGalleryImg}
            resizeMode="cover"
          />

          <View style={styles.thumbnailRow}>
            {galleryImages.map((imgUri, index) => {
              const isSelected = selectedImgIndex === index;
              return (
                <TouchableOpacity
                  key={`thumb_${index}`}
                  style={[
                    styles.thumbnailWrapper,
                    isSelected && styles.thumbnailWrapperSelected,
                  ]}
                  activeOpacity={0.8}
                  onPress={() => setSelectedImgIndex(index)}
                >
                  <Image source={{ uri: imgUri }} style={styles.thumbnailImg} resizeMode="cover" />
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.bodyContent}>
          {/* PROPERTY INFORMATION */}
          <View style={styles.propInfoSection}>
            <View style={styles.titleRow}>
              <Text style={[styles.propTitle, { color: colors.text }]}>{stay.name}</Text>
            </View>

            {/* Room type / class tag & Hotel star rating */}
            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 4, marginBottom: 6 }}>
              {Boolean(stay.roomClass || stay.roomName) && (
                <View style={{ backgroundColor: '#EEF2FF', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: '#C7D2FE' }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#4338CA' }}>{stay.roomClass || stay.roomName}</Text>
                </View>
              )}
              {Boolean(stay.starRating) && (
                <View style={{ backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: '#FDE68A', flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#B45309' }}>{stay.starRating} Star Hotel</Text>
                  <Text style={{ color: '#D97706', fontSize: 10 }}>{'★'.repeat(Math.min(Number(stay.starRating) || 4, 5))}</Text>
                </View>
              )}
              {Boolean(stay.propertyType && stay.propertyType !== 'Hotels') && (
                <View style={{ backgroundColor: '#F0FDF4', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: '#BBF7D0' }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#15803D' }}>{stay.propertyType}</Text>
                </View>
              )}
            </View>

            <View style={styles.ratingAndLocRow}>
              <View style={styles.ratingBadge}>
                <Icons.Star color="#F5B800" size={13} fill="#F5B800" />
                <Text style={styles.ratingBadgeText}>{stay.rating || '4.9'}</Text>
              </View>
              <Text style={[styles.reviewsCountText, { color: isLight ? '#64748B' : '#94A3B8' }]}>
                ({stay.reviews || '630'} reviews)
              </Text>
              <Text style={styles.bulletSeparator}>•</Text>
              <Text style={[styles.locationText, { color: isLight ? '#0F172A' : '#F5B800' }]} numberOfLines={1}>
                {stay.location}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.viewOnMapBtn}
              activeOpacity={0.8}
              onPress={() => setIsMapModalOpen(true)}
            >
              <Icons.MapPin color="#D97706" size={15} />
              <Text style={styles.viewOnMapBtnText}>View on Map</Text>
            </TouchableOpacity>
          </View>

          {/* PRICE SECTION */}
          <View style={[styles.priceCard, { backgroundColor: isLight ? '#FFFFFF' : 'rgba(255, 255, 255, 0.05)', borderColor: isLight ? '#F1EAD8' : colors.cardBorder }]}>
            <View style={styles.priceLeftRow}>
              <Text style={[styles.priceLargeText, { color: isLight ? '#0F172A' : '#F5B800' }]}>
                {stay.price}
              </Text>
              {stay.originalPrice && (
                <Text style={styles.priceOriginalText}>{stay.originalPrice}</Text>
              )}
              <View style={styles.discountTag}>
                <Text style={styles.discountTagText}>{stay.discount || '24% OFF'}</Text>
              </View>
            </View>
            {taxesAndFees > 0 && (
              <Text style={styles.taxesNoticeText}>
                + ₹{Math.round(taxesAndFees / (computedNights * roomsCount))} taxes & fees per night
              </Text>
            )}
          </View>

          {/* ROOM SPECIFICATIONS & KEY HIGHLIGHTS */}
          <View style={styles.sectionBlock}>
            <Text style={[styles.sectionHeading, { color: colors.text }]}>Room Specifications & Details</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8 }}>
              {/* Bed Type */}
              <View
                style={[
                  styles.amenityItemCard,
                  {
                    width: '48%',
                    backgroundColor: isLight ? '#FFFFFF' : 'rgba(255, 255, 255, 0.04)',
                    borderColor: isLight ? '#F1EAD8' : colors.cardBorder,
                    flexDirection: 'row',
                    alignItems: 'center',
                    padding: 10,
                  },
                ]}
              >
                <View style={[styles.amenityIconContainer, { backgroundColor: '#EEF2FF', marginRight: 10 }]}>
                  <Icons.Bed color="#4F46E5" size={18} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: '#64748B', textTransform: 'uppercase' }}>Bed Type</Text>
                  <Text style={[{ fontSize: 12, fontWeight: '800' }, { color: colors.text }]} numberOfLines={1}>
                    {stay.bedType || '1 King Bed'}
                  </Text>
                </View>
              </View>

              {/* Max Guests */}
              <View
                style={[
                  styles.amenityItemCard,
                  {
                    width: '48%',
                    backgroundColor: isLight ? '#FFFFFF' : 'rgba(255, 255, 255, 0.04)',
                    borderColor: isLight ? '#F1EAD8' : colors.cardBorder,
                    flexDirection: 'row',
                    alignItems: 'center',
                    padding: 10,
                  },
                ]}
              >
                <View style={[styles.amenityIconContainer, { backgroundColor: '#FEF3C7', marginRight: 10 }]}>
                  <Icons.Users color="#D97706" size={18} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: '#64748B', textTransform: 'uppercase' }}>Guests</Text>
                  <Text style={[{ fontSize: 12, fontWeight: '800' }, { color: colors.text }]} numberOfLines={1}>
                    {stay.numberOfGuests || '2 Guests'}
                  </Text>
                </View>
              </View>

              {/* Room Size */}
              <View
                style={[
                  styles.amenityItemCard,
                  {
                    width: '48%',
                    backgroundColor: isLight ? '#FFFFFF' : 'rgba(255, 255, 255, 0.04)',
                    borderColor: isLight ? '#F1EAD8' : colors.cardBorder,
                    flexDirection: 'row',
                    alignItems: 'center',
                    padding: 10,
                  },
                ]}
              >
                <View style={[styles.amenityIconContainer, { backgroundColor: '#ECFDF5', marginRight: 10 }]}>
                  <Icons.Maximize2 color="#059669" size={18} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: '#64748B', textTransform: 'uppercase' }}>Room Size</Text>
                  <Text style={[{ fontSize: 12, fontWeight: '800' }, { color: colors.text }]} numberOfLines={1}>
                    {stay.roomSize || '280 sq.ft'}
                  </Text>
                </View>
              </View>

              {/* Room View */}
              <View
                style={[
                  styles.amenityItemCard,
                  {
                    width: '48%',
                    backgroundColor: isLight ? '#FFFFFF' : 'rgba(255, 255, 255, 0.04)',
                    borderColor: isLight ? '#F1EAD8' : colors.cardBorder,
                    flexDirection: 'row',
                    alignItems: 'center',
                    padding: 10,
                  },
                ]}
              >
                <View style={[styles.amenityIconContainer, { backgroundColor: '#EFF6FF', marginRight: 10 }]}>
                  <Icons.Eye color="#2563EB" size={18} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: '#64748B', textTransform: 'uppercase' }}>Room View</Text>
                  <Text style={[{ fontSize: 12, fontWeight: '800' }, { color: colors.text }]} numberOfLines={1}>
                    {stay.roomView || 'City View'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Quick Policy & Inclusion Highlights */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
              {stay.freeBreakfast !== false && (stay.freeBreakfast || stay.amenities?.includes('Breakfast') || stay.amenities?.includes('Free Breakfast')) && (
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isLight ? '#ECFDF5' : 'rgba(5, 150, 105, 0.15)', borderWidth: 1, borderColor: '#A7F3D0', paddingHorizontal: 9, paddingVertical: 4.5, borderRadius: 8, gap: 5 }}>
                  <Icons.Coffee color="#059669" size={13} />
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#059669' }}>Free Breakfast Included</Text>
                </View>
              )}
              {stay.freeCancellation !== false && (
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isLight ? '#EFF6FF' : 'rgba(37, 99, 235, 0.15)', borderWidth: 1, borderColor: '#BFDBFE', paddingHorizontal: 9, paddingVertical: 4.5, borderRadius: 8, gap: 5 }}>
                  <Icons.ShieldCheck color="#2563EB" size={13} />
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#2563EB' }}>Free Cancellation</Text>
                </View>
              )}
              {stay.coupleFriendly !== false && (
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isLight ? '#FDF2F8' : 'rgba(236, 72, 153, 0.15)', borderWidth: 1, borderColor: '#FBCFE8', paddingHorizontal: 9, paddingVertical: 4.5, borderRadius: 8, gap: 5 }}>
                  <Icons.Heart color="#EC4899" size={13} />
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#DB2777' }}>Couple Friendly</Text>
                </View>
              )}
              {stay.payAtHotel !== false && (
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isLight ? '#F5F3FF' : 'rgba(99, 102, 241, 0.15)', borderWidth: 1, borderColor: '#DDD6FE', paddingHorizontal: 9, paddingVertical: 4.5, borderRadius: 8, gap: 5 }}>
                  <Icons.CreditCard color="#6366F1" size={13} />
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#6366F1' }}>Pay at Hotel</Text>
                </View>
              )}
            </View>
          </View>

          {/* AMENITIES */}
          <View style={styles.sectionBlock}>
            <Text style={[styles.sectionHeading, { color: colors.text }]}>Amenities</Text>
            <View style={styles.amenitiesGrid}>
              {(stay.amenities || ['Swimming Pool', 'Free Wi-Fi', 'Breakfast Included', 'Free Parking', 'Air Conditioning']).map((amen: string) => (
                <View
                  key={amen}
                  style={[
                    styles.amenityItemCard,
                    {
                      backgroundColor: isLight ? '#FFFFFF' : 'rgba(255, 255, 255, 0.04)',
                      borderColor: isLight ? '#F1EAD8' : colors.cardBorder,
                    },
                  ]}
                >
                  <View style={styles.amenityIconContainer}>
                    {renderAmenityIcon(amen)}
                  </View>
                  <Text style={[styles.amenityLabel, { color: colors.text }]}>{amen}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* ABOUT PROPERTY */}
          <View style={styles.sectionBlock}>
            <Text style={[styles.sectionHeading, { color: colors.text }]}>About this property</Text>
            <Text style={[styles.aboutText, { color: isLight ? '#334155' : '#CBD5E1' }]}>
              {stay.desc || 'Luxury villa surrounded by nature with private pool, breakfast, Wi-Fi and premium rooms.'}
            </Text>
          </View>

          {/* POLICIES */}
          <View style={styles.sectionBlock}>
            <Text style={[styles.sectionHeading, { color: colors.text }]}>Property Policies</Text>
            <View
              style={[
                styles.policyContainer,
                {
                  backgroundColor: isLight ? '#FFFFFF' : 'rgba(255, 255, 255, 0.04)',
                  borderColor: isLight ? '#F1EAD8' : colors.cardBorder,
                },
              ]}
            >
              <View style={styles.policyRow}>
                <Icons.Clock color="#D97706" size={16} />
                <Text style={[styles.policyRowText, { color: colors.text }]}>Check-in: {defaultCheckInTime}</Text>
              </View>
              <View style={styles.policyRow}>
                <Icons.Clock color="#D97706" size={16} />
                <Text style={[styles.policyRowText, { color: colors.text }]}>Check-out: {defaultCheckOutTime}</Text>
              </View>
              {stay.freeCancellation !== false && (
                <View style={styles.policyRow}>
                  <Icons.ShieldCheck color="#059669" size={16} />
                  <Text style={[styles.policyRowText, { color: colors.text }]}>
                    Free cancellation up to 24 hours before check-in
                  </Text>
                </View>
              )}
              {stay.coupleFriendly !== false && (
                <View style={styles.policyRow}>
                  <Icons.Heart color="#EC4899" size={16} />
                  <Text style={[styles.policyRowText, { color: colors.text }]}>
                    Couple Friendly • Unmarried couples and Local IDs accepted
                  </Text>
                </View>
              )}
              {stay.payAtHotel !== false && (
                <View style={styles.policyRow}>
                  <Icons.CreditCard color="#6366F1" size={16} />
                  <Text style={[styles.policyRowText, { color: colors.text }]}>
                    Pay at Hotel Available • Pay cash or card during check-in
                  </Text>
                </View>
              )}
              <View style={styles.policyRow}>
                <Icons.FileText color="#64748B" size={16} />
                <Text style={[styles.policyRowText, { color: colors.text }]}>
                  Valid government ID required at check-in
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* STICKY BOTTOM BOOKING SECTION */}
      <View
        style={[
          styles.stickyBottomBar,
          {
            paddingBottom: Math.max(insets.bottom, 12) + 4,
            backgroundColor: isLight ? '#FFFFFF' : colors.cardBg,
            borderTopColor: isLight ? '#F1EAD8' : colors.cardBorder,
          },
        ]}
      >
        <View style={styles.stickyPriceColumn}>
          <Text style={[styles.stickyPriceText, { color: isLight ? '#0F172A' : '#F5B800' }]}>
            {selectedRoom.priceStr}
          </Text>
          <Text style={styles.stickyRoomSubtitle}>{selectedRoom.name} • {computedNights} night(s)</Text>
        </View>

        <TouchableOpacity
          style={styles.stickySelectRoomBtn}
          activeOpacity={0.85}
          onPress={() => {
            const authUser = useAuthStore.getState().currentUser;
            if (!isUserAuthenticated(authUser)) {
              useAuthStore.getState().setPendingPurchaseProduct({
                ...stay,
                selectedRoom,
                checkIn: selectedCheckInItem.fullDateStr,
                checkOut: selectedCheckOutItem.fullDateStr,
                rooms: roomsCount,
                adults: adultsCount,
                children: childrenCount,
                actionType: 'book_stay',
                returnScreen: 'StayDetails',
              });
              useAuthGuardStore.getState().showAuthModal('select room and book your stay');
              return;
            }
            setBookingStep(1);
            setIsBookingModalOpen(true);
          }}
        >
          <Text style={styles.stickySelectRoomBtnText}>Select Room</Text>
        </TouchableOpacity>
      </View>

      {/* --- LOCATION MAP MODAL --- */}
      <Modal visible={isMapModalOpen} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: '#0F172A' }}>
          <View
            style={[
              styles.headerWrapper,
              {
                paddingTop: Math.max(insets.top, 16),
                backgroundColor: '#0F172A',
                borderBottomColor: 'rgba(255,255,255,0.1)',
              },
            ]}
          >
            <TouchableOpacity style={styles.headerIconBtn} onPress={() => setIsMapModalOpen(false)}>
              <Icons.ArrowLeft color="#FFFFFF" size={22} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: '#FFFFFF' }]}>Location Map</Text>
            <View style={{ width: 36 }} />
          </View>

          <View style={{ flex: 1, position: 'relative', justifyContent: 'center', alignItems: 'center' }}>
            <Image
              source={{ uri: 'https://images.unsplash.com/photo-1524661135-423995f22d0b?w=1000&auto=format&fit=crop&q=80' }}
              style={{ width: '100%', height: '100%', opacity: 0.8 }}
              resizeMode="cover"
            />
            <View style={styles.mapPinBadge}>
              <Icons.Bed color="#0F172A" size={16} />
              <Text style={styles.mapPinText}>{stay.name}</Text>
            </View>
          </View>
        </View>
      </Modal>

      {/* ========================================================================= */}
      {/* --- STAY BOOKING TIMINGS, DATES & GUEST CONFIGURATION MODAL --- */}
      {/* ========================================================================= */}
      <Modal visible={isBookingModalOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: isLight ? '#F8FAFC' : colors.cardBg, maxHeight: '94%' }]}>
            {/* Sheet Header */}
            <View style={styles.modalSheetHeader}>
              <View>
                <Text style={[styles.modalSheetSuperHeader, { color: '#D97706' }]}>
                  {bookingStep === 1
                    ? 'CONFIGURE TIMINGS & DATES'
                    : bookingStep === 2
                    ? 'PRIMARY GUEST DETAILS'
                    : bookingStep === 3
                    ? 'BOOKING SUMMARY & PAYMENT'
                    : 'BOOKING CONFIRMATION'}
                </Text>
                <Text style={[styles.modalSheetTitle, { color: colors.text }]}>
                  {bookingStep === 1
                    ? 'Select Dates, Times & Guests'
                    : bookingStep === 2
                    ? 'Guest Information'
                    : bookingStep === 3
                    ? 'Review & Pay'
                    : '✓ Booking Confirmed'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsBookingModalOpen(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={styles.closeSheetBtn}
              >
                <Icons.X color={colors.text} size={20} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
              {/* STEP 1: CONFIGURE TIMINGS, DATES & GUESTS */}
              {bookingStep === 1 && (
                <View style={{ gap: 16 }}>
                  {/* --- 1. CHECK-IN DETAILS --- */}
                  <View style={[styles.configCard, { borderColor: '#059669' }]}>
                    <View style={styles.configCardHeader}>
                      <View style={styles.configCardHeaderLeft}>
                        <View style={[styles.statusDot, { backgroundColor: '#059669' }]} />
                        <Text style={styles.configCardHeaderTitle}>CHECK-IN DETAILS</Text>
                      </View>
                      <View style={styles.configCardBadgeGreen}>
                        <Text style={styles.configCardBadgeGreenText}>
                          {selectedCheckInItem.fullDateStr} • {checkInTimeSlot}
                        </Text>
                      </View>
                    </View>

                    {/* Clickable Date Selector Field -> Opens Calendar Modal */}
                    <TouchableOpacity
                      style={styles.fieldTriggerCard}
                      activeOpacity={0.8}
                      onPress={() => {
                        setDatePickerTarget('checkIn');
                        setDatePickerVisible(true);
                      }}
                    >
                      <View style={[styles.fieldTriggerIconCircle, { backgroundColor: '#ECFDF5' }]}>
                        <Icons.Calendar color="#059669" size={20} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.fieldTriggerSubLabel}>CHECK-IN DATE</Text>
                        <Text style={[styles.fieldTriggerMainText, { color: '#059669' }]}>
                          {selectedCheckInItem.fullDateStr}
                        </Text>
                      </View>
                      <View style={[styles.fieldTriggerActionBtn, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}>
                        <Icons.Calendar color="#059669" size={13} />
                        <Text style={[styles.fieldTriggerActionText, { color: '#059669' }]}>Calendar</Text>
                      </View>
                    </TouchableOpacity>

                    {/* Clickable Time Selector Field -> Opens Round Clock Modal */}
                    <TouchableOpacity
                      style={[styles.fieldTriggerCard, { marginTop: 10 }]}
                      activeOpacity={0.8}
                      onPress={() => handleOpenTimePicker('checkIn')}
                    >
                      <View style={[styles.fieldTriggerIconCircle, { backgroundColor: '#ECFDF5' }]}>
                        <Icons.Clock color="#059669" size={20} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.fieldTriggerSubLabel}>CHECK-IN TIME</Text>
                        <Text style={[styles.fieldTriggerMainText, { color: '#059669' }]}>
                          {checkInTimeSlot || '12:00 PM'}
                        </Text>
                      </View>
                      <View style={[styles.fieldTriggerActionBtn, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}>
                        <Icons.Clock color="#059669" size={13} />
                        <Text style={[styles.fieldTriggerActionText, { color: '#059669' }]}>Round Clock</Text>
                      </View>
                    </TouchableOpacity>
                  </View>

                  {/* --- 2. CHECK-OUT DETAILS --- */}
                  <View style={[styles.configCard, { borderColor: '#2563EB' }]}>
                    <View style={styles.configCardHeader}>
                      <View style={styles.configCardHeaderLeft}>
                        <View style={[styles.statusDot, { backgroundColor: '#2563EB' }]} />
                        <Text style={styles.configCardHeaderTitle}>CHECK-OUT DETAILS</Text>
                      </View>
                      <View style={styles.configCardBadgeBlue}>
                        <Text style={styles.configCardBadgeBlueText}>
                          {selectedCheckOutItem.fullDateStr} • {checkOutTimeSlot}
                        </Text>
                      </View>
                    </View>

                    {/* Clickable Date Selector Field -> Opens Calendar Modal */}
                    <TouchableOpacity
                      style={styles.fieldTriggerCard}
                      activeOpacity={0.8}
                      onPress={() => {
                        setDatePickerTarget('checkOut');
                        setDatePickerVisible(true);
                      }}
                    >
                      <View style={[styles.fieldTriggerIconCircle, { backgroundColor: '#EFF6FF' }]}>
                        <Icons.Calendar color="#2563EB" size={20} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.fieldTriggerSubLabel}>CHECK-OUT DATE</Text>
                        <Text style={[styles.fieldTriggerMainText, { color: '#2563EB' }]}>
                          {selectedCheckOutItem.fullDateStr}
                        </Text>
                      </View>
                      <View style={[styles.fieldTriggerActionBtn, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}>
                        <Icons.Calendar color="#2563EB" size={13} />
                        <Text style={[styles.fieldTriggerActionText, { color: '#2563EB' }]}>Calendar</Text>
                      </View>
                    </TouchableOpacity>

                    {/* Clickable Time Selector Field -> Opens Round Clock Modal */}
                    <TouchableOpacity
                      style={[styles.fieldTriggerCard, { marginTop: 10 }]}
                      activeOpacity={0.8}
                      onPress={() => handleOpenTimePicker('checkOut')}
                    >
                      <View style={[styles.fieldTriggerIconCircle, { backgroundColor: '#EFF6FF' }]}>
                        <Icons.Clock color="#2563EB" size={20} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.fieldTriggerSubLabel}>CHECK-OUT TIME</Text>
                        <Text style={[styles.fieldTriggerMainText, { color: '#2563EB' }]}>
                          {checkOutTimeSlot || '11:00 AM'}
                        </Text>
                      </View>
                      <View style={[styles.fieldTriggerActionBtn, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}>
                        <Icons.Clock color="#2563EB" size={13} />
                        <Text style={[styles.fieldTriggerActionText, { color: '#2563EB' }]}>Round Clock</Text>
                      </View>
                    </TouchableOpacity>
                  </View>

                  {/* --- 3. TRAVELERS / GUESTS --- */}
                  <View style={[styles.configCard, { borderColor: '#E2E8F0' }]}>
                    <Text style={styles.travelersCardTitle}>TRAVELERS / GUESTS</Text>

                    <View style={styles.travelersCardsRow}>
                      {/* Adults Card */}
                      <View style={styles.travelerCategoryCard}>
                        <View>
                          <Text style={styles.travelerCategoryName}>Adults</Text>
                          <Text style={styles.travelerCategoryAge}>Age 12+</Text>
                        </View>
                        <View style={styles.stepperPillWrap}>
                          <TouchableOpacity
                            style={styles.stepperBtnRef}
                            onPress={() => setAdultsCount((prev) => Math.max(1, prev - 1))}
                          >
                            <Text style={styles.stepperBtnRefText}>-</Text>
                          </TouchableOpacity>
                          <Text style={styles.stepperCountRefText}>{adultsCount}</Text>
                          <TouchableOpacity
                            style={styles.stepperBtnRef}
                            onPress={() => setAdultsCount((prev) => Math.min(10, prev + 1))}
                          >
                            <Text style={styles.stepperBtnRefText}>+</Text>
                          </TouchableOpacity>
                        </View>
                      </View>

                      {/* Children Card */}
                      <View style={styles.travelerCategoryCard}>
                        <View>
                          <Text style={styles.travelerCategoryName}>Children</Text>
                          <Text style={styles.travelerCategoryAge}>Age 2-12</Text>
                        </View>
                        <View style={styles.stepperPillWrap}>
                          <TouchableOpacity
                            style={styles.stepperBtnRef}
                            onPress={() => setChildrenCount((prev) => Math.max(0, prev - 1))}
                          >
                            <Text style={styles.stepperBtnRefText}>-</Text>
                          </TouchableOpacity>
                          <Text style={styles.stepperCountRefText}>{childrenCount}</Text>
                          <TouchableOpacity
                            style={styles.stepperBtnRef}
                            onPress={() => setChildrenCount((prev) => Math.min(6, prev + 1))}
                          >
                            <Text style={styles.stepperBtnRefText}>+</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* --- 3. GUEST INFORMATION DETAILS CARD --- */}
                  <View style={styles.guestInfoOuterCard}>
                    <Text style={styles.guestInfoSectionHeader}>
                      GUEST INFORMATION DETAILS ({totalGuestsCount} GUESTS)
                    </Text>

                    <View style={{ gap: 10, marginTop: 8 }}>
                      {guestList.map((gItem, idx) => {
                        const isPrimary = idx === 0;

                        return (
                          <View key={`guest_form_${idx}`} style={styles.guestDetailBox}>
                            <View style={styles.guestDetailHeaderRow}>
                              <Text style={styles.guestDetailHeaderTitle}>
                                {isPrimary ? 'PRIMARY GUEST (GUEST 1)' : `GUEST ${idx + 1}`}
                              </Text>
                              {isPrimary && (
                                <View style={styles.mainContactBadge}>
                                  <Text style={styles.mainContactBadgeText}>MAIN CONTACT</Text>
                                </View>
                              )}
                            </View>

                            <View style={styles.guestFieldsRow}>
                              {/* Full Name */}
                              <View style={styles.guestFieldBlock}>
                                <Text style={styles.guestInputLabel}>FULL NAME</Text>
                                <TextInput
                                  style={styles.guestRefInput}
                                  value={gItem.fullName}
                                  onChangeText={(val) => {
                                    handleUpdateGuestInfo(idx, 'fullName', val);
                                    if (isPrimary) setGuestName(val);
                                  }}
                                  placeholder={isPrimary ? 'Full Name' : `Guest ${idx + 1} Full Name`}
                                  placeholderTextColor="#94A3B8"
                                />
                              </View>

                              {/* Aadhaar Card Number */}
                              <View style={styles.guestFieldBlock}>
                                <Text style={styles.guestInputLabel}>AADHAAR CARD NUMBER</Text>
                                <TextInput
                                  style={styles.guestRefInput}
                                  value={gItem.aadhaarNumber}
                                  onChangeText={(val) => handleUpdateGuestInfo(idx, 'aadhaarNumber', val)}
                                  placeholder="12-Digit Aadhaar No"
                                  placeholderTextColor="#94A3B8"
                                  keyboardType="numeric"
                                  maxLength={12}
                                />
                              </View>

                              {/* Phone Number */}
                              <View style={styles.guestFieldBlock}>
                                <Text style={styles.guestInputLabel}>PHONE NUMBER</Text>
                                <TextInput
                                  style={styles.guestRefInput}
                                  value={gItem.phoneNumber}
                                  onChangeText={(val) => {
                                    handleUpdateGuestInfo(idx, 'phoneNumber', val);
                                    if (isPrimary) setGuestMobile(val);
                                  }}
                                  placeholder="10-Digit Phone No"
                                  placeholderTextColor="#94A3B8"
                                  keyboardType="phone-pad"
                                  maxLength={10}
                                />
                              </View>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  </View>

                  {/* --- 4. LIVE BOOKING SUMMARY CARD --- */}
                  <View style={[styles.summaryCard, { backgroundColor: '#FFFFFF', borderColor: '#F5B800' }]}>
                    <Text style={styles.summaryCardTitle}>YOUR APPOINTMENT / STAY SUMMARY</Text>

                    <View style={styles.summaryPropertyRow}>
                      <Image source={{ uri: stay.image }} style={styles.summaryPropThumb} />
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Text style={[styles.summaryHotelName, { color: colors.text }]} numberOfLines={1}>
                            {stay.name}
                          </Text>
                          <Icons.CheckCircle2 color="#3B82F6" size={14} />
                        </View>
                        <Text style={styles.summaryRoomType}>{selectedRoom.name}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 }}>
                          <Icons.Star color="#F5B800" size={11} fill="#F5B800" />
                          <Text style={{ fontSize: 11, fontWeight: '800', color: '#0F172A' }}>
                            {stay.rating} ({stay.reviews} Reviews)
                          </Text>
                        </View>
                      </View>
                    </View>

                    <View style={styles.summaryDivider} />

                    <View style={styles.summaryDetailsList}>
                      <View style={styles.summaryItemRow}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Icons.Clock color="#3B82F6" size={15} />
                          <Text style={styles.summaryItemLabel}>Check-In & Check-Out</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={styles.summaryItemValBold}>
                            {selectedCheckInItem.dayName}, {selectedCheckInItem.dateNum} {selectedCheckInItem.monthStr} ({checkInTimeSlot})
                          </Text>
                          <Text style={styles.summaryItemValSub}>
                            to {selectedCheckOutItem.dayName}, {selectedCheckOutItem.dateNum} {selectedCheckOutItem.monthStr} ({checkOutTimeSlot}) • {computedNights} Night{computedNights > 1 ? 's' : ''}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.summaryItemRow}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Icons.Users color="#64748B" size={15} />
                          <Text style={styles.summaryItemLabel}>Travelers / Guests</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={styles.summaryItemValBold}>
                            {totalGuestsCount} Person ({adultsCount} Adults, {childrenCount} Children)
                          </Text>
                          <Text style={styles.summaryItemValSub}>
                            Adults: ₹{adultPricePerNight.toLocaleString()} × {adultsCount} | Children: ₹{childPricePerNight.toLocaleString()} × {childrenCount}
                          </Text>
                        </View>
                      </View>

                      {taxesAndFees > 0 && (
                        <View style={styles.summaryItemRow}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Icons.Percent color="#64748B" size={15} />
                            <Text style={styles.summaryItemLabel}>Taxes & Fees{rawTaxRate ? ` (${rawTaxRate}%)` : ''}</Text>
                          </View>
                          <Text style={styles.summaryItemValBold}>₹{taxesAndFees.toLocaleString()}</Text>
                        </View>
                      )}

                      <View style={[styles.summaryItemRow, styles.summaryTotalRow]}>
                        <Text style={styles.summaryTotalLabel}>Total Amount</Text>
                        <Text style={styles.summaryTotalValue}>₹{grandTotal.toLocaleString()}</Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      style={styles.modalCtaBtn}
                      activeOpacity={0.85}
                      onPress={() => setBookingStep(2)}
                    >
                      <Text style={styles.modalCtaBtnText}>
                        Continue to Guest Details (₹{grandTotal.toLocaleString()})
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* STEP 2: GUEST DETAILS */}
              {bookingStep === 2 && (
                <View style={{ gap: 14 }}>
                  <View style={[styles.summaryCard, { backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' }]}>
                    <Text style={styles.summaryHotelName}>{stay.name}</Text>
                    <Text style={styles.summaryRoomType}>{selectedRoom.name} • {roomsCount} Room(s)</Text>
                    <Text style={styles.summaryDates}>
                      {selectedCheckInItem.fullDateStr} ({checkInTimeSlot}) → {selectedCheckOutItem.fullDateStr} ({checkOutTimeSlot})
                    </Text>
                    <Text style={styles.summaryGuests}>
                      {adultsCount} Adults, {childrenCount} Children • Total: ₹{grandTotal.toLocaleString()}
                    </Text>
                  </View>

                  {/* Editable input cards for each guest in guestList */}
                  <View style={styles.guestInfoOuterCard}>
                    <Text style={styles.guestInfoSectionHeader}>GUEST INFORMATION ({guestList.length} {guestList.length === 1 ? 'PERSON' : 'PERSONS'})</Text>
                    <View style={{ gap: 12, marginTop: 10 }}>
                      {guestList.map((g, gIdx) => (
                        <View key={`g_edit_${gIdx}`} style={{ backgroundColor: isLight ? '#FFFFFF' : 'rgba(255,255,255,0.05)', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: isLight ? '#FEF3C7' : colors.cardBorder }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                            <Icons.User color="#F4C400" size={14} style={{ marginRight: 6 }} />
                            <Text style={{ fontSize: 12, fontWeight: '800', color: colors.text }}>
                              {gIdx === 0 ? 'Person 1 (Primary Guest)' : `Person ${gIdx + 1} Details`}
                            </Text>
                          </View>

                          {/* Full Name */}
                          <Text style={{ fontSize: 10.5, fontWeight: '700', color: colors.subtext, marginBottom: 4 }}>
                            FULL NAME *
                          </Text>
                          <TextInput
                            style={[
                              styles.textInput,
                              {
                                color: colors.text,
                                backgroundColor: isLight ? '#F8FAFC' : 'rgba(255,255,255,0.06)',
                                borderColor: isLight ? '#CBD5E1' : colors.cardBorder,
                                marginBottom: 8,
                                height: 44,
                              },
                            ]}
                            value={g.fullName}
                            onChangeText={(val) => handleUpdateGuestInfo(gIdx, 'fullName', val)}
                            placeholder="Enter full name"
                            placeholderTextColor="#94A3B8"
                          />

                          {/* Aadhaar Number */}
                          <Text style={{ fontSize: 10.5, fontWeight: '700', color: colors.subtext, marginBottom: 4 }}>
                            AADHAAR CARD NUMBER (12 DIGITS) *
                          </Text>
                          <TextInput
                            style={[
                              styles.textInput,
                              {
                                color: colors.text,
                                backgroundColor: isLight ? '#F8FAFC' : 'rgba(255,255,255,0.06)',
                                borderColor: isLight ? '#CBD5E1' : colors.cardBorder,
                                marginBottom: 8,
                                height: 44,
                              },
                            ]}
                            value={g.aadhaarNumber}
                            onChangeText={(val) => handleUpdateGuestInfo(gIdx, 'aadhaarNumber', val.replace(/[^\d]/g, '').slice(0, 12))}
                            placeholder="12-digit Aadhaar Card number"
                            placeholderTextColor="#94A3B8"
                            keyboardType="number-pad"
                            maxLength={12}
                          />

                          {/* Mobile Number */}
                          <Text style={{ fontSize: 10.5, fontWeight: '700', color: colors.subtext, marginBottom: 4 }}>
                            MOBILE NUMBER (10 DIGITS) *
                          </Text>
                          <TextInput
                            style={[
                              styles.textInput,
                              {
                                color: colors.text,
                                backgroundColor: isLight ? '#F8FAFC' : 'rgba(255,255,255,0.06)',
                                borderColor: isLight ? '#CBD5E1' : colors.cardBorder,
                                height: 44,
                              },
                            ]}
                            value={g.phoneNumber}
                            onChangeText={(val) => handleUpdateGuestInfo(gIdx, 'phoneNumber', val.replace(/[^\d]/g, '').slice(0, 10))}
                            placeholder="10-digit mobile number"
                            placeholderTextColor="#94A3B8"
                            keyboardType="phone-pad"
                            maxLength={10}
                          />
                        </View>
                      ))}
                    </View>
                  </View>

                  <View>
                    <Text style={styles.inputFieldLabel}>EMAIL ADDRESS *</Text>
                    <TextInput
                      style={[
                        styles.textInput,
                        {
                          color: colors.text,
                          backgroundColor: isLight ? '#FFFFFF' : 'rgba(255,255,255,0.06)',
                          borderColor: isLight ? '#E2E8F0' : colors.cardBorder,
                        },
                      ]}
                      value={guestEmail}
                      onChangeText={setGuestEmail}
                      keyboardType="email-address"
                      placeholder="guest@domain.com"
                      placeholderTextColor="#94A3B8"
                    />
                  </View>

                  <View>
                    <Text style={styles.inputFieldLabel}>SPECIAL REQUESTS (OPTIONAL)</Text>
                    <TextInput
                      style={[
                        styles.textInput,
                        {
                          color: colors.text,
                          backgroundColor: isLight ? '#FFFFFF' : 'rgba(255,255,255,0.06)',
                          borderColor: isLight ? '#E2E8F0' : colors.cardBorder,
                          height: 60,
                        },
                      ]}
                      value={guestSpecialNote}
                      onChangeText={setGuestSpecialNote}
                      placeholder="Early check-in, high floor, quiet room..."
                      placeholderTextColor="#94A3B8"
                      multiline
                    />
                  </View>

                  <View style={styles.policyNoticeBox}>
                    <Icons.Info color="#D97706" size={15} />
                    <Text style={styles.policyNoticeText}>
                      Confirmation voucher and check-in PIN will be sent to {guestEmail || 'your email'}.
                    </Text>
                  </View>

                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
                    <TouchableOpacity
                      style={[styles.modalCtaBtn, { flex: 1, backgroundColor: '#E2E8F0' }]}
                      activeOpacity={0.85}
                      onPress={() => setBookingStep(1)}
                    >
                      <Text style={[styles.modalCtaBtnText, { color: '#0F172A' }]}>Back</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.modalCtaBtn, { flex: 2 }]}
                      activeOpacity={0.85}
                      onPress={() => {
                        for (let i = 0; i < guestList.length; i++) {
                          const g = guestList[i];
                          if (!g || !g.fullName || !g.fullName.trim()) {
                            Alert.alert('Missing Name', `Please enter Full Name for Person ${i + 1}.`);
                            return;
                          }
                          if (!g.aadhaarNumber || g.aadhaarNumber.replace(/[^\d]/g, '').length !== 12) {
                            Alert.alert('Validation Error', `Please enter a valid 12-digit Aadhaar Card Number for Person ${i + 1} (${g.fullName}).`);
                            return;
                          }
                          if (!g.phoneNumber || g.phoneNumber.replace(/[^\d]/g, '').length !== 10) {
                            Alert.alert('Validation Error', `Please enter a valid 10-digit Mobile Number for Person ${i + 1} (${g.fullName}).`);
                            return;
                          }
                        }
                        setBookingStep(3);
                      }}
                    >
                      <Text style={styles.modalCtaBtnText}>Continue to Payment (₹{grandTotal.toLocaleString()})</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* STEP 3: BOOKING SUMMARY & PAYMENT */}
              {bookingStep === 3 && (
                <View style={{ gap: 14 }}>
                  <Text style={[styles.sectionSubheading, { color: colors.text }]}>Select Payment Method</Text>

                  {(['UPI', 'Card', 'Net Banking', 'Pay at Hotel'] as const).map((payOpt) => {
                    const isSelected = paymentMethod === payOpt;
                    return (
                      <TouchableOpacity
                        key={payOpt}
                        style={[
                          styles.paymentOptionCard,
                          {
                            backgroundColor: isSelected ? '#FFFBEB' : isLight ? '#FFFFFF' : 'rgba(255,255,255,0.04)',
                            borderColor: isSelected ? '#F5B800' : isLight ? '#E2E8F0' : colors.cardBorder,
                          },
                        ]}
                        activeOpacity={0.8}
                        onPress={() => setPaymentMethod(payOpt)}
                      >
                        <Text
                          style={[
                            styles.paymentOptionText,
                            {
                              color: isSelected ? '#0F172A' : colors.text,
                              fontWeight: isSelected ? '800' : '600',
                            },
                          ]}
                        >
                          {payOpt}
                        </Text>
                        {isSelected && <Icons.Check color="#F5B800" size={18} />}
                      </TouchableOpacity>
                    );
                  })}

                  {/* Summary Box */}
                  <View style={[styles.priceBreakdownCard, { backgroundColor: '#FFFFFF', borderColor: '#F1EAD8' }]}>
                    <View style={styles.priceRow}>
                      <Text style={styles.priceLabel}>
                        ₹{selectedRoom.priceNum.toLocaleString()} × {computedNights} nights × {roomsCount} room(s)
                      </Text>
                      <Text style={[styles.priceValue, { color: colors.text }]}>₹{baseRoomCharge.toLocaleString()}</Text>
                    </View>
                    {taxesAndFees > 0 && (
                      <View style={styles.priceRow}>
                        <Text style={styles.priceLabel}>Taxes & fees{rawTaxRate ? ` (${rawTaxRate}%)` : ''}</Text>
                        <Text style={[styles.priceValue, { color: colors.text }]}>₹{taxesAndFees.toLocaleString()}</Text>
                      </View>
                    )}
                    <View style={[styles.priceRow, styles.totalRow]}>
                      <Text style={styles.totalLabel}>Grand Total Payable</Text>
                      <Text style={styles.totalValue}>₹{grandTotal.toLocaleString()}</Text>
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
                    <TouchableOpacity
                      style={[styles.modalCtaBtn, { flex: 1, backgroundColor: '#E2E8F0' }]}
                      activeOpacity={0.85}
                      onPress={() => setBookingStep(2)}
                    >
                      <Text style={[styles.modalCtaBtnText, { color: '#0F172A' }]}>Back</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.modalCtaBtn, { flex: 2 }]}
                      activeOpacity={0.85}
                      onPress={() => {
                        const newId = `CN-STAY-${Date.now().toString().slice(-6)}`;
                        setConfirmedBookingId(newId);

                        if (paymentMethod === 'Pay at Hotel') {
                          const authUser = useAuthStore.getState().currentUser;
                          const guestNameVal = guestList[0]?.fullName || guestName || authUser?.name || 'Customer';
                          const guestPhoneVal = guestList[0]?.phoneNumber || guestMobile || authUser?.phone || '';
                          const guestEmailVal = guestEmail || authUser?.email || '';

                          const newStayOrder: Order = {
                            id: newId,
                            order_number: newId,
                            vendor_id: stay.vendorId || stay.vendor_id || '',
                            vendorId: stay.vendorId || stay.vendor_id || '',
                            productId: stay.id || stay._id,
                            vendor_name: stay.name || 'Luxury Resort & Stay',
                            category: 'Stay',
                            order_type: 'booking',
                            customer_name: guestNameVal,
                            customer_phone: guestPhoneVal,
                            customer_address: `${stay.name}, ${stay.location || 'Bangalore'}`,
                            customer_latitude: 12.9498,
                            customer_longitude: 77.6289,
                            product_details: `${stay.name} (${selectedRoom.name} • ${selectedCheckInItem.fullDateStr} to ${selectedCheckOutItem.fullDateStr})`,
                            hotel_name: stay.name,
                            room_type: selectedRoom.name,
                            check_in: selectedCheckInItem.fullDateStr,
                            check_out: selectedCheckOutItem.fullDateStr,
                            guests_count: `${adultsCount} Adults, ${childrenCount} Children`,
                            items: [
                              {
                                name: `${stay.name} - ${selectedRoom.name}`,
                                quantity: roomsCount,
                                price: grandTotal,
                              },
                            ],
                            item_count: 1,
                            amount: grandTotal,
                            status: 'Confirmed',
                            payment_method: 'Pay at Hotel (Cash / Card)',
                            payment_status: 'Pending',
                            created_at: new Date().toISOString(),
                            image: stay.image || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=500',
                          };

                          useOrderStore.getState().addLocalOrder(newStayOrder);
                          apiFetch('/orders', {
                            method: 'POST',
                            body: {
                              id: newId,
                              order_number: newId,
                              vendor_id: stay.vendorId || stay.vendor_id || '',
                            vendorId: stay.vendorId || stay.vendor_id || '',
                            productId: stay.id || stay._id,
                              customerId: authUser?.customerId || authUser?.registrationId || authUser?.id,
                              customer_id: authUser?.customerId || authUser?.registrationId || authUser?.id,
                              customer_name: guestNameVal,
                              customer_phone: guestPhoneVal,
                              customer_email: guestEmailVal,
                              customer_address: `${stay.name}, ${stay.location || 'Bangalore'}`,
                              amount: grandTotal,
                              order_type: 'booking',
                              type: 'Stay',
                              category: 'Stay',
                              payment_status: 'Pending',
                              payment_method: 'Pay at Hotel',
                              checkInDate: selectedCheckInItem.fullDateStr,
                              checkOutDate: selectedCheckOutItem.fullDateStr,
                              roomsCount,
                              nightsCount: computedNights,
                              adults: adultsCount,
                              children: childrenCount,
                              guestList,
                              specialRequests: guestSpecialNote,
                            },
                          }).catch((err) => console.warn('Stay order save notice:', err));

                          setIsBookingModalOpen(false);
                          setBookingStep(1);

                          navigation.navigate('BookingConfirmation', {
                            bookingId: newId,
                            items: [
                              {
                                name: `${stay.name} - ${selectedRoom.name}`,
                                quantity: roomsCount,
                                price: grandTotal,
                                image: stay.image || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=500',
                              },
                            ],
                            totalAmount: grandTotal,
                            paymentMethod: 'Pay at Hotel (Pending)',
                            type: 'stay',
                            date: `${selectedCheckInItem.fullDateStr} (${checkInTimeSlot})`,
                            slot: `Check-Out: ${selectedCheckOutItem.fullDateStr} (${checkOutTimeSlot}) • ${computedNights} Night(s)`,
                            address: `${stay.name}, ${stay.location || 'Bangalore'}`,
                            order: newStayOrder,
                          });
                          return;
                        }

                        const authUser = useAuthStore.getState().currentUser;
                        prepareRazorpayOrder({
                          amount: grandTotal,
                          planType: 'stay_booking',
                          planName: `${stay.name} (${selectedRoom.name})`,
                          priceText: `₹${grandTotal.toLocaleString('en-IN')}`,
                          userId: authUser?.id || '',
                          onOrderReady: (ord) => {
                            setRazorpayOrder(ord);
                            setRazorpayModalVisible(true);
                          },
                        }).catch(() => {
                          setRazorpayOrder({
                            orderId: `order_stay_${Date.now()}`,
                            amount: grandTotal * 100,
                            currency: 'INR',
                            keyId: RAZORPAY_KEY_ID || 'rzp_test_THLM17MgXLM2tP',
                            planType: 'stay_booking',
                            planName: `${stay.name} (${selectedRoom.name})`,
                            priceText: `₹${grandTotal.toLocaleString('en-IN')}`,
                          });
                          setRazorpayModalVisible(true);
                        });
                      }}
                    >
                      <Text style={styles.modalCtaBtnText}>
                        {paymentMethod === 'Pay at Hotel' ? 'Confirm Booking (Pay at Hotel)' : `Pay & Book (₹${grandTotal.toLocaleString()})`}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* STEP 4: BOOKING CONFIRMED */}
              {bookingStep === 4 && (
                <View style={styles.confirmedContainer}>
                  <View style={styles.confirmedCircle}>
                    <Icons.Check color="#FFFFFF" size={34} />
                  </View>

                  <Text style={styles.confirmedTitle}>✓ Booking Confirmed!</Text>
                  <Text style={styles.confirmedIdText}>Booking ID: {confirmedBookingId || 'CN-STAY-82910'}</Text>

                  <View style={[styles.summaryCard, { width: '100%', backgroundColor: '#FFFFFF', borderColor: '#10B981' }]}>
                    <Text style={[styles.summaryHotelName, { color: colors.text }]}>{stay.name}</Text>
                    <Text style={styles.summaryRoomType}>{selectedRoom.name} • {roomsCount} Room(s)</Text>
                    <Text style={styles.summaryDates}>
                      Check-In: {selectedCheckInItem.fullDateStr} ({checkInTimeSlot})
                    </Text>
                    <Text style={styles.summaryDates}>
                      Check-Out: {selectedCheckOutItem.fullDateStr} ({checkOutTimeSlot})
                    </Text>
                    <Text style={styles.summaryGuests}>
                      Guest: {guestName} ({guestMobile}) • {adultsCount} Adults, {childrenCount} Children
                    </Text>
                    <Text style={[styles.totalValue, { marginTop: 8 }]}>
                      Total Paid: ₹{grandTotal.toLocaleString()} (Razorpay Test Mode Verified)
                    </Text>
                  </View>

                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                    <TouchableOpacity
                      style={[styles.modalCtaBtn, { flex: 1, backgroundColor: '#E2E8F0' }]}
                      activeOpacity={0.85}
                      onPress={() => {
                        setIsBookingModalOpen(false);
                        navigation.goBack();
                      }}
                    >
                      <Text style={[styles.modalCtaBtnText, { color: '#0F172A' }]}>Done</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.modalCtaBtn, { flex: 1.5 }]}
                      activeOpacity={0.85}
                      onPress={() => {
                        setIsBookingModalOpen(false);
                        navigation.navigate('CustomerTabs', {
                          screen: 'Orders',
                          params: { activeTab: 'bookings', category: 'Stay' },
                        });
                      }}
                    >
                      <Text style={styles.modalCtaBtnText}>View in Bookings</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Razorpay Test Mode Checkout Modal */}
      <RazorpayModal
        visible={razorpayModalVisible}
        orderData={razorpayOrder}
        userInfo={{
          name: guestName || useAuthStore.getState().currentUser?.name || 'Guest User',
          email: useAuthStore.getState().currentUser?.email || '',
          phone: guestMobile || useAuthStore.getState().currentUser?.phone || '',
        }}
        merchantName="Forge India Connect • Stay & Travel"
        onSuccess={async (paymentResult) => {
          setRazorpayModalVisible(false);
          const newId = `CN-STAY-${Date.now().toString().slice(-6)}`;
          setConfirmedBookingId(newId);

          const newStayOrder: Order = {
            id: newId,
            order_number: newId,
            vendor_id: stay.vendor_id || stay.vendorId || '',
            vendor_name: stay.name || 'Luxury Resort & Stay',
            category: 'Stay',
            order_type: 'booking',
            customer_name: guestName || useAuthStore.getState().currentUser?.name || 'Guest User',
            customer_phone: guestMobile || useAuthStore.getState().currentUser?.phone || '',
            customer_address: `${stay.name}, ${stay.location || 'Bangalore'}`,
            customer_latitude: 12.9498,
            customer_longitude: 77.6289,
            product_details: `${stay.name} (${selectedRoom.name} • ${selectedCheckInItem.fullDateStr} to ${selectedCheckOutItem.fullDateStr})`,
            hotel_name: stay.name,
            room_type: selectedRoom.name,
            check_in: selectedCheckInItem.fullDateStr,
            check_out: selectedCheckOutItem.fullDateStr,
            guests_count: `${adultsCount} Adults, ${childrenCount} Children`,
            items: [
              {
                name: `${stay.name} - ${selectedRoom.name}`,
                quantity: roomsCount,
                price: grandTotal,
              },
            ],
            item_count: 1,
            amount: grandTotal,
            status: 'Confirmed',
            payment_method: 'Razorpay Test Mode (Online)',
            payment_status: 'Paid',
            created_at: new Date().toISOString(),
            image: stay.image || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=500',
          };

          // 1. Immediately record in local state
          useOrderStore.getState().addLocalOrder(newStayOrder);

          // Notification Center & System Notification Dispatch
          dispatchCustomerNotification({
            title: 'Stay Reserved Successfully! 🏨',
            body: `Reservation for ${stay.name || 'Resort'} (${selectedRoom.name}) confirmed. Dates: ${selectedCheckInItem.fullDateStr} to ${selectedCheckOutItem.fullDateStr}`,
            icon: 'Hotel',
            category: 'order',
            actionLabel: 'View Booking',
            actionType: 'booking',
            orderType: 'booking',
            bookingId: newId,
            orderId: newId,
            targetScreen: 'Orders',
            targetParams: { activeTab: 'my bookings', category: 'Stay', orderId: newId },
          });

          // 2. Verify payment on backend
          apiFetch('/razorpay/verify-payment', {
            method: 'POST',
            body: {
              ...paymentResult,
              planType: 'stay_booking',
              amount: grandTotal,
              userId: useAuthStore.getState().currentUser?.id || 'guest_user',
            },
          }).catch((err) => console.warn('Background stay payment verify notice:', err));

          const authUser = useAuthStore.getState().currentUser;
          const guestNameVal = guestList[0]?.fullName || guestName || authUser?.name || 'Customer';
          const guestPhoneVal = guestList[0]?.phoneNumber || guestMobile || authUser?.phone || '';
          const guestEmailVal = guestEmail || authUser?.email || '';

          // 3. Save stay booking to orders on backend with customer and booking details
          apiFetch('/orders', {
            method: 'POST',
            body: {
              id: newId,
              order_number: newId,
              vendor_id: stay.vendorId || stay.vendor_id || '',
                            vendorId: stay.vendorId || stay.vendor_id || '',
                            productId: stay.id || stay._id,
              customerId: authUser?.customerId || authUser?.registrationId || authUser?.id,
              customer_id: authUser?.customerId || authUser?.registrationId || authUser?.id,
              customer_name: guestNameVal,
              customer_phone: guestPhoneVal,
              customer_email: guestEmailVal,
              customer_address: `${stay.name}, ${stay.location || 'Bangalore'}`,
              customer_latitude: 12.9498,
              customer_longitude: 77.6289,
              product_details: `${stay.name} (${selectedRoom.name} • ${selectedCheckInItem.fullDateStr} to ${selectedCheckOutItem.fullDateStr})`,
              amount: grandTotal,
              order_type: 'booking',
              type: 'Stay',
              category: 'Stay',
              payment_id: paymentResult.razorpay_payment_id,
              transactionId: paymentResult.razorpay_payment_id,
              payment_status: 'Paid',
              payment_method: 'Razorpay Test Mode (Online)',
              checkInDate: selectedCheckInItem.fullDateStr,
              checkOutDate: selectedCheckOutItem.fullDateStr,
              roomsCount,
              nightsCount: computedNights,
              adults: adultsCount,
              children: childrenCount,
              guestList,
              specialRequests: guestSpecialNote,
            },
          }).catch((err) => console.warn('Background stay order save notice:', err));

          // Dismiss sheet modal and navigate to BookingConfirmation screen (like other bookings & orders)
          setIsBookingModalOpen(false);
          setBookingStep(1);

          navigation.navigate('BookingConfirmation', {
            bookingId: newId,
            items: [
              {
                name: `${stay.name} - ${selectedRoom.name}`,
                quantity: roomsCount,
                price: grandTotal,
                image: stay.image || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=500',
              },
            ],
            totalAmount: grandTotal,
            paymentMethod: 'Razorpay (Online Paid)',
            type: 'stay',
            date: `${selectedCheckInItem.fullDateStr} (${checkInTimeSlot})`,
            slot: `Check-Out: ${selectedCheckOutItem.fullDateStr} (${checkOutTimeSlot}) • ${computedNights} Night(s)`,
            address: `${stay.name}, ${stay.location || 'Bangalore'}`,
            order: newStayOrder,
          });
        }}
        onCancel={() => {
          setRazorpayModalVisible(false);
          setRazorpayOrder(null);
        }}
      />

      {/* ========================================================================= */}
      {/* --- CALENDAR MODAL (DATE SELECTION) --- */}
      {/* ========================================================================= */}
      <Modal
        visible={datePickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDatePickerVisible(false)}
      >
        <View style={styles.pickerBackdrop}>
          <View style={styles.calendarModalCard}>
            {/* Header */}
            <View style={styles.pickerHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: datePickerTarget === 'checkIn' ? '#059669' : '#2563EB' },
                  ]}
                />
                <Text style={styles.pickerHeaderTitle}>
                  {datePickerTarget === 'checkIn' ? 'Select Check-In Date' : 'Select Check-Out Date'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setDatePickerVisible(false)}
                style={styles.pickerCloseBtn}
              >
                <Icons.X color="#64748B" size={18} />
              </TouchableOpacity>
            </View>

            {/* Selected Date Preview Bar */}
            <View
              style={[
                styles.calendarSelectedPreviewBar,
                {
                  backgroundColor: datePickerTarget === 'checkIn' ? '#F0FDF4' : '#EFF6FF',
                  borderColor: datePickerTarget === 'checkIn' ? '#A7F3D0' : '#BFDBFE',
                },
              ]}
            >
              <Icons.Calendar
                color={datePickerTarget === 'checkIn' ? '#059669' : '#2563EB'}
                size={18}
              />
              <Text
                style={[
                  styles.calendarSelectedPreviewText,
                  { color: datePickerTarget === 'checkIn' ? '#059669' : '#2563EB' },
                ]}
              >
                {datePickerTarget === 'checkIn'
                  ? selectedCheckInItem.fullDateStr
                  : selectedCheckOutItem.fullDateStr}
              </Text>
            </View>

            {/* Month Navigation Header */}
            <View style={styles.calendarHeaderRow}>
              <TouchableOpacity
                style={styles.calendarNavBtn}
                onPress={handlePrevMonth}
                activeOpacity={0.7}
              >
                <Icons.ChevronLeft color="#0F172A" size={18} />
              </TouchableOpacity>
              <Text style={styles.calendarMonthTitle}>
                {MONTH_NAMES[calendarMonth]} {calendarYear}
              </Text>
              <TouchableOpacity
                style={styles.calendarNavBtn}
                onPress={handleNextMonth}
                activeOpacity={0.7}
              >
                <Icons.ChevronRight color="#0F172A" size={18} />
              </TouchableOpacity>
            </View>

            {/* Weekdays Row */}
            <View style={styles.calendarWeekRow}>
              {WEEKDAYS_SHORT.map((wd, wIdx) => (
                <View key={`wd_modal_${wIdx}`} style={styles.calendarWeekCell}>
                  <Text style={styles.calendarWeekText}>{wd}</Text>
                </View>
              ))}
            </View>

            {/* Calendar Days Grid */}
            <View style={styles.calendarGrid}>
              {calendarDays.map((cell, cIdx) => {
                if (!cell.day || !cell.dateObj) {
                  return <View key={`blank_m_${cIdx}`} style={styles.calendarDayCell} />;
                }

                const dObj = cell.dateObj;
                const isCheckInTarget = datePickerTarget === 'checkIn';
                const isSelIn =
                  dObj.getFullYear() === checkInDateObj.getFullYear() &&
                  dObj.getMonth() === checkInDateObj.getMonth() &&
                  dObj.getDate() === checkInDateObj.getDate();
                const isSelOut =
                  dObj.getFullYear() === checkOutDateObj.getFullYear() &&
                  dObj.getMonth() === checkOutDateObj.getMonth() &&
                  dObj.getDate() === checkOutDateObj.getDate();
                const isBetween = dObj > checkInDateObj && dObj < checkOutDateObj;

                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const checkD = new Date(dObj);
                checkD.setHours(0, 0, 0, 0);

                let isBlocked = false;
                if (isCheckInTarget) {
                  isBlocked = checkD < today;
                } else {
                  const inD = new Date(checkInDateObj);
                  inD.setHours(0, 0, 0, 0);
                  isBlocked = checkD <= inD;
                }

                const isCurrentTargetSel = isCheckInTarget ? isSelIn : isSelOut;

                return (
                  <TouchableOpacity
                    key={`day_m_${cIdx}`}
                    style={[
                      styles.calendarDayCell,
                      isBetween &&
                        (isCheckInTarget
                          ? styles.calendarDayCellBetweenIn
                          : styles.calendarDayCellBetweenOut),
                    ]}
                    activeOpacity={0.75}
                    disabled={isBlocked}
                    onPress={() => {
                      handleCalendarSelectDate(dObj, datePickerTarget);
                    }}
                  >
                    <View
                      style={[
                        styles.calendarDayCircle,
                        isCurrentTargetSel &&
                          (isCheckInTarget
                            ? styles.calendarDayCircleSelectedGreen
                            : styles.calendarDayCircleSelectedBlue),
                        !isCurrentTargetSel &&
                          isSelIn &&
                          styles.calendarDayCircleSelectedGreenBorder,
                        !isCurrentTargetSel &&
                          isSelOut &&
                          styles.calendarDayCircleSelectedBlueBorder,
                      ]}
                    >
                      <Text
                        style={[
                          styles.calendarDayNum,
                          isBlocked && styles.calendarDayNumPast,
                          isCurrentTargetSel && styles.calendarDayNumWhite,
                          !isCurrentTargetSel && isSelIn && styles.calendarDayNumGreen,
                          !isCurrentTargetSel && isSelOut && styles.calendarDayNumBlue,
                        ]}
                      >
                        {cell.day}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Confirm Actions */}
            <View style={styles.pickerActionsRow}>
              <TouchableOpacity
                style={styles.pickerCancelBtn}
                onPress={() => setDatePickerVisible(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.pickerCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.pickerConfirmBtn,
                  {
                    backgroundColor: datePickerTarget === 'checkIn' ? '#059669' : '#2563EB',
                  },
                ]}
                onPress={() => setDatePickerVisible(false)}
                activeOpacity={0.85}
              >
                <Text style={styles.pickerConfirmBtnText}>Confirm Date</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ========================================================================= */}
      {/* --- ROUND CLOCK MODAL (ROTATABLE CLOCK HANDS) --- */}
      {/* ========================================================================= */}
      <Modal
        visible={timePickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setTimePickerVisible(false)}
      >
        <View style={styles.pickerBackdrop}>
          <View style={styles.pickerCard}>
            {/* Header */}
            <View style={styles.pickerHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: timePickerTarget === 'checkIn' ? '#059669' : '#2563EB' },
                  ]}
                />
                <Text style={styles.pickerHeaderTitle}>
                  {timePickerTarget === 'checkIn' ? 'Check-In Round Clock' : 'Check-Out Round Clock'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setTimePickerVisible(false)}
                style={styles.pickerCloseBtn}
              >
                <Icons.X color="#64748B" size={18} />
              </TouchableOpacity>
            </View>

            {/* Interactive Digital Header with Hour / Minute / AM-PM Selectors */}
            <View
              style={[
                styles.pickerClockPreview,
                {
                  borderColor: timePickerTarget === 'checkIn' ? '#A7F3D0' : '#BFDBFE',
                  backgroundColor: timePickerTarget === 'checkIn' ? '#F0FDF4' : '#EFF6FF',
                },
              ]}
            >
              {/* Hour Box */}
              <TouchableOpacity
                style={[
                  styles.pickerClockBox,
                  clockMode === 'hour' && {
                    backgroundColor: timePickerTarget === 'checkIn' ? '#DCFCE7' : '#DBEAFE',
                    borderColor: timePickerTarget === 'checkIn' ? '#059669' : '#2563EB',
                    borderWidth: 1.5,
                  },
                ]}
                activeOpacity={0.8}
                onPress={() => setClockMode('hour')}
              >
                <Text
                  style={[
                    styles.pickerClockDigit,
                    { color: timePickerTarget === 'checkIn' ? '#059669' : '#2563EB' },
                  ]}
                >
                  {pickerHour}
                </Text>
                <Text
                  style={[
                    styles.pickerClockSub,
                    clockMode === 'hour' && {
                      color: timePickerTarget === 'checkIn' ? '#059669' : '#2563EB',
                      fontWeight: '900',
                    },
                  ]}
                >
                  HOUR
                </Text>
              </TouchableOpacity>

              <Text
                style={[
                  styles.pickerClockColon,
                  { color: timePickerTarget === 'checkIn' ? '#059669' : '#2563EB' },
                ]}
              >
                :
              </Text>

              {/* Minute Box */}
              <TouchableOpacity
                style={[
                  styles.pickerClockBox,
                  clockMode === 'minute' && {
                    backgroundColor: timePickerTarget === 'checkIn' ? '#DCFCE7' : '#DBEAFE',
                    borderColor: timePickerTarget === 'checkIn' ? '#059669' : '#2563EB',
                    borderWidth: 1.5,
                  },
                ]}
                activeOpacity={0.8}
                onPress={() => setClockMode('minute')}
              >
                <Text
                  style={[
                    styles.pickerClockDigit,
                    { color: timePickerTarget === 'checkIn' ? '#059669' : '#2563EB' },
                  ]}
                >
                  {pickerMinute}
                </Text>
                <Text
                  style={[
                    styles.pickerClockSub,
                    clockMode === 'minute' && {
                      color: timePickerTarget === 'checkIn' ? '#059669' : '#2563EB',
                      fontWeight: '900',
                    },
                  ]}
                >
                  MIN
                </Text>
              </TouchableOpacity>

              {/* AM / PM Toggle Pills */}
              <View style={styles.periodToggleCol}>
                <TouchableOpacity
                  style={[
                    styles.periodToggleBtn,
                    pickerPeriod === 'AM' && {
                      backgroundColor: timePickerTarget === 'checkIn' ? '#059669' : '#2563EB',
                    },
                  ]}
                  activeOpacity={0.8}
                  onPress={() => setPickerPeriod('AM')}
                >
                  <Text
                    style={[
                      styles.periodToggleBtnText,
                      pickerPeriod === 'AM' && { color: '#FFFFFF', fontWeight: '900' },
                    ]}
                  >
                    AM
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.periodToggleBtn,
                    pickerPeriod === 'PM' && {
                      backgroundColor: timePickerTarget === 'checkIn' ? '#059669' : '#2563EB',
                    },
                  ]}
                  activeOpacity={0.8}
                  onPress={() => setPickerPeriod('PM')}
                >
                  <Text
                    style={[
                      styles.periodToggleBtnText,
                      pickerPeriod === 'PM' && { color: '#FFFFFF', fontWeight: '900' },
                    ]}
                  >
                    PM
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Mode Switcher Tabs */}
            <View style={styles.clockModeTabRow}>
              <TouchableOpacity
                style={[
                  styles.clockModeTab,
                  clockMode === 'hour' && {
                    backgroundColor: timePickerTarget === 'checkIn' ? '#059669' : '#2563EB',
                    borderColor: timePickerTarget === 'checkIn' ? '#059669' : '#2563EB',
                  },
                ]}
                activeOpacity={0.8}
                onPress={() => setClockMode('hour')}
              >
                <Text
                  style={[
                    styles.clockModeTabText,
                    clockMode === 'hour' && { color: '#FFFFFF', fontWeight: '900' },
                  ]}
                >
                  Pick Hour (1 - 12)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.clockModeTab,
                  clockMode === 'minute' && {
                    backgroundColor: timePickerTarget === 'checkIn' ? '#059669' : '#2563EB',
                    borderColor: timePickerTarget === 'checkIn' ? '#059669' : '#2563EB',
                  },
                ]}
                activeOpacity={0.8}
                onPress={() => setClockMode('minute')}
              >
                <Text
                  style={[
                    styles.clockModeTabText,
                    clockMode === 'minute' && { color: '#FFFFFF', fontWeight: '900' },
                  ]}
                >
                  Pick Minute (00 - 55)
                </Text>
              </TouchableOpacity>
            </View>

            {/* Sub-instruction label */}
            <Text style={styles.clockDialSubInstruction}>
              {clockMode === 'hour'
                ? 'Touch or drag the clock hand to select hour:'
                : 'Touch or drag the clock hand to select minute:'}
            </Text>

            {/* THE ROUND ANALOG CLOCK FACE WITH ROTATABLE CLOCK HAND */}
            <View style={styles.clockDialWrapper}>
              <View
                style={[
                  styles.clockDialCircle,
                  {
                    borderColor: timePickerTarget === 'checkIn' ? '#A7F3D0' : '#BFDBFE',
                  },
                ]}
                {...clockPanResponder.panHandlers}
              >
                {/* Rotatable Clock Hand */}
                <View
                  pointerEvents="none"
                  style={[
                    styles.clockHandPivotWrap,
                    {
                      transform: [{ rotate: `${clockHandAngle}deg` }],
                    },
                  ]}
                >
                  {/* Hand Shaft */}
                  <View
                    style={[
                      styles.clockHandShaft,
                      {
                        backgroundColor:
                          timePickerTarget === 'checkIn' ? '#059669' : '#2563EB',
                      },
                    ]}
                  />
                  {/* Hand Tip Knob */}
                  <View
                    style={[
                      styles.clockHandTipKnob,
                      {
                        backgroundColor:
                          timePickerTarget === 'checkIn' ? '#059669' : '#2563EB',
                        shadowColor:
                          timePickerTarget === 'checkIn' ? '#059669' : '#2563EB',
                      },
                    ]}
                  />
                </View>

                {/* Center Pivot Pin */}
                <View
                  pointerEvents="none"
                  style={[
                    styles.clockCenterPin,
                    {
                      backgroundColor:
                        timePickerTarget === 'checkIn' ? '#059669' : '#2563EB',
                    },
                  ]}
                >
                  <View style={styles.clockCenterPinDot} />
                </View>

                {/* 12 Numbers arranged in circle at radius 86px */}
                {(clockMode === 'hour' ? CLOCK_HOURS_ITEMS : CLOCK_MINUTES_ITEMS).map((item, idx) => {
                  const isSelected =
                    clockMode === 'hour'
                      ? pickerHour === item.val || parseInt(pickerHour, 10) === parseInt(item.val, 10)
                      : pickerMinute === item.val || parseInt(pickerMinute, 10) === parseInt(item.val, 10);

                  const angleRad = (idx * 30 - 90) * (Math.PI / 180);
                  const posX = 125 + 86 * Math.cos(angleRad) - 18;
                  const posY = 125 + 86 * Math.sin(angleRad) - 18;

                  return (
                    <View
                      key={`dial_node_${clockMode}_${item.val}`}
                      style={[
                        styles.clockDialNumberPill,
                        { left: posX, top: posY },
                      ]}
                      pointerEvents="none"
                    >
                      <Text
                        style={[
                          styles.clockDialNumberText,
                          isSelected && styles.clockDialNumberTextSelected,
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
            <View style={styles.pickerActionsRow}>
              <TouchableOpacity
                style={styles.pickerCancelBtn}
                onPress={() => setTimePickerVisible(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.pickerCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.pickerConfirmBtn,
                  { backgroundColor: timePickerTarget === 'checkIn' ? '#059669' : '#2563EB' },
                ]}
                onPress={handleConfirmTimePicker}
                activeOpacity={0.85}
              >
                <Text style={styles.pickerConfirmBtnText}>
                  Set Time ({pickerHour}:{pickerMinute} {pickerPeriod})
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scrollContent: {
    paddingTop: 12,
  },
  galleryContainer: {
    paddingHorizontal: 16,
  },
  mainGalleryImg: {
    width: '100%',
    height: 220,
    borderRadius: 16,
    backgroundColor: '#E2E8F0',
  },
  thumbnailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 10,
  },
  thumbnailWrapper: {
    flex: 1,
    height: 60,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  thumbnailWrapperSelected: {
    borderColor: '#F5B800',
  },
  thumbnailImg: {
    width: '100%',
    height: '100%',
  },
  bodyContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  propInfoSection: {
    marginBottom: 12,
  },
  titleRow: {
    marginBottom: 6,
  },
  propTitle: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  ratingAndLocRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FFFBEB',
    borderColor: '#F5B800',
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  ratingBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  reviewsCountText: {
    fontSize: 12,
    fontWeight: '600',
  },
  bulletSeparator: {
    color: '#94A3B8',
    fontSize: 12,
  },
  locationText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  viewOnMapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  viewOnMapBtnText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#D97706',
  },
  priceCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginBottom: 16,
  },
  priceLeftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  priceLargeText: {
    fontSize: 20,
    fontWeight: '900',
  },
  priceOriginalText: {
    fontSize: 14,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
    fontWeight: '600',
  },
  discountTag: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  discountTagText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#059669',
  },
  taxesNoticeText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
    fontWeight: '500',
  },
  sectionBlock: {
    marginBottom: 18,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 10,
  },
  amenitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  amenityItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  amenityIconContainer: {
    width: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  amenityLabel: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  aboutText: {
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '400',
  },
  roomCard: {
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 14,
  },
  roomHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  roomNameText: {
    fontSize: 15,
    fontWeight: '900',
  },
  roomGuestsSubtitle: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '600',
  },
  roomPricePill: {
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  roomPricePillText: {
    fontSize: 13,
    fontWeight: '900',
  },
  roomInclusionsList: {
    gap: 4,
    marginVertical: 8,
  },
  inclusionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  inclusionText: {
    fontSize: 11.5,
    color: '#059669',
    fontWeight: '700',
  },
  selectRoomBtn: {
    backgroundColor: '#F5B800',
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  selectRoomBtnActive: {
    backgroundColor: '#F59E0B',
  },
  selectRoomBtnText: {
    fontSize: 12.5,
    fontWeight: '900',
    color: '#0F172A',
  },
  policyContainer: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 8,
  },
  policyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  policyRowText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  stickyBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  stickyPriceColumn: {
    flex: 1,
  },
  stickyPriceText: {
    fontSize: 18,
    fontWeight: '900',
  },
  stickyRoomSubtitle: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  stickySelectRoomBtn: {
    backgroundColor: '#F5B800',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  stickySelectRoomBtnText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#0F172A',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 16,
  },
  modalSheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalSheetSuperHeader: {
    fontSize: 10.5,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  modalSheetTitle: {
    fontSize: 17,
    fontWeight: '900',
    marginTop: 2,
  },
  closeSheetBtn: {
    padding: 4,
  },
  configCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 14,
  },
  configCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  configCardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  configCardHeaderTitle: {
    fontSize: 12.5,
    fontWeight: '900',
    letterSpacing: 0.5,
    color: '#0F172A',
  },
  configCardBadgeBlue: {
    backgroundColor: '#EFF6FF',
    borderColor: '#93C5FD',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    maxWidth: '100%',
  },
  configCardBadgeBlueText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1E40AF',
  },
  configCardBadgeGreen: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    maxWidth: '100%',
    flexShrink: 1,
  },
  configCardBadgeGreenText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#065F46',
  },
  subfieldLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: '#64748B',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  dateChipsScroller: {
    gap: 8,
    paddingBottom: 10,
  },
  dateCard: {
    width: 68,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  dateCardSelectedBlue: {
    backgroundColor: '#2563EB',
    borderColor: '#1D4ED8',
  },
  dateCardSelectedGreen: {
    backgroundColor: '#059669',
    borderColor: '#047857',
  },
  dateCardDisabled: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
    opacity: 0.55,
  },
  dateCardDay: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
  },
  dateCardNum: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
    marginVertical: 1,
  },
  dateCardMonth: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
  },
  dateCardTextWhite: {
    color: '#FFFFFF',
  },
  dateCardTextMuted: {
    color: '#94A3B8',
  },
  dateStatusPill: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  dateStatusPillSelectedBlue: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  dateStatusPillSelectedGreen: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  dateStatusPillAvail: {
    backgroundColor: '#ECFDF5',
  },
  dateStatusPillFull: {
    backgroundColor: '#FEF2F2',
  },
  dateStatusPillText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#059669',
  },
  timeSlotsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  timeSlotPill: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: 'center',
    minWidth: 86,
  },
  timeSlotPillSelectedEmerald: {
    backgroundColor: '#059669',
    borderColor: '#047857',
  },
  timeSlotPillDisabled: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    opacity: 0.6,
  },
  timeSlotText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#0F172A',
  },
  timeSlotTextWhite: {
    color: '#FFFFFF',
  },
  timeSlotTextMuted: {
    color: '#94A3B8',
  },
  timeSlotStatusText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#059669',
    marginTop: 1,
  },
  manualEntryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 8,
    marginTop: 4,
  },
  manualEntryLabel: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  manualEntrySub: {
    fontSize: 9.5,
    color: '#64748B',
  },
  manualEntryInput: {
    width: 64,
    height: 32,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 6,
    textAlign: 'center',
    fontSize: 11.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  manualTimeBadgeBlue: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  manualTimeBadgeBlueText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#1D4ED8',
  },
  manualTimeBadgeGreen: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  manualTimeBadgeGreenText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#065F46',
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  stepperLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  stepperSub: {
    fontSize: 10.5,
    color: '#64748B',
  },
  stepperControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepperBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0F172A',
    minWidth: 20,
    textAlign: 'center',
  },
  summaryCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 14,
  },
  summaryCardTitle: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
    color: '#64748B',
    marginBottom: 10,
  },
  summaryPropertyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  summaryPropThumb: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#E2E8F0',
  },
  summaryHotelName: {
    fontSize: 14,
    fontWeight: '900',
  },
  summaryRoomType: {
    fontSize: 12,
    fontWeight: '800',
    color: '#D97706',
  },
  summaryDates: {
    fontSize: 11.5,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 2,
  },
  summaryGuests: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 10,
  },
  summaryDetailsList: {
    gap: 8,
  },
  summaryItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryItemLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  summaryItemValBold: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  summaryItemValSub: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
  },
  summaryTotalRow: {
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 8,
    marginTop: 4,
  },
  summaryTotalLabel: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0F172A',
  },
  summaryTotalValue: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0F172A',
  },
  modalCtaBtn: {
    backgroundColor: '#F5B800',
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  modalCtaBtnText: {
    fontSize: 13.5,
    fontWeight: '900',
    color: '#0F172A',
  },
  inputFieldLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: '#64748B',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  textInput: {
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 13,
  },
  policyNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF3C7',
    padding: 10,
    borderRadius: 10,
  },
  policyNoticeText: {
    fontSize: 11,
    color: '#92400E',
    fontWeight: '600',
    flex: 1,
  },
  sectionSubheading: {
    fontSize: 14,
    fontWeight: '800',
  },
  paymentOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  paymentOptionText: {
    fontSize: 13.5,
  },
  priceBreakdownCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 6,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  priceLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  priceValue: {
    fontSize: 12,
    fontWeight: '700',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 8,
    marginTop: 4,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0F172A',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
  },
  confirmedContainer: {
    alignItems: 'center',
    paddingVertical: 16,
    gap: 12,
  },
  confirmedCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmedTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: '#10B981',
  },
  confirmedIdText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  mapPinBadge: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F5B800',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    elevation: 8,
  },
  mapPinText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#0F172A',
  },
  // Reference Image Styled Departure & Traveler Component Styles
  departureSlotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 8,
  },
  depSlotCard: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  depSlotSelectedEmerald: {
    backgroundColor: '#059669',
    borderColor: '#047857',
  },
  depSlotNotAvailCard: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
  },
  depSlotTimeText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0F172A',
  },
  depSlotNotAvailTimeText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#EF4444',
    textDecorationLine: 'line-through',
  },
  depSlotStatusPill: {
    marginTop: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  depSlotStatusPillSelected: {
    backgroundColor: '#047857',
  },
  depSlotStatusPillAvail: {
    backgroundColor: '#ECFDF5',
  },
  depSlotStatusPillNotAvail: {
    marginTop: 4,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  depSlotStatusText: {
    fontSize: 8.5,
    fontWeight: '900',
    color: '#059669',
  },
  depSlotNotAvailStatusText: {
    fontSize: 8.5,
    fontWeight: '900',
    color: '#DC2626',
  },
  manualDepContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    borderRadius: 12,
    padding: 10,
    marginTop: 6,
  },
  clockIconCircleBlue: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  manualDepTitle: {
    fontSize: 11.5,
    fontWeight: '900',
    color: '#0F172A',
  },
  manualDepSub: {
    fontSize: 9.5,
    color: '#64748B',
  },
  manualInputWrap: {
    position: 'relative',
    justifyContent: 'center',
  },
  manualDepInput: {
    width: 78,
    height: 32,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    paddingLeft: 6,
    paddingRight: 22,
    fontSize: 10.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  travelersCardTitle: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
    color: '#475569',
    marginBottom: 10,
  },
  travelersCardsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  travelerCategoryCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  travelerCategoryName: {
    fontSize: 13,
    fontWeight: '900',
    color: '#0F172A',
  },
  travelerCategoryAge: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
  },
  stepperPillWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 3,
    paddingVertical: 2,
  },
  stepperBtnRef: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
  },
  stepperBtnRefText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0F172A',
  },
  stepperCountRefText: {
    fontSize: 13.5,
    fontWeight: '900',
    color: '#0F172A',
    minWidth: 20,
    textAlign: 'center',
  },
  guestInfoOuterCard: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1.5,
    borderColor: '#FDE68A',
    borderRadius: 14,
    padding: 14,
  },
  guestInfoSectionHeader: {
    fontSize: 11.5,
    fontWeight: '900',
    letterSpacing: 0.5,
    color: '#D97706',
  },
  guestDetailBox: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  guestDetailHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  guestDetailHeaderTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#D97706',
    letterSpacing: 0.5,
  },
  mainContactBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  mainContactBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#B45309',
    letterSpacing: 0.4,
  },
  guestFieldsRow: {
    flexDirection: 'column',
    gap: 10,
  },
  guestFieldBlock: {
    width: '100%',
  },
  guestInputLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: '#64748B',
    marginBottom: 4,
    letterSpacing: 0.4,
  },
  guestRefInput: {
    height: 38,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  // Time Picker Modal Styles (Hour & Minute Selector)
  manualInputClickableWrap: {
    height: 32,
    minWidth: 88,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
  },
  manualDepInputText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0F172A',
  },
  pickerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  pickerCard: {
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
  pickerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  pickerHeaderTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0F172A',
  },
  pickerCloseBtn: {
    padding: 4,
  },
  pickerClockPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 14,
  },
  pickerClockBox: {
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    minWidth: 54,
  },
  pickerClockDigit: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  pickerClockSub: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748B',
    marginTop: 1,
  },
  pickerClockColon: {
    fontSize: 24,
    fontWeight: '900',
    marginTop: -4,
  },
  periodToggleCol: {
    gap: 4,
    marginLeft: 4,
  },
  periodToggleBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
  },
  periodToggleBtnText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#475569',
  },
  clockModeTabRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  clockModeTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  clockModeTabText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#64748B',
  },
  clockDialSubInstruction: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 8,
  },
  clockDialWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 6,
  },
  clockDialCircle: {
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: '#F8FAFC',
    borderWidth: 2,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clockHandPivotWrap: {
    position: 'absolute',
    left: 125,
    top: 125,
    width: 0,
    height: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 6,
  },
  clockHandShaft: {
    position: 'absolute',
    left: -1.5,
    bottom: 0,
    width: 3,
    height: 86,
    borderRadius: 1.5,
  },
  clockHandTipKnob: {
    position: 'absolute',
    left: -19,
    top: -86 - 19,
    width: 38,
    height: 38,
    borderRadius: 19,
    elevation: 6,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.45,
    shadowRadius: 5,
  },
  clockCenterPin: {
    position: 'absolute',
    left: 125 - 7,
    top: 125 - 7,
    width: 14,
    height: 14,
    borderRadius: 7,
    zIndex: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clockCenterPinDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
  },
  clockDialNumberPill: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 8,
  },
  clockDialNumberText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#334155',
  },
  clockDialNumberTextSelected: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  pickerActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 12,
  },
  pickerCancelBtn: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerCancelBtnText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#64748B',
  },
  pickerConfirmBtn: {
    flex: 2,
    height: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerConfirmBtnText: {
    fontSize: 12.5,
    fontWeight: '900',
    color: '#FFFFFF',
  },

  // Clickable Date & Time Field Trigger Card Styles on Main Sheet
  fieldTriggerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 12,
  },
  fieldTriggerIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldTriggerSubLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  fieldTriggerMainText: {
    fontSize: 14,
    fontWeight: '900',
  },
  fieldTriggerActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  fieldTriggerActionText: {
    fontSize: 11,
    fontWeight: '800',
  },

  // Calendar Modal Styles
  calendarModalCard: {
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
  calendarSelectedPreviewBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  calendarSelectedPreviewText: {
    fontSize: 13,
    fontWeight: '800',
  },
  calendarContainer: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 12,
  },
  calendarHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  calendarNavBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarMonthTitle: {
    fontSize: 13.5,
    fontWeight: '900',
    color: '#0F172A',
  },
  calendarWeekRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 6,
    marginBottom: 6,
  },
  calendarWeekCell: {
    flex: 1,
    alignItems: 'center',
  },
  calendarWeekText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94A3B8',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarDayCell: {
    width: '14.28%',
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 2,
  },
  calendarDayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarDayCircleSelectedGreen: {
    backgroundColor: '#059669',
  },
  calendarDayCircleSelectedBlue: {
    backgroundColor: '#2563EB',
  },
  calendarDayCircleSelectedGreenBorder: {
    borderWidth: 1.5,
    borderColor: '#059669',
    backgroundColor: '#ECFDF5',
  },
  calendarDayCircleSelectedBlueBorder: {
    borderWidth: 1.5,
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  calendarDayCellBetweenIn: {
    backgroundColor: '#ECFDF5',
    borderRadius: 4,
  },
  calendarDayCellBetweenOut: {
    backgroundColor: '#EFF6FF',
    borderRadius: 4,
  },
  calendarDayNum: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  calendarDayNumPast: {
    color: '#CBD5E1',
  },
  calendarDayNumWhite: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  calendarDayNumGreen: {
    color: '#059669',
    fontWeight: '900',
  },
  calendarDayNumBlue: {
    color: '#2563EB',
    fontWeight: '900',
  },

  // Time Main Bar & Round Clock Launcher Styles
  timeMainBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
  },
  timeMainBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  clockCircleIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeMainBarLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  timeMainBarValue: {
    fontSize: 14,
    fontWeight: '900',
  },
  openClockCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  openClockCtaBtnText: {
    fontSize: 11.5,
    fontWeight: '900',
    color: '#FFFFFF',
  },
});
