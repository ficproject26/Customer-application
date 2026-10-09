import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  StatusBar,
  Dimensions,
  Animated,
  Easing,
  Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Icons from 'lucide-react-native';
import { useThemeStore } from '../../store/themeStore';
import { useAuthStore } from '../../store/authStore';
import { useOrderStore } from '../../store/orderStore';
import { useNotificationStore } from '../../store/notificationStore';
import { downloadInvoicePDF, shareInvoicePDF } from '../../services/invoiceService';
import RazorpayModal, { RazorpayOrderDetails } from '../../components/RazorpayModal';
import { RAZORPAY_KEY_ID } from '../../services/env';
import { apiFetch } from '../../services/api';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const CONFETTI_COLORS = [
  '#EF4444', // Red
  '#F59E0B', // Amber Gold
  '#10B981', // Emerald
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#FACC15', // Yellow
  '#06B6D4', // Cyan
  '#F97316', // Orange
  '#14B8A6', // Teal
  '#E11D48', // Ruby
  '#84CC16', // Lime
];

const CONFETTI_EMOJIS = ['🎉', '🥳', '🎊', '✨', '⭐', '🎈'];

interface ConfettiPieceProps {
  index: number;
}

/**
 * Confetti cannon particle that bursts instantly DOWN-TO-UP from the party poppers,
 * spreads across the entire screen, then gently floats down!
 */
const ConfettiPiece: React.FC<ConfettiPieceProps> = React.memo(({ index }) => {
  const anim = React.useRef(new Animated.Value(0)).current;
  const [isLaunched, setIsLaunched] = React.useState(false);

  const config = React.useMemo(() => {
    // 20% emojis, 80% colorful party paper ribbons/flakes
    const isEmoji = index % 5 === 0;
    const emoji = CONFETTI_EMOJIS[index % CONFETTI_EMOJIS.length];
    const color = CONFETTI_COLORS[index % CONFETTI_COLORS.length];

    // Origin radiates outwards from around the central green tick circle
    const isLeft = index % 2 === 0;
    const direction = isLeft ? -1 : 1;
    const startX = SCREEN_WIDTH * 0.5 + direction * (18 + (index % 6) * 7);
    const startY = SCREEN_HEIGHT * 0.43;

    // Upward blast target (apex): shoots up towards the top 5% to 25% of screen
    const apexY = SCREEN_HEIGHT * 0.05 + (index % 16) * 14;

    // Outward explosive burst spread across the screen
    const spreadSpread = ((index * 37) % 100) / 100;
    const burstX = direction * (35 + spreadSpread * (SCREEN_WIDTH * 0.46));

    // Flutter sway while falling down
    const sway = (index % 2 === 0 ? 1 : -1) * (20 + (index % 7) * 7);

    // Blast waves:
    // Wave 1 (index 0..27): INSTANT BLAST (0ms - 150ms)
    // Wave 2 (index 28..49): 450ms - 1100ms
    // Wave 3 (index 50..69): 1400ms - 2200ms
    let delay = 0;
    if (index < 28) {
      delay = (index % 14) * 12; // 0ms to 156ms -> Instant pop!
    } else if (index < 50) {
      delay = 450 + (index % 11) * 65;
    } else {
      delay = 1400 + (index % 10) * 85;
    }

    const duration = 2200 + (index % 8) * 220;
    const rotationDeg = (isLeft ? -1 : 1) * (480 + (index % 6) * 160);

    // Confetti shapes: 0 = long ribbon, 1 = rectangle, 2 = diamond, 3 = circle dot
    const shapeType = index % 4;
    const width = shapeType === 0 ? 7 : shapeType === 1 ? 12 : shapeType === 2 ? 10 : 9;
    const height = shapeType === 0 ? 22 : shapeType === 1 ? 9 : shapeType === 2 ? 10 : 9;
    const borderRadius = shapeType === 3 ? 5 : shapeType === 0 ? 3 : 2;

    return {
      isEmoji,
      emoji,
      color,
      startX,
      startY,
      apexY,
      burstX,
      sway,
      duration,
      delay,
      rotationDeg,
      width,
      height,
      borderRadius,
    };
  }, [index]);

  React.useEffect(() => {
    let isMounted = true;
    let timer: any = null;

    const startAnimation = () => {
      if (!isMounted) return;
      anim.setValue(0);
      setIsLaunched(true);

      Animated.timing(anim, {
        toValue: 1,
        duration: config.duration,
        easing: Easing.bezier(0.22, 1, 0.36, 1),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished && isMounted) {
          // Loop continuously for the celebration
          startAnimation();
        }
      });
    };

    if (config.delay === 0) {
      startAnimation();
    } else {
      timer = setTimeout(() => {
        startAnimation();
      }, config.delay);
    }

    return () => {
      isMounted = false;
      if (timer) clearTimeout(timer);
      anim.stopAnimation();
    };
  }, [anim, config]);

  if (!isLaunched) {
    return null;
  }

  // Phase 1 (0 -> 0.32): Shoots UP from poppers to apex
  // Phase 2 (0.32 -> 1.0): Drifts DOWN past bottom of screen
  const translateY = anim.interpolate({
    inputRange: [0, 0.32, 1],
    outputRange: [config.startY, config.apexY, SCREEN_HEIGHT + 60],
  });

  // Outward explosive burst, then gentle side flutter
  const translateX = anim.interpolate({
    inputRange: [0, 0.32, 0.65, 1],
    outputRange: [
      config.startX,
      config.startX + config.burstX,
      config.startX + config.burstX + config.sway,
      config.startX + config.burstX - config.sway * 0.8,
    ],
  });

  const rotate = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', `${config.rotationDeg}deg`],
  });

  const scale = anim.interpolate({
    inputRange: [0, 0.15, 0.7, 1],
    outputRange: [0.35, 1.3, 1.0, 0.6],
  });

  const opacity = anim.interpolate({
    inputRange: [0, 0.05, 0.85, 1],
    outputRange: [0.85, 1, 1, 0],
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        opacity,
        transform: [{ translateX }, { translateY }, { rotate }, { scale }],
        zIndex: 9999,
      }}
    >
      {config.isEmoji ? (
        <Text style={{ fontSize: 24 }}>{config.emoji}</Text>
      ) : (
        <View
          style={{
            width: config.width,
            height: config.height,
            backgroundColor: config.color,
            borderRadius: config.borderRadius,
            shadowColor: config.color,
            shadowOffset: { width: 0, height: 1.5 },
            shadowOpacity: 0.5,
            shadowRadius: 2.5,
            elevation: 4,
          }}
        />
      )}
    </Animated.View>
  );
});

