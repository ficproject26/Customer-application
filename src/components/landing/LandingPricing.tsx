import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import Animated, {
  useDerivedValue,
  useAnimatedStyle,
  useAnimatedReaction,
  runOnJS,
  interpolate,
  withTiming,
  withSpring,
  SharedValue,
} from 'react-native-reanimated';
import Svg, { Polygon, Line as SvgLine, Rect, Defs, LinearGradient, Stop } from 'react-native-svg';
import * as Icons from 'lucide-react-native';

const { width, height: screenHeight } = Dimensions.get('window');

const PLANS = [
  {
    name: 'Silver Tier',
    price: '49',
    cardNumber: '4000 8841 2921 1012',
    features: [
      { text: '10% Off All Vendors', included: true },
      { text: '2 Daily Delivery Slots', included: true },
      { text: 'No Lounge Access', included: false },
      { text: 'Standard Customer Support', included: true },
      { text: 'Everyday Delivery Partner Fees Appy', included: true },
    ],
    buttonText: 'Select Silver',
    isFeatured: false,
    accentColor: '#94A3B8',
    textColor: '#1E293B',
    bgColor: '#1E293B',
  },
  {
    name: 'Gold Elite',
    price: '99',
    cardNumber: '5412 8841 2921 2045',
    features: [
      { text: '20% Off All Vendors', included: true },
      { text: 'Priority Customer Support', included: true },
      { text: '5 Monthly Lounge Passes', included: true },
      { text: 'Exclusive Invite Only Local Events', included: true },
      { text: 'No Booking & Convenice Fees', included: true },
    ],
    buttonText: 'Select Gold',
    isFeatured: true,
    accentColor: '#D4AF37',
    textColor: '#3D2B00',
    badge: 'MOST POPULAR',
    bgColor: '#F5D061',
  },
  {
    name: 'Diamond Prestige',
    price: '249',
    cardNumber: '3782 8841 2921 3099',
    features: [
      { text: 'Unlimited VIP Lounge Access', included: true },
      { text: 'Dedicated Lifestyle Concierge', included: true },
      { text: 'Airport Limo Transfer & Escort', included: true },
      { text: 'Waived Delivery Fees Everywhere', included: true },
      { text: 'Complimentary Partner Offers', included: true },
    ],
    buttonText: 'Select Diamond',
    isFeatured: false,
    accentColor: '#D4AF37',
    textColor: '#FFFFFF',
    bgColor: '#0F172A',
  },
];

interface LandingPricingProps {
  onSelectTier?: (tierName: string) => void;
  scrollY: SharedValue<number>;
}

const GoldChip = () => (
  <Svg width={32} height={22} viewBox="0 0 50 38">
    <Defs>
      <LinearGradient id="chipGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <Stop offset="0%" stopColor="#FFF9E6" />
        <Stop offset="35%" stopColor="#E6C35C" />
        <Stop offset="70%" stopColor="#B3861B" />
        <Stop offset="100%" stopColor="#805B07" />
      </LinearGradient>
    </Defs>
    <Rect width="50" height="38" rx="3" fill="url(#chipGrad)" />
  </Svg>
);

const DiamondLogo = ({ isSilver }: { isSilver: boolean }) => (
  <Svg width={40} height={30} viewBox="0 0 100 70">
    <Defs>
      <LinearGradient id="diamondGradGold" x1="0%" y1="0%" x2="100%" y2="100%">
        <Stop offset="0%" stopColor="#FFF9E6" />
        <Stop offset="30%" stopColor="#F5D061" />
        <Stop offset="70%" stopColor="#D4AF37" />
        <Stop offset="100%" stopColor="#805B07" />
      </LinearGradient>
      <LinearGradient id="diamondGradSilver" x1="0%" y1="0%" x2="100%" y2="100%">
        <Stop offset="0%" stopColor="#FFFFFF" />
        <Stop offset="40%" stopColor="#CBD5E1" />
        <Stop offset="100%" stopColor="#64748B" />
      </LinearGradient>
    </Defs>
    <Polygon
      points="50,5 90,26 50,65 10,26"
      fill={isSilver ? 'url(#diamondGradSilver)' : 'url(#diamondGradGold)'}
      stroke={isSilver ? '#64748B' : '#AA7C11'}
      strokeWidth="1.2"
    />
    <Polygon
      points="50,5 70,26 50,65 30,26"
      fill="none"
      stroke={isSilver ? '#64748B' : '#AA7C11'}
      strokeWidth="1"
    />
    <SvgLine
      x1="10" y1="26" x2="90" y2="26"
      stroke={isSilver ? '#64748B' : '#AA7C11'}
      strokeWidth="1.2"
    />
  </Svg>
);

