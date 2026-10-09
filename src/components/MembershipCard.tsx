import React, { useEffect } from 'react';
import { View, Text, StyleSheet, useWindowDimensions, Image } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import Svg, { Rect, Defs, LinearGradient, Stop, Path } from 'react-native-svg';
import { useAuthStore } from '../store/authStore';

const CARD_HEIGHT = 200;

interface MembershipCardProps {
  name: string;
  type: 'silver' | 'gold' | 'diamond';
  number: string;
  points: number;
  validity: string;
}

function MembershipCardComponent({ name, type, number, points, validity }: MembershipCardProps) {
  const currentUser = useAuthStore((state) => state.currentUser);
  const isGuestUser = !currentUser || currentUser.isGuest || currentUser.name.toLowerCase().includes('guest') || (name || '').toLowerCase().includes('guest');
  const cardDisplayName = isGuestUser ? 'Guest User' : (name || currentUser?.name || 'Guest User');
  const cardNumber = isGuestUser ? `CN-${type.toUpperCase()}-GUEST` : number;

  const { width } = useWindowDimensions();
  const CARD_WIDTH = width - 32;
  const shimmer = useSharedValue(-1.5);

  useEffect(() => {
    shimmer.value = withRepeat(
      withTiming(1.5, { duration: 3000 }),
      -1, // Loop infinitely
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

  // Gradient configurations
  const getGradient = () => {
    switch (type) {
      case 'silver':
        return (
          <LinearGradient id="cardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#708090" />
            <Stop offset="50%" stopColor="#A9A9A9" />
            <Stop offset="100%" stopColor="#2F4F4F" />
          </LinearGradient>
        );
      case 'diamond':
        return (
          <LinearGradient id="cardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#0A1128" />
            <Stop offset="30%" stopColor="#1E3A8A" />
            <Stop offset="70%" stopColor="#3B82F6" />
            <Stop offset="100%" stopColor="#8B5CF6" />
          </LinearGradient>
        );
      case 'gold':
      default:
        return (
          <LinearGradient id="cardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#B8860B" />
            <Stop offset="40%" stopColor="#FFD700" />
            <Stop offset="70%" stopColor="#DAA520" />
            <Stop offset="100%" stopColor="#8B6508" />
          </LinearGradient>
        );
    }
  };

  const getBorderColor = () => {
    if (type === 'gold') return '#FFE47E';
    if (type === 'diamond') return '#A5B4FC';
    return '#E2E8F0';
  };

  return (
    <View style={[styles.container, { width: CARD_WIDTH }, { borderColor: getBorderColor() }]}>
      {/* SVG Background Gradient */}
      <View style={StyleSheet.absoluteFill}>
        <Svg width="100%" height="100%">
          <Defs>
            {getGradient()}
          </Defs>
          <Rect width="100%" height="100%" rx="20" ry="20" fill="url(#cardGrad)" />
        </Svg>
      </View>

      {/* Shimmer Glow Overlay */}
      <Animated.View style={[styles.shimmer, animatedShimmerStyle]} />

      {/* Card Content Overlay */}
      <View style={styles.content}>
        {/* Header: Brand and Member type */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Image
              source={require('../assets/images/forge_india_logo.jpg')}
              style={styles.logoImage}
            />
            <Text style={styles.logoText}>Connect Club</Text>
          </View>
          <Text style={[styles.planBadge, { color: type === 'gold' ? '#FFF' : '#FFF' }]}>
            {type.toUpperCase()} MEMBER
          </Text>
        </View>

        {/* Middle: Details & QR code */}
        <View style={styles.middleRow}>
          <View style={styles.detailsCol}>
            <Text style={styles.cardNoLabel}>CARD NUMBER</Text>
            <Text style={styles.cardNoValue}>{cardNumber}</Text>

            <Text style={styles.pointsLabel}>REWARD BALANCE</Text>
            <Text style={styles.pointsValue}>{points.toLocaleString()} PTS</Text>
          </View>

          {/* QR Code Simulation SVG */}
          <View style={styles.qrContainer}>
            <Svg width="56" height="56" viewBox="0 0 100 100">
              <Path
                d="M 5,5 h 25 v 25 h -25 z M 5,5 v 10 h 10 M 70,5 h 25 v 25 h -25 z M 95,5 v 10 h -10 M 5,70 h 25 v 25 h -25 z M 5,95 v -10 h 10 M 40,40 h 20 v 20 h -20 z M 75,75 h 20 M 85,85 h 10 M 70,80 h 10 M 80,70 v 10 M 90,95 h 5"
                stroke="white"
                strokeWidth="6"
                fill="none"
              />
              <Path
                d="M 12,12 h 11 v 11 h -11 z M 77,12 h 11 v 11 h -11 z M 12,77 h 11 v 11 h -11 z M 45,45 h 10 v 10 h -10 z"
                fill="white"
              />
            </Svg>
          </View>
        </View>

        {/* Footer: Name and Validity */}
        <View style={styles.footer}>
          <View>
            <Text style={styles.footerLabel}>MEMBER NAME</Text>
            <Text style={styles.footerValue}>{cardDisplayName}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.footerLabel}>VALID THRU</Text>
            <Text style={styles.footerValue}>{validity}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    maxWidth: 340,
    height: CARD_HEIGHT,
    borderRadius: 20,
    borderWidth: 1.5,
    overflow: 'hidden',
    position: 'relative',
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 18,
    elevation: 10,
    backgroundColor: '#050B1E',
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'space-between',
    zIndex: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoImage: {
    width: 22,
    height: 22,
    borderRadius: 11,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#FFF',
  },
  logoText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFF',
    letterSpacing: 0.5,
  },
  planBadge: {
    fontSize: 10,
    fontWeight: '900',
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    overflow: 'hidden',
  },
  middleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 12,
  },
  detailsCol: {
    flex: 1,
  },
  cardNoLabel: {
    fontSize: 8,
    fontWeight: 'bold',
    color: 'rgba(255, 255, 255, 0.6)',
    letterSpacing: 1,
  },
  cardNoValue: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  pointsLabel: {
    fontSize: 8,
    fontWeight: 'bold',
    color: 'rgba(255, 255, 255, 0.6)',
    letterSpacing: 1,
  },
  pointsValue: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFF',
  },

  qrContainer: {
    width: 68,
    height: 68,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  footerLabel: {
    fontSize: 8,
    fontWeight: 'bold',
    color: 'rgba(255, 255, 255, 0.6)',
    letterSpacing: 1,
    marginBottom: 2,
  },
  footerValue: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#FFF',
  },
});

export default React.memo(MembershipCardComponent);