/**
 * Fullscreen Cannon Confetti background: party papers shoot down-to-up, then fall down!
 * ONLY shown on the celebration intro screen!
 */
function PartyCannonConfettiBackground() {
  const particles = React.useMemo(() => Array.from({ length: 70 }, (_, i) => i), []);

  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT,
        overflow: 'hidden',
        zIndex: 9999,
        elevation: 9999,
      }}
    >
      {particles.map((idx) => (
        <ConfettiPiece key={idx} index={idx} />
      ))}
    </View>
  );
}

/**
 * Animated stage spotlights that highlight the center celebration
 */
function SpotlightHighlights() {
  const pulseAnim = React.useRef(new Animated.Value(0)).current;
  const beamWiggleAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    // Spotlight pulsing glow loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Subtle spotlight beam sway
    Animated.loop(
      Animated.sequence([
        Animated.timing(beamWiggleAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(beamWiggleAnim, {
          toValue: -1,
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim, beamWiggleAnim]);

  const haloScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.35],
  });

  const haloOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.65, 0.2],
  });

  const leftBeamRotate = beamWiggleAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: ['22deg', '30deg'],
  });

  const rightBeamRotate = beamWiggleAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: ['-22deg', '-30deg'],
  });

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}>
      {/* Top Left Spotlight Beam */}
      <Animated.View
        style={{
          position: 'absolute',
          top: -100,
          left: -40,
          width: 220,
          height: SCREEN_HEIGHT * 0.9,
          backgroundColor: 'rgba(254, 240, 138, 0.16)',
          transform: [{ rotate: leftBeamRotate }],
          borderBottomRightRadius: 180,
          borderBottomLeftRadius: 180,
        }}
      />

      {/* Top Right Spotlight Beam */}
      <Animated.View
        style={{
          position: 'absolute',
          top: -100,
          right: -40,
          width: 220,
          height: SCREEN_HEIGHT * 0.9,
          backgroundColor: 'rgba(254, 240, 138, 0.16)',
          transform: [{ rotate: rightBeamRotate }],
          borderBottomRightRadius: 180,
          borderBottomLeftRadius: 180,
        }}
      />

      {/* Center Spotlight Glowing Rings */}
      <View
        style={{
          position: 'absolute',
          top: SCREEN_HEIGHT * 0.38 - 140,
          left: SCREEN_WIDTH * 0.5 - 140,
          width: 280,
          height: 280,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Animated.View
          style={{
            position: 'absolute',
            width: 260,
            height: 260,
            borderRadius: 130,
            backgroundColor: 'rgba(245, 184, 0, 0.18)',
            transform: [{ scale: haloScale }],
            opacity: haloOpacity,
          }}
        />
        <Animated.View
          style={{
            position: 'absolute',
            width: 190,
            height: 190,
            borderRadius: 95,
            backgroundColor: 'rgba(34, 197, 94, 0.22)',
            transform: [{ scale: haloScale }],
            opacity: haloOpacity,
          }}
        />
      </View>
    </View>
  );
}

