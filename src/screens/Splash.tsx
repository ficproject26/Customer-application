import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions, Image } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { AuthStackParamList } from '../navigation/AppNavigator';
import Svg, { Circle, Line, G } from 'react-native-svg';



export default function Splash() {
  const { height, width } = useWindowDimensions();
  const navigation = useNavigation<any>();

  // Shared values for animations
  const logoScale = useSharedValue(0.2);
  const logoRotate = useSharedValue(0);
  const titleOpacity = useSharedValue(0);
  const buttonOpacity = useSharedValue(0);
  const starRotate = useSharedValue(0);

  useEffect(() => {
    // Logo entrance
    logoScale.value = withTiming(1, {
      duration: 1500,
      easing: Easing.out(Easing.back(1.5)),
    });
    
    logoRotate.value = withTiming(360, {
      duration: 2000,
      easing: Easing.out(Easing.exp),
    });

    // Constellation spin
    starRotate.value = withTiming(720, {
      duration: 80000,
      easing: Easing.linear,
    });

    // Content fade in
    titleOpacity.value = withDelay(
      800,
      withTiming(1, { duration: 1000 })
    );

    buttonOpacity.value = withDelay(
      1500,
      withTiming(1, { duration: 800 })
    );
  }, []);

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: logoScale.value },
      { rotate: `${logoRotate.value}deg` }
    ],
  }));

  const constellationAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${starRotate.value}deg` }],
  }));

  const titleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: interpolate(titleOpacity.value, [0, 1], [30, 0]) }],
  }));

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
    transform: [{ translateY: interpolate(buttonOpacity.value, [0, 1], [20, 0]) }],
  }));

  return (
    <View style={[styles.container, { paddingVertical: height * 0.08 }]}>
      {/* Animated Earth Space Constellation Background */}
      <Animated.View style={[styles.backgroundConstellation, { top: height * 0.12 }, constellationAnimatedStyle]}>
        <Svg width="350" height="350" viewBox="0 0 100 100">
          <G stroke="rgba(244, 196, 0, 0.12)" strokeWidth="0.4" fill="none">
            <Circle cx="50" cy="50" r="38" strokeDasharray="2, 4" />
            <Circle cx="50" cy="50" r="24" />
            <Circle cx="50" cy="50" r="10" strokeDasharray="3, 2" />
            <Line x1="12" y1="50" x2="88" y2="50" />
            <Line x1="50" y1="12" x2="50" y2="88" />
            <Line x1="23" y1="23" x2="77" y2="77" />
            <Line x1="23" y1="77" x2="77" y2="23" />
          </G>
          <G fill="#F4C400">
            <Circle cx="50" cy="12" r="1.5" />
            <Circle cx="50" cy="88" r="1.5" />
            <Circle cx="12" cy="50" r="1.5" />
            <Circle cx="88" cy="50" r="1.5" />
            <Circle cx="23" cy="23" r="1" />
            <Circle cx="77" cy="77" r="1" />
            <Circle cx="77" cy="23" r="1.2" />
            <Circle cx="23" cy="77" r="1.2" />
          </G>
        </Svg>
      </Animated.View>

      {/* App Logo */}
      <Animated.View style={[styles.logoContainer, { marginTop: height * 0.1 }, logoAnimatedStyle]}>
        <Image
          source={require('../assets/images/forge_india_logo.jpg')}
          style={styles.logoImage}
        />
      </Animated.View>

      {/* Hero Headline & Subheadline */}
      <Animated.View style={[styles.textContainer, titleAnimatedStyle]}>
        <Text style={styles.headline}>Everything Connected.</Text>
        <Text style={styles.headline}>Everywhere You Go.</Text>
        <Text style={styles.subheading}>One Membership. Unlimited Benefits.</Text>
      </Animated.View>

      {/* Buttons */}
      <Animated.View style={[styles.buttonContainer, buttonAnimatedStyle]}>
        <TouchableOpacity
          style={styles.primaryButton}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('LocationSelection')}
        >
          <Text style={styles.primaryButtonText}>Join Membership</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('LocationSelection')}
        >
          <Text style={styles.secondaryButtonText}>Explore Benefits</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050B1E',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },
  backgroundConstellation: {
    position: 'absolute',
    alignSelf: 'center',
    width: 350,
    height: 350,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.85,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 2,
    borderColor: '#F4C400',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F4C400',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  logoImage: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  textContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  headline: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 38,
  },
  subheading: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.55)',
    textAlign: 'center',
    marginTop: 14,
    letterSpacing: 1,
    fontWeight: 'bold',
  },
  buttonContainer: {
    width: '100%',
    paddingHorizontal: 16,
  },
  primaryButton: {
    width: '100%',
    backgroundColor: '#F4C400',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#F4C400',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 5,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#050B1E',
    letterSpacing: 0.5,
  },
  secondaryButton: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
});
