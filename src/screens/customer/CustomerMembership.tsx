import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert,
  Animated,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Icons from 'lucide-react-native';
import Svg, { Rect, Defs, LinearGradient, Stop } from 'react-native-svg';
import QRCode from 'react-native-qrcode-svg';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import { apiFetch } from '../../services/api';
import RazorpayModal, { RazorpayOrderDetails } from '../../components/RazorpayModal';
import { prepareRazorpayOrder, verifyRazorpayPayment } from '../../services/razorpayService';
import { useTranslation } from '../../store/languageStore';
import { useAuthGuardStore } from '../../store/authGuardStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = Math.min(SCREEN_WIDTH - 32, 380);
const CARD_HEIGHT = 205;

// Hierarchy ranking for membership tiers
const TIER_LEVEL: Record<'silver' | 'gold' | 'diamond', number> = {
  silver: 1,
  gold: 2,
  diamond: 3,
};

export interface TierPlan {
  tier: string;
  type: 'silver' | 'gold' | 'diamond';
  price: string;
  badge: string;
  color: string;
  bgColor: string;
  borderColor: string;
  backBgColor: string;
  backBorderColor: string;
  accentColor: string;
  points: number;
  pointsMultiplier: string;
  delivery: string;
  lounges: string;
  discount: string;
}

export const MEMBERSHIP_PLANS: TierPlan[] = [
  {
    tier: 'Silver Club',
    type: 'silver',
    price: '₹999 / year',
    badge: 'Starter Pass',
    color: '#94A3B8',
    bgColor: '#334155',
    borderColor: '#CBD5E1',
    backBgColor: '#0F172A',
    backBorderColor: '#475569',
    accentColor: '#38BDF8',
    points: 1500,
    pointsMultiplier: '1.5x Connect Points on all orders',
    delivery: 'Free delivery on orders > ₹499',
    lounges: 'Standard Airport Access Pass',
    discount: '10% off Partner Dining & Stays',
  },
  {
    tier: 'Gold Club',
    type: 'gold',
    price: '₹2,499 / year',
    badge: 'Most Popular',
    color: '#F59E0B',
    bgColor: '#78350F',
    borderColor: '#FDE68A',
    backBgColor: '#0B0F19',
    backBorderColor: '#B45309',
    accentColor: '#FBBF24',
    points: 3500,
    pointsMultiplier: '2.5x Connect Points on all orders',
    delivery: 'Unlimited Free Delivery on all orders',
    lounges: '2 Domestic Lounge visits / year',
    discount: '20% off Luxury Stays & Fine Dining',
  },
  {
    tier: 'Diamond Club',
    type: 'diamond',
    price: '₹5,999 / year',
    badge: 'VIP Passport',
    color: '#A855F7',
    bgColor: '#3B0764',
    borderColor: '#C4B5FD',
    backBgColor: '#0D091A',
    backBorderColor: '#6B21A8',
    accentColor: '#C084FC',
    points: 8500,
    pointsMultiplier: '5.0x Connect Points on all orders',
    delivery: 'Priority Instant 10-min Free Delivery',
    lounges: 'Unlimited Global Lounge access',
    discount: '30% off Luxury Stays, Dining & Cabs',
  },
];

// ==========================================
// 3D FLIPPABLE DIGITAL CARD COMPONENT
// ==========================================
interface DigitalMembershipCardProps {
  plan: TierPlan;
  currentMembership?: 'silver' | 'gold' | 'diamond' | null;
  displayName: string;
  onUpgrade: (plan: TierPlan) => void;
  updating: boolean;
  updatingPlanType?: string | null;
  isFlipped: boolean;
  onToggleFlip: (planType: string) => void;
}

