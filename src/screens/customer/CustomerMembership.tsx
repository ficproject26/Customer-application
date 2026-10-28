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
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Icons from 'lucide-react-native';
import Svg, { Rect, Defs, LinearGradient, Stop, Path, Circle } from 'react-native-svg';
import QRCode from 'react-native-qrcode-svg';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import { apiFetch } from '../../services/api';
import RazorpayModal, { RazorpayOrderDetails } from '../../components/RazorpayModal';
import { prepareRazorpayOrder, verifyRazorpayPayment } from '../../services/razorpayService';
import { useTranslation } from '../../store/languageStore';
import { useAuthGuardStore } from '../../store/authGuardStore';
import { dispatchCustomerNotification } from '../../services/notificationService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = Math.min(SCREEN_WIDTH - 32, 380);
const HERO_CARD_HEIGHT = 216;

// Hierarchy ranking for membership tiers
const TIER_LEVEL: Record<'silver' | 'gold' | 'diamond', number> = {
  silver: 1,
  gold: 2,
  diamond: 3,
};

export interface ListPerk {
  icon: string;
  text: string;
}

export interface DetailBenefit {
  icon: string;
  title: string;
  desc: string;
  iconBg: string;
  iconColor: string;
}

export interface TierPlan {
  tier: string;
  type: 'silver' | 'gold' | 'diamond';
  price: string;
  annualFee: string;
  badge: string;
  color: string;
  gradientColors: [string, string, string];
  borderColor: string;
  backBgColor: string;
  backBorderColor: string;
  accentColor: string;
  points: number;
  listPerks: ListPerk[];
  detailBenefits: DetailBenefit[];
}

export const MEMBERSHIP_PLANS: TierPlan[] = [
  {
    tier: 'Silver Club',
    type: 'silver',
    price: '₹999 / year',
    annualFee: '₹999 / year',
    badge: 'BASIC PLAN',
    color: '#94A3B8',
    gradientColors: ['#0E1217', '#1A212D', '#0A0D13'],
    borderColor: '#94A3B8',
    backBgColor: '#0A0D13',
    backBorderColor: '#64748B',
    accentColor: '#E2E8F0',
    points: 1500,
    listPerks: [
      { icon: 'Percent', text: 'Exclusive Discounts' },
      { icon: 'Truck', text: 'Priority Delivery' },
      { icon: 'Sparkles', text: 'Special Offers' },
      { icon: 'Headphones', text: 'Standard Support' },
    ],
    detailBenefits: [
      {
        icon: 'Tag',
        title: 'Exclusive member discounts',
        desc: 'Special prices on products and services',
        iconBg: '#FEF3C7',
        iconColor: '#D97706',
      },
      {
        icon: 'Compass',
        title: 'Early access to offers',
        desc: 'Be the first to know about new offers',
        iconBg: '#E0E7FF',
        iconColor: '#4F46E5',
      },
      {
        icon: 'Gift',
        title: 'Birthday special offers',
        desc: 'Exclusive rewards on your special day',
        iconBg: '#FCE7F3',
        iconColor: '#DB2777',
      },
      {
        icon: 'Headphones',
        title: 'Priority customer support',
        desc: 'Faster resolution for your queries',
        iconBg: '#E0F2FE',
        iconColor: '#0284C7',
      },
    ],
  },
  {
    tier: 'Gold Club',
    type: 'gold',
    price: '₹2,499 / year',
    annualFee: '₹2,499 / year',
    badge: 'POPULAR PLAN',
    color: '#F59E0B',
    gradientColors: ['#0F0B04', '#1D1506', '#080602'],
    borderColor: '#FDE68A',
    backBgColor: '#080602',
    backBorderColor: '#B45309',
    accentColor: '#FBBF24',
    points: 3500,
    listPerks: [
      { icon: 'Percent', text: 'Higher Discounts' },
      { icon: 'Gift', text: 'Partner Deals' },
      { icon: 'Headphones', text: 'Priority Support' },
      { icon: 'Crown', text: 'Silver Included' },
      { icon: 'Star', text: 'VIP Events' },
    ],
    detailBenefits: [
      {
        icon: 'Percent',
        title: 'Higher member discounts',
        desc: 'Save more on all categories',
        iconBg: '#FCE7F3',
        iconColor: '#DB2777',
      },
      {
        icon: 'Headphones',
        title: 'Priority customer support',
        desc: 'Get faster and dedicated support',
        iconBg: '#E0E7FF',
        iconColor: '#4F46E5',
      },
      {
        icon: 'Gift',
        title: 'Exclusive partner offers',
        desc: 'Access to premium partner deals',
        iconBg: '#FDF2F8',
        iconColor: '#BE185D',
      },
      {
        icon: 'Star',
        title: 'Special event invitations',
        desc: 'Be a part of exclusive events',
        iconBg: '#FEF3C7',
        iconColor: '#D97706',
      },
      {
        icon: 'Crown',
        title: 'All Silver benefits included',
        desc: 'Enjoy everything from Silver Club',
        iconBg: '#FFEDD5',
        iconColor: '#EA580C',
      },
    ],
  },
  {
    tier: 'Diamond Club',
    type: 'diamond',
    price: '₹5,999 / year',
    annualFee: '₹5,999 / year',
    badge: 'PREMIUM PLAN',
    color: '#A855F7',
    gradientColors: ['#0B0517', '#190A36', '#070310'],
    borderColor: '#D8B4FE',
    backBgColor: '#070310',
    backBorderColor: '#7E22CE',
    accentColor: '#C084FC',
    points: 8500,
    listPerks: [
      { icon: 'Percent', text: 'Maximum Discounts' },
      { icon: 'Crown', text: 'VIP Concierge' },
      { icon: 'Compass', text: 'Lounge Access' },
      { icon: 'Star', text: 'Exclusive Perks' },
      { icon: 'ShieldCheck', text: 'All Perks Included' },
    ],
    detailBenefits: [
      {
        icon: 'Percent',
        title: 'Maximum member discounts',
        desc: 'Highest savings & exclusive member pricing',
        iconBg: '#F3E8FF',
        iconColor: '#9333EA',
      },
      {
        icon: 'Crown',
        title: 'Dedicated VIP Concierge',
        desc: 'Personal 24/7 dedicated relationship manager',
        iconBg: '#E0E7FF',
        iconColor: '#4F46E5',
      },
      {
        icon: 'Compass',
        title: 'Unlimited Airport Lounge Access',
        desc: 'Complimentary global lounge privileges',
        iconBg: '#CCFBF1',
        iconColor: '#0D9488',
      },
      {
        icon: 'Star',
        title: 'Exclusive Experiences',
        desc: 'VIP invitations to partner galas & luxury stays',
        iconBg: '#FEF3C7',
        iconColor: '#D97706',
      },
      {
        icon: 'ShieldCheck',
        title: 'All Gold benefits included',
        desc: 'Enjoy everything from Silver & Gold Club',
        iconBg: '#EDE9FE',
        iconColor: '#7C3AED',
      },
    ],
  },
];