export default function LandingPricing({ onSelectTier, scrollY }: LandingPricingProps) {
  const [layoutY, setLayoutY] = useState(0);
  const [layoutHeight, setLayoutHeight] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [showBenefits, setShowBenefits] = useState(true); // show benefits by default for active card

  const handleContainerLayout = (event: any) => {
    const { y, height } = event.nativeEvent.layout;
    setLayoutY(y);
    setLayoutHeight(height);
  };

  // Compute overall scroll progress within the Pricing section
  const progress = useDerivedValue(() => {
    if (layoutHeight === 0) return 0;
    // Section starts animating when entering viewport, completes when scrolling out
    const startScroll = layoutY - screenHeight * 0.3;
    const endScroll = layoutY + layoutHeight - screenHeight * 0.7;
    const val = (scrollY.value - startScroll) / (endScroll - startScroll || 1);
    return Math.min(Math.max(val, 0), 1);
  });

  // Dynamically update activeIndex state on scroll progress
  useAnimatedReaction(
    () => {
      const p = progress.value;
      if (p < 0.35) return 0;
      if (p < 0.7) return 1;
      return 2;
    },
    (currIndex) => {
      if (currIndex !== activeIndex) {
        runOnJS(setActiveIndex)(currIndex);
      }
    }
  );

  const handleCardPress = (idx: number) => {
    setActiveIndex(idx);
    setShowBenefits(true);
  };

  const toggleBenefits = () => {
    setShowBenefits(!showBenefits);
  };

  const activePlan = PLANS[activeIndex];
  const isDarkActive = activePlan.name === 'Diamond Prestige';

  // Card transform styles
  const getCardStyle = (idx: number) => {
    return useAnimatedStyle(() => {
      const p = progress.value;
      let x = 0;
      let y = 0;
      let scale = 1;
      let opacity = 1;
      let rotateZ = 0;

      if (idx === 0) {
        // Silver Card: Active in front initially, then flies up and disappears
        if (p < 0.25) {
          x = 0;
          y = 0;
          scale = 1;
          opacity = 1;
          rotateZ = 5;
        } else if (p < 0.45) {
          x = 0;
          y = interpolate(p, [0.25, 0.45], [0, -250]);
          scale = interpolate(p, [0.25, 0.45], [1, 0.88]);
          opacity = interpolate(p, [0.25, 0.45], [1, 0]);
          rotateZ = interpolate(p, [0.25, 0.45], [5, 0]);
        } else {
          x = 0;
          y = -250;
          scale = 0.88;
          opacity = 0;
          rotateZ = 0;
        }
      } else if (idx === 1) {
        // Gold Card: Behind Silver initially, moves to front, then flies up
        if (p < 0.25) {
          x = 16;
          y = -16;
          scale = 0.92;
          opacity = 0.8;
          rotateZ = 2.5;
        } else if (p < 0.45) {
          x = interpolate(p, [0.25, 0.45], [16, 0]);
          y = interpolate(p, [0.25, 0.45], [-16, 0]);
          scale = interpolate(p, [0.25, 0.45], [0.92, 1]);
          opacity = interpolate(p, [0.25, 0.45], [0.8, 1]);
          rotateZ = interpolate(p, [0.25, 0.45], [2.5, 5]);
        } else if (p < 0.6) {
          x = 0;
          y = 0;
          scale = 1;
          opacity = 1;
          rotateZ = 5;
        } else if (p < 0.8) {
          x = 0;
          y = interpolate(p, [0.6, 0.8], [0, -250]);
          scale = interpolate(p, [0.6, 0.8], [1, 0.88]);
          opacity = interpolate(p, [0.6, 0.8], [1, 0]);
          rotateZ = interpolate(p, [0.6, 0.8], [5, 0]);
        } else {
          x = 0;
          y = -250;
          scale = 0.88;
          opacity = 0;
          rotateZ = 0;
        }
      } else if (idx === 2) {
        // Diamond Card: Behind Gold initially, moves to middle, then moves to front
        if (p < 0.25) {
          x = 32;
          y = -32;
          scale = 0.84;
          opacity = 0.6;
          rotateZ = 0;
        } else if (p < 0.45) {
          x = interpolate(p, [0.25, 0.45], [32, 16]);
          y = interpolate(p, [0.25, 0.45], [-32, -16]);
          scale = interpolate(p, [0.25, 0.45], [0.84, 0.92]);
          opacity = interpolate(p, [0.25, 0.45], [0.6, 0.8]);
          rotateZ = interpolate(p, [0.25, 0.45], [0, 2.5]);
        } else if (p < 0.6) {
          x = 16;
          y = -16;
          scale = 0.92;
          opacity = 0.8;
          rotateZ = 2.5;
        } else if (p < 0.8) {
          x = interpolate(p, [0.6, 0.8], [16, 0]);
          y = interpolate(p, [0.6, 0.8], [-16, 0]);
          scale = interpolate(p, [0.6, 0.8], [0.92, 1]);
          opacity = interpolate(p, [0.6, 0.8], [0.8, 1]);
          rotateZ = interpolate(p, [0.6, 0.8], [2.5, 5]);
        } else {
          x = 0;
          y = 0;
          scale = 1;
          opacity = 1;
          rotateZ = 5;
        }
      }

      // Check if tap overrides the active index when not scrolling
      const isCardSelected = activeIndex === idx;
      
      return {
        transform: [
          { translateX: withSpring(x) },
          { translateY: withSpring(y) },
          { scale: withSpring(isCardSelected && activeIndex !== idx ? scale * 1.05 : scale) },
          { rotate: withSpring(`${rotateZ}deg`) }
        ],
        opacity: withTiming(opacity, { duration: 200 }),
        zIndex: isCardSelected ? 50 : 10 - idx,
      };
    });
  };

  const benefitsStyle = useAnimatedStyle(() => {
    return {
      maxHeight: withTiming(showBenefits ? 400 : 0, { duration: 350 }),
      opacity: withTiming(showBenefits ? 1 : 0, { duration: 300 }),
      overflow: 'hidden',
    };
  });

  return (
    <View style={styles.container} onLayout={handleContainerLayout}>
      {/* Section Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Choose Your Prestige</Text>
        <Text style={styles.subtitle}>Scroll vertically or tap a card to explore benefits</Text>
      </View>

      {/* 3D Stack Container */}
      <View style={styles.stackContainer}>
        {PLANS.map((plan, idx) => {
          const isDark = plan.name === 'Diamond Prestige';
          const isSilver = plan.name === 'Silver Tier';
          const isSelected = activeIndex === idx;
          const borderColor = isSelected
            ? '#F4C400'
            : isDark
            ? 'rgba(255,255,255,0.08)'
            : isSilver
            ? 'rgba(148,163,184,0.3)'
            : 'rgba(212,175,55,0.35)';

          return (
            <Animated.View
              key={plan.name}
              style={[
                styles.creditCard,
                {
                  backgroundColor: isDark ? '#0F172A' : isSilver ? '#E2E8F0' : '#E5C558',
                  borderColor: borderColor,
                },
                getCardStyle(idx),
              ]}
            >
              <TouchableOpacity
                style={styles.cardTouchArea}
                activeOpacity={0.9}
                onPress={() => handleCardPress(idx)}
              >
                {/* Gold Chip */}
                <View style={styles.chipContainer}>
                  <GoldChip />
                </View>

                {/* Contactless Signal Symbol */}
                <Icons.Wifi
                  color={isDark || !isSilver ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.5)'}
                  size={16}
                  style={styles.wifiIcon}
                />

                {/* CONNECT Logo */}
                <View style={styles.logoCenter}>
                  <DiamondLogo isSilver={isSilver} />
                  <Text
                    style={[
                      styles.logoText,
                      { color: isSilver ? '#475569' : isDark ? '#FFFFFF' : '#3D2B00' },
                    ]}
                  >
                    CONNECT
                  </Text>
                </View>

                {/* Interactive Click to Expand Cue */}
                {isSelected && (
                  <View style={styles.hintContainer}>
                    <Icons.Info color={isDark || !isSilver ? '#F4C400' : '#1E293B'} size={10} />
                    <Text style={[styles.hintText, { color: isDark || !isSilver ? '#FFFFFF' : '#1E293B' }]}>
                      {showBenefits ? 'TAP TO COLLAPSE' : 'TAP TO VIEW BENEFITS'}
                    </Text>
                  </View>
                )}

                {/* Tier Name & Number */}
                <View style={styles.cardBottom}>
                  <Text style={[styles.cardNumber, { color: isDark || !isSilver ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.6)' }]}>
                    {plan.cardNumber}
                  </Text>
                  <Text
                    style={[
                      styles.tierLabel,
                      { color: isSilver ? '#475569' : isDark ? '#F4C400' : '#3D2B00' },
                    ]}
                  >
                    {plan.name}
                  </Text>
                </View>
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </View>

      {/* Selected Card Details & Benefits */}
      <TouchableOpacity 
        style={[
          styles.detailsCard,
          { 
            backgroundColor: isDarkActive ? '#0F172A' : '#1E293B',
            borderColor: isDarkActive ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.1)'
          }
        ]}
        activeOpacity={0.95}
        onPress={toggleBenefits}
      >
        {/* Toggleable Header */}
        <View style={styles.detailsHeader}>
          <View>
            <Text style={styles.detailsTitle}>{activePlan.name}</Text>
            <View style={styles.priceRow}>
              <Text style={styles.priceSymbol}>$</Text>
              <Text style={styles.priceValue}>{activePlan.price}</Text>
              <Text style={styles.pricePeriod}>/mo</Text>
            </View>
          </View>
          <View style={styles.expandToggle}>
            <Text style={styles.expandText}>{showBenefits ? 'Collapse' : 'Show benefits'}</Text>
            <Icons.ChevronDown
              color="#F4C400"
              size={18}
              style={{ transform: [{ rotate: showBenefits ? '180deg' : '0deg' }] }}
            />
          </View>
        </View>

        {/* Collapsible Features Checklists */}
        <Animated.View style={[styles.benefitsWrapper, benefitsStyle]}>
          <Text style={styles.benefitsTitle}>MEMBERSHIP BENEFITS</Text>
          <View style={styles.featuresList}>
            {activePlan.features.map((feature, fIdx) => (
              <View key={fIdx} style={styles.featureRow}>
                {feature.included ? (
                  <Icons.Check color="#10B981" size={14} />
                ) : (
                  <Icons.X color="rgba(255,255,255,0.3)" size={14} />
                )}
                <Text
                  style={[
                    styles.featureText,
                    {
                      color: feature.included ? '#FFFFFF' : 'rgba(255,255,255,0.3)',
                      textDecorationLine: feature.included ? 'none' : 'line-through',
                    },
                  ]}
                >
                  {feature.text}
                </Text>
              </View>
            ))}
          </View>

          {/* Selection CTA Button */}
          <TouchableOpacity
            style={[
              styles.ctaButton,
              { backgroundColor: activePlan.isFeatured ? '#F4C400' : 'rgba(255,255,255,0.1)' }
            ]}
            activeOpacity={0.8}
            onPress={() => onSelectTier?.(activePlan.name)}
          >
            <Text style={[styles.ctaText, { color: activePlan.isFeatured ? '#050B1E' : '#FFFFFF' }]}>
              {activePlan.buttonText}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#050B1E',
    paddingVertical: 50,
  },
  header: {
    paddingHorizontal: 24,
    marginBottom: 10,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.45)',
    textAlign: 'center',
  },
  stackContainer: {
    height: 240,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
  creditCard: {
    width: width * 0.8,
    height: 180,
    borderRadius: 20,
    borderWidth: 1.5,
    position: 'absolute',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
  },
  cardTouchArea: {
    width: '100%',
    height: '100%',
    padding: 18,
    justifyContent: 'space-between',
  },
  chipContainer: {
    position: 'absolute',
    left: 18,
    bottom: 20,
  },
  wifiIcon: {
    position: 'absolute',
    right: 18,
    top: 18,
  },
  logoCenter: {
    alignItems: 'center',
    marginTop: 10,
  },
  logoText: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 5,
    marginTop: 4,
  },
  hintContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: 'center',
    marginTop: 8,
  },
  hintText: {
    fontSize: 7,
    fontWeight: '800',
    letterSpacing: 1,
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardNumber: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 1.2,
  },
  tierLabel: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  detailsCard: {
    marginHorizontal: 20,
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  detailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailsTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  priceSymbol: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F4C400',
    marginRight: 2,
  },
  priceValue: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  pricePeriod: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.4)',
    marginLeft: 3,
  },
  expandToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  expandText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '700',
  },
  benefitsWrapper: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    paddingTop: 16,
  },
  benefitsTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#F4C400',
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  featuresList: {
    gap: 10,
    marginBottom: 20,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  featureText: {
    fontSize: 12,
    fontWeight: '600',
  },
  ctaButton: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  ctaText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