export default function BookingConfirmationScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const route = useRoute();
  const colors = useThemeStore((state) => state.colors);
  const isDark = useThemeStore((state) => state.isDark);
  const isLight = !isDark;

  const { bookingId, items, totalAmount, paymentMethod, type, date, slot, status, order, address, boardingPoint, droppingPoint, travelers } =
    (route.params as any) || {};

  const effBoardingPoint = boardingPoint || order?.boarding_point;
  const effDroppingPoint = droppingPoint || order?.dropping_point;
  const effTravelers = travelers || order?.travelers;
  const effVehicleNumber =
    (route.params as any)?.vehicleNumber ||
    order?.vehicle_number ||
    order?.vehicleNumber ||
    order?.vehicleRegNo ||
    order?.busNumber ||
    items?.[0]?.vehicleNumber ||
    items?.[0]?.vehicleRegNo ||
    items?.[0]?.busNumber;

  // Check if product is delivered: invoice should ONLY appear when delivered
  const orderStatus = String(status || order?.status || 'Confirmed').toLowerCase().trim();
  const isDelivered = orderStatus === 'delivered' || orderStatus === 'completed';

  // COD & Payment State
  const [currentPaymentMethod, setCurrentPaymentMethod] = React.useState<string>(
    paymentMethod || order?.payment_method || 'Cash on Delivery (COD)'
  );
  const [currentPaymentStatus, setCurrentPaymentStatus] = React.useState<string>(
    order?.payment_status || (paymentMethod?.toLowerCase().includes('cod') ? 'Pending' : 'Paid')
  );
  const [razorpayModalVisible, setRazorpayModalVisible] = React.useState(false);
  const [isPayingOnline, setIsPayingOnline] = React.useState(false);

  const isCOD =
    currentPaymentMethod.toLowerCase().includes('cod') ||
    currentPaymentMethod.toLowerCase().includes('cash');

  // STAGES: 'intro' (5-second centered spotlight celebration) -> 'details' (full order screen)
  const [isIntroStage, setIsIntroStage] = React.useState(true);

  // Transition animations
  const transitionAnim = React.useRef(new Animated.Value(0)).current;

  // Top green tick pulsing animation for details page (continuously scales up & down)
  const topTickPulseAnim = React.useRef(new Animated.Value(1)).current;

  const handleProceedToDetails = React.useCallback(() => {
    Animated.timing(transitionAnim, {
      toValue: 1,
      duration: 600,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      useNativeDriver: true,
    }).start(() => {
      setIsIntroStage(false);
    });
  }, [transitionAnim]);

  React.useEffect(() => {
    // 1. Continuous pulse loop for top green tick on last page (perusu aagi chinnadhu aaganum)
    Animated.loop(
      Animated.sequence([
        Animated.timing(topTickPulseAnim, {
          toValue: 1.28,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(topTickPulseAnim, {
          toValue: 1.0,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // 2. Automatically transition to full details after exactly 5 seconds (no bottom progress line)
    const timer = setTimeout(() => {
      handleProceedToDetails();
    }, 5000);

    return () => clearTimeout(timer);
  }, [topTickPulseAnim, handleProceedToDetails]);

  // Handle COD payment online success
  const handleCodPaymentSuccess = async (paymentId: string) => {
    setIsPayingOnline(true);
    try {
      setCurrentPaymentMethod('Razorpay (UPI / Online)');
      setCurrentPaymentStatus('Paid');

      const targetId = bookingId || order?.id || order?.order_number;
      if (targetId) {
        // Update in order store
        useOrderStore.getState().updateOrderStatusLocally(targetId, 'Confirmed', {
          order: {
            payment_method: 'Razorpay (UPI / Online)',
            payment_status: 'Paid',
            razorpay_payment_id: paymentId,
          },
        });

        // Persist to backend
        await apiFetch(`/orders/${targetId}`, {
          method: 'PATCH',
          body: {
            payment_method: 'Razorpay (UPI / Online)',
            payment_status: 'Paid',
            razorpay_payment_id: paymentId,
          },
        }).catch(() => {});

        // Dispatch Payment Complete Notification with View Booking / View Order action
        const isBooking = type === 'stay' || type === 'service' || type === 'travel';
        const formattedAmount = Number(totalAmount || 499).toLocaleString('en-IN');
        useNotificationStore.getState().addNotification({
          title: isBooking
            ? (type === 'travel' ? 'Ticket Booked! Payment Complete 🚍' : type === 'stay' ? 'Stay Booked! Payment Complete 🏨' : 'Service Booked! Payment Complete 🛠️')
            : 'Payment Complete & Order Placed! 🛍️',
          message: isBooking
            ? `Payment of ₹${formattedAmount} received. Your booking #${targetId} is fully confirmed.`
            : `Payment of ₹${formattedAmount} received. Order #${targetId} is now paid & confirmed.`,
          type: 'order',
          category: isBooking ? (type === 'travel' ? 'Travel' : type === 'stay' ? 'Stay' : 'Services') : 'Products',
          actionLabel: isBooking ? 'View Booking' : 'View Order',
          actionType: isBooking ? 'view_booking' : 'view_order',
          orderType: isBooking ? type : 'product',
          orderId: String(targetId),
        });
      }

      Alert.alert(
        'Payment Successful! 🎉',
        `₹${(totalAmount || 499).toLocaleString('en-IN')} paid successfully via UPI/Online.\nYour COD order has been converted to fully paid!`,
        [{ text: 'OK' }]
      );
    } catch (err: any) {
      console.warn('COD Payment update notice:', err);
    } finally {
      setIsPayingOnline(false);
    }
  };

  const orderTypeLabel =
    type === 'stay'
      ? 'Reservation'
      : type === 'service'
      ? 'Service Booking'
      : type === 'travel'
      ? 'Ticket Booking'
      : 'Order';

  const isBooking =
    type === 'stay' ||
    type === 'service' ||
    type === 'travel' ||
    order?.order_type === 'booking';

  const isStayBooking =
    type === 'stay' ||
    String(order?.category).toLowerCase() === 'stay' ||
    Boolean(slot && slot.includes('Check-Out:'));

  let stayCheckIn = '';
  let stayCheckOut = '';
  let stayDuration = '';

  if (isStayBooking) {
    stayCheckIn = order?.check_in || date || '';
    if (slot && slot.includes('Check-Out:')) {
      const parts = slot.split('•');
      stayCheckOut = parts[0].replace('Check-Out:', '').trim();
      if (parts[1]) {
        stayDuration = parts[1].trim();
      }
    } else {
      stayCheckOut = order?.check_out || slot || '';
    }
  }

  // Smooth slide up & fade transitions from Stage 1 to Stage 2
  const centerIntroTranslateY = transitionAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -SCREEN_HEIGHT * 0.45],
  });

  const centerIntroOpacity = transitionAnim.interpolate({
    inputRange: [0, 0.7, 1],
    outputRange: [1, 0.3, 0],
  });

  const detailsViewOpacity = transitionAnim.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: [0, 0.5, 1],
  });

  const detailsViewTranslateY = transitionAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [50, 0],
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={colors.statusBarStyle}
        backgroundColor={colors.headerBackground}
        translucent={false}
      />

      {/* STAGE 1: 5-SECOND CENTERED SPOTLIGHT CELEBRATION */}
      {isIntroStage && (
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              zIndex: 20,
              backgroundColor: colors.background,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: centerIntroOpacity,
              transform: [{ translateY: centerIntroTranslateY }],
            },
          ]}
        >
          {/* Spotlight beams and central glowing radial aura */}
          <SpotlightHighlights />

          <View style={{ alignItems: 'center', paddingHorizontal: 24, zIndex: 30 }}>
            {/* GREEN TICK BOX DIRECTLY IN THE CENTER (Side poppers removed as requested) */}
            <View style={{ alignItems: 'center', justifyContent: 'center', marginVertical: 18 }}>
              <View style={styles.centerCheckCircle}>
                <Icons.Check color="#FFFFFF" size={54} strokeWidth={3.8} />
              </View>
            </View>

            {/* Bold Centered Order / Reservation Confirmed */}
            <Text style={[styles.centerConfirmedTitle, { color: colors.text }]}>
              {orderTypeLabel} Confirmed!
            </Text>

            <Text
              style={{
                fontSize: 14.5,
                fontWeight: '600',
                color: isLight ? '#166534' : '#86EFAC',
                marginTop: 6,
                textAlign: 'center',
              }}
            >
              Payment Successful • Preparing Your {orderTypeLabel}
            </Text>

            {/* Booking ID badge */}
            <View
              style={[
                styles.idBadge,
                {
                  marginTop: 14,
                  backgroundColor: isLight ? '#FFF8E8' : 'rgba(245, 184, 0, 0.12)',
                  borderColor: isLight ? '#FDE68A' : 'rgba(245, 184, 0, 0.25)',
                },
              ]}
            >
              <Text style={[styles.idBadgeText, { color: isLight ? '#92400E' : '#F5B800' }]}>
                ID: {bookingId || 'BK-849204'}
              </Text>
            </View>
          </View>

          {/* Bottom Button (clean, without any progress line) */}
          <View style={styles.introBottomControls}>
            <TouchableOpacity
              onPress={handleProceedToDetails}
              style={styles.skipToDetailsBtn}
              activeOpacity={0.8}
            >
              <Text style={styles.skipToDetailsText}>
                {isBooking ? 'View Booking Details' : 'View Order Details'}
              </Text>
              <Icons.ArrowRight color="#0F172A" size={14} strokeWidth={2.5} />
            </TouchableOpacity>
          </View>

          {/* Real Party Paper Confetti Cannon Blast - placed as top-most overlay in Stage 1! */}
          <PartyCannonConfettiBackground />
        </Animated.View>
      )}

      {/* STAGE 2: DETAILS PAGE (SLIDES IN AFTER 5 SECONDS - NO CONFETTI ON THIS PAGE) */}
      <Animated.View
        style={[
          styles.container,
          {
            opacity: detailsViewOpacity,
            transform: [{ translateY: detailsViewTranslateY }],
          },
        ]}
      >
        {/* Header */}
        <View
          style={[
            styles.header,
            {
              paddingTop: insets.top,
              height: 56 + insets.top,
              backgroundColor: colors.headerBackground,
              borderBottomColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {orderTypeLabel} Confirmation
          </Text>
        </View>

        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 130 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Order Confirmed Banner (Moved to top as requested) */}
          <View style={styles.successBanner}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <Text style={{ fontSize: 24, transform: [{ scaleX: -1 }] }}>🎉</Text>
              <Animated.View
                style={[
                  styles.topCheckCircle,
                  {
                    transform: [{ scale: topTickPulseAnim }],
                  },
                ]}
              >
                <Icons.Check color="#FFFFFF" size={22} strokeWidth={3.5} />
              </Animated.View>
              <Text style={{ fontSize: 24 }}>🎉</Text>
            </View>

            <Text style={[styles.successTitle, { color: colors.text }]}>
              {orderTypeLabel} Confirmed!
            </Text>

            <View
              style={[
                styles.idBadge,
                {
                  backgroundColor: isLight ? '#FFF8E8' : 'rgba(245, 184, 0, 0.12)',
                  borderColor: isLight ? '#FDE68A' : 'rgba(245, 184, 0, 0.25)',
                },
              ]}
            >
              <Text style={[styles.idBadgeText, { color: isLight ? '#92400E' : '#F5B800' }]}>
                Booking ID: {bookingId || 'BK-849204'}
              </Text>
            </View>
          </View>

          {/* Booking Details Card */}
          <View
            style={[
              styles.card,
              {
                backgroundColor: isLight ? '#FFFFFF' : 'rgba(255, 255, 255, 0.03)',
                borderColor: isLight ? '#F1EAD8' : colors.cardBorder,
              },
            ]}
          >
            <Text style={[styles.sectionHeading, { color: isLight ? '#64748B' : '#94A3B8' }]}>
              Booking Details
            </Text>

            <View style={[styles.detailRow, { borderBottomColor: isLight ? '#F1EAD8' : 'rgba(255, 255, 255, 0.06)' }]}>
              <Text style={[styles.detailLabel, { color: isLight ? '#64748B' : '#94A3B8' }]}>Status</Text>
              <View style={styles.statusBadge}>
                <Icons.CheckCircle2 color="#16A34A" size={13} />
                <Text style={styles.statusText}>Confirmed</Text>
              </View>
            </View>

            {isStayBooking ? (
              <>
                {/* Check-In Row */}
                <View style={[styles.detailRow, { borderBottomColor: isLight ? '#F1EAD8' : 'rgba(255, 255, 255, 0.06)' }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#16A34A' }} />
                    <Text style={[styles.detailLabel, { color: isLight ? '#64748B' : '#94A3B8' }]}>Check-In</Text>
                  </View>
                  <View style={{ flex: 1, alignItems: 'flex-end', marginLeft: 12 }}>
                    <Text style={[styles.detailVal, { color: colors.text, textAlign: 'right' }]}>
                      {stayCheckIn}
                    </Text>
                  </View>
                </View>

                {/* Check-Out Row */}
                <View style={[styles.detailRow, { borderBottomColor: isLight ? '#F1EAD8' : 'rgba(255, 255, 255, 0.06)' }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#2563EB' }} />
                    <Text style={[styles.detailLabel, { color: isLight ? '#64748B' : '#94A3B8' }]}>Check-Out</Text>
                  </View>
                  <View style={{ flex: 1, alignItems: 'flex-end', marginLeft: 12 }}>
                    <Text style={[styles.detailVal, { color: colors.text, textAlign: 'right' }]}>
                      {stayCheckOut}
                    </Text>
                  </View>
                </View>

                {/* Duration Row */}
                {stayDuration ? (
                  <View style={[styles.detailRow, { borderBottomColor: isLight ? '#F1EAD8' : 'rgba(255, 255, 255, 0.06)' }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Icons.Moon color="#64748B" size={13} />
                      <Text style={[styles.detailLabel, { color: isLight ? '#64748B' : '#94A3B8' }]}>Duration</Text>
                    </View>
                    <View style={{ flex: 1, alignItems: 'flex-end', marginLeft: 12 }}>
                      <Text style={[styles.detailVal, { color: colors.text, textAlign: 'right' }]}>
                        {stayDuration}
                      </Text>
                    </View>
                  </View>
                ) : null}
              </>
            ) : (
              <View style={[styles.detailRow, { borderBottomColor: isLight ? '#F1EAD8' : 'rgba(255, 255, 255, 0.06)' }]}>
                <Text style={[styles.detailLabel, { color: isLight ? '#64748B' : '#94A3B8' }]}>Date & Time</Text>
                <View style={{ flex: 1, alignItems: 'flex-end', marginLeft: 12 }}>
                  <Text style={[styles.detailVal, { color: colors.text, textAlign: 'right' }]}>
                    {date || new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}{' '}
                    {slot ? `• ${slot}` : ''}
                  </Text>
                </View>
              </View>
            )}

            {effBoardingPoint ? (
              <View style={[styles.detailRow, { borderBottomColor: isLight ? '#F1EAD8' : 'rgba(255, 255, 255, 0.06)' }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Icons.MapPin color="#16A34A" size={14} />
                  <Text style={[styles.detailLabel, { color: isLight ? '#64748B' : '#94A3B8' }]}>Boarding Point</Text>
                </View>
                <View style={{ flex: 1, alignItems: 'flex-end', marginLeft: 12 }}>
                  <Text style={[styles.detailVal, { color: '#16A34A', fontWeight: '800', textAlign: 'right' }]}>
                    {effBoardingPoint}
                  </Text>
                </View>
              </View>
            ) : null}

            {effDroppingPoint ? (
              <View style={[styles.detailRow, { borderBottomColor: isLight ? '#F1EAD8' : 'rgba(255, 255, 255, 0.06)' }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Icons.MapPin color="#EA580C" size={14} />
                  <Text style={[styles.detailLabel, { color: isLight ? '#64748B' : '#94A3B8' }]}>Dropping Point</Text>
                </View>
                <View style={{ flex: 1, alignItems: 'flex-end', marginLeft: 12 }}>
                  <Text style={[styles.detailVal, { color: '#EA580C', fontWeight: '800', textAlign: 'right' }]}>
                    {effDroppingPoint}
                  </Text>
                </View>
              </View>
            ) : null}

            {effVehicleNumber ? (
              <View style={[styles.detailRow, { borderBottomColor: isLight ? '#F1EAD8' : 'rgba(255, 255, 255, 0.06)' }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Icons.Bus color="#D97706" size={14} />
                  <Text style={[styles.detailLabel, { color: isLight ? '#64748B' : '#94A3B8' }]}>Vehicle Reg. No</Text>
                </View>
                <View style={{ flex: 1, alignItems: 'flex-end', marginLeft: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isLight ? '#FEF3C7' : 'rgba(245, 158, 11, 0.15)', paddingHorizontal: 7, paddingVertical: 2.5, borderRadius: 6, borderWidth: 1, borderColor: isLight ? '#FDE68A' : 'rgba(245, 158, 11, 0.3)' }}>
                    <Icons.ShieldCheck size={11} color="#D97706" style={{ marginRight: 4 }} />
                    <Text style={{ fontSize: 11, fontWeight: '800', color: isLight ? '#92400E' : '#FCD34D', letterSpacing: 0.5 }}>
                      {effVehicleNumber}
                    </Text>
                  </View>
                </View>
              </View>
            ) : null}

            {effTravelers && Array.isArray(effTravelers) && effTravelers.length > 0 ? (
              <View style={[styles.detailRow, { borderBottomColor: isLight ? '#F1EAD8' : 'rgba(255, 255, 255, 0.06)' }]}>
                <Text style={[styles.detailLabel, { color: isLight ? '#64748B' : '#94A3B8' }]}>Passengers / Guests</Text>
                <View style={{ flex: 1, alignItems: 'flex-end', marginLeft: 12 }}>
                  <Text style={[styles.detailVal, { color: colors.text, fontWeight: '700', textAlign: 'right' }]}>
                    {effTravelers.map((t: any) => t.fullName || t.name).filter(Boolean).join(', ') || `${effTravelers.length} Guest(s)`}
                  </Text>
                </View>
              </View>
            ) : null}

            <View style={[styles.detailRow, { borderBottomColor: isLight ? '#F1EAD8' : 'rgba(255, 255, 255, 0.06)' }]}>
              <Text style={[styles.detailLabel, { color: isLight ? '#64748B' : '#94A3B8' }]}>Payment Method</Text>
              <View style={{ flex: 1, alignItems: 'flex-end', marginLeft: 12 }}>
                <Text style={[styles.detailVal, { color: colors.text, textAlign: 'right' }]}>
                  {currentPaymentMethod}
                </Text>
                {currentPaymentStatus === 'Paid' ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                    <Icons.CheckCircle2 color="#16A34A" size={11} />
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#16A34A' }}>Paid Online</Text>
                  </View>
                ) : (
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#D97706', marginTop: 2, textAlign: 'right' }}>
                    Payment Pending (Pay upon delivery)
                  </Text>
                )}
              </View>
            </View>

            <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
              <Text style={[styles.detailLabel, { color: isLight ? '#64748B' : '#94A3B8' }]}>
                Total Amount
              </Text>
              <Text style={[styles.totalPrice, { color: isLight ? '#0F172A' : '#F5B800' }]}>
                ₹{(totalAmount || 499).toLocaleString('en-IN')}
              </Text>
            </View>

            {/* COD PAY ONLINE OPTION (As requested: "COD ah irundha pay pandra option irukanum") */}
            {isCOD && currentPaymentStatus !== 'Paid' && (
              <View
                style={[
                  styles.codPayBox,
                  {
                    backgroundColor: isLight ? '#FFFBEB' : 'rgba(245, 184, 0, 0.08)',
                    borderColor: isLight ? '#FDE68A' : 'rgba(245, 184, 0, 0.25)',
                  },
                ]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={styles.codIconWrap}>
                    <Icons.Banknote color="#D97706" size={20} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: isLight ? '#92400E' : '#F5B800' }}>
                      Pay Online for Contactless Delivery
                    </Text>
                    <Text style={{ fontSize: 11.5, color: isLight ? '#78350F' : '#FDE68A', marginTop: 2 }}>
                      You chose Cash on Delivery. Avoid cash handling by paying online now via UPI, GPay, Cards or NetBanking!
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.payNowBtn}
                  onPress={() => setRazorpayModalVisible(true)}
                  activeOpacity={0.85}
                  disabled={isPayingOnline}
                >
                  <Icons.CreditCard color="#0F172A" size={16} />
                  <Text style={styles.payNowBtnText}>
                    {isPayingOnline ? 'Processing...' : `Pay Online Now • ₹${(totalAmount || 499).toLocaleString('en-IN')}`}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Items Summary Card (Items which ordered) */}
          {items && items.length > 0 && (
            <View
              style={[
                styles.card,
                {
                  backgroundColor: isLight ? '#FFFFFF' : 'rgba(255, 255, 255, 0.03)',
                  borderColor: isLight ? '#F1EAD8' : colors.cardBorder,
                },
              ]}
            >
              <Text style={[styles.sectionHeading, { color: isLight ? '#64748B' : '#94A3B8' }]}>
                {type === 'stay' ? 'Room & Stay Details' : type === 'travel' ? 'Ticket & Travel Details' : type === 'service' ? 'Service Details' : 'Items Ordered'}
              </Text>
              {items.map((it: any, idx: number) => (
                <View key={idx} style={styles.itemRow}>
                  {it.image ? (
                    <Image source={{ uri: it.image }} style={styles.itemImg} />
                  ) : (
                    <View style={[styles.itemImg, { alignItems: 'center', justifyContent: 'center' }]}>
                      <Icons.Package color="#94A3B8" size={20} />
                    </View>
                  )}
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={2}>
                      {it.name || it.title}
                    </Text>
                    {(it.vehicleNumber || it.vehicleRegNo || it.busNumber || (it.category === 'Travel' && effVehicleNumber)) ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2, marginBottom: 2 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isLight ? '#FEF3C7' : 'rgba(245, 158, 11, 0.15)', paddingHorizontal: 5, paddingVertical: 1.5, borderRadius: 5, borderWidth: 1, borderColor: isLight ? '#FDE68A' : 'rgba(245, 158, 11, 0.3)' }}>
                          <Icons.ShieldCheck size={9} color="#D97706" style={{ marginRight: 3 }} />
                          <Text style={{ fontSize: 9.5, fontWeight: '800', color: isLight ? '#92400E' : '#FCD34D' }}>
                            Reg: {it.vehicleNumber || it.vehicleRegNo || it.busNumber || effVehicleNumber}
                          </Text>
                        </View>
                      </View>
                    ) : null}
                    <Text style={[styles.itemMeta, { color: isLight ? '#64748B' : '#94A3B8' }]}>
                      Qty: {it.quantity || 1} • {it.category || 'Order Item'}
                    </Text>
                  </View>
                  <Text style={[styles.itemPrice, { color: isLight ? '#0F172A' : '#F5B800' }]}>
                    {typeof it.price === 'number' ? `₹${it.price.toLocaleString('en-IN')}` : it.price}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Delivery Address Details Card */}
          {address && (
            <View
              style={[
                styles.card,
                {
                  backgroundColor: isLight ? '#FFFFFF' : 'rgba(255, 255, 255, 0.03)',
                  borderColor: isLight ? '#F1EAD8' : colors.cardBorder,
                },
              ]}
            >
              <Text style={[styles.sectionHeading, { color: isLight ? '#64748B' : '#94A3B8' }]}>
                {type === 'stay' ? 'Property / Hotel Location' : type === 'service' ? 'Service Location' : type === 'travel' ? 'Travel Station / Stop' : 'Delivery Destination'}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                <Icons.MapPin color="#F5B800" size={18} style={{ marginTop: 2 }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text, lineHeight: 18 }}>
                    {typeof address === 'string' ? address : address.fullAddress || 'Selected Delivery Address'}
                  </Text>
                  <Text style={{ fontSize: 11.5, color: isLight ? '#64748B' : '#94A3B8', marginTop: 4 }}>
                    {type === 'stay' ? 'Check-in instructions and booking voucher sent via SMS & email.' : type === 'travel' ? 'Boarding point details and updates sent via SMS.' : 'Estimated delivery updates will be sent via SMS & notification.'}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Tax Invoice & Receipt Card - ONLY visible after product is delivered */}
          {isDelivered && (
            <View
              style={[
                styles.card,
                {
                  backgroundColor: isLight ? '#FFFFFF' : 'rgba(255, 255, 255, 0.03)',
                  borderColor: isLight ? '#F1EAD8' : colors.cardBorder,
                },
              ]}
            >
              <Text style={[styles.sectionHeading, { color: isLight ? '#64748B' : '#94A3B8' }]}>
                Tax Invoice & Receipt
              </Text>

              <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 12 }}>
                Official GST-compliant digital tax invoice is ready for download.
              </Text>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity
                  style={[
                    styles.invoiceActionBtn,
                    {
                      backgroundColor: isLight ? '#F8FAFC' : 'rgba(255, 255, 255, 0.06)',
                      borderColor: isLight ? '#E2E8F0' : 'rgba(255, 255, 255, 0.15)',
                    },
                  ]}
                  activeOpacity={0.85}
                  onPress={async () => {
                    const bookingInvoiceData: any = {
                      id: bookingId || `BK-${Date.now().toString().slice(-6)}`,
                      order_number: bookingId || `BK-${Date.now().toString().slice(-6)}`,
                      customer_name: useAuthStore.getState().currentUser?.name || 'Customer',
                      customer_phone: useAuthStore.getState().currentUser?.phone || '',
                      customer_address: typeof address === 'string' ? address : 'Delivery Location',
                      category: type === 'stay' ? 'Stay' : type === 'service' ? 'Services' : type === 'travel' ? 'Travel' : 'Products',
                      order_type: type === 'stay' || type === 'service' || type === 'travel' ? 'booking' : 'order',
                      boarding_point: effBoardingPoint,
                      dropping_point: effDroppingPoint,
                      items: items && items.length > 0 ? items : [{ name: `${orderTypeLabel} Booking`, quantity: 1, price: totalAmount || 0 }],
                      amount: totalAmount || 0,
                      status: 'Delivered',
                      payment_method: currentPaymentMethod,
                      payment_status: currentPaymentStatus,
                      created_at: new Date().toISOString(),
                    };
                    await downloadInvoicePDF(bookingInvoiceData);
                  }}
                >
                  <Icons.Download color={colors.text} size={15} />
                  <Text style={[styles.invoiceActionBtnText, { color: colors.text }]}>Download PDF</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.invoiceActionBtn,
                    {
                      backgroundColor: isLight ? '#F8FAFC' : 'rgba(255, 255, 255, 0.06)',
                      borderColor: isLight ? '#E2E8F0' : 'rgba(255, 255, 255, 0.15)',
                    },
                  ]}
                  activeOpacity={0.85}
                  onPress={async () => {
                    const bookingInvoiceData: any = {
                      id: bookingId || `BK-${Date.now().toString().slice(-6)}`,
                      order_number: bookingId || `BK-${Date.now().toString().slice(-6)}`,
                      customer_name: useAuthStore.getState().currentUser?.name || 'Customer',
                      customer_phone: useAuthStore.getState().currentUser?.phone || '',
                      customer_address: typeof address === 'string' ? address : 'Delivery Location',
                      category: type === 'stay' ? 'Stay' : type === 'service' ? 'Services' : type === 'travel' ? 'Travel' : 'Products',
                      order_type: type === 'stay' || type === 'service' || type === 'travel' ? 'booking' : 'order',
                      boarding_point: effBoardingPoint,
                      dropping_point: effDroppingPoint,
                      items: items && items.length > 0 ? items : [{ name: `${orderTypeLabel} Booking`, quantity: 1, price: totalAmount || 0 }],
                      amount: totalAmount || 0,
                      status: 'Delivered',
                      payment_method: currentPaymentMethod,
                      payment_status: currentPaymentStatus,
                      created_at: new Date().toISOString(),
                    };
                    await shareInvoicePDF(bookingInvoiceData);
                  }}
                >
                  <Icons.Share2 color={colors.text} size={15} />
                  <Text style={[styles.invoiceActionBtnText, { color: colors.text }]}>Share Receipt</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Confirmation Notice Card */}
          <View
            style={[
              styles.infoBox,
              {
                backgroundColor: isLight ? 'rgba(37, 99, 235, 0.06)' : 'rgba(59, 130, 246, 0.08)',
                borderColor: isLight ? 'rgba(37, 99, 235, 0.15)' : 'rgba(59, 130, 246, 0.2)',
              },
            ]}
          >
            <Icons.Info color="#3B82F6" size={18} />
            <Text style={[styles.infoText, { color: isLight ? '#1E40AF' : '#93C5FD' }]}>
              A confirmation receipt and order updates have been sent to your registered mobile number and email.
            </Text>
          </View>
        </ScrollView>

        {/* Sticky Bottom Actions: View My Bookings / Orders & Continue Shopping / Explore */}
        <View
          style={[
            styles.bottomBar,
            {
              paddingBottom: Math.max(insets.bottom, 12),
              backgroundColor: isLight ? '#FFFFFF' : '#0B132B',
              borderTopColor: isLight ? '#F1EAD8' : colors.cardBorder,
            },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.ordersBtn,
              {
                borderColor: isLight ? '#CBD5E1' : 'rgba(255, 255, 255, 0.15)',
                backgroundColor: isLight ? '#F8FAFC' : 'rgba(255, 255, 255, 0.05)',
              },
            ]}
            onPress={() => {
              if (isBooking) {
                navigation.navigate('CustomerTabs', {
                  screen: 'Orders',
                  params: {
                    activeTab: 'bookings',
                    category: type === 'stay' ? 'Stay' : type === 'travel' ? 'Travel' : undefined,
                  },
                });
              } else {
                navigation.navigate('CustomerTabs', { screen: 'Orders' });
              }
            }}
            activeOpacity={0.85}
          >
            {isBooking ? (
              <Icons.BookmarkCheck color={colors.text} size={16} />
            ) : (
              <Icons.ClipboardList color={colors.text} size={16} />
            )}
            <Text style={[styles.ordersBtnText, { color: colors.text }]}>
              {isBooking ? 'View My Bookings' : 'View My Orders'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.continueShoppingBtn}
            onPress={() => {
              if (type === 'stay') {
                navigation.navigate('CustomerTabs', { screen: 'Stays' });
              } else {
                navigation.navigate('CustomerTabs', { screen: 'Home' });
              }
            }}
            activeOpacity={0.85}
          >
            {type === 'stay' ? (
              <Icons.Compass color="#0F172A" size={16} />
            ) : (
              <Icons.ShoppingBag color="#0F172A" size={16} />
            )}
            <Text style={styles.continueShoppingBtnText}>
              {type === 'stay' ? 'Explore Stays' : isBooking ? 'Continue Exploring' : 'Continue Shopping'}
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* RAZORPAY CHECKOUT MODAL FOR COD PAY ONLINE OPTION */}
      <RazorpayModal
        visible={razorpayModalVisible}
        orderData={{
          orderId: bookingId || `BK-${Date.now().toString().slice(-6)}`,
          amount: (totalAmount || 499) * 100, // in paise
          currency: 'INR',
          keyId: RAZORPAY_KEY_ID || 'rzp_test_THLM17MgXLM2tP',
          planType: 'gold',
          planName: `${orderTypeLabel} Payment`,
          priceText: `₹${(totalAmount || 0).toLocaleString('en-IN')}`,
        }}
        userInfo={{
          name: useAuthStore.getState().currentUser?.name || 'Customer',
          email: useAuthStore.getState().currentUser?.email || '',
          phone: useAuthStore.getState().currentUser?.phone || '',
        }}
        merchantName="Connect App"
        onSuccess={(res) => {
          setRazorpayModalVisible(false);
          handleCodPaymentSuccess(res.razorpay_payment_id);
        }}
        onCancel={() => setRazorpayModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  centerCheckCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
  centerConfirmedTitle: {
    fontSize: 27,
    fontWeight: '900',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  introBottomControls: {
    position: 'absolute',
    bottom: 40,
    left: 24,
    right: 24,
    alignItems: 'center',
    zIndex: 35,
  },
  skipToDetailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F5B800',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  skipToDetailsText: {
    fontSize: 12.5,
    fontWeight: '900',
    color: '#0F172A',
  },
  successBanner: {
    alignItems: 'center',
    marginVertical: 12,
  },
  topCheckCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  idBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
  },
  idBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
  },
  sectionHeading: {
    fontSize: 11.5,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 9,
    borderBottomWidth: 1,
  },
  detailLabel: {
    fontSize: 12.5,
  },
  detailVal: {
    fontSize: 12.5,
    fontWeight: 'bold',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(22, 163, 74, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: {
    color: '#16A34A',
    fontSize: 11,
    fontWeight: 'bold',
  },
  totalPrice: {
    fontSize: 16,
    fontWeight: '900',
  },
  codPayBox: {
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 14,
    marginTop: 12,
  },
  codIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(245, 184, 0, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  payNowBtn: {
    backgroundColor: '#F5B800',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 11,
    borderRadius: 10,
    marginTop: 12,
    shadowColor: '#F5B800',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  payNowBtnText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#0F172A',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 6,
  },
  itemImg: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  itemName: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  itemMeta: {
    fontSize: 11,
    marginTop: 2,
  },
  itemPrice: {
    fontSize: 13,
    fontWeight: '800',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 11.5,
    lineHeight: 16,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    flexDirection: 'row',
    gap: 10,
    elevation: 10,
  },
  ordersBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    borderWidth: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  ordersBtnText: {
    fontSize: 12.5,
    fontWeight: 'bold',
  },
  continueShoppingBtn: {
    flex: 1.25,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#F5B800',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: '#F5B800',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  continueShoppingBtnText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#0F172A',
  },
  invoiceActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  invoiceActionBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
});