// Helper to render dynamic Lucide icons
const DynamicIcon: React.FC<{ name: string; color: string; size: number; strokeWidth?: number }> = ({
  name,
  color,
  size,
  strokeWidth = 2,
}) => {
  const IconComponent = (Icons as any)[name] || Icons.Sparkles;
  return <IconComponent color={color} size={size} strokeWidth={strokeWidth} />;
};

// ==========================================
// 1. MEMBERSHIP LIST CARD COMPONENT (Screen 1)
// ==========================================
interface MembershipListCardProps {
  plan: TierPlan;
  currentMembership?: 'silver' | 'gold' | 'diamond' | null;
  onPress: () => void;
  memberId: string;
}

const MembershipListCard: React.FC<MembershipListCardProps> = ({
  plan,
  currentMembership,
  onPress,
  memberId,
}) => {
  const isCurrent = Boolean(currentMembership && currentMembership === plan.type);
  const currentLevel = currentMembership ? TIER_LEVEL[currentMembership] || 0 : 0;
  const cardLevel = TIER_LEVEL[plan.type] || 0;
  const isLower = currentLevel > 0 && cardLevel < currentLevel;
  const tierTitle = plan.type === 'silver' ? 'SILVER' : plan.type === 'diamond' ? 'DIAMOND' : 'GOLD';

  return (
    <TouchableOpacity
      activeOpacity={0.92}
      onPress={onPress}
      style={styles.listCardWrapper}
    >
      <View style={[styles.listCardContainer, { borderColor: plan.borderColor }]}>
        {/* SVG Gradient Background */}
        <View style={StyleSheet.absoluteFill}>
          <Svg width="100%" height="100%">
            <Defs>
              <LinearGradient id={"listGrad-" + plan.type} x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor={plan.gradientColors[0]} />
                <Stop offset="50%" stopColor={plan.gradientColors[1]} />
                <Stop offset="100%" stopColor={plan.gradientColors[2]} />
              </LinearGradient>
              <LinearGradient id={"listWave-" + plan.type} x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor={plan.accentColor} stopOpacity="0.4" />
                <Stop offset="70%" stopColor={plan.color} stopOpacity="0.2" />
                <Stop offset="100%" stopColor="transparent" stopOpacity="0" />
              </LinearGradient>
            </Defs>
            <Rect width="100%" height="100%" rx="20" ry="20" fill={"url(#listGrad-" + plan.type + ")"} />
            <Path
              d="M -20,130 C 70,80 170,160 270,100 C 320,70 350,90 400,50 L 400,230 L -20,230 Z"
              fill={"url(#listWave-" + plan.type + ")"}
            />
          </Svg>
        </View>

        {/* Card Content */}
        <View style={styles.listCardContent}>
          {/* Top Row: Brand & Tier Badge */}
          <View style={styles.listCardTopRow}>
            <View style={styles.brandBadgeRow}>
              <View style={[styles.crownIconBoxSmall, { borderColor: plan.accentColor }]}>
                <Icons.Crown color={plan.accentColor} size={12} strokeWidth={2.5} />
              </View>
              <View>
                <Text style={styles.brandTitleText}>Connect Club</Text>
                <Text style={styles.brandTaglineText}>ONE CITY ONE CARD</Text>
              </View>
            </View>

            <View style={styles.topRightPillsRow}>
              {isCurrent ? (
                <View style={styles.activePillBadge}>
                  <View style={styles.activePillDot} />
                  <Text style={styles.activePillText}>ACTIVE</Text>
                </View>
              ) : isLower ? (
                <View style={styles.includedPillBadge}>
                  <Icons.Lock color="#CBD5E1" size={9} />
                  <Text style={styles.includedPillText}>INCLUDED</Text>
                </View>
              ) : null}

              <View style={[styles.planTierBadge, { borderColor: plan.borderColor }]}>
                <Text style={[styles.planTierBadgeText, { color: plan.accentColor }]}>{plan.badge}</Text>
              </View>
            </View>
          </View>

          {/* Main Content Area */}
          <View style={styles.listCardMainRow}>
            {/* Left: Titles & Perks */}
            <View style={styles.listCardLeftCol}>
              <View style={styles.listTierHeaderRow}>
                <Text style={styles.listCardTitle}>{tierTitle} CLUB</Text>
                <Icons.Sparkles color={plan.accentColor} size={12} />
              </View>
              <Text style={styles.listCardFee}>Annual Fee: {plan.annualFee}</Text>

              {/* Bullet Perks */}
              <View style={styles.perksListContainer}>
                {plan.listPerks.map((perk, idx) => (
                  <View key={idx} style={styles.perkBulletRow}>
                    <View style={[styles.perkIconCircle, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
                      <DynamicIcon name={perk.icon} color={plan.accentColor} size={9} strokeWidth={2.5} />
                    </View>
                    <Text style={styles.perkBulletText}>{perk.text}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Right: QR Preview & Arrow */}
            <View style={styles.listCardRightCol}>
              <View style={styles.listQrBox}>
                <QRCode
                  value={memberId}
                  size={46}
                  color="#0F172A"
                  backgroundColor="#FFFFFF"
                />
              </View>
              <Text style={styles.scanToVerifyTextSmall}>SCAN TO VERIFY</Text>

              {/* Circle Right Arrow */}
              <View style={[styles.arrowCircleBtn, { backgroundColor: plan.accentColor }]}>
                <Icons.ChevronRight color="#0B0F19" size={14} strokeWidth={3} />
              </View>
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

// ==========================================
// 2. HERO 3D FLIPPABLE CARD (Screens 2, 3, 4)
// ==========================================
interface HeroMembershipCardProps {
  plan: TierPlan;
  currentMembership?: 'silver' | 'gold' | 'diamond' | null;
  displayName: string;
  memberId: string;
  isFlipped: boolean;
  onFlip: () => void;
}

const HeroMembershipCard: React.FC<HeroMembershipCardProps> = ({
  plan,
  displayName,
  memberId,
  isFlipped,
  onFlip,
}) => {
  const animatedValue = useRef(new Animated.Value(isFlipped ? 180 : 0)).current;

  useEffect(() => {
    Animated.spring(animatedValue, {
      toValue: isFlipped ? 180 : 0,
      friction: 8,
      tension: 10,
      useNativeDriver: true,
    }).start();
  }, [isFlipped, animatedValue]);

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

  const tierTitle = plan.type === 'silver' ? 'SILVER' : plan.type === 'diamond' ? 'DIAMOND' : 'GOLD';

  return (
    <TouchableOpacity
      activeOpacity={0.94}
      onPress={onFlip}
      style={styles.heroCardTouchWrapper}
    >
      {/* ================= HERO CARD FRONT ================= */}
      <Animated.View
        style={[
          styles.heroCardFace,
          {
            borderColor: plan.borderColor,
            transform: [{ perspective: 1200 }, { rotateY: frontInterpolate }],
            opacity: frontOpacity,
            zIndex: isFlipped ? 0 : 2,
          },
        ]}
        pointerEvents={isFlipped ? 'none' : 'auto'}
      >
        {/* SVG Fluid Wave & Specular Ribbon Background */}
        <View style={StyleSheet.absoluteFill}>
          <Svg width="100%" height="100%">
            <Defs>
              <LinearGradient id={"heroGrad-" + plan.type} x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor={plan.gradientColors[0]} />
                <Stop offset="50%" stopColor={plan.gradientColors[1]} />
                <Stop offset="100%" stopColor={plan.gradientColors[2]} />
              </LinearGradient>
              <LinearGradient id={"heroWave-" + plan.type} x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor={plan.accentColor} stopOpacity="0.45" />
                <Stop offset="60%" stopColor={plan.color} stopOpacity="0.25" />
                <Stop offset="100%" stopColor="transparent" stopOpacity="0" />
              </LinearGradient>
            </Defs>
            <Rect width="100%" height="100%" rx="20" ry="20" fill={"url(#heroGrad-" + plan.type + ")"} />
            <Path
              d="M -20,150 C 70,100 170,180 270,120 C 320,90 350,110 400,70 L 400,230 L -20,230 Z"
              fill={"url(#heroWave-" + plan.type + ")"}
            />
            <Path
              d="M -20,150 C 70,100 170,180 270,120 C 320,90 350,110 400,70"
              stroke={plan.accentColor}
              strokeWidth="1.5"
              strokeOpacity="0.6"
            />
          </Svg>
        </View>

        {/* Card Content Front */}
        <View style={styles.heroCardContent}>
          {/* Header Row: Connect Club Logo & Right Motif */}
          <View style={styles.heroCardHeaderRow}>
            <View style={styles.brandBadgeRow}>
              <Icons.Crown color="#FFFFFF" size={14} strokeWidth={2.5} />
              <Text style={styles.brandTitleText}>Connect Club</Text>
            </View>
            <View style={styles.topRightEmblem}>
              <Icons.Sparkles color="rgba(255,255,255,0.8)" size={15} />
            </View>
          </View>

          {/* Bottom Row: Member Details & QR Code */}
          <View style={styles.heroMainRow}>
            <View style={styles.heroLeftCol}>
              <Text style={styles.heroTierTitle}>{plan.tier}</Text>
              <Text style={styles.heroFeeText}>Annual Fee: {plan.annualFee}</Text>
              <Text style={styles.heroCardNumber}>{memberId}</Text>
              <Text style={styles.heroMemberName}>{displayName}</Text>
            </View>

            <View style={styles.heroRightCol}>
              <View style={styles.heroQrBox}>
                <QRCode
                  value={memberId}
                  size={52}
                  color="#0F172A"
                  backgroundColor="#FFFFFF"
                />
              </View>
              <View style={styles.heroValidThruRow}>
                <View>
                  <Text style={styles.heroValidLabel}>Valid Thru</Text>
                  <Text style={styles.heroValidDate}>12/27</Text>
                </View>
                <View style={styles.heroSubtleArrow}>
                  <Icons.ChevronRight color="#FFFFFF" size={13} />
                </View>
              </View>
            </View>
          </View>
        </View>
      </Animated.View>

      {/* ================= HERO CARD BACK ================= */}
      <Animated.View
        style={[
          styles.heroCardFace,
          {
            borderColor: plan.backBorderColor,
            transform: [{ perspective: 1200 }, { rotateY: backInterpolate }],
            opacity: backOpacity,
            zIndex: isFlipped ? 2 : 0,
          },
        ]}
        pointerEvents={isFlipped ? 'auto' : 'none'}
      >
        {/* SVG Gradient Back */}
        <View style={StyleSheet.absoluteFill}>
          <Svg width="100%" height="100%">
            <Defs>
              <LinearGradient id={"heroBackGrad-" + plan.type} x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor={plan.backBgColor} />
                <Stop offset="60%" stopColor="#0B0F19" />
                <Stop offset="100%" stopColor="#04060A" />
              </LinearGradient>
            </Defs>
            <Rect width="100%" height="100%" rx="20" ry="20" fill={"url(#heroBackGrad-" + plan.type + ")"} />
          </Svg>
        </View>

        {/* Content Back */}
        <View style={styles.heroCardContent}>
          {/* Top Row: Connect Club + MEMBER CARD */}
          <View style={styles.heroCardHeaderRow}>
            <View style={styles.brandBadgeRow}>
              <Icons.Crown color="#FFFFFF" size={14} strokeWidth={2.5} />
              <Text style={styles.brandTitleText}>Connect Club</Text>
            </View>
            <Text style={styles.memberCardHeaderText}>MEMBER CARD</Text>
          </View>

          {/* Signature Panel */}
          <View style={styles.signaturePanel}>
            <Text style={styles.signatureScriptText} numberOfLines={1}>
              {displayName}
            </Text>
            <Text style={styles.authorizedSignatureSubtext}>Authorized Signature</Text>
          </View>

          {/* Terms & Conditions Section */}
          <View style={styles.backTermsBox}>
            <Text style={styles.backTermsTitle}>Terms & Conditions</Text>
            <Text style={styles.backTermLine}>1. This card is non-transferable.</Text>
            <Text style={styles.backTermLine}>2. Valid only for the registered member.</Text>
            <Text style={styles.backTermLine}>3. Membership is subject to terms & conditions.</Text>
            <Text style={styles.backTermLine}>4. For support, contact our customer care.</Text>
          </View>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
};

// ==========================================
// 3. MAIN MEMBERSHIP SCREEN
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
  const rawTier = (currentUser?.membership || currentUser?.membershipTier || '').toLowerCase();
  const currentMembership = (['silver', 'gold', 'diamond'].includes(rawTier) ? rawTier : null) as 'silver' | 'gold' | 'diamond' | null;

  // Selected plan for Details view (null = List view, TierPlan = Details view)
  const [selectedPlan, setSelectedPlan] = useState<TierPlan | null>(null);

  // Active Tab for Details view ('benefits' | 'details' | 'terms')
  const [activeTab, setActiveTab] = useState<'benefits' | 'details' | 'terms'>('benefits');

  // Hero Card Flip state
  const [isFlipped, setIsFlipped] = useState(false);

  // Razorpay Checkout Modal State
  const [razorpayModalVisible, setRazorpayModalVisible] = useState(false);
  const [razorpayOrder, setRazorpayOrder] = useState<RazorpayOrderDetails | null>(null);
  const [updating, setUpdating] = useState(false);

  // Member ID generation / sync
  const userNum = isGuest ? 'GUEST' : (currentUser?.id ? currentUser.id.replace(/[^\d]/g, '') || '1793084393349' : '1793084393349');
  const getMemberIdForPlan = (plan: TierPlan) => `CN-${plan.type.toUpperCase()}-${userNum}`;

  // Sync membership status in background from MongoDB Atlas
  useEffect(() => {
    let isMounted = true;

    apiFetch('/membership/status')
      .then((res) => {
        if (!isMounted) return;
        if (res && res.tier) {
          const liveTier = res.tier.toLowerCase();
          if (['silver', 'gold', 'diamond'].includes(liveTier)) {
            useAuthStore.getState().updateProfile({
              membershipTier: liveTier,
              membership: liveTier as 'silver' | 'gold' | 'diamond',
            });
          }
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  // Handle plan purchase / upgrade initiation
  const handleUpgradePlan = (plan: TierPlan) => {
    if (isGuest) {
      useAuthGuardStore.getState().showAuthModal('select or upgrade a membership plan');
      return;
    }

    if (plan.type === currentMembership) {
      Alert.alert('Current Active Tier', `You are already enjoying ${plan.tier} privileges!`);
      return;
    }

    const currentLevel = currentMembership ? TIER_LEVEL[currentMembership] || 0 : 0;
    const targetLevel = TIER_LEVEL[plan.type] || 0;

    if (currentLevel > 0 && targetLevel < currentLevel) {
      Alert.alert('Downgrade Not Permitted', 'You already have an active higher tier membership.');
      return;
    }

    const rawPrice = plan.price.replace(/[^0-9]/g, '');
    const priceNum = parseInt(rawPrice, 10) || 999;
    const isUpgrade = currentLevel > 0 && targetLevel > currentLevel;

    setUpdating(true);

    prepareRazorpayOrder({
      amount: priceNum,
      planType: plan.type,
      planName: isUpgrade ? `Upgrade to ${plan.tier}` : `Buy ${plan.tier}`,
      priceText: plan.price,
      userId: currentUser?.id || 'guest_user',
      onOrderReady: (ord) => {
        setRazorpayOrder(ord);
        setRazorpayModalVisible(true);
        setUpdating(false);
      },
    }).catch((err) => {
      setUpdating(false);
      Alert.alert('Order Notice', err?.message || 'Could not initiate membership order.');
    });
  };

  // Handle verified Razorpay payment
  const handleRazorpaySuccess = async (paymentResult: {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  }) => {
    setRazorpayModalVisible(false);

    try {
      const response = await verifyRazorpayPayment({
        ...paymentResult,
        planType: razorpayOrder?.planType || 'silver',
        userId: currentUser?.id || 'guest_user',
      });

      if (response && (response.status === 'success' || response.success === true || response?.success)) {
        const newTier = (razorpayOrder?.planType || 'silver') as 'silver' | 'gold' | 'diamond';
        await updateMembership(newTier);

        dispatchCustomerNotification({
          title: 'Membership Activated! 👑',
          body: `Congratulations! Your ${razorpayOrder?.planName || 'Connect Club'} membership is now active. Enjoy exclusive privileges!`,
          icon: 'Crown',
          category: 'membership',
          actionLabel: 'View Membership',
          actionType: 'membership',
          targetScreen: 'Membership',
          channelId: 'connect_account_channel',
        });

        Alert.alert(
          'Membership Activated 🎉',
          `Payment verified! Your ${razorpayOrder?.planName || 'Connect Club'} membership is now active.`
        );
      } else {
        Alert.alert(
          'Payment Notice',
          response?.message || 'Payment completed, but verification is being processed.'
        );
      }
    } catch (err: any) {
      Alert.alert('Notice', err?.message || 'Payment processing error.');
    } finally {
      setRazorpayOrder(null);
    }
  };

  const handleRazorpayCancel = () => {
    setRazorpayModalVisible(false);
    setRazorpayOrder(null);
    setUpdating(false);
  };

  // Determine button state for selected plan in Detail View
  const selectedLevel = selectedPlan ? TIER_LEVEL[selectedPlan.type] || 0 : 0;
  const userCurrentLevel = currentMembership ? TIER_LEVEL[currentMembership] || 0 : 0;
  const isSelectedCurrent = Boolean(currentMembership && selectedPlan?.type === currentMembership);
  const isSelectedLower = userCurrentLevel > 0 && selectedLevel < userCurrentLevel;
  const isSelectedHigher = userCurrentLevel > 0 && selectedLevel > userCurrentLevel;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.headerBackground}
      />

      {/* TOP HEADER */}
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
            if (selectedPlan) {
              setSelectedPlan(null);
              setIsFlipped(false);
            } else if (navigation.canGoBack()) {
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

        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {selectedPlan ? selectedPlan.tier : t('Connect Membership')}
        </Text>

        <View style={styles.headerRightSpacer} />
      </View>

      {/* ============================================================ */}
      {/* VIEW 1: MEMBERSHIP CARDS LIST (Screen 1 in Reference)          */}
      {/* ============================================================ */}
      {!selectedPlan ? (
        <ScrollView
          contentContainerStyle={styles.listScrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Section Header */}
          <View style={styles.sectionHeaderBox}>
            <View style={styles.sectionTitleRow}>
              <Icons.Crown color="#D97706" size={13} strokeWidth={2.5} />
              <Text style={styles.sectionOrangeLabel}>MEMBERSHIP TIERS</Text>
            </View>
            <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
              Choose the right plan and unlock exclusive benefits
            </Text>
          </View>

          {/* Cards List */}
          <View style={styles.cardsStack}>
            {MEMBERSHIP_PLANS.map((plan) => (
              <MembershipListCard
                key={plan.type}
                plan={plan}
                currentMembership={currentMembership}
                memberId={getMemberIdForPlan(plan)}
                onPress={() => {
                  setSelectedPlan(plan);
                  setIsFlipped(false);
                  setActiveTab('benefits');
                }}
              />
            ))}
          </View>
        </ScrollView>
      ) : (
        /* ============================================================ */
        /* VIEW 2: CARD DETAILS, FLIP & TABS (Screens 2, 3, 4)           */
        /* ============================================================ */
        <View style={styles.detailsViewWrapper}>
          <ScrollView
            contentContainerStyle={styles.detailsScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Hero Flippable Card */}
            <View style={styles.heroCardContainer}>
              <HeroMembershipCard
                plan={selectedPlan}
                displayName={displayName}
                memberId={getMemberIdForPlan(selectedPlan)}
                isFlipped={isFlipped}
                onFlip={() => setIsFlipped((prev) => !prev)}
              />
            </View>

            {/* Tap to view flip pill button */}
            <View style={styles.flipPillRow}>
              <TouchableOpacity
                style={[
                  styles.flipPillButton,
                  {
                    backgroundColor: isLight ? '#FFFFFF' : '#1E293B',
                    borderColor: isLight ? '#E2E8F0' : '#334155',
                  },
                ]}
                activeOpacity={0.8}
                onPress={() => setIsFlipped((prev) => !prev)}
              >
                <Icons.RotateCw color={colors.text} size={13} strokeWidth={2.2} />
                <Text style={[styles.flipPillButtonText, { color: colors.text }]}>
                  {isFlipped ? 'Tap card to view front side' : 'Tap card to view back side'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Segmented Tabs Switcher */}
            <View
              style={[
                styles.segmentedTabsContainer,
                { backgroundColor: isLight ? '#F1F5F9' : '#0F172A' },
              ]}
            >
              {(['benefits', 'details', 'terms'] as const).map((tabKey) => {
                const isActive = activeTab === tabKey;
                const tabTitle =
                  tabKey === 'benefits'
                    ? 'Benefits'
                    : tabKey === 'details'
                    ? 'Details'
                    : 'Terms';

                return (
                  <TouchableOpacity
                    key={tabKey}
                    style={[
                      styles.segmentedTabItem,
                      isActive && {
                        backgroundColor: isLight ? '#0F172A' : '#3B82F6',
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.12,
                        shadowRadius: 3,
                        elevation: 2,
                      },
                    ]}
                    activeOpacity={0.85}
                    onPress={() => setActiveTab(tabKey)}
                  >
                    <Text
                      style={[
                        styles.segmentedTabText,
                        isActive
                          ? { color: '#FFFFFF', fontWeight: '800' }
                          : { color: isLight ? '#64748B' : '#94A3B8' },
                      ]}
                    >
                      {tabTitle}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* TAB CONTENT 1: BENEFITS */}
            {activeTab === 'benefits' && (
              <View style={styles.tabContentBlock}>
                <View style={styles.tabHeadingRow}>
                  <Icons.Crown color="#D97706" size={16} strokeWidth={2.5} />
                  <Text style={[styles.tabHeadingText, { color: colors.text }]}>
                    {selectedPlan.tier} Benefits
                  </Text>
                </View>

                <View style={styles.benefitsListContainer}>
                  {selectedPlan.detailBenefits.map((item, idx) => (
                    <View
                      key={idx}
                      style={[
                        styles.benefitCardItem,
                        {
                          backgroundColor: isLight ? '#FFFFFF' : 'rgba(255,255,255,0.03)',
                          borderColor: isLight ? '#F1F5F9' : colors.cardBorder,
                        },
                      ]}
                    >
                      <View style={[styles.benefitIconBox, { backgroundColor: item.iconBg }]}>
                        <DynamicIcon
                          name={item.icon}
                          color={item.iconColor}
                          size={18}
                          strokeWidth={2.2}
                        />
                      </View>
                      <View style={styles.benefitTextBox}>
                        <Text style={[styles.benefitItemTitle, { color: colors.text }]}>
                          {item.title}
                        </Text>
                        <Text style={[styles.benefitItemDesc, { color: colors.textSecondary }]}>
                          {item.desc}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* TAB CONTENT 2: DETAILS */}
            {activeTab === 'details' && (
              <View style={styles.tabContentBlock}>
                <View style={styles.tabHeadingRow}>
                  <Icons.FileText color="#D97706" size={16} strokeWidth={2.2} />
                  <Text style={[styles.tabHeadingText, { color: colors.text }]}>Plan Details</Text>
                </View>

                <View
                  style={[
                    styles.detailsTableCard,
                    {
                      backgroundColor: isLight ? '#FFFFFF' : 'rgba(255,255,255,0.03)',
                      borderColor: isLight ? '#F1F5F9' : colors.cardBorder,
                    },
                  ]}
                >
                  <View style={styles.detailsTableRow}>
                    <Text style={[styles.detailsTableLabel, { color: colors.textSecondary }]}>
                      Membership Tier
                    </Text>
                    <Text style={[styles.detailsTableValue, { color: colors.text }]}>
                      {selectedPlan.tier}
                    </Text>
                  </View>

                  <View style={styles.detailsTableRow}>
                    <Text style={[styles.detailsTableLabel, { color: colors.textSecondary }]}>
                      Annual Fee
                    </Text>
                    <Text style={[styles.detailsTableValue, { color: colors.text }]}>
                      {selectedPlan.price}
                    </Text>
                  </View>

                  <View style={styles.detailsTableRow}>
                    <Text style={[styles.detailsTableLabel, { color: colors.textSecondary }]}>
                      Valid Thru
                    </Text>
                    <Text style={[styles.detailsTableValue, { color: colors.text }]}>12/27</Text>
                  </View>

                  <View style={styles.detailsTableRow}>
                    <Text style={[styles.detailsTableLabel, { color: colors.textSecondary }]}>
                      Card Number
                    </Text>
                    <Text style={[styles.detailsTableValue, { color: colors.text }]}>
                      {getMemberIdForPlan(selectedPlan)}
                    </Text>
                  </View>

                  <View style={[styles.detailsTableRow, { borderBottomWidth: 0 }]}>
                    <Text style={[styles.detailsTableLabel, { color: colors.textSecondary }]}>
                      Member Name
                    </Text>
                    <Text style={[styles.detailsTableValue, { color: colors.text }]}>
                      {displayName}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* TAB CONTENT 3: TERMS */}
            {activeTab === 'terms' && (
              <View style={styles.tabContentBlock}>
                <View style={styles.tabHeadingRow}>
                  <Icons.ShieldCheck color="#D97706" size={16} strokeWidth={2.2} />
                  <Text style={[styles.tabHeadingText, { color: colors.text }]}>
                    Terms & Conditions
                  </Text>
                </View>

                <View
                  style={[
                    styles.termsCardContainer,
                    {
                      backgroundColor: isLight ? '#FFFFFF' : 'rgba(255,255,255,0.03)',
                      borderColor: isLight ? '#F1F5F9' : colors.cardBorder,
                    },
                  ]}
                >
                  {[
                    'Membership privileges are strictly non-transferable and valid only for the verified account owner.',
                    'Validity extends for 12 months from activation date, renewable upon expiry.',
                    'Partner dining, lounge passes, and exclusive discounts are subject to partner availability and booking slots.',
                    'Upgrades between tiers are calculated and activated instantly upon payment verification.',
                    'Tier downgrades are not supported in accordance with Connect Privilege policy.',
                    'For priority member support, reach out 24/7 via the Connect Help & Support desk.',
                  ].map((rule, idx) => (
                    <View key={idx} style={styles.termItemRow}>
                      <View style={styles.termCheckCircle}>
                        <Icons.Check color="#16A34A" size={11} strokeWidth={3} />
                      </View>
                      <Text style={[styles.termItemText, { color: colors.text }]}>{rule}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </ScrollView>

          {/* STICKY BOTTOM ACTION CTA */}
          <View
            style={[
              styles.stickyBottomBar,
              {
                paddingBottom: Math.max(insets.bottom, 12),
                backgroundColor: colors.headerBackground,
                borderTopColor: colors.border,
              },
            ]}
          >
            {isSelectedCurrent ? (
              <View style={styles.activeOwnedBtn}>
                <Icons.CheckCircle2 color="#FFFFFF" size={18} strokeWidth={2.5} />
                <View>
                  <Text style={styles.activeOwnedBtnText}>Current Active Membership</Text>
                  <Text style={styles.activeOwnedBtnSub}>Privileges active through 12/27</Text>
                </View>
              </View>
            ) : isSelectedLower ? (
              <View style={styles.lowerLockedBtn}>
                <Icons.Lock color="#CBD5E1" size={16} />
                <View>
                  <Text style={styles.lowerLockedBtnText}>Included in Active Plan</Text>
                  <Text style={styles.lowerLockedBtnSub}>Downgrades are not permitted</Text>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.actionCtaBtn}
                activeOpacity={0.88}
                disabled={updating}
                onPress={() => handleUpgradePlan(selectedPlan)}
              >
                <View style={styles.actionCtaTextCol}>
                  <Text style={styles.actionCtaTitle}>
                    {isSelectedHigher ? `Upgrade to ${selectedPlan.tier}` : `Buy ${selectedPlan.tier}`}
                  </Text>
                  <Text style={styles.actionCtaFee}>{selectedPlan.price}</Text>
                </View>
                <Icons.ArrowRight color="#FFFFFF" size={18} strokeWidth={2.5} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

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
    fontSize: 16.5,
    fontWeight: '700',
  },

  // 1. LIST VIEW STYLES
  listScrollContent: {
    paddingVertical: 14,
    paddingBottom: 32,
  },
  sectionHeaderBox: {
    marginHorizontal: 16,
    marginBottom: 14,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  },
  sectionOrangeLabel: {
    fontSize: 11.5,
    fontWeight: '900',
    color: '#D97706',
    letterSpacing: 0.8,
  },
  sectionSubtitle: {
    fontSize: 12.5,
    fontWeight: '500',
  },
  cardsStack: {
    paddingHorizontal: 16,
    gap: 14,
  },
  listCardWrapper: {
    width: '100%',
  },
  listCardContainer: {
    borderRadius: 20,
    borderWidth: 1.5,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 8,
    elevation: 4,
  },
  listCardContent: {
    padding: 16,
  },
  listCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  brandBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  brandTitleText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  topRightPillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  activePillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.3)',
    borderWidth: 1,
    borderColor: '#34D399',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  activePillDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#34D399',
  },
  activePillText: {
    fontSize: 8.5,
    fontWeight: '900',
    color: '#A7F3D0',
    letterSpacing: 0.5,
  },
  includedPillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(100, 116, 139, 0.35)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.5)',
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  includedPillText: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#CBD5E1',
    letterSpacing: 0.4,
  },
  planTierBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.28)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  planTierBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.6,
  },
  listCardMainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  listCardLeftCol: {
    flex: 1,
  },
  listCardTitle: {
    fontSize: 18.5,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  listCardFee: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.82)',
    marginBottom: 10,
  },
  perksListContainer: {
    gap: 5,
  },
  perkBulletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  perkIconCircle: {
    width: 17,
    height: 17,
    borderRadius: 8.5,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  perkBulletText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  listCardRightCol: {
    alignItems: 'center',
    marginLeft: 12,
  },
  listQrBox: {
    padding: 3,
    borderRadius: 7,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
    marginBottom: 4,
  },
  listValidThruText: {
    fontSize: 8,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.65)',
  },
  listValidThruDate: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  arrowCircleBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // 2. DETAILS VIEW STYLES
  detailsViewWrapper: {
    flex: 1,
  },
  detailsScrollContent: {
    paddingVertical: 14,
    paddingBottom: 90,
  },
  heroCardContainer: {
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 10,
  },
  heroCardTouchWrapper: {
    width: CARD_WIDTH,
    height: HERO_CARD_HEIGHT,
    position: 'relative',
  },
  heroCardFace: {
    width: CARD_WIDTH,
    height: HERO_CARD_HEIGHT,
    borderRadius: 20,
    borderWidth: 1.5,
    overflow: 'hidden',
    position: 'absolute',
    top: 0,
    left: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  heroCardContent: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
    zIndex: 2,
  },
  heroCardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topRightEmblem: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroMainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  heroLeftCol: {
    flex: 1,
  },
  heroTierTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  heroFeeText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.85)',
    marginBottom: 6,
  },
  heroCardNumber: {
    fontSize: 10.5,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.95)',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  heroMemberName: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  heroRightCol: {
    alignItems: 'center',
    marginLeft: 12,
  },
  heroQrBox: {
    padding: 4,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
    marginBottom: 4,
  },
  heroValidThruRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  heroValidLabel: {
    fontSize: 7.5,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.65)',
    textAlign: 'center',
  },
  heroValidDate: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  heroSubtleArrow: {
    marginLeft: 2,
  },

  // Hero Back Styles
  memberCardHeaderText: {
    fontSize: 10,
    fontWeight: '800',
    color: 'rgba(255, 255, 255, 0.85)',
    letterSpacing: 1.2,
  },
  signaturePanel: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 3,
  },
  signatureScriptText: {
    fontSize: 19,
    fontWeight: '700',
    fontStyle: 'italic',
    color: '#1E293B',
    letterSpacing: 1.5,
    fontFamily: Platform.OS === 'android' ? 'cursive' : 'Snell Roundhand',
  },
  authorizedSignatureSubtext: {
    fontSize: 7.5,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 1,
  },
  backTermsBox: {
    paddingTop: 2,
  },
  backTermsTitle: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  backTermLine: {
    fontSize: 8,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.82)',
    lineHeight: 11,
  },

  // Flip Pill Button
  flipPillRow: {
    alignItems: 'center',
    marginBottom: 12,
  },
  flipPillButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  flipPillButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Segmented Tabs
  segmentedTabsContainer: {
    flexDirection: 'row',
    borderRadius: 22,
    padding: 3,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  segmentedTabItem: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 19,
  },
  segmentedTabText: {
    fontSize: 12.5,
    fontWeight: '600',
  },

  // Tab Content Blocks
  tabContentBlock: {
    marginHorizontal: 16,
  },
  tabHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 12,
  },
  tabHeadingText: {
    fontSize: 15,
    fontWeight: '800',
  },

  // Benefits List
  benefitsListContainer: {
    gap: 10,
  },
  benefitCardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  benefitIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitTextBox: {
    flex: 1,
  },
  benefitItemTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  benefitItemDesc: {
    fontSize: 11,
    lineHeight: 15,
  },

  // Details Table
  detailsTableCard: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  detailsTableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148, 163, 184, 0.15)',
  },
  detailsTableLabel: {
    fontSize: 12.5,
    fontWeight: '500',
  },
  detailsTableValue: {
    fontSize: 13,
    fontWeight: '700',
  },

  // Terms Card
  termsCardContainer: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  termItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  termCheckCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  termItemText: {
    flex: 1,
    fontSize: 11.5,
    lineHeight: 16,
    fontWeight: '500',
  },

  // Sticky Bottom CTA Bar
  stickyBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 8,
  },
  actionCtaBtn: {
    backgroundColor: '#FF6A00',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#FF6A00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  actionCtaTextCol: {
    alignItems: 'flex-start',
  },
  actionCtaTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  actionCtaFee: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 11.5,
    fontWeight: '600',
    marginTop: 1,
  },
  activeOwnedBtn: {
    backgroundColor: '#10B981',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  activeOwnedBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  activeOwnedBtnSub: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 10.5,
    fontWeight: '600',
  },
  lowerLockedBtn: {
    backgroundColor: '#64748B',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  lowerLockedBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  lowerLockedBtnSub: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 10.5,
    fontWeight: '600',
  },

  crownIconBoxSmall: {
    width: 22,
    height: 22,
    borderRadius: 7,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  crownIconBox: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTaglineText: {
    fontSize: 6.5,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.65)',
    letterSpacing: 1.2,
    marginTop: 1,
  },
  listTierHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  scanToVerifyTextSmall: {
    fontSize: 6,
    fontWeight: '800',
    color: 'rgba(255, 255, 255, 0.7)',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  tierTitleBox: {
    alignItems: 'flex-end',
  },
  tierTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  serifTierTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1.5,
  },
  serifTierSubtitle: {
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1.8,
  },
  serifTierTitleBack: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1.2,
  },
  privilegesSubtext: {
    fontSize: 7,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginTop: 1,
  },
  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
  },
  emvChipBox: {
    width: 20,
    height: 14,
    borderRadius: 3,
    backgroundColor: '#EAB308',
    borderWidth: 1,
    borderColor: '#FEF08A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emvChipInner: {
    width: 12,
    height: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 1.5,
  },
  heroValidText: {
    fontSize: 7.5,
    fontWeight: '700',
    fontFamily: 'monospace',
    color: 'rgba(255, 255, 255, 0.85)',
    letterSpacing: 0.5,
  },
  scanToVerifyText: {
    fontSize: 6.5,
    fontWeight: '800',
    color: 'rgba(255, 255, 255, 0.7)',
    letterSpacing: 0.8,
    marginTop: 2,
  },
  backCapsulesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 5,
    marginVertical: 6,
  },
  backPerkCapsule: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 10,
    paddingVertical: 5,
    paddingHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  backPerkIconCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 3,
  },
  backPerkText: {
    fontSize: 6.5,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  backFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 3,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.12)',
    marginTop: 3,
  },
  backSupportText: {
    fontSize: 7,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.65)',
  },
  tapToFlipBackText: {
    fontSize: 7,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