const DigitalMembershipCard: React.FC<DigitalMembershipCardProps> = ({
  plan,
  currentMembership,
  displayName,
  onUpgrade,
  updating,
  updatingPlanType,
  isFlipped,
  onToggleFlip,
}) => {
  const currentLevel = currentMembership ? (TIER_LEVEL[currentMembership] || 0) : 0;
  const cardLevel = TIER_LEVEL[plan.type] || 0;

  const isCurrent = Boolean(currentMembership && currentMembership === plan.type);
  const isLower = currentLevel > 0 && cardLevel < currentLevel;
  const isHigher = currentLevel > 0 && cardLevel > currentLevel;
  const isThisPlanUpdating = updatingPlanType === plan.type;

  const animatedValue = useRef(new Animated.Value(isFlipped ? 180 : 0)).current;

  useEffect(() => {
    Animated.spring(animatedValue, {
      toValue: isFlipped ? 180 : 0,
      friction: 8,
      tension: 10,
      useNativeDriver: true,
    }).start();
  }, [isFlipped, animatedValue]);

  const flipCard = () => {
    if (isLower) {
      // Lower tiers are locked and cannot be flipped
      return;
    }

    if (isGuestUser) {
      useAuthGuardStore.getState().showAuthModal('select a plan or access membership privileges');
      return;
    }

    onToggleFlip(plan.type);
  };

  const frontInterpolate = animatedValue.interpolate({
    inputRange: [0, 180],
    outputRange: ['0deg', '180deg'],
  });

  const backInterpolate = animatedValue.interpolate({
    inputRange: [0, 180],
    outputRange: ['180deg', '360deg'],
  });

  const frontOpacity = animatedValue.interpolate({
    inputRange: [0, 89, 90, 180],
    outputRange: [1, 1, 0, 0],
  });

  const backOpacity = animatedValue.interpolate({
    inputRange: [0, 89, 90, 180],
    outputRange: [0, 0, 1, 1],
  });

  const currentUser = useAuthStore.getState().currentUser;
  const isGuestUser = !currentUser || currentUser.isGuest || (currentUser.name || '').toLowerCase().includes('guest');
  const cardDisplayName = isGuestUser ? 'Guest User' : (displayName || currentUser?.name || 'Guest User');
  const userNum = isGuestUser ? 'GUEST' : (currentUser?.id ? currentUser.id.replace(/[^\d]/g, '') || '4820' : '4820');
  const memberId = `CN-${plan.type.toUpperCase()}-${userNum}`;

  return (
    <TouchableOpacity
      activeOpacity={isLower ? 0.95 : 0.92}
      onPress={flipCard}
      style={styles.cardTouchWrapper}
    >
      {/* ================= CARD FRONT ================= */}
      <Animated.View
        style={[
          styles.cardFace,
          {
            backgroundColor: plan.bgColor,
            borderColor: plan.borderColor,
            transform: [{ perspective: 1200 }, { rotateY: frontInterpolate }],
            opacity: frontOpacity,
            zIndex: isFlipped ? 0 : 2,
          },
        ]}
        pointerEvents={isFlipped ? 'none' : 'auto'}
      >
        {/* Card SVG Gradient */}
        <View style={StyleSheet.absoluteFill}>
          <Svg width="100%" height="100%">
            <Defs>
              {plan.type === 'silver' ? (
                <LinearGradient id={`gradFront-${plan.type}`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <Stop offset="0%" stopColor="#334155" />
                  <Stop offset="45%" stopColor="#64748B" />
                  <Stop offset="80%" stopColor="#475569" />
                  <Stop offset="100%" stopColor="#1E293B" />
                </LinearGradient>
              ) : plan.type === 'diamond' ? (
                <LinearGradient id={`gradFront-${plan.type}`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <Stop offset="0%" stopColor="#1E1B4B" />
                  <Stop offset="35%" stopColor="#3B0764" />
                  <Stop offset="70%" stopColor="#581C87" />
                  <Stop offset="100%" stopColor="#0F0C20" />
                </LinearGradient>
              ) : (
                <LinearGradient id={`gradFront-${plan.type}`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <Stop offset="0%" stopColor="#92400E" />
                  <Stop offset="35%" stopColor="#D97706" />
                  <Stop offset="70%" stopColor="#B45309" />
                  <Stop offset="100%" stopColor="#78350F" />
                </LinearGradient>
              )}
            </Defs>
            <Rect
              width="100%"
              height="100%"
              rx="20"
              ry="20"
              fill={`url(#gradFront-${plan.type})`}
            />
          </Svg>
        </View>

        {/* Card Front Content */}
        <View style={styles.cardContent}>
          {/* Header Row */}
          <View style={styles.cardHeader}>
            <View style={styles.logoRow}>
              <View style={styles.crestCircle}>
                <Icons.Crown color="#FFFFFF" size={12} />
              </View>
              <Text style={styles.logoText}>Connect Club</Text>
            </View>

            {/* Status Pill / Upgrade Button */}
            {isCurrent ? (
              <View style={styles.activeStatusPill}>
                <View style={styles.activeDot} />
                <Text style={styles.activeStatusText}>ACTIVE</Text>
              </View>
            ) : isLower ? (
              <View style={styles.lockedStatusPill}>
                <Icons.Lock color="#CBD5E1" size={10} />
                <Text style={styles.lockedStatusText}>LOCKED</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.upgradeStatusPill}
                activeOpacity={0.8}
                onPress={() => {
                  if (isGuestUser) {
                    useAuthGuardStore.getState().showAuthModal('select or upgrade a membership plan');
                    return;
                  }
                  onUpgrade(plan);
                }}
                disabled={updating}
              >
                <Icons.Sparkles color="#FFFFFF" size={10} />
                <Text style={styles.upgradeStatusText}>
                  {isThisPlanUpdating
                    ? 'OPENING...'
                    : currentMembership
                    ? 'UPGRADE AVAILABLE'
                    : 'SELECT PLAN'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Middle Row */}
          <View style={styles.middleRow}>
            <View style={styles.detailsCol}>
              <Text style={styles.cardMetaLabel}>MEMBERSHIP TIER</Text>
              <Text style={styles.tierNameValue}>{plan.tier}</Text>

              <View style={styles.priceRow}>
                <Text style={styles.cardMetaLabel}>ANNUAL FEE: </Text>
                <Text style={styles.cardPriceValue}>{plan.price}</Text>
              </View>

              <Text style={styles.cardMetaLabel}>CARD NUMBER</Text>
              <Text style={styles.cardMetaValue}>{memberId}</Text>
            </View>

            {/* High-Contrast QR Code */}
            <View style={styles.qrWrapper}>
              <View style={styles.qrContainer}>
                <QRCode
                  value={memberId}
                  size={46}
                  color="#0F172A"
                  backgroundColor="#FFFFFF"
                />
              </View>
              {isLower ? (
                <View style={styles.qrLockOverlay}>
                  <Icons.Lock color="#475569" size={18} />
                </View>
              ) : null}
            </View>
          </View>

          {/* Footer Row */}
          <View style={styles.cardFooter}>
            <View>
              <Text style={styles.cardMetaLabel}>MEMBER NAME</Text>
              <Text style={styles.memberNameValue}>{cardDisplayName}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.cardMetaLabel}>VALID THRU</Text>
              <Text style={styles.validityValue}>12/27</Text>
            </View>
          </View>
        </View>

        {/* Lower Tier Lock Overlay */}
        {isLower ? (
          <View style={styles.lowerTierOverlay}>
            <View style={styles.lowerTierBadge}>
              <Icons.Lock color="#E2E8F0" size={12} />
              <Text style={styles.lowerTierBadgeText}>Included in Active Plan</Text>
            </View>
          </View>
        ) : null}
      </Animated.View>

      {/* ================= CARD BACK ================= */}
      <Animated.View
        style={[
          styles.cardFace,
          styles.cardFaceBack,
          {
            backgroundColor: plan.backBgColor,
            borderColor: plan.backBorderColor,
            transform: [{ perspective: 1200 }, { rotateY: backInterpolate }],
            opacity: backOpacity,
            zIndex: isFlipped ? 2 : 0,
          },
        ]}
        pointerEvents={isFlipped ? 'auto' : 'none'}
      >
        {/* Back SVG Gradient */}
        <View style={StyleSheet.absoluteFill}>
          <Svg width="100%" height="100%">
            <Defs>
              <LinearGradient id={`gradBack-${plan.type}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor={plan.backBgColor} />
                <Stop offset="60%" stopColor="#0B0F19" />
                <Stop offset="100%" stopColor="#050810" />
              </LinearGradient>
            </Defs>
            <Rect
              width="100%"
              height="100%"
              rx="20"
              ry="20"
              fill={`url(#gradBack-${plan.type})`}
            />
          </Svg>
        </View>

        {/* Back Content */}
        <View style={styles.cardContent}>
          {/* Header */}
          <View style={styles.cardHeader}>
            <View style={styles.logoRow}>
              <Icons.Sparkles color={plan.accentColor} size={13} />
              <Text style={[styles.logoText, { color: plan.accentColor }]}>
                {plan.tier} Privileges
              </Text>
            </View>
            <View style={[styles.flipBadge, { borderColor: plan.accentColor + '55' }]}>
              <Icons.RotateCcw color={plan.accentColor} size={9} />
              <Text style={[styles.flipBadgeText, { color: plan.accentColor }]}>
                Tap to Flip
              </Text>
            </View>
          </View>

          {/* Benefits Rows */}
          <View style={styles.backBenefitsList}>
            <View style={styles.backBenefitRow}>
              <Icons.Zap color={plan.accentColor} size={11} />
              <Text style={styles.backBenefitText} numberOfLines={1}>
                {plan.pointsMultiplier}
              </Text>
            </View>

            <View style={styles.backBenefitRow}>
              <Icons.Truck color={plan.accentColor} size={11} />
              <Text style={styles.backBenefitText} numberOfLines={1}>
                {plan.delivery}
              </Text>
            </View>

            <View style={styles.backBenefitRow}>
              <Icons.Compass color={plan.accentColor} size={11} />
              <Text style={styles.backBenefitText} numberOfLines={1}>
                {plan.lounges}
              </Text>
            </View>

            <View style={styles.backBenefitRow}>
              <Icons.Tag color={plan.accentColor} size={11} />
              <Text style={styles.backBenefitText} numberOfLines={1}>
                {plan.discount}
              </Text>
            </View>
          </View>

          {/* Card Back Info Container */}
          <View style={styles.backActionContainer}>
            {isCurrent ? (
              <View style={styles.activeBadgeBack}>
                <Icons.CheckCircle2 color="#34D399" size={13} />
                <Text style={styles.activeBadgeBackText}>Current Active Membership</Text>
              </View>
            ) : isLower ? (
              <View style={styles.lockedBadgeBack}>
                <Icons.Lock color="#94A3B8" size={12} />
                <Text style={styles.lockedBadgeBackText}>
                  Lower Tier • Included in Active Plan
                </Text>
              </View>
            ) : (
              <View style={styles.activeBadgeBack}>
                <Icons.Sparkles color={plan.accentColor} size={12} />
                <Text style={[styles.activeBadgeBackText, { color: plan.accentColor }]}>
                  {plan.tier} Tier Privileges
                </Text>
              </View>
            )}
          </View>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
};

// ==========================================
// MAIN SCREEN COMPONENT
// ==========================================
export default function CustomerMembership() {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const currentUser = useAuthStore((state) => state.currentUser);
  const updateMembership = useAuthStore((state) => state.updateMembership);
  const colors = useThemeStore((state) => state.colors);
  const isDark = useThemeStore((state) => state.isDark);
  const isLight = !isDark;

  const isGuest = !currentUser || currentUser.isGuest || (currentUser.name || '').toLowerCase().includes('guest');
  const displayName = isGuest ? 'Guest User' : currentUser?.name || 'Guest User';
  const currentMembership = currentUser?.membership ? (currentUser.membership as 'silver' | 'gold' | 'diamond') : null;

  const [updating, setUpdating] = useState(false);
  const [updatingPlanType, setUpdatingPlanType] = useState<string | null>(null);
  const [memberOffers, setMemberOffers] = useState<any[]>([]);
  const [flippedPlanType, setFlippedPlanType] = useState<string | null>(null);

  const handleToggleFlip = (planType: string) => {
    setFlippedPlanType((prev) => (prev === planType ? null : planType));
  };

  // Razorpay Checkout Modal State
  const [razorpayModalVisible, setRazorpayModalVisible] = useState(false);
  const [razorpayOrder, setRazorpayOrder] = useState<RazorpayOrderDetails | null>(null);

  // Load / Sync Member Offers in background from MongoDB Atlas
  useEffect(() => {
    let isMounted = true;
    apiFetch('/offers')
      .then((res) => {
        if (!isMounted) return;
        if (res && res.data && Array.isArray(res.data) && res.data.length > 0) {
          setMemberOffers(res.data);
        }
      })
      .catch((err) => {
        console.warn('[CustomerMembership] Background offers sync notice:', err);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleUpgradePlan = (plan: TierPlan) => {
    if (isGuest) {
      useAuthGuardStore.getState().showAuthModal('select or upgrade a membership plan');
      return;
    }

    if (plan.type === currentMembership) {
      Alert.alert('Current Active Tier', `You are already enjoying ${plan.tier} privileges!`);
      return;
    }

    // Extract numerical price (e.g., "₹5,999 / year" -> 5999)
    const rawPrice = plan.price.replace(/[^0-9]/g, '');
    const priceNum = parseInt(rawPrice, 10) || 5999;

    // 1. Immediately synthesize order & open Razorpay Modal with 0ms delay
    prepareRazorpayOrder({
      amount: priceNum,
      planType: plan.type,
      planName: `Upgrade to ${plan.tier}`,
      priceText: plan.price,
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

    try {
      // 2. Server-side Payment Verification & Membership Upgrade in MongoDB Atlas
      const response = await verifyRazorpayPayment({
        ...paymentResult,
        planType: razorpayOrder?.planType || 'diamond',
        userId: currentUser?.id || 'guest_user',
      });

      if (response && response.status === 'success') {
        const newTier = (razorpayOrder?.planType || 'diamond') as 'silver' | 'gold' | 'diamond';
        await updateMembership(newTier);

        Alert.alert(
          'Payment Verified & Upgraded 🎉',
          `Razorpay Test Mode Payment Verified!\n\nCongratulations! Your ${razorpayOrder?.planName || 'Diamond Club'} membership is now active.`
        );
      } else {
        Alert.alert(
          'Payment Verification Notice',
          response?.message || 'Could not verify payment signature on the server.',
          [
            { text: 'OK' },
            {
              text: 'Retry Upgrade',
              onPress: () => {
                const targetPlan = MEMBERSHIP_PLANS.find((p) => p.type === razorpayOrder?.planType);
                if (targetPlan) handleUpgradePlan(targetPlan);
              },
            },
          ]
        );
      }
    } catch (err: any) {
      console.error('[CustomerMembership] Verification error:', err);
      Alert.alert(
        'Payment Notice',
        err?.message || 'Payment verification failed. Would you like to retry?',
        [
          { text: 'Cancel' },
          {
            text: 'Retry',
            onPress: () => {
              const targetPlan = MEMBERSHIP_PLANS.find((p) => p.type === razorpayOrder?.planType);
              if (targetPlan) handleUpgradePlan(targetPlan);
            },
          },
        ]
      );
    } finally {
      setUpdating(false);
      setRazorpayOrder(null);
    }
  };

  const handleRazorpayCancel = () => {
    setRazorpayModalVisible(false);
    setRazorpayOrder(null);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.headerBackground} />
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
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => {
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.navigate('CustomerTabs', { screen: 'Home' });
            }
          }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.7}
        >
          <Icons.ArrowLeft color={colors.text} size={22} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Connect Membership</Text>
        <View style={styles.headerRightSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* CARDS SECTION HEADER */}
        <View style={styles.cardsSectionHeader}>
          <Icons.ShieldCheck color={colors.textSecondary} size={14} />
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{t('MEMBERSHIP TIERS')}</Text>
        </View>

        {/* Tap Prompt Hint */}
        <View
          style={[
            styles.flipPromptRow,
            { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder },
          ]}
        >
          <Icons.RotateCcw color={colors.textSecondary} size={11} />
          <Text style={[styles.flipPromptText, { color: colors.textSecondary }]}>
            Tap card to flip for benefits • Tap Upgrade to join instantly
          </Text>
        </View>

        {/* VERTICAL CARDS COLUMN */}
        <View style={styles.cardsVerticalList}>
          {MEMBERSHIP_PLANS.map((plan) => (
            <View key={plan.type} style={styles.cardVerticalSlot}>
              <DigitalMembershipCard
                plan={plan}
                currentMembership={currentMembership}
                displayName={displayName}
                onUpgrade={handleUpgradePlan}
                updating={updating}
                updatingPlanType={updatingPlanType}
                isFlipped={flippedPlanType === plan.type}
                onToggleFlip={handleToggleFlip}
              />
            </View>
          ))}
        </View>

        {/* MEMBER OFFERS SECTION */}
        <View style={styles.offersSectionHeader}>
          <Icons.Gift color={colors.textSecondary} size={14} />
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>MEMBER-ONLY OFFERS</Text>
        </View>

        <View style={styles.offersContainer}>
          {memberOffers.length === 0 ? (
            <View style={{ paddingVertical: 24, paddingHorizontal: 16, alignItems: 'center' }}>
              <Text style={{ color: colors.textSecondary, fontSize: 13 }}>No active member offers at the moment</Text>
            </View>
          ) : (
            memberOffers.map((offer) => (
              <TouchableOpacity
                key={offer.id}
                activeOpacity={0.88}
                style={[
                  styles.offerCard,
                  { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder },
                ]}
                onPress={() => {
                  if (isGuest) {
                    useAuthGuardStore.getState().showAuthModal('claim exclusive member vouchers');
                    return;
                  }
                  Alert.alert(
                    'Promo Code Copied 📋',
                    `Promo code ${offer.code} copied! Applied on your next checkout.`
                  );
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.offerTitle, { color: colors.text }]}>{offer.title}</Text>
                  <Text style={[styles.offerVendor, { color: colors.textSecondary }]}>
                    {offer.vendor || offer.category || 'Connect Partner'}
                  </Text>
                  <Text style={styles.offerValidity}>
                    {offer.validity || offer.discount || 'Limited Period Deal'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.codeBtn,
                    {
                      backgroundColor: isLight ? '#FEFCE8' : '#1E293B',
                      borderColor: isLight ? '#FACC15' : '#854D0E',
                    },
                  ]}
                  activeOpacity={0.8}
                  onPress={() => {
                    if (isGuest) {
                      useAuthGuardStore.getState().showAuthModal('claim exclusive member vouchers');
                      return;
                    }
                    Alert.alert(
                      'Promo Code Copied 📋',
                      `Promo code ${offer.code} copied! Applied on your next checkout.`
                    );
                  }}
                >
                  <Text style={[styles.codeText, { color: isLight ? '#854D0E' : '#F4C400' }]}>
                    {offer.code}
                  </Text>
                </TouchableOpacity>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      {/* Razorpay Test Mode Checkout Modal */}
      <RazorpayModal
        visible={razorpayModalVisible}
        orderData={razorpayOrder}
        userInfo={{
          name: displayName,
          email: currentUser?.email || 'guest@connectapp.com',
          phone: currentUser?.phone || '',
        }}
        onSuccess={handleRazorpaySuccess}
        onCancel={handleRazorpayCancel}
      />
    </View>
  );
}

// ==========================================
// STYLES
// ==========================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerRightSpacer: {
    width: 40,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  scrollContent: {
    paddingVertical: 14,
    paddingBottom: 40,
  },
  cardsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginHorizontal: 16,
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 0.6,
  },
  flipPromptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
    marginHorizontal: 16,
    marginBottom: 14,
  },
  flipPromptText: {
    fontSize: 10.5,
    fontWeight: '600',
  },
  cardsVerticalList: {
    marginBottom: 20,
  },
  cardVerticalSlot: {
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTouchWrapper: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    position: 'relative',
  },
  cardFace: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 20,
    borderWidth: 1.5,
    overflow: 'hidden',
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: '#0F172A',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 5,
  },
  cardFaceBack: {
    backgroundColor: '#0B0F19',
  },
  cardContent: {
    flex: 1,
    padding: 14,
    justifyContent: 'space-between',
    zIndex: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  crestCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  activeStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.25)',
    borderWidth: 1,
    borderColor: '#34D399',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  activeDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#34D399',
  },
  activeStatusText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#A7F3D0',
    letterSpacing: 0.5,
  },
  lockedStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(100, 116, 139, 0.35)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.4)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  lockedStatusText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#CBD5E1',
    letterSpacing: 0.5,
  },
  upgradeStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  upgradeStatusText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  middleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 2,
  },
  detailsCol: {
    flex: 1,
  },
  cardMetaLabel: {
    fontSize: 7.5,
    fontWeight: 'bold',
    color: 'rgba(255, 255, 255, 0.65)',
    letterSpacing: 0.7,
  },
  tierNameValue: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  cardPriceValue: {
    fontSize: 9.5,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  cardMetaValue: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  qrWrapper: {
    position: 'relative',
  },
  qrContainer: {
    padding: 3,
    borderRadius: 7,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  qrLockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  memberNameValue: {
    fontSize: 10.5,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 1,
  },
  validityValue: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 1,
  },
  lowerTierOverlay: {
    position: 'absolute',
    bottom: 8,
    right: 12,
  },
  lowerTierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  lowerTierBadgeText: {
    fontSize: 8.5,
    fontWeight: 'bold',
    color: '#E2E8F0',
  },
  flipBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
  },
  flipBadgeText: {
    fontSize: 8,
    fontWeight: 'bold',
  },
  backBenefitsList: {
    gap: 4,
    marginVertical: 1,
  },
  backBenefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4.5,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  backBenefitText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
  },
  backActionContainer: {
    marginTop: 3,
  },
  activeBadgeBack: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: 'rgba(16, 185, 129, 0.18)',
    borderWidth: 1,
    borderColor: '#34D399',
    borderRadius: 7,
    paddingVertical: 5,
  },
  activeBadgeBackText: {
    fontSize: 10.5,
    fontWeight: 'bold',
    color: '#34D399',
  },
  upgradeBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderRadius: 7,
    paddingVertical: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  upgradeBackBtnText: {
    fontSize: 10.5,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  lockedBadgeBack: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: 'rgba(100, 116, 139, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.3)',
    borderRadius: 7,
    paddingVertical: 5,
  },
  lockedBadgeBackText: {
    fontSize: 9.5,
    fontWeight: '600',
    color: '#94A3B8',
  },
  offersSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginHorizontal: 16,
    marginBottom: 10,
  },
  offersContainer: {
    marginHorizontal: 16,
    gap: 10,
  },
  offerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  offerTitle: {
    fontSize: 12.5,
    fontWeight: 'bold',
  },
  offerVendor: {
    fontSize: 11,
    marginTop: 1,
  },
  offerValidity: {
    fontSize: 10,
    color: '#D97706',
    fontWeight: '600',
    marginTop: 2,
  },
  codeBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  codeText: {
    fontSize: 10.5,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
});
