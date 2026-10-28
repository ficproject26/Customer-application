import React, { useEffect } from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import Svg, { Rect, Defs, LinearGradient, Stop, Path } from 'react-native-svg';
import * as Icons from 'lucide-react-native';
import QRCode from 'react-native-qrcode-svg';
import { useAuthStore } from '../store/authStore';

const CARD_HEIGHT = 205;

interface MembershipCardProps {
  name: string;
  type: 'silver' | 'gold' | 'diamond';
  number: string;
  points: number;
  validity: string;
}

function MembershipCardComponent({ name, type, number, points, validity }: MembershipCardProps) {
  const currentUser = useAuthStore((state) => state.currentUser);
  const rawTier = (type || currentUser?.membership || currentUser?.membershipTier || 'gold').toLowerCase();
  const effectiveType: 'silver' | 'gold' | 'diamond' = (['silver', 'gold', 'diamond'].includes(rawTier) ? rawTier : 'gold') as any;
  const isGuestUser = !currentUser || currentUser.isGuest || currentUser.name.toLowerCase().includes('guest') || (name || '').toLowerCase().includes('guest');
  const cardDisplayName = isGuestUser ? 'Guest User' : (name || currentUser?.name || 'Guest User');
  const cardNumber = isGuestUser ? `CN-${effectiveType.toUpperCase()}-GUEST` : number;

  const { width } = useWindowDimensions();
  const CARD_WIDTH = Math.min(width - 32, 380);
  const shimmer = useSharedValue(-1.5);

  useEffect(() => {
    shimmer.value = withRepeat(
      withTiming(1.5, { duration: 3200 }),
      -1,
      false
    );
  }, []);

  const animatedShimmerStyle = useAnimatedStyle(() => {
    const translateX = interpolate(shimmer.value, [-1.5, 1.5], [-CARD_WIDTH, CARD_WIDTH * 1.5]);
    return {
      width: CARD_WIDTH * 0.4,
      transform: [{ translateX }, { skewX: '-25deg' }],
    };
  });

  // Theme colors matching approved reference
  const getTheme = () => {
    switch (effectiveType) {
      case 'silver':
        return {
          title: 'SILVER',
          subtitle: 'CLUB',
          accent: '#E2E8F0',
          crown: '#CBD5E1',
          border: 'rgba(226, 232, 240, 0.45)',
          wave1: '#94A3B8',
          wave2: '#E2E8F0',
          gradient: ['#0E1217', '#1A212D', '#0A0D13'],
        };
      case 'diamond':
        return {
          title: 'DIAMOND',
          subtitle: 'CLUB',
          accent: '#C084FC',
          crown: '#A855F7',
          border: 'rgba(192, 132, 252, 0.5)',
          wave1: '#6B21A8',
          wave2: '#D8B4FE',
          gradient: ['#0B0517', '#190A36', '#070310'],
        };
      case 'gold':
      default:
        return {
          title: 'GOLD',
          subtitle: 'CLUB',
          accent: '#FBBF24',
          crown: '#F59E0B',
          border: 'rgba(251, 191, 36, 0.5)',
          wave1: '#B45309',
          wave2: '#FDE68A',
          gradient: ['#0F0B04', '#1D1506', '#080602'],
        };
    }
  };

  const theme = getTheme();

  return (
    <View style={[styles.container, { width: CARD_WIDTH, borderColor: theme.border }]}>
      {/* SVG Background Gradient & Fluid Wave Ribbons */}
      <View style={StyleSheet.absoluteFill}>
        <Svg width="100%" height="100%">
          <Defs>
            <LinearGradient id="cardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor={theme.gradient[0]} />
              <Stop offset="50%" stopColor={theme.gradient[1]} />
              <Stop offset="100%" stopColor={theme.gradient[2]} />
            </LinearGradient>
            <LinearGradient id="cardWave" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor={theme.wave1} stopOpacity="0.45" />
              <Stop offset="50%" stopColor={theme.wave2} stopOpacity="0.3" />
              <Stop offset="100%" stopColor="transparent" stopOpacity="0" />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" rx="20" ry="20" fill="url(#cardGrad)" />
          {/* Fluid ribbon wave */}
          <Path
            d="M -20,150 C 70,100 170,180 270,120 C 320,90 350,110 400,70 L 400,230 L -20,230 Z"
            fill="url(#cardWave)"
          />
          <Path
            d="M -20,150 C 70,100 170,180 270,120 C 320,90 350,110 400,70"
            stroke={theme.accent}
            strokeWidth="1.5"
            strokeOpacity="0.6"
          />
        </Svg>
      </View>

      {/* Shimmer Glow Overlay */}
      <Animated.View style={[styles.shimmer, animatedShimmerStyle]} />

      {/* Card Content Overlay */}
      <View style={styles.content}>
        {/* Header: Connect Club Brand & Serif Tier Title */}
        <View style={styles.header}>
          <View style={styles.brandRow}>
            <View style={[styles.crownIconBox, { borderColor: theme.accent }]}>
              <Icons.Crown color={theme.accent} size={13} strokeWidth={2.5} />
            </View>
            <View>
              <Text style={styles.brandTitleText}>Connect Club</Text>
              <Text style={styles.brandTaglineText}>ONE CITY ONE CARD</Text>
            </View>
          </View>

          <View style={styles.tierTitleBox}>
            <View style={styles.tierTitleRow}>
              <Text style={styles.serifTierTitle}>{theme.title}</Text>
              <Icons.Sparkles color={theme.accent} size={11} />
            </View>
            <Text style={[styles.serifTierSubtitle, { color: theme.accent }]}>
              {theme.subtitle}
            </Text>
          </View>
        </View>

        {/* Middle: Details & Points */}
        <View style={styles.middleRow}>
          <View style={styles.detailsCol}>
            <Text style={styles.memberDisplayName} numberOfLines={1}>{cardDisplayName}</Text>
            <Text style={styles.cardNoValue}>{cardNumber}</Text>

            <View style={styles.pointsPill}>
              <Icons.Sparkles color={theme.accent} size={10} />
              <Text style={styles.pointsText}>{points.toLocaleString()} PTS</Text>
            </View>
          </View>

          {/* QR Code Container with SCAN TO VERIFY */}
          <View style={styles.qrCol}>
            <View style={styles.qrBox}>
              <QRCode
                value={cardNumber}
                size={50}
                color="#0F172A"
                backgroundColor="#FFFFFF"
              />
            </View>
            <Text style={styles.scanToVerifyText}>SCAN TO VERIFY</Text>
          </View>
        </View>

        {/* Footer: EMV Chip & Validity */}
        <View style={styles.footer}>
          <View style={styles.emvRow}>
            <View style={styles.emvChipBox}>
              <View style={styles.emvChipInner} />
            </View>
            <Text style={styles.validityText}>VALID THRU {validity || '12/26'}</Text>
          </View>
          <Text style={[styles.verifiedBadge, { color: theme.accent }]}>CONNECT VERIFIED ✓</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    maxWidth: 380,
    height: CARD_HEIGHT,
    borderRadius: 22,
    borderWidth: 1.5,
    overflow: 'hidden',
    position: 'relative',
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
    backgroundColor: '#0A0D13',
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  content: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
    zIndex: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
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
  brandTitleText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },
  brandTaglineText: {
    fontSize: 6.5,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.65)',
    letterSpacing: 1.2,
    marginTop: 1,
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
  middleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 4,
  },
  detailsCol: {
    flex: 1,
    justifyContent: 'center',
  },
  memberDisplayName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  cardNoValue: {
    fontSize: 11,
    fontFamily: 'monospace',
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.85)',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  pointsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  pointsText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  qrCol: {
    alignItems: 'center',
    marginLeft: 12,
  },
  qrBox: {
    padding: 3,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 3,
  },
  scanToVerifyText: {
    fontSize: 6.5,
    fontWeight: '800',
    color: 'rgba(255, 255, 255, 0.7)',
    letterSpacing: 0.8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  emvRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  emvChipBox: {
    width: 22,
    height: 16,
    borderRadius: 3,
    backgroundColor: '#EAB308',
    borderWidth: 1,
    borderColor: '#FEF08A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emvChipInner: {
    width: 14,
    height: 10,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 1.5,
  },
  validityText: {
    fontSize: 8.5,
    fontWeight: '700',
    fontFamily: 'monospace',
    color: 'rgba(255, 255, 255, 0.85)',
    letterSpacing: 0.5,
  },
  verifiedBadge: {
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
});

export default React.memo(MembershipCardComponent);
